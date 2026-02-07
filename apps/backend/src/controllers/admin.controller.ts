import { Request, Response } from 'express';
import crypto from 'crypto';
import { pool } from '../config/database';
import { MandateRepository } from '../repositories/mandate.repository';
import { AgentActionRepository } from '../repositories/agent-action.repository';
import { PurchaseIntentRepository } from '../repositories/purchase-intent.repository';
import { AP2TransactionRepository } from '../repositories/ap2-transaction.repository';
import { AgentRepository } from '../repositories/agent.repository';
import { MerchantRepository } from '../repositories/merchant.repository';
import { merchantAgentRepository } from '../repositories/merchant-agent.repository';
import { userSettingsRepository } from '../repositories/user-settings.repository';
import { auditLogRepository } from '../repositories/audit-log.repository';
import { caCertificateRepository } from '../repositories/ca-certificate.repository';
import { adminSettingsRepository } from '../repositories/admin-settings.repository';
import { auditService } from '../services/audit.service';
import { MerchantStatus, MerchantTier } from '@agentic-commerce/shared-types';

export class AdminController {
  private mandateRepository: MandateRepository;
  private actionRepository: AgentActionRepository;
  private intentRepository: PurchaseIntentRepository;
  private transactionRepository: AP2TransactionRepository;
  private agentRepository: AgentRepository;
  private merchantRepository: MerchantRepository;

  constructor() {
    this.mandateRepository = new MandateRepository();
    this.actionRepository = new AgentActionRepository();
    this.intentRepository = new PurchaseIntentRepository();
    this.transactionRepository = new AP2TransactionRepository();
    this.agentRepository = new AgentRepository();
    this.merchantRepository = new MerchantRepository();
  }

