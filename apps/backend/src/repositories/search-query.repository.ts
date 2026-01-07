import { SearchQuery, CreateSearchQueryDTO } from '@agentic-commerce/shared-types';
import { query } from '../config/database';

export class SearchQueryRepository {
  async create(queryData: CreateSearchQueryDTO): Promise<SearchQuery> {
    const result = await query(
      `INSERT INTO search_queries (user_id, query_text, metadata)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [
        queryData.userId,
        queryData.queryText,
        queryData.metadata ? JSON.stringify(queryData.metadata) : null,
      ]
    );

    return this.mapToSearchQuery(result.rows[0]);
  }

  async findById(id: string): Promise<SearchQuery | null> {
    const result = await query(
      'SELECT * FROM search_queries WHERE id = $1',
      [id]
    );

    return result.rows.length > 0 ? this.mapToSearchQuery(result.rows[0]) : null;
  }

  async findByUserId(userId: string, limit: number = 10): Promise<SearchQuery[]> {
    const result = await query(
      `SELECT * FROM search_queries
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows.map(row => this.mapToSearchQuery(row));
  }

  async updateStatus(
    id: string,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    resultsCount?: number
  ): Promise<void> {
    const updates = ['status = $2'];
    const values: any[] = [id, status];
    let paramCount = 3;

    if (resultsCount !== undefined) {
      updates.push(`results_count = $${paramCount++}`);
      values.push(resultsCount);
    }

    await query(
      `UPDATE search_queries
       SET ${updates.join(', ')}
       WHERE id = $1`,
      values
    );
  }

  async complete(id: string, resultsCount: number): Promise<void> {
    await query(
      `UPDATE search_queries
       SET status = 'completed', results_count = $2, completed_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id, resultsCount]
    );
  }

  async setError(id: string, errorMessage: string): Promise<void> {
    await query(
      `UPDATE search_queries
       SET status = 'failed', error_message = $2, completed_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id, errorMessage]
    );
  }

  async delete(id: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM search_queries WHERE id = $1',
      [id]
    );

    return result.rowCount !== null && result.rowCount > 0;
  }

  async deleteByUserId(userId: string): Promise<number> {
    const result = await query(
      'DELETE FROM search_queries WHERE user_id = $1',
      [userId]
    );

    return result.rowCount || 0;
  }

  private mapToSearchQuery(row: any): SearchQuery {
    return {
      id: row.id,
      userId: row.user_id,
      queryText: row.query_text,
      status: row.status,
      resultsCount: row.results_count,
      errorMessage: row.error_message,
      metadata: row.metadata,
      createdAt: row.created_at,
      completedAt: row.completed_at,
    };
  }
}
