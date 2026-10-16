import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/server";
import { hashToken } from "@/lib/apiTokens";
import { summarize } from "@/lib/prismPrompt";

// Serveur MCP distant (transport "streamable HTTP", réponses JSON) pour brancher
// son propre Claude sur son journal. Authentifié par un jeton personnel
// (Authorization: Bearer mtb_…). Le client service_role bypass la RLS, donc
// CHAQUE requête est filtrée explicitement sur le user_id du jeton.
export const dynamic = "force-dynamic";

const PROTOCOL_VERSION = "2025-06-18";
const SUPPORTED_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];
const TRADE_COLUMNS = "id, date, symbol, dir, session, grade, r, pnl, setup, tags, why, plan, account_id, created_at";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const GRADES = ["A+", "A", "B", "C", "F"];

const dateProp = (description) => ({ type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$", description });

const TOOLS = [
  {
    name: "list_trades",
    description: "List trades from the user's MyTradeBook journal, newest first. Notes are in the 'why' field.",
    inputSchema: {
      type: "object",
      properties: {
        from: dateProp("Start date (inclusive), YYYY-MM-DD"),
        to: dateProp("End date (inclusive), YYYY-MM-DD"),
        setup: { type: "string", description: "Filter by setup name (case-insensitive, partial match)" },
        symbol: { type: "string", description: "Filter by symbol, e.g. MNQ" },
        limit: { type: "integer", minimum: 1, maximum: 500, description: "Max trades (default 100)" },
      },
    },
  },
  {
    name: "get_stats",
    description: "Aggregated performance stats (net P&L, win rate, breakdown by setup, session, weekday, tag, grade, plan adherence) over an optional date range.",
    inputSchema: {
      type: "object",
      properties: { from: dateProp("Start date (inclusive)"), to: dateProp("End date (inclusive)"), setup: { type: "string" } },
    },
  },
  {
    name: "create_trade",
    description: "Log a new trade in the journal.",
    inputSchema: {
      type: "object",
      required: ["dir"],
      properties: {
        date: dateProp("Trade date, YYYY-MM-DD (default today)"),
        symbol: { type: "string", description: "Instrument, default MNQ" },
        dir: { type: "string", enum: ["long", "short"] },
        session: { type: "string", description: "e.g. Asia, London, NY AM, NY PM" },
        setup: { type: "string" },
        grade: { type: "string", enum: GRADES },
        r: { type: "number", description: "Result in R multiples" },
        pnl: { type: "number", description: "Result in dollars" },
        tags: { type: "array", items: { type: "string" } },
        notes: { type: "string", description: "Free-text notes / why" },
        plan: { type: "boolean", description: "Did the trade follow the plan? (default true)" },
        account_id: { type: "string", description: "Optional account uuid (must belong to the user)" },
      },
    },
  },
  {
    name: "update_trade_notes",
    description: "Replace or append to the notes of an existing trade (use list_trades to find its id).",
    inputSchema: {
      type: "object",
      required: ["id", "notes"],
      properties: {
        id: { type: "string", description: "Trade uuid" },
        notes: { type: "string" },
        mode: { type: "string", enum: ["replace", "append"], description: "Default append" },
      },
    },
  },
];

class ToolError extends Error {}

const str = (value, max = 200) => (value == null ? undefined : String(value).trim().slice(0, max) || undefined);
function optDate(value, field) {
  if (value == null || value === "") return undefined;
  if (typeof value !== "string" || !DATE_RE.test(value) || Number.isNaN(Date.parse(value))) throw new ToolError(`${field} must be YYYY-MM-DD`);
  return value;
}
function optNumber(value, field) {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || Math.abs(n) > 1e7) throw new ToolError(`${field} must be a number`);
  return n;
}
const isUuid = (value) => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const escapeLike = (value) => value.replace(/[\\%_]/g, (c) => `\\${c}`);

async function queryTrades(db, userId, args, defaultLimit, maxLimit) {
  const from = optDate(args.from, "from");
  const to = optDate(args.to, "to");
  const setup = str(args.setup, 100);
  const symbol = str(args.symbol, 20);
  const limit = Math.min(Math.max(parseInt(args.limit, 10) || defaultLimit, 1), maxLimit);
  let query = db.from("trades").select(TRADE_COLUMNS).eq("user_id", userId);
  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);
  if (setup) query = query.ilike("setup", `%${escapeLike(setup)}%`);
  if (symbol) query = query.ilike("symbol", escapeLike(symbol));
  const { data, error } = await query.order("date", { ascending: false }).order("created_at", { ascending: false }).limit(limit);
  if (error) throw new ToolError(error.message);
  return data || [];
}

