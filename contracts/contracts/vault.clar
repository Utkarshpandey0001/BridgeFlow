;; ===========================================================================
;; Bitflow Vault — Core smart contract
;; ===========================================================================
;; The vault holds USDCx deposited by users. Each user can configure an
;; autonomous agent (Safe / Balanced / YieldChaser) which monitors market
;; conditions and programmatically bridges funds to higher-yield destinations
;; via CCTP (simulated on testnet via xReserve event pattern).
;;
;; Bridge integration:
;;   When trigger-bridge is called, the vault burns USDCx (simulating the
;;   CCTP burn-and-mint flow). The off-chain agent monitors the BridgeTriggered
;;   event and handles the cross-chain mint on Base/Aave.
;; ===========================================================================

(use-trait ft-trait .sip010-trait.sip010-ft-trait)

;; --------------------------------------------------------------------------
;; Constants
;; --------------------------------------------------------------------------
(define-constant CONTRACT-OWNER tx-sender)

;; Error codes
(define-constant ERR-NOT-OWNER          (err u200))
(define-constant ERR-NOT-AGENT          (err u201))
(define-constant ERR-ZERO-AMOUNT        (err u202))
(define-constant ERR-INSUFFICIENT-BAL   (err u203))
(define-constant ERR-INVALID-AGENT-TYPE (err u204))
(define-constant ERR-VAULT-PAUSED       (err u205))
(define-constant ERR-INVALID-PARAMS     (err u206))
(define-constant ERR-EXCEED-BRIDGE-PCT  (err u207))

;; Agent type constants
(define-constant AGENT-SAFE    u0)
(define-constant AGENT-BALANCED u1)
(define-constant AGENT-CHASER  u2)

;; Basis point denominator (10000 bps = 100%)
(define-constant BPS-DENOMINATOR u10000)

;; Maximum bridge percentage (50% of vault balance at once)
(define-constant MAX-BRIDGE-PCT u5000)

;; --------------------------------------------------------------------------
;; Data vars
;; --------------------------------------------------------------------------
(define-data-var vault-paused bool false)
(define-data-var total-deposited uint u0)
(define-data-var total-bridged uint u0)
(define-data-var bridge-event-nonce uint u0)

;; Approved agent executors (off-chain bots authorized to call trigger-bridge)
(define-map approved-agents principal bool)

;; --------------------------------------------------------------------------
;; User state
;; --------------------------------------------------------------------------

;; User balance in the vault (in USDCx micro-units, 6 decimals)
(define-map user-balances principal uint)

;; User rules / agent configuration
(define-map user-rules principal {
  agent-type:        uint,   ;; 0=Safe 1=Balanced 2=YieldChaser
  min-apy-bps:       uint,   ;; Min APY on Stacks before bridging (e.g. 800 = 8%)
  bridge-pct-bps:    uint,   ;; % of balance to bridge per trigger (e.g. 3000 = 30%)
  vol-threshold-bps: uint,   ;; BTC vol threshold (e.g. 4000 = 40% annualized)
  auto-execute:      bool    ;; true = agent auto-executes; false = suggest-only
})

;; Track bridged amounts per user (for performance calc)
(define-map user-bridged principal uint)

;; Leaderboard opt-in
(define-map leaderboard-optin principal bool)

;; Bridge history: nonce → event info (for off-chain tracking)
(define-map bridge-events uint {
  user:            principal,
  amount:          uint,
  bridge-pct-bps:  uint,
  agent-type:      uint,
  block-height:    uint,
  reason:          (string-ascii 64)
})

;; --------------------------------------------------------------------------
;; Events (via print)
;; --------------------------------------------------------------------------
(define-private (emit-deposited (user principal) (amount uint) (new-balance uint))
  (print { event: "Deposited", user: user, amount: amount, new-balance: new-balance })
)

(define-private (emit-withdrawn (user principal) (amount uint) (remaining-balance uint))
  (print { event: "Withdrawn", user: user, amount: amount, remaining-balance: remaining-balance })
)

(define-private (emit-rules-set (user principal) (agent-type uint) (min-apy-bps uint) (bridge-pct-bps uint))
  (print { event: "RulesSet", user: user, agent-type: agent-type, min-apy-bps: min-apy-bps, bridge-pct-bps: bridge-pct-bps })
)

