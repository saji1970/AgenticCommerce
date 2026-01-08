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
