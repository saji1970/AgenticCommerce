import { query } from '../config/database';

async function checkDemoProducts() {
  try {
    // Check demo users
    const demoUserEmails = ['alice@example.com', 'bob@example.com', 'carol@example.com'];
    const usersResult = await query(
      `SELECT id, email FROM users WHERE email = ANY($1)`,
      [demoUserEmails]
    );
    
    console.log('Demo users found:', usersResult.rows.length);
    usersResult.rows.forEach(user => {
      console.log(`  - ${user.email} (${user.id})`);
    });
    
    if (usersResult.rows.length === 0) {
      console.log('\n⚠️  No demo users found!');
      return;
    }
    
    const demoUserIds = usersResult.rows.map(row => row.id);
    
    // Check products for demo users
    const productsResult = await query(
      `SELECT COUNT(*) as count, user_id, 
              array_agg(DISTINCT name) as product_names
       FROM products 
       WHERE user_id = ANY($1)
       GROUP BY user_id`,
      [demoUserIds]
    );
    
    console.log('\nProducts by user:');
    if (productsResult.rows.length === 0) {
      console.log('  ⚠️  No products found for demo users!');
    } else {
      productsResult.rows.forEach(row => {
        console.log(`  User ${row.user_id}: ${row.count} products`);
        const names = row.product_names.slice(0, 5);
        names.forEach((name: string) => console.log(`    - ${name}`));
        if (row.product_names.length > 5) {
          console.log(`    ... and ${row.product_names.length - 5} more`);
        }
      });
    }
    
    // Check all products
    const allProductsResult = await query(
      `SELECT COUNT(*) as count FROM products`
    );
    console.log(`\nTotal products in database: ${allProductsResult.rows[0].count}`);
    
    // Check products with sample names
    const sampleProducts = await query(
      `SELECT name, price, user_id, search_query_id 
       FROM products 
       LIMIT 10`
    );
    
    if (sampleProducts.rows.length > 0) {
      console.log('\nSample products:');
      sampleProducts.rows.forEach((row: any) => {
        console.log(`  - ${row.name} ($${row.price || 'N/A'}) - User: ${row.user_id.substring(0, 8)}...`);
      });
    }
    
  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkDemoProducts();
