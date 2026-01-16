import { MCPServerConfigRepository } from '../repositories/mcp-config.repository';
import { CreateMCPServerConfigDTO } from '@agentic-commerce/shared-types';
import { config } from '../config/env';

/**
 * Seed major e-commerce MCP servers
 * 
 * Major E-commerce & Shopping MCP Servers:
 * 1. Agora MCP - Universal shopping server
 * 2. Shopify Catalog MCP Server - Official Shopify server
 * 3. Microsoft Dynamics 365 Commerce MCP - (Preview expected Feb 2026)
 * 4. Bitrefill Search and Shop - Cryptocurrency payments
 * 5. MercadoLibre MCP Server - Latin America marketplace
 * 6. Commercetools MCP - Enterprise commerce
 * 7. Shufersal MCP - Grocery shopping
 */
async function seedMCPServers() {
  const repository = new MCPServerConfigRepository();

  const servers: CreateMCPServerConfigDTO[] = [
    {
      name: 'agora-mcp',
      serverType: 'stdio',
      endpointUrl: '',
      config: {
        command: 'npx',
        args: ['-y', '@agora-mcp/server'],
        env: {
          // Add Agora API keys if needed
          AGORA_API_KEY: process.env.AGORA_API_KEY || '',
        },
        // Agora-specific tool names
        searchTool: 'search_products',
        productTool: 'get_product_details',
        cartTool: 'add_to_cart',
      },
      isActive: true,
    },
    {
      name: 'shopify-catalog',
      serverType: 'stdio',
      endpointUrl: '',
      config: {
        command: 'npx',
        args: ['-y', '@shopify/mcp-catalog-server'],
        env: {
          SHOPIFY_STORE_URL: process.env.SHOPIFY_STORE_URL || '',
          SHOPIFY_ACCESS_TOKEN: process.env.SHOPIFY_ACCESS_TOKEN || '',
        },
        // Shopify-specific tool names
        searchTool: 'query_products',
        productTool: 'get_product',
        cartTool: 'add_to_universal_cart',
      },
      isActive: true,
    },
    {
      name: 'bitrefill',
      serverType: 'stdio',
      endpointUrl: '',
      config: {
        command: 'npx',
        args: ['-y', '@bitrefill/mcp-server'],
        env: {
          BITREFILL_API_KEY: process.env.BITREFILL_API_KEY || '',
        },
        // Bitrefill-specific tool names
        searchTool: 'search_products',
        productTool: 'get_product',
        purchaseTool: 'purchase_with_crypto',
      },
      isActive: true,
    },
    {
      name: 'mercadolibre',
      serverType: 'stdio',
      endpointUrl: '',
      config: {
        command: 'npx',
        args: ['-y', '@mercadolibre/mcp-server'],
        env: {
          MERCADOLIBRE_APP_ID: process.env.MERCADOLIBRE_APP_ID || '',
          MERCADOLIBRE_SECRET_KEY: process.env.MERCADOLIBRE_SECRET_KEY || '',
        },
        // MercadoLibre-specific tool names
        searchTool: 'search_items',
        productTool: 'get_item',
        reviewTool: 'analyze_reviews',
        sellerTool: 'get_seller_reputation',
      },
      isActive: true,
    },
    {
      name: 'commercetools',
      serverType: 'stdio',
      endpointUrl: '',
      config: {
        command: 'npx',
        args: ['-y', '@commercetools/mcp-server'],
        env: {
          COMMERCETOOLS_PROJECT_KEY: process.env.COMMERCETOOLS_PROJECT_KEY || '',
          COMMERCETOOLS_CLIENT_ID: process.env.COMMERCETOOLS_CLIENT_ID || '',
          COMMERCETOOLS_CLIENT_SECRET: process.env.COMMERCETOOLS_CLIENT_SECRET || '',
        },
        // Commercetools-specific tool names
        searchTool: 'search_products',
        cartTool: 'add_to_cart',
        orderTool: 'place_order',
        discountTool: 'apply_discount',
      },
      isActive: true,
    },
    {
      name: 'shufersal',
      serverType: 'stdio',
      endpointUrl: '',
      config: {
        command: 'npx',
        args: ['-y', '@shufersal/mcp-server'],
        env: {
          SHUFERSAL_API_KEY: process.env.SHUFERSAL_API_KEY || '',
        },
        // Shufersal-specific tool names
        searchTool: 'search_groceries',
        productTool: 'get_product',
        listTool: 'create_shopping_list',
      },
      isActive: true,
    },
    // Microsoft Dynamics 365 Commerce MCP - Preview (expected Feb 2026)
    // Uncomment when available
    /*
    {
      name: 'dynamics365-commerce',
      serverType: 'stdio',
      endpointUrl: '',
      config: {
        command: 'npx',
        args: ['-y', '@microsoft/dynamics365-commerce-mcp'],
        env: {
          DYNAMICS365_TENANT_ID: process.env.DYNAMICS365_TENANT_ID || '',
          DYNAMICS365_CLIENT_ID: process.env.DYNAMICS365_CLIENT_ID || '',
          DYNAMICS365_CLIENT_SECRET: process.env.DYNAMICS365_CLIENT_SECRET || '',
        },
        // Dynamics 365-specific tool names
        searchTool: 'search_products',
        pricingTool: 'get_pricing',
        inventoryTool: 'check_inventory',
        promotionTool: 'get_promotions',
        fulfillmentTool: 'get_fulfillment_options',
      },
      isActive: false, // Set to true when available
    },
    */
  ];

  console.log('🌱 Seeding MCP server configurations...\n');

  for (const server of servers) {
    try {
      // Check if server already exists
      const existing = await repository.findByName(server.name);
      
      if (existing) {
        console.log(`⚠️  Server '${server.name}' already exists, skipping...`);
        continue;
      }

      const created = await repository.create(server);
      console.log(`✅ Created MCP server config: ${created.name} (${created.serverType})`);
    } catch (error: any) {
      console.error(`❌ Failed to create server '${server.name}':`, error.message);
    }
  }

  console.log('\n✨ MCP server seeding complete!');
  console.log('\n📝 Note: Make sure to set the required environment variables for each server:');
  console.log('   - AGORA_API_KEY (for Agora MCP)');
  console.log('   - SHOPIFY_STORE_URL, SHOPIFY_ACCESS_TOKEN (for Shopify)');
  console.log('   - BITREFILL_API_KEY (for Bitrefill)');
  console.log('   - MERCADOLIBRE_APP_ID, MERCADOLIBRE_SECRET_KEY (for MercadoLibre)');
  console.log('   - COMMERCETOOLS_* (for Commercetools)');
  console.log('   - SHUFERSAL_API_KEY (for Shufersal)');
  console.log('\n💡 You can activate/deactivate servers via the admin portal or database.');
}

// Run if called directly
if (require.main === module) {
  seedMCPServers()
    .then(() => {
      console.log('\n✅ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error:', error);
      process.exit(1);
    });
}

export { seedMCPServers };
