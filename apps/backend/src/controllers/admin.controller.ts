import { Request, Response } from 'express';
import { pool } from '../config/database';
import { MandateRepository } from '../repositories/mandate.repository';
import { AgentActionRepository } from '../repositories/agent-action.repository';
import { PurchaseIntentRepository } from '../repositories/purchase-intent.repository';
import { AP2TransactionRepository } from '../repositories/ap2-transaction.repository';

export class AdminController {
  private mandateRepository: MandateRepository;
  private actionRepository: AgentActionRepository;
  private intentRepository: PurchaseIntentRepository;
  private transactionRepository: AP2TransactionRepository;

  constructor() {
    this.mandateRepository = new MandateRepository();
    this.actionRepository = new AgentActionRepository();
    this.intentRepository = new PurchaseIntentRepository();
    this.transactionRepository = new AP2TransactionRepository();
  }

  // Dashboard Statistics
  getDashboardStats = async (req: Request, res: Response): Promise<void> => {
    try {
      // Total users
      const usersResult = await pool.query('SELECT COUNT(*) FROM users');
      const totalUsers = parseInt(usersResult.rows[0].count);

      // Total mandates by status
      const mandatesResult = await pool.query(`
        SELECT status, COUNT(*) as count
        FROM mandates
        GROUP BY status
      `);
      const mandatesByStatus = mandatesResult.rows.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, {} as Record<string, number>);

      // Total mandates by type
      const mandatesTypeResult = await pool.query(`
        SELECT type, COUNT(*) as count
        FROM mandates
        GROUP BY type
      `);
      const mandatesByType = mandatesTypeResult.rows.reduce((acc, row) => {
        acc[row.type] = parseInt(row.count);
        return acc;
      }, {} as Record<string, number>);

      // Total intents by status
      const intentsResult = await pool.query(`
        SELECT status, COUNT(*) as count
        FROM purchase_intents
        GROUP BY status
      `);
      const intentsByStatus = intentsResult.rows.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, {} as Record<string, number>);

      // Total spending from completed intents
      const spendingResult = await pool.query(`
        SELECT COALESCE(SUM(total), 0) as total_spent
        FROM purchase_intents
        WHERE status = 'executed'
      `);
      const totalSpent = parseFloat(spendingResult.rows[0].total_spent);

      // Recent activity (last 7 days)
      const activityResult = await pool.query(`
        SELECT DATE(timestamp) as date, COUNT(*) as count
        FROM agent_action_logs
        WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY DATE(timestamp)
        ORDER BY date
      `);
      const recentActivity = activityResult.rows;

      // AP2 transactions stats
      const ap2Result = await pool.query(`
        SELECT
          COUNT(*) as total_transactions,
          SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_volume
        FROM ap2_transactions
      `);
      const ap2Stats = {
        totalTransactions: parseInt(ap2Result.rows[0].total_transactions || 0),
        totalVolume: parseFloat(ap2Result.rows[0].total_volume || 0),
      };

