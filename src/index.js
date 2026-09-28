import { Hono } from "hono";
import { paymentMiddleware } from "@x402/hono";
import {
  x402ResourceServer,
  HTTPFacilitatorClient
} from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";

const app = new Hono();

/*
 * ============================================================
 * BASENAME CLUB — AGENTIC PACKAGE CONFIG
 * ============================================================
 */

const AGENT = {
  name: "Project Vegetables",
  basename: "vegetables.base.eth",
  agentId: 95581,

  payTo: "0x5549EF31863DCD74BE3C5872eF19A3EFC27Cf169",

  network: "eip155:8453",
  price: "$0.01",

  facilitatorUrl: "https://x402.org/facilitator"
};

/*
 * ============================================================
 * x402 PAYMENT ENGINE
 * ============================================================
 *
 * Remote facilitator over ordinary HTTP.
 *
 * Important:
 * We register the EVM "exact" server scheme ourselves.
 * We do NOT call server.initialize() here.
 */

const facilitator = new HTTPFacilitatorClient({
  url: AGENT.facilitatorUrl
});

const paymentServer = new x402ResourceServer(facilitator);

paymentServer.register(
  AGENT.network,
  new ExactEvmScheme()
);

/*
 * ============================================================
 * PUBLIC ENDPOINTS
 * ============================================================
 */

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
      scheme: "exact",
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

/*
 * ============================================================
 * PROTECTED x402 RESOURCE
 * ============================================================
 */

app.use(
  paymentMiddleware(
    {
      "GET /premium": {
        accepts: [
          {
            scheme: "exact",
            price: AGENT.price,
            network: AGENT.network,
            payTo: AGENT.payTo
          }
        ],

        description:
          "Paid Project Vegetables machine-readable resource",

        mimeType: "application/json"
      }
    },

    paymentServer
  )
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
        "Payment verified. Project Vegetables released this x402-protected resource.",

      capabilities: [
        "Basename identity",
        "ERC-8004 agent identity",
        "Machine-readable metadata",
        "x402 machine payments"
      ]
    },

    timestamp: new Date().toISOString()
  })
);

/*
 * ============================================================
 * FALLBACKS
 * ============================================================
 */

app.notFound((c) =>
  c.json(
    {
      error: "Not found",
      endpoints: [
        "/",
        "/health",
        "/package",
        "/premium"
      ]
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
