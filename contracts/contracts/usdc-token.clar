;; ===========================================================================
;; Mock USDCx Token — SIP-010 compliant for testnet / demo
;; ===========================================================================
;; This is a simplified USDCx token used on devnet/testnet.
;; In production, the real USDCx from xLink/CCTP would be used.

(impl-trait .sip010-trait.sip010-ft-trait)

;; --------------------------------------------------------------------------
;; Token data
;; --------------------------------------------------------------------------
(define-fungible-token usdcx)

(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-NOT-OWNER (err u100))
(define-constant ERR-TRANSFER-FAILED (err u101))
(define-constant ERR-INSUFFICIENT-BALANCE (err u102))
(define-constant ERR-ZERO-AMOUNT (err u103))

;; --------------------------------------------------------------------------
;; SIP-010 trait implementations
;; --------------------------------------------------------------------------
(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
  (begin
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)
    (asserts! (is-eq tx-sender sender) ERR-TRANSFER-FAILED)
    (try! (ft-transfer? usdcx amount sender recipient))
    (match memo to-print (print to-print) 0x)
    (ok true)
  )
)

(define-read-only (get-name)
  (ok "USD Coin (Stacks)")
)

(define-read-only (get-symbol)
  (ok "USDCx")
)

(define-read-only (get-decimals)
  (ok u6)
)

(define-read-only (get-balance (owner principal))
  (ok (ft-get-balance usdcx owner))
)

(define-read-only (get-total-supply)
  (ok (ft-get-supply usdcx))
)

(define-read-only (get-token-uri)
  (ok (some u"https://bitflow.finance/usdc-token.json"))
)

;; --------------------------------------------------------------------------
;; Minting (only contract owner / faucet for testnet)
;; --------------------------------------------------------------------------
(define-public (mint (amount uint) (recipient principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-OWNER)
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)
    (ft-mint? usdcx amount recipient)
  )
)

;; Faucet: anyone can mint up to 10,000 USDCx for themselves on testnet
(define-public (faucet)
  (ft-mint? usdcx u10000000000 tx-sender)   ;; 10,000 USDCx (6 decimals)
)

;; --------------------------------------------------------------------------
;; Burn (for CCTP bridge simulation)
;; --------------------------------------------------------------------------
(define-public (burn (amount uint) (owner principal))
  (begin
    (asserts! (is-eq tx-sender owner) ERR-TRANSFER-FAILED)
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)
    (ft-burn? usdcx amount owner)
  )
)
