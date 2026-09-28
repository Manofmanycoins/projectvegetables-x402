import { Hono } from "hono";
import { paymentMiddlewareFromConfig } from "@x402/hono";
import { HTTPFacilitatorClient } from "@x402/core/server";

const app = new Hono();

const AGENT = {
  name: "Project Vegetables",
  basename: "vegetables.base.eth",
  agentId: 95581,
  payTo: "0x5549EF31863DCD74BE3C5872eF19A3EFC27Cf169",
  network: "eip155:8453",
  price: "$0.01",
  facilitatorUrl: "https://x402.org/facilitator"
};

const routes = {
  "GET /premium": {
    accepts: {
      scheme: "exact",
      price: AGENT.price,
      network: AGENT.network,
      payTo: AGENT.payTo
    },
    description:
      "Paid Project Vegetables machine-readable resource",
    mimeType: "application/json"
  }
};

const facilitator = new HTTPFacilitatorClient({
  url: AGENT.facilitatorUrl
});

/*
 * Important for Cloudflare Workers:
 * false = do NOT sync facilitator capabilities at startup.
 *
 * The facilitator is contacted only when the paid flow actually needs it.
 */
app.use(
  paymentMiddlewareFromConfig(
    routes,
    facilitator,
    undefined,
    undefined,
    undefined,
    false
  )
);

app.get("/", (c) =>
  c.json({
    service: `${AGENT.name} x402 Server`,
    packageType: "Basename Club Agentic Package",
    basename: AGENT.basename,
    erc8004Agent: AGENT.agentId,
    network: AGENT.network,
    paymentAsset: "USDC",
    price: AGENT.price,
    paidEndpoint: "/premium",
    recipient: AGENT.payTo,
    facilitator: AGENT.facilitatorUrl,
    status: "ready"
  })
);

app.get("/health", (c) =>
  c.json({
    ok: true,
    service: "projectvegetables-x402",
    basename: AGENT.basename
  })
);

app.get("/package", (c) =>
  c.json({
    name: AGENT.name,
    basename: AGENT.basename,
    erc8004Agent: AGENT.agentId,
    capabilities: {
      machinePayments: true,
      protocol: "x402",
      network: AGENT.network,
      paymentAsset: "USDC",
      paidResource: "/premium"
    },
    payment: {
      price: AGENT.price,
      recipient: AGENT.payTo
    }
  })
);

app.get("/premium", (c) =>
  c.json({
    paid: true,
    provider: AGENT.name,
    basename: AGENT.basename,
    erc8004Agent: AGENT.agentId,
    resource: {
      type: "agentic-package-proof",
      message:
        "Payment verified. Project Vegetables released this x402-protected resource."
    },
    timestamp: new Date().toISOString()
  })
);

app.notFound((c) =>
  c.json(
    {
      error: "Not found",
      endpoints: ["/", "/health", "/package", "/premium"]
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
