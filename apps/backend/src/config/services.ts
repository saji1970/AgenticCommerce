import { ShoppingAgent } from '@agentic-commerce/ai-agent';
import { MCPClient, MCPServerConfig } from '@agentic-commerce/mcp-client';
import { PaymentService, PaymentGatewayType } from '@agentic-commerce/payment';
import { ProductSearchService, ProductSearchSource } from '@agentic-commerce/product-search';
import { VisualSearchService, VisualSearchProvider } from '@agentic-commerce/visual-search';
import { MandateManager } from '@agentic-commerce/ap2-mandate';
import { Pool } from 'pg';
import { logger } from '../utils/logger';
import { MandateController } from '../controllers/mandate.controller';

// Initialize Product Search Service
const productDataSource = (process.env.PRODUCT_DATA_SOURCE || 'rapidapi') as ProductSearchSource;

export const productSearchService = new ProductSearchService({
  source: productDataSource,
  apiKey: process.env.RAPIDAPI_KEY || process.env.SERPAPI_KEY,
});
logger.info(`Product Search Service initialized with ${productDataSource} provider`);

// Initialize MCP Client (if using MCP)
const mcpConfigs: MCPServerConfig[] = (process.env.MCP_SERVER_URLS || '')
  .split(',')
  .filter(Boolean)
  .map((url, index) => ({
    url: url.trim(),
    retailer: `retailer_${index + 1}`,
  }));

export const mcpClient = mcpConfigs.length > 0 ? new MCPClient(mcpConfigs) : null;
if (mcpClient) {
  logger.info(`MCP Client initialized with ${mcpConfigs.length} retailer servers`);
}

// Initialize Shopping Agent
export const shoppingAgent = new ShoppingAgent(
  {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 4096,
  },
  mcpClient || ({} as any)
);
logger.info('Shopping Agent initialized');

// Initialize Visual Search Service
const visualSearchProvider = (process.env.VISUAL_SEARCH_PROVIDER || 'clarifai') as VisualSearchProvider;

export const visualSearchService = new VisualSearchService({
  provider: visualSearchProvider,
  config: {
    apiKey: process.env.CLARIFAI_API_KEY || process.env.GOOGLE_VISION_API_KEY || '',
  },
});
logger.info(`Visual Search Service initialized with ${visualSearchProvider} provider`);

// Initialize Payment Service with configurable gateway
const paymentGateway = (process.env.PAYMENT_GATEWAY || 'stripe') as PaymentGatewayType;

export const paymentService = new PaymentService({
  gateway: paymentGateway,
  config: {
    apiKey: process.env.PAYMENT_API_KEY || process.env.STRIPE_SECRET_KEY || '',
    apiSecret: process.env.PAYMENT_API_SECRET,
    webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET,
    environment: process.env.NODE_ENV === 'production' ? 'production' : 'test',
  },
});

// Initialize payment service
paymentService.init().then(() => {
  logger.info(`Payment Service initialized with ${paymentGateway} gateway`);
}).catch((error) => {
  logger.error('Failed to initialize payment service:', error);
});

// Initialize Database Pool for AP2
export const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

dbPool.on('error', (err) => {
  logger.error('Unexpected database pool error:', err);
});

logger.info('Database pool initialized');

// Initialize AP2 Mandate Manager
export const mandateManager = new MandateManager();
logger.info('AP2 Mandate Manager initialized');

// Initialize Mandate Controller
export const mandateController = new MandateController(
  mandateManager,
  dbPool,
  paymentService
);
logger.info('Mandate Controller initialized');
