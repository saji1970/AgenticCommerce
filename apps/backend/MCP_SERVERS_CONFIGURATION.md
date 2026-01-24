# MCP Servers Configuration

This document describes the configured MCP (Model Context Protocol) servers for product search.

## Configured Servers

All 7 requested MCP servers have been configured in the seed script:

### 1. **agora-mcp** - General Product Search
- **Package**: `@agora-mcp/server`
- **Command**: `npx -y @agora-mcp/server`
- **Search Tool**: `search_products`
- **Environment Variables**:
  - `AGORA_API_KEY` (optional)
- **Status**: ✅ Active

### 2. **shopify-catalog** - Shopify Products
- **Package**: `@shopify/mcp-catalog-server`
- **Command**: `npx -y @shopify/mcp-catalog-server`
- **Search Tool**: `query_products`
- **Environment Variables**:
  - `SHOPIFY_STORE_URL` (required)
  - `SHOPIFY_ACCESS_TOKEN` (required)
- **Status**: ✅ Active

### 3. **mercadolibre** - MercadoLibre Marketplace
- **Package**: `@mercadolibre/mcp-server`
- **Command**: `npx -y @mercadolibre/mcp-server`
- **Search Tool**: `search_items`
- **Environment Variables**:
  - `MERCADOLIBRE_APP_ID` (required)
  - `MERCADOLIBRE_SECRET_KEY` (required)
- **Status**: ✅ Active

### 4. **commercetools** - Commercetools Platform
- **Package**: `@commercetools/mcp-server`
- **Command**: `npx -y @commercetools/mcp-server`
- **Search Tool**: `search_products`
- **Environment Variables**:
  - `COMMERCETOOLS_PROJECT_KEY` (required)
  - `COMMERCETOOLS_CLIENT_ID` (required)
  - `COMMERCETOOLS_CLIENT_SECRET` (required)
- **Status**: ✅ Active

### 5. **bitrefill** - Gift Cards
- **Package**: `@bitrefill/mcp-server`
- **Command**: `npx -y @bitrefill/mcp-server`
- **Search Tool**: `search_products`
- **Environment Variables**:
  - `BITREFILL_API_KEY` (required)
- **Status**: ✅ Active

### 6. **shufersal** - Groceries
- **Package**: `@shufersal/mcp-server`
- **Command**: `npx -y @shufersal/mcp-server`
- **Search Tool**: `search_groceries`
- **Environment Variables**:
  - `SHUFERSAL_API_KEY` (required)
- **Status**: ✅ Active

### 7. **dynamics365-commerce** - Microsoft Commerce
- **Package**: `@microsoft/dynamics365-commerce-mcp`
- **Command**: `npx -y @microsoft/dynamics365-commerce-mcp`
- **Search Tool**: `search_products`
- **Environment Variables**:
  - `DYNAMICS365_TENANT_ID` (required)
  - `DYNAMICS365_CLIENT_ID` (required)
  - `DYNAMICS365_CLIENT_SECRET` (required)
  - `DYNAMICS365_ENVIRONMENT` (optional, defaults to 'production')
- **Status**: ✅ Active

## How to Seed the Configuration

Run the seed script to add all server configurations to the database:

```bash
cd apps/backend
pnpm seed:mcp-servers
```

**Note**: Make sure your database is properly configured and accessible before running the seed script.

## Environment Variables Setup

Add the required environment variables to your `.env` file:

```env
# Agora MCP
AGORA_API_KEY=your_agora_api_key

# Shopify
SHOPIFY_STORE_URL=https://your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=your_shopify_access_token

# MercadoLibre
MERCADOLIBRE_APP_ID=your_app_id
MERCADOLIBRE_SECRET_KEY=your_secret_key

# Commercetools
COMMERCETOOLS_PROJECT_KEY=your_project_key
COMMERCETOOLS_CLIENT_ID=your_client_id
COMMERCETOOLS_CLIENT_SECRET=your_client_secret

# Bitrefill
BITREFILL_API_KEY=your_bitrefill_api_key

# Shufersal
SHUFERSAL_API_KEY=your_shufersal_api_key

# Dynamics 365 Commerce
DYNAMICS365_TENANT_ID=your_tenant_id
DYNAMICS365_CLIENT_ID=your_client_id
DYNAMICS365_CLIENT_SECRET=your_client_secret
DYNAMICS365_ENVIRONMENT=production
```

## How It Works

1. **Search Flow**: When a product search is performed:
   - Google Shopping/Search is queried first
   - All active MCP servers are queried in parallel
   - Results are combined and deduplicated
   - Products are returned to the user

2. **Server Activation**: Servers can be activated/deactivated via:
   - Database: Update `isActive` field in `mcp_server_configs` table
   - Admin Portal: (if available)
   - API: Update server configuration endpoint

3. **Error Handling**: If an MCP server fails:
   - Error is logged
   - Search continues with other servers
   - No blocking - graceful degradation

## Server-Specific Features

### Agora MCP
- Universal product search
- Works with multiple e-commerce platforms
- General-purpose product discovery

### Shopify Catalog
- Direct access to Shopify store products
- Supports GraphQL queries
- Real-time inventory and pricing

### MercadoLibre
- Latin America marketplace
- Seller reputation analysis
- Review analysis tools

### Commercetools
- Enterprise commerce platform
- Advanced pricing and discount tools
- Order management

### Bitrefill
- Gift cards and prepaid products
- Cryptocurrency payment support
- Global coverage

### Shufersal
- Grocery shopping
- Shopping list management
- Fresh produce and perishables

### Dynamics 365 Commerce
- Microsoft enterprise commerce
- Inventory management
- Promotion and fulfillment tools

## Troubleshooting

### Server Not Connecting
1. Check if the MCP server package is installed: `npx -y @package-name`
2. Verify environment variables are set correctly
3. Check server logs for connection errors
4. Ensure database has the server configuration

### No Results from MCP Servers
1. Verify servers are marked as `isActive: true` in database
2. Check if required environment variables are set
3. Review server-specific API requirements
4. Check MCP service logs for errors

### Package Not Found
- Some MCP server packages may not be publicly available yet
- Check with the provider for package availability
- You may need to install packages manually or use alternative implementations

## Next Steps

1. **Set Environment Variables**: Add required API keys and credentials
2. **Run Seed Script**: Execute `pnpm seed:mcp-servers` with proper database access
3. **Test Search**: Perform a product search to verify MCP integration
4. **Monitor Logs**: Check backend logs for MCP server activity
5. **Activate/Deactivate**: Control which servers are active based on your needs
