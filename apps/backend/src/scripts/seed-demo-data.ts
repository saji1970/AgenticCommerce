/**
 * Seed Demo Data for Current User
 * Creates sample mandates, intents, and products for showcasing
 */

import { pool } from '../config/database';

const DEMO_USER_ID = 'cfd469c6-266e-4134-a5bc-b485dd583e1c';

async function seedDemoData() {
  console.log('🎬 Seeding demo data for user:', DEMO_USER_ID);

  try {
    // 1. Create sample mandates
    console.log('\n🤖 Creating sample mandates...');

    const mandates = [
      {
        agentId: 'smart-shopper-ai',
        agentName: 'Smart Shopper AI',
        type: 'cart',
        status: 'active',
        constraints: {
          maxItemValue: 500,
          maxItemsPerDay: 10,
          allowedCategories: ['Electronics', 'Books', 'Home & Kitchen'],
        },
      },
      {
        agentId: 'deal-hunter-bot',
        agentName: 'Deal Hunter Bot',
        type: 'intent',
        status: 'active',
        constraints: {
          maxIntentValue: 2000,
          maxIntentsPerDay: 5,
          autoApproveUnder: 100,
          expiryHours: 48,
        },
      },
      {
        agentId: 'price-tracker-ai',
        agentName: 'Price Tracker AI',
        type: 'payment',
        status: 'active',
        constraints: {
          maxTransactionAmount: 1000,
          dailySpendingLimit: 2000,
          monthlySpendingLimit: 10000,
          allowedPaymentMethods: ['card', 'paypal'],
        },
      },
    ];

    const mandateIds: string[] = [];

    for (const mandate of mandates) {
      // Check if mandate already exists
      const existing = await pool.query(
        'SELECT id FROM agent_mandates WHERE user_id = $1 AND agent_id = $2 AND type = $3',
        [DEMO_USER_ID, mandate.agentId, mandate.type]
      );

      if (existing.rows.length > 0) {
        mandateIds.push(existing.rows[0].id);
        console.log(`   ✓ Mandate ${mandate.type} for ${mandate.agentName} already exists`);
      } else {
        const result = await pool.query(
          `INSERT INTO agent_mandates (user_id, agent_id, agent_name, type, status, constraints)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [
            DEMO_USER_ID,
            mandate.agentId,
            mandate.agentName,
            mandate.type,
            mandate.status,
            JSON.stringify(mandate.constraints),
          ]
        );
        mandateIds.push(result.rows[0].id);
        console.log(`   ✓ Created ${mandate.type} mandate for ${mandate.agentName}`);
      }
    }

    // 2. Create sample purchase intents
    console.log('\n🛒 Creating sample purchase intents...');

    const intents = [
      {
        agentId: 'deal-hunter-bot',
        items: [{ productId: 'prod-mbp16', productName: 'MacBook Pro 16" M3 Max', quantity: 1, price: 2499 }],
        subtotal: 2499,
        reasoning: 'Found MacBook Pro at lowest price in 6 months during holiday sale',
        status: 'pending',
      },
      {
        agentId: 'smart-shopper-ai',
        items: [{ productId: 'prod-sony-xm5', productName: 'Sony WH-1000XM5 Headphones', quantity: 1, price: 349 }],
        subtotal: 349,
        reasoning: 'User requested noise-cancelling headphones under $400 - found best match',
        status: 'approved',
      },
      {
        agentId: 'price-tracker-ai',
        items: [{ productId: 'prod-ipad-air', productName: 'iPad Air 11" M2', quantity: 1, price: 599 }],
        subtotal: 599,
        reasoning: 'Price dropped to target of $599 with education discount applied',
        status: 'executed',
      },
      {
        agentId: 'deal-hunter-bot',
        items: [
          { productId: 'prod-airpods', productName: 'AirPods Pro 2nd Gen', quantity: 1, price: 199 },
          { productId: 'prod-case', productName: 'Silicone Case', quantity: 1, price: 29 },
        ],
        subtotal: 228,
        reasoning: 'Bundle deal found: AirPods Pro + Case for $50 off regular price',
        status: 'pending',
      },
      {
        agentId: 'smart-shopper-ai',
        items: [{ productId: 'prod-watch', productName: 'Apple Watch Series 9', quantity: 1, price: 399 }],
        subtotal: 399,
        reasoning: 'Matched user preferences: GPS model, 45mm, Midnight color in stock',
        status: 'rejected',
      },
    ];

    for (const intent of intents) {
      const existing = await pool.query(
        `SELECT id FROM purchase_intents WHERE user_id = $1 AND agent_id = $2 AND subtotal = $3`,
        [DEMO_USER_ID, intent.agentId, intent.subtotal]
      );

      if (existing.rows.length > 0) {
        console.log(`   ✓ Intent for ${intent.items[0].productName} already exists`);
      } else {
        const tax = intent.subtotal * 0.08;
        const total = intent.subtotal + tax;

        await pool.query(
          `INSERT INTO purchase_intents (user_id, agent_id, items, subtotal, tax, total, reasoning, status, expires_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP + INTERVAL '48 hours')`,
          [
            DEMO_USER_ID,
            intent.agentId,
            JSON.stringify(intent.items),
            intent.subtotal,
            tax,
            total,
            intent.reasoning,
            intent.status,
          ]
        );
        console.log(`   ✓ Created ${intent.status} intent: ${intent.items[0].productName}`);
      }
    }

    // 3. Create sample products
    console.log('\n📦 Creating sample products...');

    const products = [
      {
        name: 'MacBook Pro 16" M3 Max',
        description: 'The most powerful MacBook Pro ever. M3 Max chip with 16-core CPU, 40-core GPU.',
        price: 2499,
        currency: 'USD',
        imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400',
        sourceUrl: 'https://apple.com/shop/buy-mac/macbook-pro',
        availability: 'In Stock',
        rating: 4.9,
        reviewCount: 1250,
      },
      {
        name: 'Sony WH-1000XM5 Headphones',
        description: 'Industry-leading noise cancellation with 30-hour battery life.',
        price: 349,
        currency: 'USD',
        imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
        sourceUrl: 'https://electronics.sony.com/audio/headphones/headband/p/wh1000xm5-b',
        availability: 'In Stock',
        rating: 4.8,
        reviewCount: 3420,
      },
      {
        name: 'iPad Air 11" M2',
        description: 'Powerful. Colorful. Wonderful. M2 chip for next-level performance.',
        price: 599,
        currency: 'USD',
        imageUrl: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400',
        sourceUrl: 'https://apple.com/shop/buy-ipad/ipad-air',
        availability: 'In Stock',
        rating: 4.7,
        reviewCount: 890,
      },
      {
        name: 'AirPods Pro 2nd Gen',
        description: 'Active Noise Cancellation, Adaptive Audio, USB-C charging.',
        price: 249,
        currency: 'USD',
        imageUrl: 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=400',
        sourceUrl: 'https://apple.com/shop/product/airpods-pro',
        availability: 'In Stock',
        rating: 4.8,
        reviewCount: 5670,
      },
      {
        name: 'Apple Watch Series 9',
        description: 'Smarter. Brighter. Mightier. S9 chip with double tap gesture.',
        price: 399,
        currency: 'USD',
        imageUrl: 'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=400',
        sourceUrl: 'https://apple.com/shop/buy-watch/apple-watch',
        availability: 'In Stock',
        rating: 4.6,
        reviewCount: 2340,
      },
      {
        name: 'Samsung Galaxy S24 Ultra',
        description: 'AI-powered smartphone with S Pen and 200MP camera.',
        price: 1299,
        currency: 'USD',
        imageUrl: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400',
        sourceUrl: 'https://samsung.com/us/smartphones/galaxy-s24-ultra',
        availability: 'In Stock',
        rating: 4.7,
        reviewCount: 1890,
      },
      {
        name: 'Dyson V15 Detect Vacuum',
        description: 'Laser reveals microscopic dust. HEPA filtration captures allergens.',
        price: 749,
        currency: 'USD',
        imageUrl: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=400',
        sourceUrl: 'https://dyson.com/vacuum-cleaners/cordless/v15',
        availability: 'In Stock',
        rating: 4.5,
        reviewCount: 670,
      },
      {
        name: 'Herman Miller Aeron Chair',
        description: 'Ergonomic office chair with PostureFit SL and 8Z Pellicle.',
        price: 1395,
        currency: 'USD',
        imageUrl: 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=400',
        sourceUrl: 'https://hermanmiller.com/products/seating/office-chairs/aeron-chairs',
        availability: 'In Stock',
        rating: 4.9,
        reviewCount: 4520,
      },
    ];

    // First create a search query to associate products with
    let searchQueryId: string;
    const existingQuery = await pool.query(
      `SELECT id FROM search_queries WHERE user_id = $1 AND query_text = 'Demo Products' LIMIT 1`,
      [DEMO_USER_ID]
    );

    if (existingQuery.rows.length > 0) {
      searchQueryId = existingQuery.rows[0].id;
    } else {
      const queryResult = await pool.query(
        `INSERT INTO search_queries (user_id, query_text, status) VALUES ($1, 'Demo Products', 'completed') RETURNING id`,
        [DEMO_USER_ID]
      );
      searchQueryId = queryResult.rows[0].id;
    }

    for (const product of products) {
      const existing = await pool.query(
        'SELECT id FROM products WHERE name = $1 AND user_id = $2',
        [product.name, DEMO_USER_ID]
      );

      if (existing.rows.length > 0) {
        console.log(`   ✓ Product ${product.name} already exists`);
      } else {
        await pool.query(
          `INSERT INTO products (
            user_id, search_query_id, name, description, price, currency,
            image_url, source_url, availability, rating, review_count
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            DEMO_USER_ID,
            searchQueryId,
            product.name,
            product.description,
            product.price,
            product.currency,
            product.imageUrl,
            product.sourceUrl,
            product.availability,
            product.rating,
            product.reviewCount,
          ]
        );
        console.log(`   ✓ Created product: ${product.name}`);
      }
    }

    console.log('\n✅ Demo data seeding complete!');
    console.log('\n🎯 Summary:');
    console.log(`   • 3 agent mandates (cart, intent, payment)`);
    console.log(`   • 5 purchase intents (pending, approved, executed, rejected)`);
    console.log(`   • ${products.length} sample products`);

  } catch (error) {
    console.error('❌ Error seeding demo data:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
seedDemoData()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