(define-private (emit-bridge-triggered (nonce uint) (user principal) (amount uint) (agent-type uint) (reason (string-ascii 64)))
  (print { event: "BridgeTriggered", nonce: nonce, user: user, amount: amount, agent-type: agent-type, reason: reason })
)

;; --------------------------------------------------------------------------
;; Admin functions
;; --------------------------------------------------------------------------
(define-public (set-vault-paused (paused bool))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-OWNER)
    (var-set vault-paused paused)
    (ok paused)
  )
)

(define-public (set-approved-agent (agent principal) (approved bool))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-OWNER)
    (map-set approved-agents agent approved)
    (ok approved)
  )
)

;; --------------------------------------------------------------------------
;; Deposit
;; --------------------------------------------------------------------------
;; User deposits USDCx into the vault. The vault pulls tokens using SIP-010
;; transfer from caller → contract.
(define-public (deposit (token <ft-trait>) (amount uint))
  (let (
    (caller    tx-sender)
    (cur-bal   (default-to u0 (map-get? user-balances caller)))
    (new-bal   (+ cur-bal amount))
  )
    (asserts! (not (var-get vault-paused)) ERR-VAULT-PAUSED)
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)

    ;; Pull USDCx from user into vault contract
    (try! (contract-call? token transfer amount caller (as-contract tx-sender) none))

    ;; Update state
    (map-set user-balances caller new-bal)
    (var-set total-deposited (+ (var-get total-deposited) amount))

    (emit-deposited caller amount new-bal)
    (ok new-bal)
  )
)

;; --------------------------------------------------------------------------
;; Withdraw
;; --------------------------------------------------------------------------
;; User withdraws USDCx from vault back to their wallet.
(define-public (withdraw (token <ft-trait>) (amount uint))
  (let (
    (caller    tx-sender)
    (cur-bal   (default-to u0 (map-get? user-balances caller)))
  )
    (asserts! (not (var-get vault-paused)) ERR-VAULT-PAUSED)
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)
    (asserts! (>= cur-bal amount) ERR-INSUFFICIENT-BAL)

    ;; Send USDCx from vault to user
    (try! (as-contract (contract-call? token transfer amount tx-sender caller none)))

    ;; Update state
    (let ((new-bal (- cur-bal amount)))
      (map-set user-balances caller new-bal)
      (var-set total-deposited (- (var-get total-deposited) amount))
      (emit-withdrawn caller amount new-bal)
      (ok new-bal)
    )
  )
)

;; --------------------------------------------------------------------------
;; Agent configuration
;; --------------------------------------------------------------------------
;; User sets their agent personality and rule parameters.
(define-public (set-user-rules
  (agent-type        uint)
  (min-apy-bps       uint)
  (bridge-pct-bps    uint)
  (vol-threshold-bps uint)
  (auto-execute      bool)
)
  (let ((caller tx-sender))
    (asserts! (<= agent-type u2) ERR-INVALID-AGENT-TYPE)
    (asserts! (> min-apy-bps u0) ERR-INVALID-PARAMS)
    (asserts! (> bridge-pct-bps u0) ERR-INVALID-PARAMS)
    (asserts! (<= bridge-pct-bps MAX-BRIDGE-PCT) ERR-EXCEED-BRIDGE-PCT)
    (asserts! (> vol-threshold-bps u0) ERR-INVALID-PARAMS)

    (map-set user-rules caller {
      agent-type:        agent-type,
      min-apy-bps:       min-apy-bps,
      bridge-pct-bps:    bridge-pct-bps,
      vol-threshold-bps: vol-threshold-bps,
      auto-execute:      auto-execute
    })
    (emit-rules-set caller agent-type min-apy-bps bridge-pct-bps)
    (ok true)
  )
)

;; --------------------------------------------------------------------------
;; Leaderboard opt-in / opt-out
;; --------------------------------------------------------------------------
(define-public (set-leaderboard-optin (optin bool))
  (begin
    (map-set leaderboard-optin tx-sender optin)
    (ok optin)
  )
)

