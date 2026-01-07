import { ProductFilter, CreateProductFilterDTO } from '@agentic-commerce/shared-types';
import { query } from '../config/database';

export class ProductFilterRepository {
  async create(filterData: CreateProductFilterDTO): Promise<ProductFilter> {
    const result = await query(
      `INSERT INTO product_filters (search_query_id, filter_type, filter_label, filter_value, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        filterData.searchQueryId,
        filterData.filterType,
        filterData.filterLabel,
        JSON.stringify(filterData.filterValue),
        filterData.isActive !== undefined ? filterData.isActive : true,
      ]
    );

    return this.mapToProductFilter(result.rows[0]);
  }

  async bulkCreate(filters: CreateProductFilterDTO[]): Promise<ProductFilter[]> {
    if (filters.length === 0) {
      return [];
    }

    const values: any[] = [];
    const valuePlaceholders: string[] = [];
    let paramCount = 1;

    filters.forEach((filter) => {
      valuePlaceholders.push(
        `($${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++})`
      );
      values.push(
        filter.searchQueryId,
        filter.filterType,
        filter.filterLabel,
        JSON.stringify(filter.filterValue),
        filter.isActive !== undefined ? filter.isActive : true
      );
    });

    const result = await query(
      `INSERT INTO product_filters (search_query_id, filter_type, filter_label, filter_value, is_active)
       VALUES ${valuePlaceholders.join(', ')}
       RETURNING *`,
      values
    );

    return result.rows.map(row => this.mapToProductFilter(row));
  }

  async findById(id: string): Promise<ProductFilter | null> {
    const result = await query(
      'SELECT * FROM product_filters WHERE id = $1',
      [id]
    );

    return result.rows.length > 0 ? this.mapToProductFilter(result.rows[0]) : null;
  }

  async findBySearchQueryId(searchQueryId: string): Promise<ProductFilter[]> {
    const result = await query(
      `SELECT * FROM product_filters
       WHERE search_query_id = $1
       ORDER BY created_at ASC`,
      [searchQueryId]
    );

    return result.rows.map(row => this.mapToProductFilter(row));
  }

  async findActiveBySearchQueryId(searchQueryId: string): Promise<ProductFilter[]> {
    const result = await query(
      `SELECT * FROM product_filters
       WHERE search_query_id = $1 AND is_active = true
       ORDER BY created_at ASC`,
      [searchQueryId]
    );

    return result.rows.map(row => this.mapToProductFilter(row));
  }

  async updateActiveStatus(id: string, isActive: boolean): Promise<void> {
    await query(
      `UPDATE product_filters
       SET is_active = $2
       WHERE id = $1`,
      [id, isActive]
    );
  }

  async delete(id: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM product_filters WHERE id = $1',
      [id]
    );

    return result.rowCount !== null && result.rowCount > 0;
  }

  async deleteBySearchQueryId(searchQueryId: string): Promise<number> {
    const result = await query(
      'DELETE FROM product_filters WHERE search_query_id = $1',
      [searchQueryId]
    );

    return result.rowCount || 0;
  }

  private mapToProductFilter(row: any): ProductFilter {
    return {
      id: row.id,
      searchQueryId: row.search_query_id,
      filterType: row.filter_type,
      filterLabel: row.filter_label,
      filterValue: row.filter_value,
      isActive: row.is_active,
      createdAt: row.created_at,
    };
  }
}