  // Dashboard Statistics
  getDashboardStats = async (req: Request, res: Response): Promise<void> => {
    try {
      // Total users
      const usersResult = await pool.query('SELECT COUNT(*) FROM users');
      const totalUsers = parseInt(usersResult.rows[0].count);

      // Total merchants
      const merchantsResult = await pool.query('SELECT COUNT(*) FROM merchants');
      const totalMerchants = parseInt(merchantsResult.rows[0].count);

      // Total agents
      const agentsResult = await pool.query('SELECT COUNT(*) FROM ai_agents');
      const totalAgents = parseInt(agentsResult.rows[0].count);

      // Total mandates by status
      const mandatesResult = await pool.query(`
        SELECT status, COUNT(*) as count
        FROM agent_mandates
        GROUP BY status
      `);
      const mandatesByStatus = mandatesResult.rows.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, {} as Record<string, number>);

      // Total mandates by type
      const mandatesTypeResult = await pool.query(`
        SELECT type, COUNT(*) as count
        FROM agent_mandates
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
        FROM agent_actions
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
          totalMerchants,
          totalAgents,
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
      const { status, type, agentId, limit = '50', offset = '0' } = req.query;

      let query = `
        SELECT m.*, u.email as user_email, u.first_name, u.last_name
        FROM agent_mandates m
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

      if (agentId) {
        paramCount++;
        query += ` AND m.agent_id = $${paramCount}`;
        params.push(agentId);
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
      const { status, agentId, limit = '50', offset = '0' } = req.query;

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

      if (agentId) {
        paramCount++;
        query += ` AND pi.agent_id = $${paramCount}`;
        params.push(agentId);
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
         FROM agent_actions aal
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

  // All Users (Admin View)
  getAllUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const { limit = '50', offset = '0', search } = req.query;

      let query = `
        SELECT id, email, first_name, last_name, phone_number, role, created_at
        FROM users
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramCount = 0;

      if (search) {
        paramCount++;
        query += ` AND (email ILIKE $${paramCount} OR first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount})`;
        params.push(`%${search}%`);
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(parseInt(limit as string), parseInt(offset as string));

      const result = await pool.query(query, params);

      // Get total count for pagination
      const countQuery = search
        ? `SELECT COUNT(*) FROM users WHERE (email ILIKE $1 OR first_name ILIKE $1 OR last_name ILIKE $1)`
        : `SELECT COUNT(*) FROM users`;
      const countParams = search ? [`%${search}%`] : [];
      const countResult = await pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].count);

      res.json({
        users: result.rows,
        pagination: {
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        },
      });
    } catch (error) {
      console.error('Error getting all users:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get users',
      });
    }
  };

  // AP2 Transaction by ID
  getAP2TransactionById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const result = await pool.query(`
        SELECT
          t.*,
          u.email as user_email,
          u.first_name as user_first_name,
          u.last_name as user_last_name,
          m.name as merchant_name,
          m.business_name as merchant_business_name,
          m.email as merchant_email
        FROM ap2_transactions t
        JOIN users u ON t.user_id = u.id
        LEFT JOIN merchants m ON t.merchant_id = m.id
        WHERE t.id = $1
      `, [id]);

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Transaction not found' });
        return;
      }

      const row = result.rows[0];
      res.json({
        transaction: {
          id: row.id,
          userId: row.user_id,
          merchantId: row.merchant_id,
          type: row.type,
          amount: parseFloat(row.amount),
          currency: row.currency,
          status: row.status,
          metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
          requestedAt: row.requested_at,
          authorizedAt: row.authorized_at,
          completedAt: row.completed_at,
          failedAt: row.failed_at,
          failureReason: row.failure_reason,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          user: {
            id: row.user_id,
            email: row.user_email,
            firstName: row.user_first_name,
            lastName: row.user_last_name,
          },
          merchant: row.merchant_id ? {
            id: row.merchant_id,
            name: row.merchant_name,
            businessName: row.merchant_business_name,
            email: row.merchant_email,
          } : null,
        },
      });
    } catch (error) {
      console.error('Error getting AP2 transaction:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get transaction',
      });
    }
  };

  // AP2 Transaction List
  getAllAP2Transactions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { status, type, merchantId, agentId, limit = '50', offset = '0' } = req.query;

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

      if (agentId) {
        paramCount++;
        query += ` AND t.agent_id = $${paramCount}`;
        params.push(agentId);
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

  // All AI Agents (Admin View)
  getAllAgents = async (req: Request, res: Response): Promise<void> => {
    try {
      const { status } = req.query;
      
      const agents = status === 'active'
        ? await this.agentRepository.getActive()
        : await this.agentRepository.getAll();

      res.json({
        agents,
      });
    } catch (error) {
      console.error('Error getting all agents:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get agents',
      });
    }
  };

  // Agent Monitoring - Statistics for a specific agent
  getAgentMonitoring = async (req: Request, res: Response): Promise<void> => {
    try {
      const { agentId } = req.params;
      const { days = '7' } = req.query;

      const daysNum = parseInt(days as string);

      // Get agent info
      const agent = await this.agentRepository.getByAgentId(agentId);
      if (!agent) {
        res.status(404).json({ error: 'Agent not found' });
        return;
      }

      // Get mandate count by status
      const mandatesResult = await pool.query(
        `SELECT status, COUNT(*) as count
         FROM agent_mandates
         WHERE agent_id = $1
         GROUP BY status`,
        [agentId]
      );
      const mandatesByStatus = mandatesResult.rows.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, {} as Record<string, number>);

      // Get action statistics
      const actionsResult = await pool.query(
        `SELECT 
           COUNT(*) as total_actions,
           SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_actions,
           SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as failed_actions,
           COUNT(DISTINCT user_id) as unique_users,
           COUNT(DISTINCT mandate_id) as active_mandates
         FROM agent_actions
         WHERE agent_id = $1
           AND timestamp >= CURRENT_TIMESTAMP - INTERVAL '${daysNum} days'`,
        [agentId]
      );

      // Get actions by type
      const actionsByTypeResult = await pool.query(
        `SELECT action, COUNT(*) as count
         FROM agent_actions
         WHERE agent_id = $1
           AND timestamp >= CURRENT_TIMESTAMP - INTERVAL '${daysNum} days'
         GROUP BY action
         ORDER BY count DESC`,
        [agentId]
      );
      const actionsByType = actionsByTypeResult.rows.map(row => ({
        action: row.action,
        count: parseInt(row.count),
      }));

      // Get daily activity
      const dailyActivityResult = await pool.query(
        `SELECT 
           DATE(timestamp) as date,
           COUNT(*) as action_count,
           SUM(CASE WHEN success THEN 1 ELSE 0 END) as success_count,
           SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as failure_count
         FROM agent_actions
         WHERE agent_id = $1
           AND timestamp >= CURRENT_TIMESTAMP - INTERVAL '${daysNum} days'
         GROUP BY DATE(timestamp)
         ORDER BY date`,
        [agentId]
      );

      // Get intent statistics
      const intentsResult = await pool.query(
        `SELECT 
           status,
           COUNT(*) as count,
           COALESCE(SUM(total), 0) as total_value
         FROM purchase_intents
         WHERE agent_id = $1
           AND created_at >= CURRENT_TIMESTAMP - INTERVAL '${daysNum} days'
         GROUP BY status`,
        [agentId]
      );
      const intentsByStatus = intentsResult.rows.reduce((acc, row) => {
        acc[row.status] = {
          count: parseInt(row.count),
          totalValue: parseFloat(row.total_value),
        };
        return acc;
      }, {} as Record<string, { count: number; totalValue: number }>);

      res.json({
        agent: {
          id: agent.id,
          agentId: agent.agentId,
          agentName: agent.agentName,
          name: agent.name,
          status: agent.status,
          capabilities: agent.capabilities,
        },
        mandates: {
          byStatus: mandatesByStatus,
          total: (Object.values(mandatesByStatus) as number[]).reduce((a, b) => a + b, 0),
        },
        actions: {
          total: parseInt(actionsResult.rows[0].total_actions || 0),
          successful: parseInt(actionsResult.rows[0].successful_actions || 0),
          failed: parseInt(actionsResult.rows[0].failed_actions || 0),
          byType: actionsByType,
          uniqueUsers: parseInt(actionsResult.rows[0].unique_users || 0),
          activeMandates: parseInt(actionsResult.rows[0].active_mandates || 0),
          dailyActivity: dailyActivityResult.rows.map(row => ({
            date: row.date,
            actionCount: parseInt(row.action_count),
            successCount: parseInt(row.success_count),
            failureCount: parseInt(row.failure_count),
          })),
        },
        intents: {
          byStatus: intentsByStatus,
          total: (Object.values(intentsByStatus) as Array<{ count: number; totalValue: number }>).reduce((acc, val) => acc + val.count, 0),
          totalValue: (Object.values(intentsByStatus) as Array<{ count: number; totalValue: number }>).reduce((acc, val) => acc + val.totalValue, 0),
        },
        period: {
          days: daysNum,
        },
      });
    } catch (error) {
      console.error('Error getting agent monitoring:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get agent monitoring',
      });
    }
  };

  // Agent Auditability - Action logs for a specific agent
  getAgentAuditability = async (req: Request, res: Response): Promise<void> => {
    try {
      const { agentId } = req.params;
      const { limit = '100', offset = '0', action, success, userId } = req.query;

      let query = `
        SELECT aal.*, u.email as user_email, u.first_name, u.last_name, m.type as mandate_type
        FROM agent_actions aal
        JOIN users u ON aal.user_id = u.id
        LEFT JOIN agent_mandates m ON aal.mandate_id = m.id
        WHERE aal.agent_id = $1
      `;
      const params: any[] = [agentId];
      let paramCount = 1;

      if (action) {
        paramCount++;
        query += ` AND aal.action = $${paramCount}`;
        params.push(action);
      }

      if (success !== undefined) {
        paramCount++;
        query += ` AND aal.success = $${paramCount}`;
        params.push(success === 'true');
      }

      if (userId) {
        paramCount++;
        query += ` AND aal.user_id = $${paramCount}`;
        params.push(userId);
      }

      query += ` ORDER BY aal.timestamp DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(parseInt(limit as string), parseInt(offset as string));

      const result = await pool.query(query, params);

      // Get total count for pagination
      let countQuery = `SELECT COUNT(*) FROM agent_actions WHERE agent_id = $1`;
      const countParams: any[] = [agentId];
      let countParamCount = 1;

      if (action) {
        countParamCount++;
        countQuery += ` AND action = $${countParamCount}`;
        countParams.push(action);
      }
      if (success !== undefined) {
        countParamCount++;
        countQuery += ` AND success = $${countParamCount}`;
        countParams.push(success === 'true');
      }
      if (userId) {
        countParamCount++;
        countQuery += ` AND user_id = $${countParamCount}`;
        countParams.push(userId);
      }

      const countResult = await pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].count);

      res.json({
        actions: result.rows.map(row => ({
          id: row.id,
          userId: row.user_id,
          userEmail: row.user_email,
          userName: `${row.first_name} ${row.last_name}`,
          agentId: row.agent_id,
          mandateId: row.mandate_id,
          mandateType: row.mandate_type,
          action: row.action,
          resourceType: row.resource_type,
          resourceId: row.resource_id,
          metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
          success: row.success,
          errorMessage: row.error_message,
          timestamp: row.timestamp,
        })),
        pagination: {
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        },
      });
    } catch (error) {
      console.error('Error getting agent auditability:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get agent auditability',
      });
    }
  };

  // Agent Transaction History
  getAgentTransactionHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { agentId } = req.params;
      const { limit = '50', offset = '0', status } = req.query;

      // Get purchase intents (transactions) for this agent
      let query = `
        SELECT pi.*, u.email as user_email, u.first_name, u.last_name, m.type as mandate_type
        FROM purchase_intents pi
        JOIN users u ON pi.user_id = u.id
        JOIN agent_mandates m ON pi.mandate_id = m.id
        WHERE pi.agent_id = $1
      `;
      const params: any[] = [agentId];
      let paramCount = 1;

      if (status) {
        paramCount++;
        query += ` AND pi.status = $${paramCount}`;
        params.push(status);
      }

      query += ` ORDER BY pi.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(parseInt(limit as string), parseInt(offset as string));

      const result = await pool.query(query, params);

      // Get total count
      let countQuery = `SELECT COUNT(*) FROM purchase_intents WHERE agent_id = $1`;
      const countParams: any[] = [agentId];
      if (status) {
        countQuery += ` AND status = $2`;
        countParams.push(status);
      }
      const countResult = await pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].count);

      // Get summary statistics
      const statsResult = await pool.query(
        `SELECT 
           COUNT(*) as total_intents,
           SUM(CASE WHEN status = 'executed' THEN total ELSE 0 END) as total_revenue,
           SUM(CASE WHEN status = 'executed' THEN 1 ELSE 0 END) as executed_count,
           AVG(CASE WHEN status = 'executed' THEN total ELSE NULL END) as avg_transaction_value
         FROM purchase_intents
         WHERE agent_id = $1`,
        [agentId]
      );

      res.json({
        transactions: result.rows.map(row => ({
          id: row.id,
          userId: row.user_id,
          userEmail: row.user_email,
          userName: `${row.first_name} ${row.last_name}`,
          agentId: row.agent_id,
          mandateId: row.mandate_id,
          mandateType: row.mandate_type,
          items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
          subtotal: parseFloat(row.subtotal),
          tax: parseFloat(row.tax),
          total: parseFloat(row.total),
          reasoning: row.reasoning,
          status: row.status,
          createdAt: row.created_at,
          expiresAt: row.expires_at,
          approvedAt: row.approved_at,
          executedAt: row.executed_at,
        })),
        statistics: {
          totalIntents: parseInt(statsResult.rows[0].total_intents || 0),
          totalRevenue: parseFloat(statsResult.rows[0].total_revenue || 0),
          executedCount: parseInt(statsResult.rows[0].executed_count || 0),
          avgTransactionValue: parseFloat(statsResult.rows[0].avg_transaction_value || 0),
        },
        pagination: {
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        },
      });
    } catch (error) {
      console.error('Error getting agent transaction history:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get agent transaction history',
      });
    }
  };

  // Dashboard Alerts
  getDashboardAlerts = async (req: Request, res: Response): Promise<void> => {
    try {
      const alerts: Array<{ type: string; message: string; severity: string }> = [];

      // Check for expiring certificates (within 30 days)
      try {
        const expiringCertsResult = await pool.query(`
          SELECT COUNT(*) as count FROM ca_certificates
          WHERE is_active = true
            AND not_after <= CURRENT_TIMESTAMP + INTERVAL '30 days'
            AND not_after > CURRENT_TIMESTAMP
        `);
        const expiringCount = parseInt(expiringCertsResult.rows[0].count || 0);
        if (expiringCount > 0) {
          alerts.push({
            type: 'certificate_expiring',
            message: `${expiringCount} certificate(s) expiring within 30 days`,
            severity: 'warning',
          });
        }
      } catch (e) {
        // Table may not exist
      }

      // Check for blocked users
      try {
        const blockedUsersResult = await pool.query(`
          SELECT COUNT(*) as count FROM user_settings WHERE is_blocked = true
        `);
        const blockedCount = parseInt(blockedUsersResult.rows[0].count || 0);
        if (blockedCount > 0) {
          alerts.push({
            type: 'users_blocked',
            message: `${blockedCount} user(s) currently blocked`,
            severity: 'info',
          });
        }
      } catch (e) {
        // Table may not exist
      }

      // Check for suspended merchants
      const suspendedMerchantsResult = await pool.query(`
        SELECT COUNT(*) as count FROM merchants WHERE status = 'suspended'
      `);
      const suspendedCount = parseInt(suspendedMerchantsResult.rows[0].count || 0);
      if (suspendedCount > 0) {
        alerts.push({
          type: 'merchants_suspended',
          message: `${suspendedCount} merchant(s) currently suspended`,
          severity: 'warning',
        });
      }

      res.json({ alerts });
    } catch (error) {
      console.error('Error getting dashboard alerts:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get alerts',
      });
    }
  };

  // Merchant Management
  getAllMerchants = async (req: Request, res: Response): Promise<void> => {
    try {
      const { status, search, limit = '50', offset = '0' } = req.query;

      let query = `SELECT * FROM merchants WHERE 1=1`;
      const params: any[] = [];
      let paramCount = 0;

      if (status) {
        paramCount++;
        query += ` AND status = $${paramCount}`;
        params.push(status);
      }

      if (search) {
        paramCount++;
        query += ` AND (name ILIKE $${paramCount} OR business_name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
        params.push(`%${search}%`);
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(parseInt(limit as string), parseInt(offset as string));

      const result = await pool.query(query, params);

      // Get total count
      let countQuery = `SELECT COUNT(*) FROM merchants WHERE 1=1`;
      const countParams: any[] = [];
      let countParamCount = 0;

      if (status) {
        countParamCount++;
        countQuery += ` AND status = $${countParamCount}`;
        countParams.push(status);
      }
      if (search) {
        countParamCount++;
        countQuery += ` AND (name ILIKE $${countParamCount} OR business_name ILIKE $${countParamCount} OR email ILIKE $${countParamCount})`;
        countParams.push(`%${search}%`);
      }

      const countResult = await pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].count);

      res.json({
        merchants: result.rows.map(row => ({
          id: row.id,
          name: row.name,
          businessName: row.business_name,
          email: row.email,
          website: row.website,
          status: row.status,
          tier: row.tier,
          apiKey: row.api_key,
          webhookUrl: row.webhook_url,
          settings: typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          lastActivityAt: row.last_activity_at,
        })),
        pagination: { total, limit: parseInt(limit as string), offset: parseInt(offset as string) },
      });
    } catch (error) {
      console.error('Error getting merchants:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get merchants' });
    }
  };

  getMerchantById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const merchant = await this.merchantRepository.getById(id);

      if (!merchant) {
        res.status(404).json({ error: 'Merchant not found' });
        return;
      }

      res.json({ merchant });
    } catch (error) {
      console.error('Error getting merchant:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get merchant' });
    }
  };

  createMerchant = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, businessName, email, website, tier, webhookUrl } = req.body;

      const merchant = await this.merchantRepository.create({
        name,
        businessName,
        email,
        website,
        tier: tier as MerchantTier,
        webhookUrl,
      });

      await auditService.logCreate(req, 'merchant', merchant.id, { name, businessName, email, tier });

      res.status(201).json({ merchant });
    } catch (error) {
      console.error('Error creating merchant:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create merchant' });
    }
  };

  updateMerchant = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const oldMerchant = await this.merchantRepository.getById(id);
      if (!oldMerchant) {
        res.status(404).json({ error: 'Merchant not found' });
        return;
      }

      // Update settings if provided
      if (updates.settings) {
        await this.merchantRepository.updateSettings(id, updates.settings);
      }

      // Update webhook if provided
      if (updates.webhookUrl !== undefined) {
        await this.merchantRepository.updateWebhook(id, updates.webhookUrl);
      }

      const merchant = await this.merchantRepository.getById(id);

      await auditService.logUpdate(req, 'merchant', id, { ...oldMerchant }, { ...merchant });

      res.json({ merchant });
    } catch (error) {
      console.error('Error updating merchant:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update merchant' });
    }
  };

  updateMerchantStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const oldMerchant = await this.merchantRepository.getById(id);
      if (!oldMerchant) {
        res.status(404).json({ error: 'Merchant not found' });
        return;
      }

      const merchant = await this.merchantRepository.updateStatus(id, status as MerchantStatus);

      await auditService.logStatusChange(req, 'merchant', id, oldMerchant.status, status);

      res.json({ merchant });
    } catch (error) {
      console.error('Error updating merchant status:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update merchant status' });
    }
  };

  deleteMerchant = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const merchant = await this.merchantRepository.getById(id);
      if (!merchant) {
        res.status(404).json({ error: 'Merchant not found' });
        return;
      }

      await pool.query('DELETE FROM merchants WHERE id = $1', [id]);

      await auditService.logDelete(req, 'merchant', id, { ...merchant });

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting merchant:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to delete merchant' });
    }
  };

  rotateMerchantKeys = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const merchant = await this.merchantRepository.getById(id);
      if (!merchant) {
        res.status(404).json({ error: 'Merchant not found' });
        return;
      }

      const newKeys = await this.merchantRepository.rotateApiKeys(id);

      await auditService.logUpdate(req, 'merchant', id, { apiKeyRotated: true }, { apiKeyRotated: true });

      res.json({
        success: true,
        apiKey: newKeys.apiKey,
        apiSecret: newKeys.apiSecret,
      });
    } catch (error) {
      console.error('Error rotating merchant keys:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to rotate merchant keys' });
    }
  };

  // Merchant-Agent Association
  getMerchantAgents = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const agents = await merchantAgentRepository.getByMerchantId(id);
      res.json({ agents });
    } catch (error) {
      console.error('Error getting merchant agents:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get merchant agents' });
    }
  };

  addMerchantAgent = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { agentId, config } = req.body;

      const merchantAgent = await merchantAgentRepository.create({
        merchantId: id,
        agentId,
        config,
      });

      await auditService.logCreate(req, 'merchant_agent', merchantAgent.id, { merchantId: id, agentId });

      res.status(201).json({ merchantAgent });
    } catch (error) {
      console.error('Error adding merchant agent:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to add agent to merchant' });
    }
  };

  updateMerchantAgentConfig = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, agentId } = req.params;
      const { config } = req.body;

      const merchantAgent = await merchantAgentRepository.updateConfig(id, agentId, config);

      if (!merchantAgent) {
        res.status(404).json({ error: 'Merchant-agent association not found' });
        return;
      }

      await auditService.logUpdate(req, 'merchant_agent', merchantAgent.id, {}, { config });

      res.json({ merchantAgent });
    } catch (error) {
      console.error('Error updating merchant agent config:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update agent config' });
    }
  };

  removeMerchantAgent = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, agentId } = req.params;

      const deleted = await merchantAgentRepository.delete(id, agentId);

      if (!deleted) {
        res.status(404).json({ error: 'Merchant-agent association not found' });
        return;
      }

      await auditService.logDelete(req, 'merchant_agent', `${id}_${agentId}`, { merchantId: id, agentId });

      res.json({ success: true });
    } catch (error) {
      console.error('Error removing merchant agent:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to remove agent from merchant' });
    }
  };

  // User Settings and Block/Unblock
  getUserSettings = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const settings = await userSettingsRepository.getOrCreate(userId);
      res.json({ settings });
    } catch (error) {
      console.error('Error getting user settings:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get user settings' });
    }
  };

  updateUserSettings = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const { defaultMaxTransaction, defaultDailyLimit, defaultMonthlyLimit } = req.body;

      const oldSettings = await userSettingsRepository.getByUserId(userId);
      const settings = await userSettingsRepository.updateSettings(userId, {
        defaultMaxTransaction,
        defaultDailyLimit,
        defaultMonthlyLimit,
      });

      await auditService.logUpdate(req, 'user_settings', userId,
        oldSettings ? { ...oldSettings } : {},
        { defaultMaxTransaction, defaultDailyLimit, defaultMonthlyLimit }
      );

      res.json({ settings });
    } catch (error) {
      console.error('Error updating user settings:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update user settings' });
    }
  };

  blockUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        res.status(400).json({ error: 'Block reason is required' });
        return;
      }

      const settings = await userSettingsRepository.blockUser(userId, reason);

      await auditService.logBlock(req, 'user', userId, reason);

      res.json({ settings });
    } catch (error) {
      console.error('Error blocking user:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to block user' });
    }
  };

  unblockUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      const settings = await userSettingsRepository.unblockUser(userId);

      await auditService.logUnblock(req, 'user', userId);

      res.json({ settings });
    } catch (error) {
      console.error('Error unblocking user:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to unblock user' });
    }
  };

  // Certificates
  getAllCertificates = async (req: Request, res: Response): Promise<void> => {
    try {
      const { limit = '50', offset = '0' } = req.query;

      const result = await pool.query(`
        SELECT * FROM ca_certificates
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `, [parseInt(limit as string), parseInt(offset as string)]);

      const countResult = await pool.query('SELECT COUNT(*) FROM ca_certificates');
      const total = parseInt(countResult.rows[0].count);

      res.json({
        certificates: result.rows.map(row => ({
          id: row.id,
          userId: row.user_id,
          agentId: row.agent_id,
          merchantId: row.merchant_id,
          fingerprint: row.fingerprint,
          publicKeyPem: row.public_key_pem,
          certificatePem: row.certificate_pem,
          issuerDn: row.issuer_dn,
          subjectDn: row.subject_dn,
          serialNumber: row.serial_number,
          notBefore: row.not_before,
          notAfter: row.not_after,
          caServerUrl: row.ca_server_url,
          isActive: row.is_active,
          revokedAt: row.revoked_at,
          revokedReason: row.revoked_reason,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })),
        pagination: { total, limit: parseInt(limit as string), offset: parseInt(offset as string) },
      });
    } catch (error: any) {
      if (error.code === '42P01') {
        res.json({ certificates: [], pagination: { total: 0, limit: 50, offset: 0 } });
        return;
      }
      console.error('Error getting certificates:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get certificates' });
    }
  };

  getExpiringCertificates = async (req: Request, res: Response): Promise<void> => {
    try {
      const { days = '30' } = req.query;

      const result = await pool.query(`
        SELECT * FROM ca_certificates
        WHERE is_active = true
          AND not_after <= CURRENT_TIMESTAMP + INTERVAL '${parseInt(days as string)} days'
          AND not_after > CURRENT_TIMESTAMP
        ORDER BY not_after ASC
      `);

      res.json({
        certificates: result.rows.map(row => ({
          id: row.id,
          userId: row.user_id,
          agentId: row.agent_id,
          merchantId: row.merchant_id,
          fingerprint: row.fingerprint,
          subjectDn: row.subject_dn,
          notBefore: row.not_before,
          notAfter: row.not_after,
          isActive: row.is_active,
          createdAt: row.created_at,
        })),
      });
    } catch (error: any) {
      if (error.code === '42P01') {
        res.json({ certificates: [] });
        return;
      }
      console.error('Error getting expiring certificates:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get expiring certificates' });
    }
  };

  getAgentCertificates = async (req: Request, res: Response): Promise<void> => {
    try {
      const { agentId } = req.params;

      const result = await pool.query(`
        SELECT * FROM ca_certificates
        WHERE agent_id = $1
        ORDER BY created_at DESC
      `, [agentId]);

      res.json({
        certificates: result.rows.map(row => ({
          id: row.id,
          userId: row.user_id,
          agentId: row.agent_id,
          fingerprint: row.fingerprint,
          subjectDn: row.subject_dn,
          notBefore: row.not_before,
          notAfter: row.not_after,
          isActive: row.is_active,
          revokedAt: row.revoked_at,
          revokedReason: row.revoked_reason,
          createdAt: row.created_at,
        })),
      });
    } catch (error: any) {
      if (error.code === '42P01') {
        res.json({ certificates: [] });
        return;
      }
      console.error('Error getting agent certificates:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get agent certificates' });
    }
  };

  uploadAgentCertificate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { agentId } = req.params;
      const { certificatePem } = req.body;

      if (!certificatePem) {
        res.status(400).json({ error: 'Certificate PEM is required' });
        return;
      }

      // Verify agent exists
      const agent = await this.agentRepository.getByAgentId(agentId);
      if (!agent) {
        res.status(404).json({ error: 'Agent not found' });
        return;
      }

      // Parse the certificate using Node.js crypto
      let x509: crypto.X509Certificate;
      try {
        x509 = new crypto.X509Certificate(certificatePem);
      } catch (parseError) {
        res.status(400).json({ error: 'Invalid certificate format. Please provide a valid PEM-encoded X.509 certificate.' });
        return;
      }

      // Check if certificate is expired
      const notAfter = new Date(x509.validTo);
      const notBefore = new Date(x509.validFrom);
      if (notAfter < new Date()) {
        res.status(400).json({ error: 'Certificate has expired' });
        return;
      }

      // Generate fingerprint (SHA-256)
      const fingerprint = x509.fingerprint256.replace(/:/g, '').toLowerCase();

      // Extract public key
      const publicKeyPem = x509.publicKey.export({ type: 'spki', format: 'pem' }) as string;

      // Create certificate record
      const certificate = await caCertificateRepository.create({
        userId: (req as any).user?.id || 'system',
        fingerprint,
        publicKeyPem,
        certificatePem,
        issuerDn: x509.issuer,
        subjectDn: x509.subject,
        serialNumber: x509.serialNumber,
        notBefore,
        notAfter,
      });

      // Update agent_id in the certificate record
      await pool.query(
        'UPDATE ca_certificates SET agent_id = $1 WHERE id = $2',
        [agentId, certificate.id]
      );

      await auditService.logCreate(req, 'certificate', certificate.id, {
        agentId,
        fingerprint,
        subject: x509.subject,
        validUntil: notAfter.toISOString(),
      });

      res.status(201).json({
        certificate: {
          id: certificate.id,
          agentId,
          fingerprint,
          subjectDn: x509.subject,
          issuerDn: x509.issuer,
          serialNumber: x509.serialNumber,
          notBefore: notBefore.toISOString(),
          notAfter: notAfter.toISOString(),
          isActive: true,
          createdAt: certificate.createdAt,
        },
      });
    } catch (error) {
      console.error('Error uploading certificate:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to upload certificate' });
    }
  };

  revokeCertificate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) {
        res.status(400).json({ error: 'Revocation reason is required' });
        return;
      }

      // Find the certificate first
      const certResult = await pool.query('SELECT * FROM ca_certificates WHERE id = $1', [id]);
      if (certResult.rows.length === 0) {
        res.status(404).json({ error: 'Certificate not found' });
        return;
      }

      const cert = certResult.rows[0];
      const revoked = await caCertificateRepository.revoke(cert.fingerprint, reason);

      if (!revoked) {
        res.status(500).json({ error: 'Failed to revoke certificate' });
        return;
      }

      await auditService.logRevoke(req, 'certificate', id, reason);

      res.json({ success: true });
    } catch (error: any) {
      if (error.code === '42P01') {
        res.status(404).json({ error: 'Certificate not found' });
        return;
      }
      console.error('Error revoking certificate:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to revoke certificate' });
    }
  };

  // Audit Logs
  getAuditLogs = async (req: Request, res: Response): Promise<void> => {
    try {
      const { action, resourceType, adminUserId, startDate, endDate, limit = '50', offset = '0' } = req.query;

      const { logs, total } = await auditLogRepository.getAll({
        action: action as string | undefined,
        resourceType: resourceType as string | undefined,
        adminUserId: adminUserId as string | undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });

      res.json({
        logs,
        pagination: { total, limit: parseInt(limit as string), offset: parseInt(offset as string) },
      });
    } catch (error) {
      console.error('Error getting audit logs:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get audit logs' });
    }
  };

  // Admin Settings
  getSettings = async (req: Request, res: Response): Promise<void> => {
    try {
      const settings = await adminSettingsRepository.getAll();
      res.json({ settings });
    } catch (error) {
      console.error('Error getting settings:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get settings' });
    }
  };

  getSettingsByCategory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { category } = req.params;
      const settings = await adminSettingsRepository.getByCategory(category);
      res.json({ settings });
    } catch (error) {
      console.error('Error getting settings by category:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get settings' });
    }
  };

  updateSettings = async (req: Request, res: Response): Promise<void> => {
    try {
      const { updates } = req.body;
      const adminUserId = (req as any).user?.id;

      if (!updates || !Array.isArray(updates)) {
        res.status(400).json({ error: 'Updates array is required' });
        return;
      }

      // Validate updates
      for (const update of updates) {
        if (!update.category || !update.key || update.value === undefined) {
          res.status(400).json({ error: 'Each update must have category, key, and value' });
          return;
        }
      }

      const updatedCount = await adminSettingsRepository.bulkUpdate(updates, adminUserId);

      // Log the settings update
      await auditService.logUpdate(req, 'admin_settings', 'bulk', {}, {
        updatedCount,
        categories: [...new Set(updates.map((u: any) => u.category))],
      });

      const settings = await adminSettingsRepository.getAll();
      res.json({ success: true, updatedCount, settings });
    } catch (error) {
      console.error('Error updating settings:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update settings' });
    }
  };
}
