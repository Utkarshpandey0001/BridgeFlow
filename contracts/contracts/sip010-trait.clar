;; ===========================================================================
;; SIP-010 Fungible Token Trait
;; ===========================================================================
;; Standard SIP-010 trait definition required by Bitflow vault to interact
;; with any compliant fungible token (e.g. USDCx).

(define-trait sip010-ft-trait
  (
    ;; Transfer tokens to a recipient.
    (transfer (uint principal principal (optional (buff 34))) (response bool uint))

    ;; Human-readable name of the token.
    (get-name () (response (string-ascii 32) uint))

    ;; Symbol or ticker of the token (3-5 chars).
    (get-symbol () (response (string-ascii 32) uint))

    ;; Number of decimal places in the token representation.
    (get-decimals () (response uint uint))

    ;; Balance of a principal.
    (get-balance (principal) (response uint uint))

    ;; Total supply of the token.
    (get-total-supply () (response uint uint))

    ;; URI for token metadata (images, description).
    (get-token-uri () (response (optional (string-utf8 256)) uint))
  )
)
