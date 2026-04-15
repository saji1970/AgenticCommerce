/**
 * MCP Streamable HTTP transport client (JSON-RPC 2.0 + session + protocol version).
 * @see https://modelcontextprotocol.io/specification/2025-06-18/basic/transports
 */

import axios, { AxiosRequestConfig } from 'axios';

const DEFAULT_PROTOCOL = '2025-06-18';

export interface McpStreamableConfig {
  /** Full MCP endpoint URL (e.g. https://host/mcp) */
  baseUrl: string;
  /** Bearer token for MCP server (e.g. MCP_API_TOKEN) — never expose to mobile APK; use backend proxy. */
  apiToken?: string;
  protocolVersion?: string;
  timeoutMs?: number;
}

function buildHeaders(
  protocolVersion: string,
  sessionId: string | undefined,
  apiToken: string | undefined
): Record<string, string> {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    'MCP-Protocol-Version': protocolVersion,
  };
  if (sessionId) {
    h['Mcp-Session-Id'] = sessionId;
  }
  if (apiToken) {
    h.Authorization = `Bearer ${apiToken}`;
  }
  return h;
}

function parseJsonRpcFromSseOrJson(
  body: string,
  expectId: number | string
): { id?: number | string; result?: unknown; error?: { message?: string; code?: number } } {
  const trimmed = body.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as {
        id?: number | string;
        result?: unknown;
        error?: { message?: string; code?: number };
        jsonrpc?: string;
      };
      if (
        parsed?.jsonrpc &&
        (parsed.id === expectId || String(parsed.id) === String(expectId))
      ) {
        return parsed;
      }
    } catch {
      /* fall through to SSE */
    }
  }
  const lines = body.split(/\r?\n/);
  for (const line of lines) {
    if (!line.startsWith('data:')) continue;
    const payload = line.slice(5).trim();
    if (!payload || payload === '[DONE]') continue;
    try {
      const msg = JSON.parse(payload) as {
        id?: number | string;
        result?: unknown;
        error?: { message?: string; code?: number };
        jsonrpc?: string;
      };
      if (msg && (msg.id === expectId || String(msg.id) === String(expectId))) {
        return msg;
      }
    } catch {
      /* next line */
    }
  }
  throw new Error('Could not parse MCP JSON-RPC response from body');
}

async function postMcp(
  url: string,
  body: Record<string, unknown>,
  headers: Record<string, string>,
  timeoutMs: number
): Promise<{ status: number; headers: Record<string, string>; dataText: string }> {
  const cfg: AxiosRequestConfig = {
    url,
    method: 'POST',
    headers,
    data: body,
    timeout: timeoutMs,
    validateStatus: () => true,
    responseType: 'text',
    transformResponse: [(d) => d],
  };
  const res = await axios(cfg);
  const rawHeaders: Record<string, string> = {};
  if (res.headers && typeof res.headers === 'object') {
    for (const [k, v] of Object.entries(res.headers)) {
      if (typeof v === 'string') rawHeaders[k.toLowerCase()] = v;
      else if (Array.isArray(v) && v[0]) rawHeaders[k.toLowerCase()] = v[0];
    }
  }
  return {
    status: res.status,
    headers: rawHeaders,
    dataText: typeof res.data === 'string' ? res.data : String(res.data ?? ''),
  };
}

/**
 * Full handshake + tools/call in one shot (new session per request; safe for stateless API workers).
 */
export async function callMcpTool(
  config: McpStreamableConfig,
  toolName: string,
  toolArguments: Record<string, unknown>
): Promise<unknown> {
  const { baseUrl, apiToken, protocolVersion = DEFAULT_PROTOCOL, timeoutMs = 60000 } = config;
  if (!baseUrl) {
    throw new Error('cardMCPServerURL is not configured (CARD_MCP_SERVER_URL or MCP_HTTP_URL)');
  }

  const url = baseUrl.replace(/\/$/, '');
  let idCounter = 1;
  const nextId = () => idCounter++;

  // 1) initialize
  const initId = nextId();
  const initBody = {
    jsonrpc: '2.0',
    id: initId,
    method: 'initialize',
    params: {
      protocolVersion,
      capabilities: {},
      clientInfo: { name: 'agentic-commerce-backend', version: '1.0.0' },
    },
  };

  const initRes = await postMcp(
    url,
    initBody,
    buildHeaders(protocolVersion, undefined, apiToken),
    timeoutMs
  );

  if (initRes.status >= 400) {
    throw new Error(`MCP initialize failed: HTTP ${initRes.status} ${initRes.dataText.slice(0, 500)}`);
  }

  const sessionId =
    initRes.headers['mcp-session-id'] ||
    initRes.headers['Mcp-Session-Id'] ||
    (() => {
      const entries = Object.entries(initRes.headers);
      const found = entries.find(([k]) => k.toLowerCase() === 'mcp-session-id');
      return found ? found[1] : undefined;
    })();

  let initMsg: ReturnType<typeof parseJsonRpcFromSseOrJson>;
  try {
    initMsg = parseJsonRpcFromSseOrJson(initRes.dataText, initId);
  } catch (e) {
    throw new Error(`MCP initialize parse error: ${(e as Error).message}`);
  }

  if (initMsg.error) {
    throw new Error(initMsg.error.message || 'MCP initialize error');
  }
  if (initMsg.result === undefined) {
    throw new Error('MCP initialize: missing result');
  }

  const negotiated =
    (initMsg.result as { protocolVersion?: string })?.protocolVersion || protocolVersion;

  // 2) notifications/initialized
  const notifBody = {
    jsonrpc: '2.0',
    method: 'notifications/initialized',
  };
  const notifRes = await postMcp(
    url,
    notifBody,
    buildHeaders(negotiated, sessionId, apiToken),
    timeoutMs
  );
  if (notifRes.status !== 202 && notifRes.status !== 200) {
    console.warn('[MCP] initialized notification unexpected status:', notifRes.status, notifRes.dataText.slice(0, 200));
  }

  // 3) tools/call
  const callId = nextId();
  const callBody = {
    jsonrpc: '2.0',
    id: callId,
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: toolArguments,
    },
  };

  const callRes = await postMcp(
    url,
    callBody,
    buildHeaders(negotiated, sessionId, apiToken),
    timeoutMs
  );

  if (callRes.status >= 400) {
    throw new Error(`MCP tools/call failed: HTTP ${callRes.status} ${callRes.dataText.slice(0, 800)}`);
  }

  let callMsg: ReturnType<typeof parseJsonRpcFromSseOrJson>;
  try {
    callMsg = parseJsonRpcFromSseOrJson(callRes.dataText, callId);
  } catch (e) {
    throw new Error(`MCP tools/call parse error: ${(e as Error).message}`);
  }

  if (callMsg.error) {
    throw new Error(callMsg.error.message || 'MCP tools/call error');
  }

  // 4) optional session teardown
  if (sessionId) {
    try {
      await axios({
        url,
        method: 'DELETE',
        headers: buildHeaders(negotiated, sessionId, apiToken),
        timeout: 5000,
        validateStatus: () => true,
      });
    } catch {
      /* ignore */
    }
  }

  return callMsg.result;
}
