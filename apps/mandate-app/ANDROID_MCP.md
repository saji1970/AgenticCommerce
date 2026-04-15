# Android & MCP Streamable HTTP

## Security: do not put `MCP_API_TOKEN` in the APK

- **Preferred:** Mobile apps call **your backend** (`POST /api/mcp/evaluate-payment-options`) with the user’s **JWT**. The backend holds **`CARD_MCP_SERVER_URL`** (config: `cardMCPServerURL`) and `MCP_API_TOKEN` and runs the MCP Streamable HTTP client server-side.
- **Avoid:** Embedding the MCP bearer token in a release APK (extractable from the binary).

## Backend proxy (implemented)

Railway / server env:

| Variable | Description |
|----------|-------------|
| `CARD_MCP_SERVER_URL` | Full card MCP endpoint URL (e.g. `https://your-mcp-host/mcp`) — sets **`cardMCPServerURL`** in server config |
| `MCP_HTTP_URL` | Optional fallback if `CARD_MCP_SERVER_URL` is not set |
| `MCP_API_TOKEN` | Bearer token your MCP server expects |
| `MCP_PROTOCOL_VERSION` | Optional, default `2025-06-18` |

The backend performs JSON-RPC: `initialize` → `notifications/initialized` → `tools/call` with tool name `evaluate_purchase_payment_options` and your **basket** payload (`items`, `subtotal`, `tax`, `total`, `currency`), plus optional **`payment_methods`** (array of `{ type, label, last4?, network? }` from Profile → Payment Methods) so the server can recommend the best card for the purchase.

Reusable client: `apps/backend/src/clients/mcp-streamable-http.client.ts`.

### Demo cards (mobile Profile → Payment Methods)

The app merges two stable demo entries into AsyncStorage on load (see `DEMO_PROFILE_PAYMENT_METHODS` in `apps/mobile/src/services/savedPaymentMethods.ts`):

| ID | Label | Network | Notes |
|----|--------|---------|--------|
| `demo_chase_visa_mcp` | Chase Visa ••••4242 | Visa | Common test-last4 `4242` |
| `demo_amex_mcp` | American Express ••••0005 | Amex | Matches typical Amex test PAN ending `0005` |

Align `evaluate_purchase_payment_options` rules on your **cardMCPServer** with these labels/networks if you key off issuer or last4.

## React Native merchant app

`apps/mobile` uses the proxy via `mcp-payment-options.client.ts` (no MCP secret in the app).

## Native Kotlin + OkHttp (optional)

If you must call MCP **without** the backend (not recommended for production secrets), mirror the same JSON-RPC sequence and headers:

```kotlin
// Pseudocode — align URLs and tool `arguments` with your MCP server.

val url = "https://your-mcp-host/mcp"

val client = OkHttpClient()

fun headers(sessionId: String?, token: String, protocol: String) =
    Headers.Builder()
        .add("Content-Type", "application/json")
        .add("Accept", "application/json, text/event-stream")
        .add("MCP-Protocol-Version", protocol)
        .apply { if (sessionId != null) add("Mcp-Session-Id", sessionId) }
        .add("Authorization", "Bearer $token")
        .build()

// 1) POST initialize — read Mcp-Session-Id from response headers
// 2) POST { "jsonrpc":"2.0","method":"notifications/initialized" } → expect 202
// 3) POST tools/call with body:
//    { "jsonrpc":"2.0","id":2,"method":"tools/call",
//      "params":{ "name":"evaluate_purchase_payment_options",
//                 "arguments":{ "items":[...], "total": 41.78, "currency":"USD" } } }
// 4) Optional: DELETE same URL with Mcp-Session-Id to end session
```

Parse either a single JSON body or `text/event-stream` `data:` lines containing JSON-RPC results.

## Spec

- Transports (Streamable HTTP, session, headers): [MCP Transports](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports)
- Lifecycle (`initialize`, `notifications/initialized`): [MCP Lifecycle](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle)
