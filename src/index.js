import { Hono } from "hono";
import { paymentMiddleware } from "@x402/hono";
import {
  x402ResourceServer,
  HTTPFacilitatorClient
} from "@x402/core/server";
import { registerExactEvmScheme } from "@x402/evm/exact/server";

const app = new Hono();

const AGENT = {
  name: "Project Vegetables",
  basename: "vegetables.base.eth",
  agentId: 95581,
  payTo: "0x5549EF31863DCD74BE3C5872eF19A3EFC27Cf169",

  // Base Sepolia testnet
  network: "eip155:84532",
  price: "$0.01",

  facilitatorUrl: "https://x402.org/facilitator"
};

const facilitatorClient = new HTTPFacilitatorClient({
  url: AGENT.facilitatorUrl
});

const server = new x402ResourceServer(facilitatorClient);

/*
 * Current x402 v2 helper.
 * Registers the EVM exact-payment implementation.
 */
registerExactEvmScheme(server);

/*
 * Public information
 */
app.get("/", (c) =>
  c.json({
    service: `${AGENT.name} x402 Server`,
    basename: AGENT.basename,
    erc8004Agent: AGENT.agentId,
    environment: "testnet",
    network: AGENT.network,
    networkName: "Base Sepolia",
    paymentAsset: "USDC",
    price: AGENT.price,
    paidEndpoint: "/premium",
    recipient: AGENT.payTo,
    status: "ready"
  })
);

app.get("/health", (c) =>
  c.json({
    ok: true,
    basename: AGENT.basename,
    network: AGENT.network
  })
);

/*
 * Protect only /premium.
 */
app.use(
  paymentMiddleware(
    {
      "/premium": {
        accepts: [
          {
            scheme: "exact",
            price: AGENT.price,
            network: AGENT.network,
            payTo: AGENT.payTo
          }
        ],
        description:
          "Project Vegetables paid machine-readable resource",
        mimeType: "application/json"
      }
    },
    server
  )
);

/*
 * This route is reached only after valid payment.
 */
app.get("/premium", (c) =>
  c.json({
    paid: true,
    provider: AGENT.name,
    basename: AGENT.basename,
    erc8004Agent: AGENT.agentId,
    network: AGENT.network,
    message:
      "Payment verified. Project Vegetables released this x402-protected resource.",
    timestamp: new Date().toISOString()
  })
);

app.notFound((c) =>
  c.json(
    {
      error: "Not found",
      endpoints: ["/", "/health", "/premium"]
    },
    404
  )
);

app.onError((error, c) => {
  console.error("Project Vegetables x402 error:", error);

  return c.json(
    {
      error: "Internal server error",
      detail: error?.message ?? String(error)
    },
    500
  );
});

export default app;