const HANDLERS = {
  async list_trades(db, userId, args) {
    const trades = await queryTrades(db, userId, args, 100, 500);
    return { count: trades.length, trades };
  },
  async get_stats(db, userId, args) {
    return summarize(await queryTrades(db, userId, { ...args, limit: 5000 }, 5000, 5000));
  },
  async create_trade(db, userId, args) {
    if (!["long", "short"].includes(args.dir)) throw new ToolError("dir must be 'long' or 'short'");
    if (args.grade != null && !GRADES.includes(args.grade)) throw new ToolError(`grade must be one of ${GRADES.join(", ")}`);
    if (args.tags != null && (!Array.isArray(args.tags) || args.tags.length > 30)) throw new ToolError("tags must be an array of at most 30 strings");
    const row = {
      user_id: userId,
      dir: args.dir,
      date: optDate(args.date, "date"),
      symbol: str(args.symbol, 20)?.toUpperCase(),
      session: str(args.session, 40),
      setup: str(args.setup, 100),
      grade: args.grade ?? undefined,
      r: optNumber(args.r, "r"),
      pnl: optNumber(args.pnl, "pnl"),
      tags: args.tags?.map((tag) => str(tag, 40)).filter(Boolean),
      why: str(args.notes, 5000),
      plan: typeof args.plan === "boolean" ? args.plan : undefined,
    };
    if (args.account_id != null && args.account_id !== "") {
      if (!isUuid(args.account_id)) throw new ToolError("account_id must be a uuid");
      const { data: account } = await db.from("accounts").select("id").eq("id", args.account_id).eq("user_id", userId).maybeSingle();
      if (!account) throw new ToolError("account not found");
      row.account_id = account.id;
    }
    Object.keys(row).forEach((key) => row[key] === undefined && delete row[key]);
    const { data, error } = await db.from("trades").insert(row).select(TRADE_COLUMNS).single();
    if (error) throw new ToolError(error.message);
    return { created: data };
  },
  async update_trade_notes(db, userId, args) {
    if (!isUuid(args.id)) throw new ToolError("id must be a trade uuid");
    if (typeof args.notes !== "string" || !args.notes.trim()) throw new ToolError("notes is required");
    const mode = args.mode === "replace" ? "replace" : "append";
    const { data: trade } = await db.from("trades").select("id, why").eq("id", args.id).eq("user_id", userId).maybeSingle();
    if (!trade) throw new ToolError("trade not found");
    const why = (mode === "append" && trade.why ? `${trade.why}\n\n${args.notes.trim()}` : args.notes.trim()).slice(0, 10000);
    const { data, error } = await db.from("trades").update({ why }).eq("id", trade.id).eq("user_id", userId).select(TRADE_COLUMNS).single();
    if (error) throw new ToolError(error.message);
    return { updated: data };
  },
};

const rpcResult = (id, result) => ({ jsonrpc: "2.0", id, result });
const rpcError = (id, code, message) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

async function authenticate(request) {
  const match = /^Bearer\s+(mtb_[A-Za-z0-9_-]{20,})$/.exec(request.headers.get("authorization") || "");
  if (!match) return null;
  const db = createAdminSupabase();
  const { data } = await db.from("api_tokens").select("id, user_id").eq("token_hash", hashToken(match[1])).maybeSingle();
  if (!data) return null;
  await db.from("api_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
  return { db, userId: data.user_id };
}

async function handleMessage(message, auth) {
  if (!message || message.jsonrpc !== "2.0" || typeof message.method !== "string") return rpcError(message?.id, -32600, "Invalid Request");
  const { id, method, params = {} } = message;
  if (id === undefined) return null; // notification (ex. notifications/initialized)

  switch (method) {
    case "initialize":
      return rpcResult(id, {
        protocolVersion: SUPPORTED_VERSIONS.includes(params.protocolVersion) ? params.protocolVersion : PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "mytradebook", version: "1.0.0" },
        instructions: "MyTradeBook trading journal. Use list_trades / get_stats to analyse, create_trade to log a trade, update_trade_notes to annotate one. Dates are YYYY-MM-DD.",
      });
    case "ping":
      return rpcResult(id, {});
    case "tools/list":
      return rpcResult(id, { tools: TOOLS });
    case "tools/call": {
      const handler = HANDLERS[params.name];
      if (!handler) return rpcError(id, -32602, `Unknown tool: ${params.name}`);
      const args = params.arguments && typeof params.arguments === "object" ? params.arguments : {};
      try {
        const result = await handler(auth.db, auth.userId, args);
        return rpcResult(id, { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], structuredContent: result, isError: false });
      } catch (error) {
        if (!(error instanceof ToolError)) console.error("[mcp]", error);
        return rpcResult(id, { content: [{ type: "text", text: error instanceof ToolError ? error.message : "Internal error" }], isError: true });
      }
    }
    default:
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Mcp-Session-Id, Mcp-Protocol-Version",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

export async function POST(request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json(rpcError(null, -32603, "Connector not configured"), { status: 503, headers: CORS });
  const auth = await authenticate(request);
  if (!auth) {
    return NextResponse.json(rpcError(null, -32001, "Invalid or missing token. Create one in MyTradeBook → Settings → Connectors."), {
      status: 401, headers: { ...CORS, "WWW-Authenticate": 'Bearer realm="mytradebook"' },
    });
  }
  let body;
  try { body = await request.json(); } catch { return NextResponse.json(rpcError(null, -32700, "Parse error"), { status: 400, headers: CORS }); }

  const batch = Array.isArray(body);
  const messages = batch ? body.slice(0, 20) : [body];
  const replies = (await Promise.all(messages.map((message) => handleMessage(message, auth)))).filter(Boolean);
  if (!replies.length) return new NextResponse(null, { status: 202, headers: CORS });
  return NextResponse.json(batch ? replies : replies[0], { headers: CORS });
}

// Pas de flux SSE serveur → client : on ne répond qu'aux POST, en JSON.
export function GET() {
  return new NextResponse(null, { status: 405, headers: { ...CORS, Allow: "POST" } });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
