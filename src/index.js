import { Hono } from "hono";
import { paymentMiddleware } from "@x402/hono";
import {
  x402ResourceServer,
  HTTPFacilitatorClient
} from "@x402/core/server";
import { registerExactEvmScheme } from "@x402/evm/exact/server";
import { createFacilitatorConfig } from "@coinbase/x402";

const app = new Hono();

const VEGETABLES = {
  name: "Project Vegetables",
  basename: "vegetables.base.eth",
  agentId: 95581,
  payTo: "0x5549EF31863DCD74BE3C5872eF19A3EFC27Cf169"
};

const NETWORK = "eip155:8453";
const PRICE = "$0.01";

let cachedServer;

function getPaymentServer(env) {
  if (cachedServer) {
    return cachedServer;
  }

  if (!env.CDP_API_KEY_ID || !env.CDP_API_KEY_SECRET) {
    throw new Error("Missing CDP facilitator credentials");
  }

  const facilitator = createFacilitatorConfig(
    env.CDP_API_KEY_ID,
    env.CDP_API_KEY_SECRET
  );

  const facilitatorClient =
    new HTTPFacilitatorClient(facilitator);

  const server =
    new x402ResourceServer(facilitatorClient);

  registerExactEvmScheme(server);

  cachedServer = server;

  return server;
}


// -----------------------------------------------------
// PUBLIC STATUS
// -----------------------------------------------------

app.get("/", (c) => {
  return c.json({
    service: "Project Vegetables x402 Server",
    basename: VEGETABLES.basename,
    erc8004Agent: VEGETABLES.agentId,
    network: NETWORK,
    paymentAsset: "USDC",
    price: PRICE,
    paidEndpoint: "/premium",
    status: "ready"
  });
});


// -----------------------------------------------------
// HEALTH CHECK
// -----------------------------------------------------

app.get("/health", (c) => {
  return c.json({
    ok: true,
    service: "projectvegetables-x402"
  });
});


// -----------------------------------------------------
// x402 PAYMENT GATE
// -----------------------------------------------------

app.use("/premium", async (c, next) => {
  let server;

  try {
    server = getPaymentServer(c.env);
  } catch (error) {
    return c.json(
      {
        error: "x402 facilitator is not configured",
        detail: error.message
      },
      503
    );
  }

  const middleware = paymentMiddleware(
    {
      "GET /premium": {
        accepts: [
          {
            scheme: "exact",
            price: PRICE,
            network: NETWORK,
            payTo: VEGETABLES.payTo
          }
        ],
        description:
          "Paid Project Vegetables machine-readable proof",
        mimeType: "application/json"
      }
    },
    server
  );

  return middleware(c, next);
});


// -----------------------------------------------------
// PAID RESOURCE
// -----------------------------------------------------

app.get("/premium", (c) => {
  return c.json({
    paid: true,
    provider: VEGETABLES.name,
    basename: VEGETABLES.basename,
    erc8004Agent: VEGETABLES.agentId,
    message:
      "Payment verified. Project Vegetables released this x402-protected resource.",
    timestamp: new Date().toISOString()
  });
});


// -----------------------------------------------------
// FALLBACKS
// -----------------------------------------------------

app.notFound((c) => {
  return c.json(
    {
      error: "Not found",
      endpoints: [
        "/",
        "/health",
        "/premium"
      ]
    },
    404
  );
});

app.onError((error, c) => {
  return c.json(
    {
      error: "Internal server error",
      detail: error.message
    },
    500
  );
});

export default app;
