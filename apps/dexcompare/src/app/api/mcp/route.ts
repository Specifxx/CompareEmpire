import { getGlobalIndex, scopeFromParam } from "@/lib/market-index";
import { prisma } from "@/lib/db";
import { cardHref } from "@/lib/card-url";
import { SITE_URL, SITE_NAME } from "@/lib/site";

// Minimal Model Context Protocol server (beta) over Streamable HTTP: MCP clients
// (Claude Desktop, Cursor, agent frameworks) POST JSON-RPC 2.0 messages here to read
// DexCompare price data as tools. Non-streaming request/response only (each POST
// returns a single JSON-RPC response) — enough for these read-only tools.
export const dynamic = "force-dynamic";

const PROTOCOL_VERSION = "2024-11-05";

const TOOLS = [
  {
    name: "get_index",
    description:
      "Get the DexCompare Global Index (a search-weighted daily market index for Pokémon TCG singles): level (base 100), deltas, breadth and tracked-card stats. Optional scope all|recent.",
    inputSchema: {
      type: "object",
      properties: { scope: { type: "string", enum: ["all", "recent"] } },
      additionalProperties: false,
    },
  },
  {
    name: "get_card_prices",
    description: "Get the lowest live in-stock price per market (AU/NZ/US/GB) for a Pokémon card, by slug or id.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "Card slug or id" } },
      required: ["id"],
      additionalProperties: false,
    },
  },
];

const round2 = (n: number | null): number | null => (n == null ? null : Number(n.toFixed(2)));

async function callTool(name: string, args: Record<string, unknown> | undefined): Promise<unknown> {
  if (name === "get_index") {
    const scopeParam = String(args?.scope ?? "").toLowerCase();
    const scope = scopeParam === "recent" ? scopeFromParam("recent") : scopeFromParam("all");
    const idx = await getGlobalIndex(scope).catch(() => null);
    if (!idx || idx.points.length === 0) return { error: "index_unavailable" };

    const pts = idx.points;
    const first = pts[0];
    const last = pts[pts.length - 1];
    // Base-100 normalisation on the first tracked day (mirrors the /market page).
    const base = first.cents || 1;
    const level = (last.cents / base) * 100;
    const pctOver = (a: number, b: number) => (b ? ((a - b) / b) * 100 : null);
    const at = (daysBack: number) => pts[Math.max(0, pts.length - 1 - daysBack)];

    return {
      name: `${SITE_NAME} Global Index`,
      base: 100,
      startDay: first.day.toISOString().slice(0, 10),
      latestDay: last.day.toISOString().slice(0, 10),
      level: Number(level.toFixed(2)),
      change: {
        d1: round2(pctOver(last.cents, at(1).cents)),
        d7: round2(pctOver(last.cents, at(7).cents)),
        d30: round2(pctOver(last.cents, at(30).cents)),
        sinceStart: round2(pctOver(last.cents, first.cents)),
      },
      breadth: { advancing: idx.risers, declining: idx.fallers, unchanged: idx.flat },
      trackedCards: idx.trackedCards,
      source: `${SITE_URL}/market`,
    };
  }
  if (name === "get_card_prices") {
    const id = String(args?.id ?? "");
    if (!id) return { error: "missing_id" };
    const card = await prisma.card
      .findFirst({
        where: { OR: [{ slug: id }, { id }] },
        select: {
          id: true, slug: true, name: true, setName: true, setCode: true, collectorNumber: true,
          lowestPriceCents: true, lowestPriceCentsNz: true, lowestPriceCentsUs: true, lowestPriceCentsGb: true,
        },
      })
      .catch(() => null);
    if (!card) return { error: "not_found", id };
    return {
      card: { name: card.name, set: card.setName, setCode: card.setCode, collectorNumber: card.collectorNumber, url: `${SITE_URL}${cardHref(card)}` },
      prices: {
        AU: { lowestCents: card.lowestPriceCents, currency: "AUD" },
        NZ: { lowestCents: card.lowestPriceCentsNz, currency: "NZD" },
        US: { lowestCents: card.lowestPriceCentsUs, currency: "USD" },
        GB: { lowestCents: card.lowestPriceCentsGb, currency: "GBP" },
      },
    };
  }
  throw new Error(`unknown tool: ${name}`);
}

const ok = (id: unknown, result: unknown) => Response.json({ jsonrpc: "2.0", id, result });
const err = (id: unknown, code: number, message: string) =>
  Response.json({ jsonrpc: "2.0", id, error: { code, message } });

export async function POST(req: Request) {
  let msg: any;
  try {
    msg = await req.json();
  } catch {
    return err(null, -32700, "Parse error");
  }
  const { id, method, params } = msg ?? {};
  // JSON-RPC notifications (no id, e.g. notifications/initialized) get no response.
  if (id === undefined || id === null) return new Response(null, { status: 202 });

  try {
    if (method === "initialize")
      return ok(id, { protocolVersion: PROTOCOL_VERSION, capabilities: { tools: { listChanged: false } }, serverInfo: { name: "dexcompare", version: "1.0.0" } });
    if (method === "ping") return ok(id, {});
    if (method === "tools/list") return ok(id, { tools: TOOLS });
    if (method === "tools/call") {
      const result = await callTool(params?.name, params?.arguments);
      const isError = !!(result && typeof result === "object" && "error" in (result as object));
      return ok(id, { content: [{ type: "text", text: JSON.stringify(result) }], isError });
    }
    return err(id, -32601, `Method not found: ${method}`);
  } catch (e) {
    return err(id, -32603, e instanceof Error ? e.message : "Internal error");
  }
}

// A plain GET describes the server (handy for humans / discovery).
export function GET() {
  return Response.json(
    {
      name: "dexcompare-mcp",
      version: "1.0.0",
      transport: "Streamable HTTP — POST JSON-RPC 2.0 (initialize, tools/list, tools/call)",
      tools: TOOLS.map((t) => t.name),
      docs: `${SITE_URL}/api/v1/openapi.json`,
    },
    { headers: { "X-Robots-Tag": "noindex" } }
  );
}
