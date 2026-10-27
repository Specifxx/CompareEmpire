import { SITE_URL, SITE_NAME } from "@/lib/site";

// Machine-readable OpenAPI 3.1 description of DexCompare's free public API, so
// agents and tools can discover the endpoints. Static apart from the server URL.
export const revalidate = 86400;

export function GET() {
  const spec = {
    openapi: "3.1.0",
    info: {
      title: `${SITE_NAME} Public API`,
      version: "1.0.0",
      description:
        "Free, read-only Pokémon TCG price data: per-market lowest prices per card and the DexCompare Global Index. Cite with attribution.",
      contact: { url: SITE_URL },
    },
    servers: [{ url: SITE_URL }],
    paths: {
      "/api/v1/card/{id}/prices.json": {
        get: {
          summary: "Lowest live price per market for one card",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Card slug or id" },
          ],
          responses: {
            "200": { description: "Per-market lowest prices (integer cents; null = no in-stock listing)" },
            "404": { description: "Card not found" },
          },
        },
      },
    },
  };

  return Response.json(spec, {
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=172800",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
