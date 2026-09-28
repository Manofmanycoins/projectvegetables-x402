import { Hono } from "hono";
import { x402ResourceServer } from "@x402/core/server";
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

app.get("/", (c) =>
  c.json({
    service: "Project Vegetables x402 Diagnostic",
    basename: VEGETABLES.basename,
    erc8004Agent: VEGETABLES.agentId,
    network: NETWORK,
    price: PRICE,
    status: "diagnostic"
  })
);

app.get("/health", (c) =>
  c.json({
    ok: true,
    service: "projectvegetables-x402"
  })
);

app.get("/crypto-test", (c) => {
  const result = {
    globalCryptoExists: typeof globalThis.crypto !== "undefined",
    globalGetRandomValuesType:
      typeof globalThis.crypto?.getRandomValues,
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

app.get("/facilitator-test", async (c) => {
  try {
    console.log("Creating CDP facilitator client...");

    const facilitator = createCdpFacilitatorClient();

    console.log("CDP facilitator client created.");

    const server = new x402ResourceServer(facilitator).register(
      NETWORK,
      new ExactEvmScheme()
    );

    console.log("x402 resource server created.");

    await server.initialize();

    console.log("x402 resource server initialized.");

    return c.json({
      ok: true,
      facilitatorCreated: true,
      resourceServerCreated: true,
      initialized: true,
      network: NETWORK
    });
  } catch (error) {
    console.error("Facilitator diagnostic failed:", error);

    return c.json(
      {
        ok: false,
        errorName: error?.name ?? null,
        errorMessage: error?.message ?? String(error),
        causeName: error?.cause?.name ?? null,
        causeMessage:
          error?.cause?.message ??
          (error?.cause ? String(error.cause) : null),
        stack: error?.stack ?? null
      },
      500
    );
  }
});

app.notFound((c) =>
  c.json(
    {
      error: "Not found",
      endpoints: [
        "/",
        "/health",
        "/crypto-test",
        "/facilitator-test"
      ]
    },
    404
  )
);

app.onError((error, c) => {
  console.error(
    "Project Vegetables diagnostic error:",
    error
  );

  return c.json(
    {
      error: "Internal server error",
      detail: error.message
    },
    500
  );
});

export default app;
