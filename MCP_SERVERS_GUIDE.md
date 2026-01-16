# Major E-commerce MCP Servers Integration Guide

This guide explains how to configure and use major e-commerce MCP (Model Context Protocol) servers for product search and shopping capabilities.

## Supported MCP Servers

### 1. **Agora MCP** - Universal Shopping Server
- **Type**: Universal shopping aggregator
- **Capabilities**: 
  - Search products across thousands of stores
  - Compare options
  - Manage cart
  - Complete purchases
- **Configuration**: Requires `AGORA_API_KEY` environment variable

### 2. **Shopify Catalog MCP Server** - Official Shopify Integration
- **Type**: Official Shopify server
- **Capabilities**:
  - Query extensive product inventories
  - Universal Cart (consolidate items from multiple stores)
  - Embed checkout kits
- **Configuration**: Requires:
  - `SHOPIFY_STORE_URL` - Your Shopify store URL
  - `SHOPIFY_ACCESS_TOKEN` - Shopify API access token

### 3. **Microsoft Dynamics 365 Commerce MCP** (Preview)
- **Type**: Enterprise retail platform
- **Status**: Preview expected February 2026
- **Capabilities**:
  - Core retail logic (pricing, promotions, inventory, fulfillment)
  - Enterprise-grade commerce operations
- **Configuration**: Will require:
  - `DYNAMICS365_TENANT_ID`
  - `DYNAMICS365_CLIENT_ID`
  - `DYNAMICS365_CLIENT_SECRET`

### 4. **Bitrefill Search and Shop** - Cryptocurrency Payments
- **Type**: Gift cards and mobile top-ups
- **Capabilities**:
  - Search for products
  - Purchase using cryptocurrencies
- **Configuration**: Requires `BITREFILL_API_KEY`

### 5. **MercadoLibre MCP Server** - Latin America Marketplace
- **Type**: Latin America's largest marketplace
- **Capabilities**:
  - Product searches
  - Review analysis
  - Seller reputation lookups
- **Configuration**: Requires:
  - `MERCADOLIBRE_APP_ID`
  - `MERCADOLIBRE_SECRET_KEY`

### 6. **Commercetools MCP** - Enterprise Commerce Platform
- **Type**: Enterprise commerce platform
- **Capabilities**:
  - Autonomously add items to carts
  - Apply discounts
  - Place orders
- **Configuration**: Requires:
  - `COMMERCETOOLS_PROJECT_KEY`
  - `COMMERCETOOLS_CLIENT_ID`
  - `COMMERCETOOLS_CLIENT_SECRET`

### 7. **Shufersal MCP** - Grocery Shopping
- **Type**: Grocery shopping automation
- **Capabilities**:
  - Search for groceries
  - Create shopping lists
- **Configuration**: Requires `SHUFERSAL_API_KEY`

## Setup Instructions

### Step 1: Install MCP Server Configurations

Run the seed script to add all major MCP server configurations to your database:

```bash
cd apps/backend
pnpm seed:mcp-servers
```

This will create configurations for all supported servers. Servers will be created in an **inactive** state until you configure their API keys.

### Step 2: Configure Environment Variables

Add the required API keys and credentials to your `.env` file:

```env
# Agora MCP
AGORA_API_KEY=your_agora_api_key

# Shopify Catalog
SHOPIFY_STORE_URL=https://your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=your_shopify_access_token

# Bitrefill
BITREFILL_API_KEY=your_bitrefill_api_key

# MercadoLibre
MERCADOLIBRE_APP_ID=your_app_id
MERCADOLIBRE_SECRET_KEY=your_secret_key

# Commercetools
COMMERCETOOLS_PROJECT_KEY=your_project_key
COMMERCETOOLS_CLIENT_ID=your_client_id
COMMERCETOOLS_CLIENT_SECRET=your_client_secret

# Shufersal
SHUFERSAL_API_KEY=your_shufersal_api_key
```

### Step 3: Activate Servers

You can activate/deactivate servers through:

1. **Admin Portal**: Navigate to `/admin` and manage MCP servers
2. **Database**: Update `mcp_server_configs.is_active = true` for desired servers
3. **API**: Use the MCP configuration endpoints (if available)

