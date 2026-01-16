import { pool } from '../config/database';

async function clearSearchHistory() {
  try {
    console.log('🗑️  Clearing all search queries and related data...');

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Delete products first (they reference search_queries via search_query_id)
      console.log('Deleting products...');
      const productsResult = await client.query('DELETE FROM products');
      console.log(`✅ Deleted ${productsResult.rowCount || 0} products`);

      // Delete product filters (they reference search_queries)
      console.log('Deleting product filters...');
      const filtersResult = await client.query('DELETE FROM product_filters');
      console.log(`✅ Deleted ${filtersResult.rowCount || 0} product filters`);

      // Delete AI processing logs (they reference search_queries)
      console.log('Deleting AI processing logs...');
      const logsResult = await client.query('DELETE FROM ai_processing_logs');
      console.log(`✅ Deleted ${logsResult.rowCount || 0} AI processing logs`);

      // Finally, delete all search queries
      console.log('Deleting search queries...');
      const queriesResult = await client.query('DELETE FROM search_queries');
      console.log(`✅ Deleted ${queriesResult.rowCount || 0} search queries`);

      await client.query('COMMIT');
      console.log('\n✅ All search history cleared successfully!');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing search history:', error);
    process.exit(1);
  }
}

clearSearchHistory();

