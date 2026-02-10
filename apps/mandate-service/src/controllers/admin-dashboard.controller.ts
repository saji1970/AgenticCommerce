import { Request, Response } from 'express';
import { query } from '../config/database';

export const adminDashboardController = {
  getStats: async (req: Request, res: Response) => {
    try {
      const caller = req.adminCaller!;
      const isSuperAdmin = caller.adminRole === 'super_admin';
      const merchantId = caller.merchantId;

      // Merchants count
      let totalMerchants = 0;
      if (isSuperAdmin) {
        const r = await query('SELECT COUNT(*)::int AS count FROM merchants');
        totalMerchants = r.rows[0].count;
      } else {
        totalMerchants = 1; // own merchant
      }

      // Agents count (scoped by merchant_id)
      let totalAgents = 0;
      if (isSuperAdmin) {
        const r = await query('SELECT COUNT(*)::int AS count FROM ai_agent_apps');
        totalAgents = r.rows[0].count;
      } else if (merchantId) {
        const r = await query('SELECT COUNT(*)::int AS count FROM ai_agent_apps WHERE merchant_id = $1', [merchantId]);
        totalAgents = r.rows[0].count;
      }

      // Mandates by status (scoped via agent's merchant_id for non-super_admin)
      let mandateStatusQuery: string;
      let mandateStatusParams: any[] = [];
      if (!isSuperAdmin && merchantId) {
        mandateStatusQuery = `
          SELECT am.status, COUNT(*)::int AS count FROM agent_mandates am
          INNER JOIN ai_agent_apps aaa ON am.agent_id = aaa.agent_id
          WHERE aaa.merchant_id = $1
          GROUP BY am.status`;
        mandateStatusParams = [merchantId];
      } else {
        mandateStatusQuery = 'SELECT status, COUNT(*)::int AS count FROM agent_mandates GROUP BY status';
      }
      const mandateResult = await query(mandateStatusQuery, mandateStatusParams);
      const mandatesByStatus: Record<string, number> = {};
      let totalMandates = 0;
      for (const row of mandateResult.rows) {
        mandatesByStatus[row.status] = row.count;
        totalMandates += row.count;
      }

      // Mandates by type (scoped)
      let mandateTypeQuery: string;
      let mandateTypeParams: any[] = [];
      if (!isSuperAdmin && merchantId) {
        mandateTypeQuery = `
          SELECT am.type, COUNT(*)::int AS count FROM agent_mandates am
          INNER JOIN ai_agent_apps aaa ON am.agent_id = aaa.agent_id
          WHERE aaa.merchant_id = $1
          GROUP BY am.type`;
        mandateTypeParams = [merchantId];
      } else {
        mandateTypeQuery = 'SELECT type, COUNT(*)::int AS count FROM agent_mandates GROUP BY type';
      }
      const typeResult = await query(mandateTypeQuery, mandateTypeParams);
      const mandatesByType: Record<string, number> = {};
      for (const row of typeResult.rows) {
        mandatesByType[row.type] = row.count;
      }

      // Recent activity (mandates created per day, last 7 days)
      const activityResult = await query(`
        SELECT DATE(created_at) AS date, COUNT(*)::int AS count
        FROM agent_mandates
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(created_at)
        ORDER BY date
      `);
      const recentActivity = activityResult.rows.map(r => ({
        date: r.date,
        count: r.count,
      }));

      // Transaction stats
      let totalTransactions = 0;
      let totalVolume = 0;
      try {
        let txQuery: string;
        let txParams: any[] = [];
        if (!isSuperAdmin && merchantId) {
          txQuery = `SELECT COUNT(*)::int AS count, COALESCE(SUM(amount), 0)::numeric AS volume FROM transactions WHERE merchant_id = $1`;
          txParams = [merchantId];
        } else {
          txQuery = `SELECT COUNT(*)::int AS count, COALESCE(SUM(amount), 0)::numeric AS volume FROM transactions`;
        }
        const txResult = await query(txQuery, txParams);
        totalTransactions = txResult.rows[0].count;
        totalVolume = parseFloat(txResult.rows[0].volume) || 0;
      } catch {
        // transactions table may not exist yet
      }

      res.json({
        stats: {
          totalMerchants,
          totalAgents,
          totalUsers: 0, // end users are in the backend DB, not mandate-service
          mandates: {
            byStatus: mandatesByStatus,
            byType: mandatesByType,
            total: totalMandates,
          },
          intents: { byStatus: {}, total: 0 },
          spending: { totalSpent: 0 },
          activity: { recent: recentActivity },
          ap2: { totalTransactions, totalVolume },
        },
      });
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({ error: 'Failed to load dashboard stats' });
    }
  },
};
