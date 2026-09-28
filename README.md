# projectvegetables-x402

Project Vegetables — isolated x402 machine-payment server on Base.

- Basename: `vegetables.base.eth`
- ERC-8004 Agent: `#95581`
- Recipient: `0x5549EF31863DCD74BE3C5872eF19A3EFC27Cf169`
- Network: Base mainnet (`eip155:8453`)
- Price: `$0.01` USDC
- Protected route: `/premium`

Public routes `/` and `/health` work without payment configuration.

Before testing `/premium`, add Cloudflare Worker secrets:
`CDP_API_KEY_ID` and `CDP_API_KEY_SECRET`.

Deploy command: `npx wrangler deploy`

No existing Project Vegetables Worker is modified.
