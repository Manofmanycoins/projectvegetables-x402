import { Hono } from "hono";
import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { createCdpFacilitatorClient } from "@coinbase/cdp-sdk/x402";

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

function getPaymentServer() {
  if (cachedServer) return cachedServer;

  const facilitator = createCdpFacilitatorClient();

  const server = new x402ResourceServer(facilitator).register(
    NETWORK,
    new ExactEvmScheme()
  );

  cachedServer = server;
  return server;
}

/*
 * Temporary Cloudflare crypto diagnostic.
 * This does NOT expose secrets and does NOT make a payment.
 */
app.get("/crypto-test", (c) => {
  const result = {
    globalCryptoExists: typeof globalThis.crypto !== "undefined",
    globalGetRandomValuesType:
      typeof globalThis.crypto?.getRandomValues,
    cryptoExists: typeof crypto !== "undefined",
    cryptoGetRandomValuesType:
      typeof crypto?.getRandomValues,
    randomUUIDType:
      typeof globalThis.crypto?.randomUUID
  };

  try {
    const bytes = new Uint8Array(8);
    globalThis.crypto.getRandomValues(bytes);

    result.getRandomValuesWorks = true;
    result.randomByteLength = bytes.length;
  } catch (error) {
    result.getRandomValuesWorks = false;
    result.getRandomValuesError = String(error);
  }

  return c.json(result);
});

app.get("/", (c) =>
  c.json({
    service: "Project Vegetables x402 Server",
    basename: VEGETABLES.basename,
    erc8004Agent: VEGETABLES.agentId,
    network: NETWORK,
    paymentAsset: "USDC",
    price: PRICE,
    paidEndpoint: "/premium",
    recipient: VEGETABLES.payTo,
    status: "ready"
  })
);

app.get("/health", (c) =>
  c.json({
    ok: true,
    service: "projectvegetables-x402"
  })
);

app.use(
  paymentMiddleware(
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
    getPaymentServer()
  )
);

app.get("/premium", (c) =>
  c.json({
    paid: true,
    provider: VEGETABLES.name,
    basename: VEGETABLES.basename,
    erc8004Agent: VEGETABLES.agentId,
    message:
      "Payment verified. Project Vegetables released this x402-protected resource.",
    timestamp: new Date().toISOString()
  })
);

app.notFound((c) =>
  c.json(
    {
      error: "Not found",
      endpoints: ["/", "/health", "/crypto-test", "/premium"]
    },
    404
  )
);

app.onError((error, c) => {
  console.error("Project Vegetables x402 error:", error);

  return c.json(
    {
      error: "Internal server error",
      detail: error.message
    },
    500
  );
});

export default app;
