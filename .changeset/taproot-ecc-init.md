---
'@relayprotocol/relay-bitcoin-wallet-adapter': patch
---

Fix Bitcoin swaps from Taproot (`bc1p`) addresses failing before broadcast. `adaptBitcoinWallet`
now initializes an ECC library before finalizing the signed PSBT, which resolves
`No ECC Library provided`, and skips inputs the wallet already finalized, which resolves
`Can not finalize input #0` from wallets that auto-finalize such as OKX.
