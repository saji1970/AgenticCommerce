/**
 * Sample Data Generation Script
 * Creates demo users, mandates, intents, and transactions for testing
 */

import { pool } from '../config/database';
import bcrypt from 'bcrypt';

async function generateSampleData() {
  console.log('🎬 Starting sample data generation...\n');

  try {
    // Sample users
    const sampleUsers = [
      {
        email: 'alice@example.com',
        password: 'Demo123!',
        firstName: 'Alice',
        lastName: 'Johnson',
      },
      {
        email: 'bob@example.com',
        password: 'Demo123!',
        firstName: 'Bob',
        lastName: 'Smith',
      },
      {
        email: 'carol@example.com',
        password: 'Demo123!',
        firstName: 'Carol',
        lastName: 'Williams',
      },
    ];

    console.log('👥 Creating sample users...');
    const userIds: string[] = [];

    for (const user of sampleUsers) {
      // Check if user exists
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [user.email]);

      let userId: string;

      if (existing.rows.length > 0) {
        userId = existing.rows[0].id;
        console.log(`   ✓ User ${user.email} already exists`);
      } else {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        const result = await pool.query(
          `INSERT INTO users (email, password_hash, first_name, last_name)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [user.email, hashedPassword, user.firstName, user.lastName]
        );
        userId = result.rows[0].id;
        console.log(`   ✓ Created user: ${user.email}`);
      }

      userIds.push(userId);
    }

    // Sample agents
    const sampleAgents = [
      { id: 'smart-shopper-ai', name: 'Smart Shopper AI' },
      { id: 'deal-hunter-bot', name: 'Deal Hunter Bot' },
      { id: 'personal-assistant', name: 'Personal Shopping Assistant' },
    ];

    console.log('\n🤖 Creating sample mandates...');

    // Create mandates for each user
    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i];
      const agent = sampleAgents[i % sampleAgents.length];

      // Cart mandate
      const cartMandate = await pool.query(
        `INSERT INTO mandates (
          user_id, agent_id, agent_name, type, status, constraints, valid_from
        )
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        ON CONFLICT DO NOTHING
        RETURNING id`,
        [
          userId,
          agent.id,
          agent.name,
          'cart',
          'active',
          JSON.stringify({
            maxItemValue: 500,
            maxItemsPerDay: 10,
            allowedCategories: ['Electronics', 'Books', 'Home & Kitchen'],
          }),
        ]
      );

      if (cartMandate.rows.length > 0) {
        console.log(`   ✓ Created cart mandate for user ${i + 1}`);

        // Log some cart actions
        await pool.query(
          `INSERT INTO agent_action_logs (
            user_id, agent_id, mandate_id, action, resource_type, metadata, success
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            userId,
            agent.id,
            cartMandate.rows[0].id,
            'add_to_cart',
            'cart',
            JSON.stringify({ productName: 'Wireless Headphones', price: 99.99 }),
            true,
          ]
        );
      }

      // Intent mandate
      const intentMandate = await pool.query(
        `INSERT INTO mandates (
          user_id, agent_id, agent_name, type, status, constraints, valid_from
        )
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        ON CONFLICT DO NOTHING
        RETURNING id`,
        [
          userId,
          agent.id,
          agent.name,
          'intent',
          'active',
          JSON.stringify({
            maxIntentValue: 2000,
            maxIntentsPerDay: 5,
            autoApproveUnder: 100,
            expiryHours: 48,
          }),
        ]
      );

      if (intentMandate.rows.length > 0) {
        console.log(`   ✓ Created intent mandate for user ${i + 1}`);

        // Create sample purchase intents
        const intentExamples = [
          {
            productName: 'MacBook Pro 16"',
            reasoning: 'Price dropped to $1,899 during Black Friday sale',
            price: 1899,
            status: 'pending',
          },
          {
            productName: 'Sony WH-1000XM5 Headphones',
            reasoning: 'User requested noise-cancelling headphones under $350',
            price: 349,
            status: 'approved',
          },
          {
            productName: 'iPad Air',
            reasoning: 'Found at target price of $599 with student discount',
            price: 599,
            status: 'executed',
          },
        ];

        for (const intent of intentExamples) {
          await pool.query(
            `INSERT INTO purchase_intents (
              user_id, agent_id, mandate_id, items, subtotal, tax, total, reasoning, status, expires_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP + INTERVAL '48 hours')`,
            [
              userId,
              agent.id,
              intentMandate.rows[0].id,
              JSON.stringify([
                {
                  productId: `prod-${Math.random().toString(36).substring(7)}`,
                  productName: intent.productName,
                  quantity: 1,
                  price: intent.price,
                },
              ]),
              intent.price,
              intent.price * 0.08,
              intent.price * 1.08,
              intent.reasoning,
              intent.status,
            ]
          );
        }
        console.log(`   ✓ Created 3 sample intents for user ${i + 1}`);
      }

      // Payment mandate (for user 1 only)
      if (i === 0) {
        const paymentMandate = await pool.query(
          `INSERT INTO mandates (
            user_id, agent_id, agent_name, type, status, constraints, valid_from
          )
          VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
          ON CONFLICT DO NOTHING
          RETURNING id`,
          [
            userId,
            agent.id,
            agent.name,
            'payment',
            'active',
            JSON.stringify({
              maxTransactionAmount: 1000,
              dailySpendingLimit: 2000,
              monthlySpendingLimit: 10000,
              allowedPaymentMethods: ['card', 'paypal'],
            }),
          ]
        );

        if (paymentMandate.rows.length > 0) {
          console.log(`   ✓ Created payment mandate for user ${i + 1}`);
        }
      }
    }

    // Create sample products if they don't exist
    console.log('\n📦 Creating sample products...');

    const sampleProducts = [
      {
        name: 'MacBook Pro 16" M3 Max',
        description: 'Powerful laptop for professionals',
        price: 2499,
        category: 'Electronics',
        stock: 15,
        image: 'https://via.placeholder.com/300x300/1a1a1a/ffffff?text=MacBook+Pro',
      },
      {
        name: 'Sony WH-1000XM5 Headphones',
        description: 'Industry-leading noise cancellation',
        price: 399,
        category: 'Electronics',
        stock: 30,
        image: 'https://via.placeholder.com/300x300/000000/ffffff?text=Sony+Headphones',
      },
      {
        name: 'iPad Air 11"',
        description: 'Lightweight and powerful tablet',
        price: 699,
        category: 'Electronics',
        stock: 25,
        image: 'https://via.placeholder.com/300x300/f5f5f7/000000?text=iPad+Air',
      },
      {
        name: 'AirPods Pro (2nd gen)',
        description: 'Active noise cancellation and spatial audio',
        price: 249,
        category: 'Electronics',
        stock: 50,
        image: 'https://via.placeholder.com/300x300/ffffff/000000?text=AirPods+Pro',
      },
      {
        name: 'Apple Watch Series 9',
        description: 'Advanced health and fitness features',
        price: 429,
        category: 'Electronics',
        stock: 20,
        image: 'https://via.placeholder.com/300x300/000000/ffffff?text=Apple+Watch',
      },
      {
        name: 'Kindle Paperwhite',
        description: 'Glare-free display, waterproof',
        price: 139,
        category: 'Books',
        stock: 40,
        image: 'https://via.placeholder.com/300x300/34495e/ffffff?text=Kindle',
      },
      {
        name: 'Dyson V15 Detect',
        description: 'Powerful cordless vacuum cleaner',
        price: 649,
        category: 'Home & Kitchen',
        stock: 12,
        image: 'https://via.placeholder.com/300x300/ffd700/000000?text=Dyson',
      },
      {
        name: 'Ninja Air Fryer',
        description: 'Large capacity air fryer with multiple functions',
        price: 129,
        category: 'Home & Kitchen',
        stock: 35,
        image: 'https://via.placeholder.com/300x300/ff6b6b/ffffff?text=Air+Fryer',
      },
    ];

    for (const product of sampleProducts) {
      const existing = await pool.query('SELECT id FROM products WHERE name = $1', [product.name]);

      if (existing.rows.length === 0) {
        await pool.query(
          `INSERT INTO products (name, description, price, category, stock_quantity, image_url)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [product.name, product.description, product.price, product.category, product.stock, product.image]
        );
        console.log(`   ✓ Created product: ${product.name}`);
      } else {
        console.log(`   ✓ Product ${product.name} already exists`);
      }
    }

    // Create AP2 transactions for demo merchant
    console.log('\n💳 Creating sample AP2 transactions...');

    const demoMerchant = await pool.query(
      `SELECT id FROM merchants WHERE email = 'demo@merchant.com'`
    );

    if (demoMerchant.rows.length > 0) {
      const merchantId = demoMerchant.rows[0].id;

      // Get a mandate ID
      const mandates = await pool.query(
        `SELECT id FROM mandates WHERE user_id = $1 LIMIT 1`,
        [userIds[0]]
      );

      if (mandates.rows.length > 0) {
        const mandateId = mandates.rows[0].id;

        const transactionTypes = ['cart_add', 'intent_create', 'payment_execute'];
        const transactionStatuses = ['completed', 'completed', 'completed', 'failed'];

        for (let i = 0; i < 5; i++) {
          const type = transactionTypes[i % transactionTypes.length];
          const status = transactionStatuses[i % transactionStatuses.length];
          const amount = Math.floor(Math.random() * 500) + 50;

          await pool.query(
            `INSERT INTO ap2_transactions (
              merchant_id, user_id, agent_id, mandate_id, type, status, amount, metadata
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              merchantId,
              userIds[0],
              'smart-shopper-ai',
              mandateId,
              type,
              status,
              amount,
              JSON.stringify({ description: `Sample ${type} transaction` }),
            ]
          );
        }

        console.log(`   ✓ Created 5 sample AP2 transactions`);
      }
    }

    console.log('\n✅ Sample data generation complete!');
    console.log('\n📋 Demo Credentials:');
    console.log('   Email: alice@example.com');
    console.log('   Email: bob@example.com');
    console.log('   Email: carol@example.com');
    console.log('   Password (all users): Demo123!');

    console.log('\n🎯 What was created:');
    console.log(`   • ${sampleUsers.length} demo users`);
    console.log(`   • ${sampleUsers.length * 2} mandates (cart + intent)`);
    console.log(`   • ${sampleUsers.length * 3} purchase intents`);
    console.log(`   • ${sampleProducts.length} sample products`);
    console.log('   • 5 AP2 transactions');

  } catch (error) {
    console.error('❌ Error generating sample data:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
generateSampleData()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
