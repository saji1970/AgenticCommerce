import { Router } from 'express';
import type { Router as RouterType } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import productRoutes from './product.routes';
import cartRoutes from './cart.routes';
import paymentRoutes from './payment.routes';
import mandateRoutes from './mandate.routes';
import agentRoutes from './agent.routes';
import acpRoutes from './agentic-commerce.routes';
import merchantRoutes from './merchant.routes';
import ap2GatewayRoutes from './ap2-gateway.routes';
import adminRoutes from './admin.routes';
import vrpProxyRoutes from './vrp-proxy.routes';
import mcpProxyRoutes from './mcp-proxy.routes';

const router: RouterType = Router();

// VRP proxy - forwards to payment gateway (avoids 404 when apps use backend URL)
router.use('/vrp', vrpProxyRoutes);

// MCP Streamable HTTP proxy (payment tool calls; MCP_API_TOKEN server-side only)
router.use('/mcp', mcpProxyRoutes);

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/payments', paymentRoutes);
router.use('/mandates', mandateRoutes);
router.use('/agents', agentRoutes);
router.use('/acp', acpRoutes);

// AP2 (Agentic Protocol 2) Routes
router.use('/merchants', merchantRoutes);
router.use('/ap2/gateway', ap2GatewayRoutes);

// Admin Routes
router.use('/admin', adminRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// TEMPORARY: Public seed endpoint - REMOVE AFTER USE
import { pool } from '../config/database';
router.get('/seed-demo-temp', async (req, res) => {
  const userId = 'cfd469c6-266e-4134-a5bc-b485dd583e1c';
  try {
    console.log('🎬 Seeding demo data for user:', userId);

    // Mandates
    const mandates = [
      { agentId: 'smart-shopper-ai', agentName: 'Smart Shopper AI', type: 'cart', constraints: { maxItemValue: 500, maxItemsPerDay: 10 } },
      { agentId: 'deal-hunter-bot', agentName: 'Deal Hunter Bot', type: 'intent', constraints: { maxIntentValue: 2000, autoApproveUnder: 100 } },
      { agentId: 'price-tracker-ai', agentName: 'Price Tracker AI', type: 'payment', constraints: { maxTransactionAmount: 1000 } },
    ];
    let mc = 0;
    for (const m of mandates) {
      const ex = await pool.query('SELECT id FROM agent_mandates WHERE user_id=$1 AND agent_id=$2', [userId, m.agentId]);
      if (ex.rows.length === 0) {
        await pool.query('INSERT INTO agent_mandates (user_id,agent_id,agent_name,type,status,constraints) VALUES ($1,$2,$3,$4,$5,$6)',
          [userId, m.agentId, m.agentName, m.type, 'active', JSON.stringify(m.constraints)]);
        mc++;
      }
    }

    // Get mandate IDs for intents
    const mandateMap: Record<string, string> = {};
    const allMandates = await pool.query('SELECT id, agent_id, type FROM agent_mandates WHERE user_id=$1', [userId]);
    console.log('Found mandates:', allMandates.rows);
    for (const row of allMandates.rows) {
      mandateMap[row.agent_id] = row.id;
    }
    console.log('Mandate map:', mandateMap);

    // Intents
    const intents = [
      { agentId: 'deal-hunter-bot', product: 'MacBook Pro 16"', price: 2499, reasoning: 'Holiday sale - 15% off', status: 'pending' },
      { agentId: 'smart-shopper-ai', product: 'Sony WH-1000XM5', price: 349, reasoning: 'Best noise-cancelling under $400', status: 'approved' },
      { agentId: 'price-tracker-ai', product: 'iPad Air M2', price: 599, reasoning: 'Hit target price', status: 'executed' },
      { agentId: 'deal-hunter-bot', product: 'AirPods Pro 2', price: 199, reasoning: 'Flash sale 20% off', status: 'pending' },
    ];
    let ic = 0;
    for (const i of intents) {
      const ex = await pool.query('SELECT id FROM purchase_intents WHERE user_id=$1 AND subtotal=$2', [userId, i.price]);
      if (ex.rows.length === 0 && mandateMap[i.agentId]) {
        const tax = i.price * 0.08;
        await pool.query('INSERT INTO purchase_intents (user_id,agent_id,mandate_id,items,subtotal,tax,total,reasoning,status,expires_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,CURRENT_TIMESTAMP+INTERVAL \'48h\')',
          [userId, i.agentId, mandateMap[i.agentId], JSON.stringify([{productName:i.product,quantity:1,price:i.price}]), i.price, tax, i.price+tax, i.reasoning, i.status]);
        ic++;
      }
    }

    // Products
    const products = [
      { name: 'MacBook Pro 16" M3', price: 2499, img: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400' },
      { name: 'Sony WH-1000XM5', price: 349, img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400' },
      { name: 'iPad Air M2', price: 599, img: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400' },
      { name: 'AirPods Pro 2', price: 249, img: 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=400' },
      { name: 'Apple Watch 9', price: 399, img: 'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=400' },
      { name: 'Samsung S24 Ultra', price: 1299, img: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400' },
      { name: 'Herman Miller Aeron', price: 1395, img: 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=400' },
      { name: 'Dyson V15', price: 749, img: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=400' },
    ];
    let sqId: string;
    const sqEx = await pool.query('SELECT id FROM search_queries WHERE user_id=$1 AND query_text=$2', [userId, 'Demo']);
    if (sqEx.rows.length > 0) sqId = sqEx.rows[0].id;
    else { const r = await pool.query('INSERT INTO search_queries (user_id,query_text,status) VALUES ($1,$2,$3) RETURNING id', [userId,'Demo','completed']); sqId = r.rows[0].id; }

    let pc = 0;
    for (const p of products) {
      const ex = await pool.query('SELECT id FROM products WHERE name=$1 AND user_id=$2', [p.name, userId]);
      if (ex.rows.length === 0) {
        await pool.query('INSERT INTO products (user_id,search_query_id,name,price,currency,image_url,availability,rating) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
          [userId, sqId, p.name, p.price, 'USD', p.img, 'In Stock', 4.5]);
        pc++;
      }
    }

    res.json({ success: true, created: { mandates: mc, intents: ic, products: pc }, debug: { mandateMap, foundMandates: allMandates.rows.length } });
  } catch (e: any) {
    console.error('Seed error:', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