### Step 4: Verify Connection

The MCP service will automatically connect to active servers when a search is performed. Check logs for connection status:

```
✅ Connected to MCP server: agora-mcp
✅ Connected to MCP server: shopify-catalog
```

## How It Works

### Automatic Server Detection

When a product search is performed:

1. **AI extracts search criteria** from the user's natural language query
2. **Google Shopping API** is used for product searches (if product type detected)
3. **MCP servers are queried in parallel** for additional product results
4. **Results are combined and deduplicated**
5. **Products are sorted and filtered** based on criteria:
   - In-store: sorted by distance (nearest first)
   - Online: sorted by price (low to high)

### Server-Specific Handling

The MCP service automatically handles different server response formats:

- **Shopify**: Handles GraphQL responses with `edges` structure
- **MercadoLibre**: Maps `items` array and Latin America-specific fields
- **Commercetools**: Handles enterprise commerce data structures
- **Agora**: Universal product format
- **Generic**: Fallback mapping for standard product fields

### Tool Detection

The service automatically detects search tools on each server:

1. Checks server configuration for `searchTool` name
2. Falls back to server-specific patterns (e.g., `search_products`, `query_products`)
3. Uses generic patterns as last resort (`search`, `query`, `product`)

## Usage Examples

### Natural Language Search

```bash
# User query: "Find ergonomic chairs under $200"
POST /api/products/nlp-search
{
  "query": "Find ergonomic chairs under $200"
}
```

The system will:
1. Extract: `productType: "chair"`, `maxPrice: 200`
2. Search Google Shopping for "ergonomic chairs"
3. Query all active MCP servers in parallel
4. Combine results and filter by price
5. Sort by price (low to high) for online products

### Direct Product Search

```bash
POST /api/products/ai-search
{
  "query": "MacBook Pro",
  "filters": {
    "maxResults": 20
  }
}
```

## Troubleshooting

### Server Not Connecting

1. **Check environment variables**: Ensure all required API keys are set
2. **Verify server is active**: Check `mcp_server_configs.is_active = true`
3. **Check logs**: Look for connection errors in server logs
4. **Test manually**: Try connecting to the server using MCP SDK directly

### No Products Returned

1. **Check tool availability**: Server might not have a search tool
2. **Verify API credentials**: Invalid credentials will fail silently
3. **Check server response format**: Some servers might return data in unexpected formats
4. **Review normalization**: Check if product field mapping is correct

### Performance Issues

1. **Limit active servers**: Too many servers can slow down searches
2. **Use server-specific search**: Query specific servers instead of all
3. **Implement caching**: Cache MCP results for frequently searched queries

## API Endpoints

### List Available MCP Servers

```bash
GET /api/mcp/servers
```

### Connect to Specific Server

```bash
POST /api/mcp/connect
{
  "serverName": "shopify-catalog"
}
```

### Search Products via MCP

```bash
POST /api/mcp/search
{
  "query": "laptop",
  "serverName": "agora-mcp"  // Optional: search specific server
}
```

## Best Practices

1. **Start with one server**: Activate and test one server at a time
2. **Monitor API usage**: Some servers have rate limits
3. **Use appropriate servers**: 
   - Use Shopify for Shopify stores
   - Use MercadoLibre for Latin America
   - Use Agora for broad product search
4. **Handle errors gracefully**: MCP failures shouldn't block Google Shopping results
5. **Cache results**: Implement caching for expensive MCP queries

## Future Enhancements

- [ ] HTTP-based MCP server support (currently only stdio)
- [ ] Microsoft Dynamics 365 Commerce integration (when available)
- [ ] MCP server health monitoring
- [ ] Automatic failover between servers
- [ ] Result ranking based on server reliability
- [ ] Server-specific filtering and sorting options

## References

- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [MCP Server Registry](https://github.com/modelcontextprotocol/servers)
- [Agora MCP Server](https://github.com/agora-mcp/server)
- [Shopify MCP Integration](https://shopify.dev/docs/api/mcp)
