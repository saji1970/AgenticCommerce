import { Product, CreateProductDTO, UpdateProductDTO, ProductFilters } from '@agentic-commerce/shared-types';
import { query } from '../config/database';

export class ProductRepository {
  async create(productData: CreateProductDTO): Promise<Product> {
    const result = await query(
      `INSERT INTO products (user_id, name, description, price, currency, image_url, product_url, source, raw_data, ai_extracted)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        productData.userId,
        productData.name,
        productData.description,
        productData.price,
        productData.currency || 'USD',
        productData.imageUrl,
        productData.productUrl,
        productData.source,
        productData.rawData ? JSON.stringify(productData.rawData) : null,
        productData.aiExtracted !== undefined ? productData.aiExtracted : true,
      ]
    );

    return this.mapToProduct(result.rows[0]);
  }

  async bulkCreate(products: CreateProductDTO[]): Promise<Product[]> {
    if (products.length === 0) {
      return [];
    }

    const values: any[] = [];
    const valuePlaceholders: string[] = [];
    let paramCount = 1;

    products.forEach((product) => {
      valuePlaceholders.push(
        `($${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++})`
      );
      values.push(
        product.userId,
        product.name,
        product.description,
        product.price,
        product.currency || 'USD',
        product.imageUrl,
        product.productUrl,
        product.source,
        product.rawData ? JSON.stringify(product.rawData) : null,
        product.aiExtracted !== undefined ? product.aiExtracted : true
      );
    });

    const result = await query(
      `INSERT INTO products (user_id, name, description, price, currency, image_url, product_url, source, raw_data, ai_extracted)
       VALUES ${valuePlaceholders.join(', ')}
       RETURNING *`,
      values
    );

    return result.rows.map(row => this.mapToProduct(row));
  }

  async findById(id: string): Promise<Product | null> {
    const result = await query(
      'SELECT * FROM products WHERE id = $1',
      [id]
    );

    return result.rows.length > 0 ? this.mapToProduct(result.rows[0]) : null;
  }

  async findByUserId(userId: string, filters?: ProductFilters): Promise<Product[]> {
    let queryText = 'SELECT * FROM products WHERE user_id = $1';
    const values: any[] = [userId];
    let paramCount = 2;

    if (filters) {
      if (filters.minPrice !== undefined) {
        queryText += ` AND price >= $${paramCount++}`;
        values.push(filters.minPrice);
      }
      if (filters.maxPrice !== undefined) {
        queryText += ` AND price <= $${paramCount++}`;
        values.push(filters.maxPrice);
      }
      if (filters.source) {
        queryText += ` AND source = $${paramCount++}`;
        values.push(filters.source);
      }
      if (filters.search) {
        queryText += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
        values.push(`%${filters.search}%`);
        paramCount++;
      }

      // Sorting
      if (filters.sortBy) {
        const sortColumn = filters.sortBy === 'price' ? 'price' : 'created_at';
        const sortOrder = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';
        queryText += ` ORDER BY ${sortColumn} ${sortOrder}`;
      } else {
        queryText += ' ORDER BY created_at DESC';
      }

      // Pagination
      const limit = filters.limit || 20;
      const offset = ((filters.page || 1) - 1) * limit;
      queryText += ` LIMIT $${paramCount++} OFFSET $${paramCount++}`;
      values.push(limit, offset);
    } else {
      queryText += ' ORDER BY created_at DESC';
    }

    const result = await query(queryText, values);
    return result.rows.map(row => this.mapToProduct(row));
  }

  async countByUserId(userId: string, filters?: ProductFilters): Promise<number> {
    let queryText = 'SELECT COUNT(*) FROM products WHERE user_id = $1';
    const values: any[] = [userId];
    let paramCount = 2;

    if (filters) {
      if (filters.minPrice !== undefined) {
        queryText += ` AND price >= $${paramCount++}`;
        values.push(filters.minPrice);
      }
      if (filters.maxPrice !== undefined) {
        queryText += ` AND price <= $${paramCount++}`;
        values.push(filters.maxPrice);
      }
      if (filters.source) {
        queryText += ` AND source = $${paramCount++}`;
        values.push(filters.source);
      }
      if (filters.search) {
        queryText += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
        values.push(`%${filters.search}%`);
        paramCount++;
      }
    }

    const result = await query(queryText, values);
    return parseInt(result.rows[0].count, 10);
  }

  async update(id: string, productData: UpdateProductDTO): Promise<Product | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (productData.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(productData.name);
    }
    if (productData.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(productData.description);
    }
    if (productData.price !== undefined) {
      updates.push(`price = $${paramCount++}`);
      values.push(productData.price);
    }
    if (productData.currency !== undefined) {
      updates.push(`currency = $${paramCount++}`);
      values.push(productData.currency);
    }
    if (productData.imageUrl !== undefined) {
      updates.push(`image_url = $${paramCount++}`);
      values.push(productData.imageUrl);
    }
    if (productData.productUrl !== undefined) {
      updates.push(`product_url = $${paramCount++}`);
      values.push(productData.productUrl);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const result = await query(
      `UPDATE products SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    return result.rows.length > 0 ? this.mapToProduct(result.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM products WHERE id = $1',
      [id]
    );

    return result.rowCount !== null && result.rowCount > 0;
  }

  async deleteByUserId(userId: string): Promise<number> {
    const result = await query(
      'DELETE FROM products WHERE user_id = $1',
      [userId]
    );

    return result.rowCount || 0;
  }

  private mapToProduct(row: any): Product {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      description: row.description,
      price: row.price ? parseFloat(row.price) : undefined,
      currency: row.currency,
      imageUrl: row.image_url,
      productUrl: row.product_url,
      source: row.source,
      rawData: row.raw_data,
      aiExtracted: row.ai_extracted,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