;; --------------------------------------------------------------------------
;; Bridge trigger — The programmatic bridge (CCTP simulation)
;; --------------------------------------------------------------------------
;; Called by approved off-chain agent when conditions are met.
;; Burns USDCx from user balance (simulates CCTP burn intent).
;; Off-chain agent monitors the BridgeTriggered event and handles
;; the mint on the destination chain (Base).
(define-public (trigger-bridge
  (token   <ft-trait>)
  (user    principal)
  (reason  (string-ascii 64))
)
  (let (
    (caller     tx-sender)
    (cur-bal    (default-to u0 (map-get? user-balances user)))
    (rules      (unwrap! (map-get? user-rules user) ERR-INVALID-PARAMS))
    (bridge-pct (get bridge-pct-bps rules))
    (agent-type (get agent-type rules))
    ;; Calculate amount to bridge
    (bridge-amt (/ (* cur-bal bridge-pct) BPS-DENOMINATOR))
    (nonce      (+ (var-get bridge-event-nonce) u1))
  )
    (asserts! (not (var-get vault-paused)) ERR-VAULT-PAUSED)
    (asserts! (default-to false (map-get? approved-agents caller)) ERR-NOT-AGENT)
    (asserts! (> cur-bal u0) ERR-INSUFFICIENT-BAL)
    (asserts! (> bridge-amt u0) ERR-ZERO-AMOUNT)

    ;; Burn USDCx from vault (simulates CCTP burn — tokens leave Stacks)
    ;; In production: call xReserve's CCTP burn endpoint here
    (try! (as-contract (contract-call? token transfer bridge-amt tx-sender user none)))
    ;; Note: in real CCTP, tokens are burned not returned. For demo we track
    ;; them as "bridged" by crediting back then immediately removing from balance.

    ;; Debit user vault balance
    (map-set user-balances user (- cur-bal bridge-amt))

    ;; Accumulate bridged tracking
    (map-set user-bridged user
      (+ (default-to u0 (map-get? user-bridged user)) bridge-amt)
    )

    ;; Update global totals
    (var-set total-bridged (+ (var-get total-bridged) bridge-amt))
    (var-set bridge-event-nonce nonce)

    ;; Log bridge event (off-chain agent scans this)
    (map-set bridge-events nonce {
      user:           user,
      amount:         bridge-amt,
      bridge-pct-bps: bridge-pct,
      agent-type:     agent-type,
      block-height:   block-height,
      reason:         reason
    })

    (emit-bridge-triggered nonce user bridge-amt agent-type reason)
    (ok { nonce: nonce, amount: bridge-amt })
  )
)

;; --------------------------------------------------------------------------
;; Read-only functions
;; --------------------------------------------------------------------------

(define-read-only (get-user-balance (user principal))
  (default-to u0 (map-get? user-balances user))
)

(define-read-only (get-user-rules (user principal))
  (map-get? user-rules user)
)

(define-read-only (get-user-bridged (user principal))
  (default-to u0 (map-get? user-bridged user))
)

(define-read-only (get-vault-stats)
  {
    total-deposited:      (var-get total-deposited),
    total-bridged:        (var-get total-bridged),
    bridge-event-nonce:   (var-get bridge-event-nonce),
    vault-paused:         (var-get vault-paused)
  }
)

(define-read-only (get-bridge-event (nonce uint))
  (map-get? bridge-events nonce)
)

(define-read-only (is-leaderboard-optin (user principal))
  (default-to false (map-get? leaderboard-optin user))
)

(define-read-only (is-approved-agent (agent principal))
  (default-to false (map-get? approved-agents agent))
)

;; Preset rules for each agent personality (off-chain can suggest these)
(define-read-only (get-preset-rules (agent-type uint))
  (if (is-eq agent-type AGENT-SAFE)
    (some {
      agent-type: AGENT-SAFE,
      min-apy-bps: u1000,       ;; 10% min APY on Stacks
      bridge-pct-bps: u2000,    ;; Bridge up to 20%
      vol-threshold-bps: u2000, ;; Only bridge if BTC vol < 20%
      auto-execute: false
    })
    (if (is-eq agent-type AGENT-BALANCED)
      (some {
        agent-type: AGENT-BALANCED,
        min-apy-bps: u800,        ;; 8% min APY
        bridge-pct-bps: u3000,    ;; Bridge up to 30%
        vol-threshold-bps: u4000, ;; Bridge if BTC vol < 40%
        auto-execute: true
      })
      (if (is-eq agent-type AGENT-CHASER)
        (some {
          agent-type: AGENT-CHASER,
          min-apy-bps: u500,        ;; 5% min APY (yield greedy)
          bridge-pct-bps: u5000,    ;; Bridge up to 50%
          vol-threshold-bps: u9999, ;; Bridges regardless of vol
          auto-execute: true
        })
        none
      )
    )
  )
)