      res.json({
        stats: {
          totalUsers,
          mandates: {
            byStatus: mandatesByStatus,
            byType: mandatesByType,
            total: (Object.values(mandatesByStatus) as number[]).reduce((a, b) => a + b, 0),
          },
          intents: {
            byStatus: intentsByStatus,
            total: (Object.values(intentsByStatus) as number[]).reduce((a, b) => a + b, 0),
          },
          spending: {
            totalSpent,
          },
          activity: {
            recent: recentActivity,
          },
          ap2: ap2Stats,
        },
      });
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get dashboard stats',
      });
    }
  };

  // All Mandates (Admin View)
  getAllMandates = async (req: Request, res: Response): Promise<void> => {
    try {
      const { status, type, limit = '50', offset = '0' } = req.query;

      let query = `
        SELECT m.*, u.email as user_email, u.first_name, u.last_name
        FROM mandates m
        JOIN users u ON m.user_id = u.id
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramCount = 0;

      if (status) {
        paramCount++;
        query += ` AND m.status = $${paramCount}`;
        params.push(status);
      }

      if (type) {
        paramCount++;
        query += ` AND m.type = $${paramCount}`;
        params.push(type);
      }

      query += ` ORDER BY m.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(parseInt(limit as string), parseInt(offset as string));

      const result = await pool.query(query, params);

      res.json({
        mandates: result.rows.map(row => ({
          ...row,
          constraints: typeof row.constraints === 'string' ? JSON.parse(row.constraints) : row.constraints,
        })),
      });
    } catch (error) {
      console.error('Error getting all mandates:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get mandates',
      });
    }
  };

  // All Intents (Admin View)
  getAllIntents = async (req: Request, res: Response): Promise<void> => {
    try {
      const { status, limit = '50', offset = '0' } = req.query;

      let query = `
        SELECT pi.*, u.email as user_email, u.first_name, u.last_name
        FROM purchase_intents pi
        JOIN users u ON pi.user_id = u.id
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramCount = 0;

      if (status) {
        paramCount++;
        query += ` AND pi.status = $${paramCount}`;
        params.push(status);
      }

      query += ` ORDER BY pi.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(parseInt(limit as string), parseInt(offset as string));

      const result = await pool.query(query, params);

      res.json({
        intents: result.rows.map(row => ({
          ...row,
          items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
        })),
      });
    } catch (error) {
      console.error('Error getting all intents:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get intents',
      });
    }
  };

  // All Agent Actions (Admin View)
  getAllActions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { limit = '100', offset = '0' } = req.query;

      const result = await pool.query(
        `SELECT aal.*, u.email as user_email, u.first_name, u.last_name
         FROM agent_action_logs aal
         JOIN users u ON aal.user_id = u.id
         ORDER BY aal.timestamp DESC
         LIMIT $1 OFFSET $2`,
        [parseInt(limit as string), parseInt(offset as string)]
      );

      res.json({
        actions: result.rows.map(row => ({
          ...row,
          metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
        })),
      });
    } catch (error) {
      console.error('Error getting all actions:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get actions',
      });
    }
  };

  // User Details
  getUserDetails = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      // User info
      const userResult = await pool.query(
        'SELECT id, email, first_name, last_name, phone_number, created_at FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const user = userResult.rows[0];

      // User's mandates
      const mandates = await this.mandateRepository.getUserMandates(userId);

      // User's intents
      const intents = await this.intentRepository.getUserIntents(userId);

      // User's actions
      const actions = await this.actionRepository.getAgentActions(userId, undefined, 20);

      res.json({
        user,
        mandates,
        intents,
        actions,
      });
    } catch (error) {
      console.error('Error getting user details:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get user details',
      });
    }
  };

  // Seed Demo Data for current user
  seedDemoData = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      console.log('🎬 Seeding demo data for user:', userId);

      // 1. Create sample mandates
      const mandates = [
        {
          agentId: 'smart-shopper-ai',
          agentName: 'Smart Shopper AI',
          type: 'cart',
          status: 'active',
          constraints: { maxItemValue: 500, maxItemsPerDay: 10, allowedCategories: ['Electronics', 'Books', 'Home'] },
        },
        {
          agentId: 'deal-hunter-bot',
          agentName: 'Deal Hunter Bot',
          type: 'intent',
          status: 'active',
          constraints: { maxIntentValue: 2000, maxIntentsPerDay: 5, autoApproveUnder: 100 },
        },
        {
          agentId: 'price-tracker-ai',
          agentName: 'Price Tracker AI',
          type: 'payment',
          status: 'active',
          constraints: { maxTransactionAmount: 1000, dailySpendingLimit: 2000 },
        },
      ];

      let mandatesCreated = 0;
      for (const mandate of mandates) {
        const existing = await pool.query(
          'SELECT id FROM agent_mandates WHERE user_id = $1 AND agent_id = $2 AND type = $3',
          [userId, mandate.agentId, mandate.type]
        );
        if (existing.rows.length === 0) {
          await pool.query(
            `INSERT INTO agent_mandates (user_id, agent_id, agent_name, type, status, constraints)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [userId, mandate.agentId, mandate.agentName, mandate.type, mandate.status, JSON.stringify(mandate.constraints)]
          );
          mandatesCreated++;
        }
      }

      // 2. Create sample purchase intents
      const intents = [
        { agentId: 'deal-hunter-bot', product: 'MacBook Pro 16" M3 Max', price: 2499, reasoning: 'Price dropped 15% during holiday sale', status: 'pending' },
        { agentId: 'smart-shopper-ai', product: 'Sony WH-1000XM5 Headphones', price: 349, reasoning: 'Matched user request for noise-cancelling headphones under $400', status: 'approved' },
        { agentId: 'price-tracker-ai', product: 'iPad Air 11" M2', price: 599, reasoning: 'Hit target price with education discount', status: 'executed' },
        { agentId: 'deal-hunter-bot', product: 'AirPods Pro 2nd Gen', price: 199, reasoning: 'Flash sale - 20% off regular price', status: 'pending' },
        { agentId: 'smart-shopper-ai', product: 'Apple Watch Series 9', price: 399, reasoning: 'User wants GPS model, found in stock', status: 'rejected' },
      ];

      let intentsCreated = 0;
      for (const intent of intents) {
        const existing = await pool.query(
          'SELECT id FROM purchase_intents WHERE user_id = $1 AND agent_id = $2 AND subtotal = $3',
          [userId, intent.agentId, intent.price]
        );
        if (existing.rows.length === 0) {
          const tax = intent.price * 0.08;
          await pool.query(
            `INSERT INTO purchase_intents (user_id, agent_id, items, subtotal, tax, total, reasoning, status, expires_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP + INTERVAL '48 hours')`,
            [userId, intent.agentId, JSON.stringify([{ productName: intent.product, quantity: 1, price: intent.price }]),
             intent.price, tax, intent.price + tax, intent.reasoning, intent.status]
          );
          intentsCreated++;
        }
      }

      // 3. Create sample products
      const products = [
        { name: 'MacBook Pro 16" M3 Max', price: 2499, desc: 'Most powerful MacBook Pro ever', img: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400' },
        { name: 'Sony WH-1000XM5', price: 349, desc: 'Industry-leading noise cancellation', img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400' },
        { name: 'iPad Air 11" M2', price: 599, desc: 'Powerful tablet with M2 chip', img: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400' },
        { name: 'AirPods Pro 2nd Gen', price: 249, desc: 'Active noise cancellation', img: 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=400' },
        { name: 'Apple Watch Series 9', price: 399, desc: 'Advanced health features', img: 'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=400' },
        { name: 'Samsung Galaxy S24 Ultra', price: 1299, desc: 'AI-powered smartphone', img: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400' },
        { name: 'Herman Miller Aeron', price: 1395, desc: 'Ergonomic office chair', img: 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=400' },
        { name: 'Dyson V15 Detect', price: 749, desc: 'Cordless vacuum with laser', img: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=400' },
      ];

      // Create search query for products
      let searchQueryId: string;
      const existingQuery = await pool.query(
        `SELECT id FROM search_queries WHERE user_id = $1 AND query_text = 'Demo Products' LIMIT 1`,
        [userId]
      );
      if (existingQuery.rows.length > 0) {
        searchQueryId = existingQuery.rows[0].id;
      } else {
        const qr = await pool.query(
          `INSERT INTO search_queries (user_id, query_text, status) VALUES ($1, 'Demo Products', 'completed') RETURNING id`,
          [userId]
        );
        searchQueryId = qr.rows[0].id;
      }

      let productsCreated = 0;
      for (const p of products) {
        const existing = await pool.query('SELECT id FROM products WHERE name = $1 AND user_id = $2', [p.name, userId]);
        if (existing.rows.length === 0) {
          await pool.query(
            `INSERT INTO products (user_id, search_query_id, name, description, price, currency, image_url, availability, rating, review_count)
             VALUES ($1, $2, $3, $4, $5, 'USD', $6, 'In Stock', 4.5, 100)`,
            [userId, searchQueryId, p.name, p.desc, p.price, p.img]
          );
          productsCreated++;
        }
      }

      res.json({
        success: true,
        message: 'Demo data seeded successfully',
        created: { mandates: mandatesCreated, intents: intentsCreated, products: productsCreated },
      });
    } catch (error) {
      console.error('Error seeding demo data:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to seed demo data' });
    }
  };

  // AP2 Transaction List
  getAllAP2Transactions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { status, type, merchantId, limit = '50', offset = '0' } = req.query;

      let query = `
        SELECT t.*, u.email as user_email, m.name as merchant_name
        FROM ap2_transactions t
        JOIN users u ON t.user_id = u.id
        LEFT JOIN merchants m ON t.merchant_id = m.id
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramCount = 0;

      if (status) {
        paramCount++;
        query += ` AND t.status = $${paramCount}`;
        params.push(status);
      }

      if (type) {
        paramCount++;
        query += ` AND t.type = $${paramCount}`;
        params.push(type);
      }

      if (merchantId) {
        paramCount++;
        query += ` AND t.merchant_id = $${paramCount}`;
        params.push(merchantId);
      }

      query += ` ORDER BY t.requested_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(parseInt(limit as string), parseInt(offset as string));

      const result = await pool.query(query, params);

      res.json({
        transactions: result.rows.map(row => ({
          ...row,
          metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
        })),
      });
    } catch (error) {
      console.error('Error getting AP2 transactions:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get transactions',
      });
    }
  };
}
