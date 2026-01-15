/**
 * Seed Comprehensive Demo Data for Product and Intent Search
 * Creates sample search queries, products, mandates, and intents for demo purposes
 * 
 * Usage: npx ts-node src/scripts/seed-demo-search-data.ts
 */

import { pool } from '../config/database';

const DEMO_USER_ID = 'cfd469c6-266e-4134-a5bc-b485dd583e1c';

// Demo queries that will have sample data
export const DEMO_QUERIES = {
  PRODUCT_SEARCH: [
    'ergonomic chair',
    'wireless headphones',
    'laptop under 1000',
    'smartphone',
    'gaming mouse',
    'mechanical keyboard',
    'monitor 4k',
    'tablet',
    'smartwatch',
    'desk lamp',
  ],
  INTENT_SEARCH: [
    'MacBook Pro',
    'Sony headphones',
    'iPad Air',
    'AirPods Pro',
    'Apple Watch',
    'Samsung Galaxy',
    'Dyson vacuum',
    'Herman Miller chair',
  ],
};

interface DemoProduct {
  name: string;
  description: string;
  price: number;
  currency: string;
  imageUrl: string;
  productUrl: string;
  source: string;
  availability?: string;
  rating?: number;
  reviewCount?: number;
}

interface DemoSearchQuery {
  queryText: string;
  status: 'completed' | 'pending' | 'processing' | 'failed';
  products: DemoProduct[];
}

async function seedDemoData() {
  console.log('🎬 Seeding comprehensive demo data for user:', DEMO_USER_ID);
  console.log('📝 This will create search queries, products, mandates, and intents\n');

  try {
    // 1. Create agent mandates for intent search
    console.log('🤖 Step 1: Creating agent mandates...');
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
        type: 'intent',
        status: 'active',
        constraints: {
          maxIntentValue: 3000,
          maxIntentsPerDay: 3,
          autoApproveUnder: 200,
          expiryHours: 72,
        },
      },
    ];

    const mandateMap: Record<string, string> = {};

    for (const mandate of mandates) {
      const existing = await pool.query(
        'SELECT id FROM agent_mandates WHERE user_id = $1 AND agent_id = $2 AND type = $3',
        [DEMO_USER_ID, mandate.agentId, mandate.type]
      );

      if (existing.rows.length > 0) {
        mandateMap[mandate.agentId] = existing.rows[0].id;
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
        mandateMap[mandate.agentId] = result.rows[0].id;
        console.log(`   ✓ Created ${mandate.type} mandate for ${mandate.agentName}`);
      }
    }

    // 2. Create search queries with products
    console.log('\n🔍 Step 2: Creating search queries with products...');

    const searchQueries: DemoSearchQuery[] = [
      {
        queryText: 'ergonomic chair',
        status: 'completed',
        products: [
          {
            name: 'Herman Miller Aeron Chair',
            description: 'Ergonomic office chair with PostureFit SL and 8Z Pellicle mesh. Adjustable lumbar support and armrests.',
            price: 1395,
            currency: 'USD',
            imageUrl: 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=400',
            productUrl: 'https://hermanmiller.com/products/seating/office-chairs/aeron-chairs',
            source: 'hermanmiller.com',
            availability: 'In Stock',
            rating: 4.9,
            reviewCount: 4520,
          },
          {
            name: 'Steelcase Gesture Chair',
            description: 'Adaptive ergonomic chair with LiveBack technology. Supports various postures and movements.',
            price: 1099,
            currency: 'USD',
            imageUrl: 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=400',
            productUrl: 'https://steelcase.com/products/office-chairs/gesture',
            source: 'steelcase.com',
            availability: 'In Stock',
            rating: 4.8,
            reviewCount: 3200,
          },
          {
            name: 'Autonomous ErgoChair Pro',
            description: 'Affordable ergonomic chair with lumbar support, adjustable headrest, and 5-year warranty.',
            price: 349,
            currency: 'USD',
            imageUrl: 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=400',
            productUrl: 'https://autonomous.ai/office-chairs/ergonomic-chair',
            source: 'autonomous.ai',
            availability: 'In Stock',
            rating: 4.6,
            reviewCount: 1890,
          },
        ],
      },
      {
        queryText: 'wireless headphones',
        status: 'completed',
        products: [
          {
            name: 'Sony WH-1000XM5 Headphones',
            description: 'Industry-leading noise cancellation with 30-hour battery life. Premium sound quality.',
            price: 349,
            currency: 'USD',
            imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
            productUrl: 'https://electronics.sony.com/audio/headphones/headband/p/wh1000xm5-b',
            source: 'sony.com',
            availability: 'In Stock',
            rating: 4.8,
            reviewCount: 3420,
          },
          {
            name: 'Bose QuietComfort 45',
            description: 'Premium noise-cancelling headphones with balanced audio and comfortable fit.',
            price: 329,
            currency: 'USD',
            imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
            productUrl: 'https://bose.com/en_us/products/headphones/over_ear_headphones/quietcomfort-45.html',
            source: 'bose.com',
            availability: 'In Stock',
            rating: 4.7,
            reviewCount: 2890,
          },
          {
            name: 'Apple AirPods Max',
            description: 'Premium over-ear headphones with Active Noise Cancellation and spatial audio.',
            price: 549,
            currency: 'USD',
            imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
            productUrl: 'https://apple.com/airpods-max',
            source: 'apple.com',
            availability: 'In Stock',
            rating: 4.6,
            reviewCount: 4560,
          },
        ],
      },
      {
        queryText: 'laptop under 1000',
        status: 'completed',
        products: [
          {
            name: 'MacBook Air M2 13"',
            description: 'Powerful laptop with M2 chip, 8GB RAM, 256GB SSD. Perfect for everyday tasks.',
            price: 999,
            currency: 'USD',
            imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400',
            productUrl: 'https://apple.com/shop/buy-mac/macbook-air',
            source: 'apple.com',
            availability: 'In Stock',
            rating: 4.8,
            reviewCount: 2340,
          },
          {
            name: 'Dell XPS 13',
            description: 'Ultra-thin laptop with Intel Core i7, 16GB RAM, 512GB SSD. Premium build quality.',
            price: 899,
            currency: 'USD',
            imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400',
            productUrl: 'https://dell.com/en-us/shop/dell-laptops/xps-13-laptop',
            source: 'dell.com',
            availability: 'In Stock',
            rating: 4.7,
            reviewCount: 1890,
          },
          {
            name: 'HP Spectre x360',
            description: '2-in-1 convertible laptop with touchscreen, Intel Core i5, 8GB RAM, 256GB SSD.',
            price: 949,
            currency: 'USD',
            imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400',
            productUrl: 'https://hp.com/us-en/shop/pdp/spectre-x360',
            source: 'hp.com',
            availability: 'In Stock',
            rating: 4.6,
            reviewCount: 1560,
          },
        ],
      },
      {
        queryText: 'smartphone',
        status: 'completed',
        products: [
          {
            name: 'iPhone 15 Pro',
            description: 'Latest iPhone with A17 Pro chip, 48MP camera, and titanium design.',
            price: 999,
            currency: 'USD',
            imageUrl: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400',
            productUrl: 'https://apple.com/iphone-15-pro',
            source: 'apple.com',
            availability: 'In Stock',
            rating: 4.9,
            reviewCount: 5670,
          },
          {
            name: 'Samsung Galaxy S24 Ultra',
            description: 'AI-powered smartphone with S Pen and 200MP camera. Premium flagship device.',
            price: 1299,
            currency: 'USD',
            imageUrl: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400',
            productUrl: 'https://samsung.com/us/smartphones/galaxy-s24-ultra',
            source: 'samsung.com',
            availability: 'In Stock',
            rating: 4.7,
            reviewCount: 1890,
          },
          {
            name: 'Google Pixel 8 Pro',
            description: 'AI-first smartphone with advanced camera features and Google Tensor G3 chip.',
            price: 899,
            currency: 'USD',
            imageUrl: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400',
            productUrl: 'https://store.google.com/product/pixel_8_pro',
            source: 'store.google.com',
            availability: 'In Stock',
            rating: 4.8,
            reviewCount: 2340,
          },
        ],
      },
      {
        queryText: 'gaming mouse',
        status: 'completed',
        products: [
          {
            name: 'Logitech G Pro X Superlight',
            description: 'Ultra-lightweight wireless gaming mouse with HERO sensor. 25,600 DPI.',
            price: 149,
            currency: 'USD',
            imageUrl: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=400',
            productUrl: 'https://logitechg.com/en-us/products/gaming-mice/pro-x-superlight-2.html',
            source: 'logitechg.com',
            availability: 'In Stock',
            rating: 4.9,
            reviewCount: 4560,
          },
          {
            name: 'Razer DeathAdder V3',
            description: 'Ergonomic gaming mouse with Focus Pro 30K sensor and 90-hour battery.',
            price: 99,
            currency: 'USD',
            imageUrl: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=400',
            productUrl: 'https://razer.com/gaming-mice/razer-deathadder-v3',
            source: 'razer.com',
            availability: 'In Stock',
            rating: 4.8,
            reviewCount: 3200,
          },
        ],
      },
      {
        queryText: 'mechanical keyboard',
        status: 'completed',
        products: [
          {
            name: 'Keychron K8 Pro',
            description: 'Wireless mechanical keyboard with Gateron switches and RGB backlighting.',
            price: 99,
            currency: 'USD',
            imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400',
            productUrl: 'https://keychron.com/products/keychron-k8-pro-qmk-via-wireless-mechanical-keyboard',
            source: 'keychron.com',
            availability: 'In Stock',
            rating: 4.7,
            reviewCount: 1890,
          },
          {
            name: 'Corsair K70 RGB TKL',
            description: 'Tenkeyless mechanical keyboard with Cherry MX switches and per-key RGB.',
            price: 149,
            currency: 'USD',
            imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400',
            productUrl: 'https://corsair.com/us/en/p/keyboards/k70-rgb-tkl',
            source: 'corsair.com',
            availability: 'In Stock',
            rating: 4.6,
            reviewCount: 2340,
          },
        ],
      },
      {
        queryText: 'monitor 4k',
        status: 'completed',
        products: [
          {
            name: 'LG 27" 4K UltraFine Display',
            description: '27-inch 4K IPS monitor with USB-C connectivity. Perfect for creative work.',
            price: 699,
            currency: 'USD',
            imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400',
            productUrl: 'https://lg.com/us/monitors/lg-27md5kl-b-4k-uhd-led-monitor',
            source: 'lg.com',
            availability: 'In Stock',
            rating: 4.8,
            reviewCount: 1890,
          },
          {
            name: 'Dell UltraSharp U2720Q',
            description: '27-inch 4K USB-C monitor with HDR support and 99% sRGB color coverage.',
            price: 549,
            currency: 'USD',
            imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400',
            productUrl: 'https://dell.com/en-us/shop/dell-ultrasharp-27-4k-usb-c-monitor-u2720q',
            source: 'dell.com',
            availability: 'In Stock',
            rating: 4.7,
            reviewCount: 2340,
          },
        ],
      },
      {
        queryText: 'tablet',
        status: 'completed',
        products: [
          {
            name: 'iPad Air 11" M2',
            description: 'Powerful tablet with M2 chip, 11-inch Liquid Retina display, and Apple Pencil support.',
            price: 599,
            currency: 'USD',
            imageUrl: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400',
            productUrl: 'https://apple.com/shop/buy-ipad/ipad-air',
            source: 'apple.com',
            availability: 'In Stock',
            rating: 4.7,
            reviewCount: 890,
          },
          {
            name: 'Samsung Galaxy Tab S9',
            description: 'Premium Android tablet with Snapdragon 8 Gen 2, 11-inch AMOLED display.',
            price: 799,
            currency: 'USD',
            imageUrl: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400',
            productUrl: 'https://samsung.com/us/tablets/galaxy-tab-s9',
            source: 'samsung.com',
            availability: 'In Stock',
            rating: 4.6,
            reviewCount: 670,
          },
        ],
      },
      {
        queryText: 'smartwatch',
        status: 'completed',
        products: [
          {
            name: 'Apple Watch Series 9',
            description: 'Latest Apple Watch with S9 chip, double tap gesture, and advanced health tracking.',
            price: 399,
            currency: 'USD',
            imageUrl: 'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=400',
            productUrl: 'https://apple.com/shop/buy-watch/apple-watch',
            source: 'apple.com',
            availability: 'In Stock',
            rating: 4.6,
            reviewCount: 2340,
          },
          {
            name: 'Samsung Galaxy Watch 6',
            description: 'Premium smartwatch with advanced health monitoring and 40-hour battery life.',
            price: 299,
            currency: 'USD',
            imageUrl: 'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=400',
            productUrl: 'https://samsung.com/us/watches/galaxy-watch6',
            source: 'samsung.com',
            availability: 'In Stock',
            rating: 4.5,
            reviewCount: 1890,
          },
        ],
      },
      {
        queryText: 'desk lamp',
        status: 'completed',
        products: [
          {
            name: 'BenQ ScreenBar Halo',
            description: 'Premium monitor light bar with wireless controller and ambient backlight.',
            price: 199,
            currency: 'USD',
            imageUrl: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400',
            productUrl: 'https://benq.com/en-us/lamps/screenbar-halo.html',
            source: 'benq.com',
            availability: 'In Stock',
            rating: 4.8,
            reviewCount: 1230,
          },
          {
            name: 'TaoTronics LED Desk Lamp',
            description: 'Adjustable desk lamp with 5 color modes, 7 brightness levels, and USB charging port.',
            price: 29,
            currency: 'USD',
            imageUrl: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400',
            productUrl: 'https://taotronics.com/products/led-desk-lamp',
            source: 'taotronics.com',
            availability: 'In Stock',
            rating: 4.5,
            reviewCount: 5670,
          },
        ],
      },
    ];

    const searchQueryMap: Record<string, string> = {};
    let totalProducts = 0;

    for (const searchQuery of searchQueries) {
      // Create or get search query
      const existingQuery = await pool.query(
        'SELECT id FROM search_queries WHERE user_id = $1 AND query_text = $2',
        [DEMO_USER_ID, searchQuery.queryText]
      );

      let searchQueryId: string;
      if (existingQuery.rows.length > 0) {
        searchQueryId = existingQuery.rows[0].id;
        // Update status if needed
        await pool.query(
          'UPDATE search_queries SET status = $1, results_count = $2, completed_at = CURRENT_TIMESTAMP WHERE id = $3',
          [searchQuery.status, searchQuery.products.length, searchQueryId]
        );
      } else {
        const result = await pool.query(
          `INSERT INTO search_queries (user_id, query_text, status, results_count, completed_at)
           VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
           RETURNING id`,
          [DEMO_USER_ID, searchQuery.queryText, searchQuery.status, searchQuery.products.length]
        );
        searchQueryId = result.rows[0].id;
      }

      searchQueryMap[searchQuery.queryText] = searchQueryId;

      // Create products for this search query
      for (const product of searchQuery.products) {
        const existing = await pool.query(
          'SELECT id FROM products WHERE name = $1 AND user_id = $2 AND search_query_id = $3',
          [product.name, DEMO_USER_ID, searchQueryId]
        );

        if (existing.rows.length === 0) {
          await pool.query(
            `INSERT INTO products (
              user_id, search_query_id, name, description, price, currency,
              image_url, product_url, source, ai_extracted, raw_data
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              DEMO_USER_ID,
              searchQueryId,
              product.name,
              product.description,
              product.price,
              product.currency,
              product.imageUrl,
              product.productUrl,
              product.source,
              true,
              JSON.stringify({
                availability: product.availability,
                rating: product.rating,
                reviewCount: product.reviewCount,
              }),
            ]
          );
          totalProducts++;
        }
      }

      console.log(`   ✓ Created search query: "${searchQuery.queryText}" with ${searchQuery.products.length} products`);
    }

    // 3. Create purchase intents for intent search
    console.log('\n🛒 Step 3: Creating purchase intents...');

    const intents = [
      {
        agentId: 'deal-hunter-bot',
        items: [{ productId: 'prod-mbp16', productName: 'MacBook Pro 16" M3 Max', quantity: 1, price: 2499 }],
        subtotal: 2499,
        reasoning: 'Found MacBook Pro at lowest price in 6 months during holiday sale. 15% discount applied.',
        status: 'pending',
      },
      {
        agentId: 'smart-shopper-ai',
        items: [{ productId: 'prod-sony-xm5', productName: 'Sony WH-1000XM5 Headphones', quantity: 1, price: 349 }],
        subtotal: 349,
        reasoning: 'User requested noise-cancelling headphones under $400 - found best match with excellent reviews.',
        status: 'approved',
      },
      {
        agentId: 'price-tracker-ai',
        items: [{ productId: 'prod-ipad-air', productName: 'iPad Air 11" M2', quantity: 1, price: 599 }],
        subtotal: 599,
        reasoning: 'Price dropped to target of $599 with education discount applied. Limited time offer.',
        status: 'executed',
      },
      {
        agentId: 'deal-hunter-bot',
        items: [
          { productId: 'prod-airpods', productName: 'AirPods Pro 2nd Gen', quantity: 1, price: 199 },
          { productId: 'prod-case', productName: 'Silicone Case', quantity: 1, price: 29 },
        ],
        subtotal: 228,
        reasoning: 'Bundle deal found: AirPods Pro + Case for $50 off regular price. Flash sale ends today.',
        status: 'pending',
      },
      {
        agentId: 'smart-shopper-ai',
        items: [{ productId: 'prod-watch', productName: 'Apple Watch Series 9', quantity: 1, price: 399 }],
        subtotal: 399,
        reasoning: 'Matched user preferences: GPS model, 45mm, Midnight color in stock. Price within budget.',
        status: 'rejected',
      },
      {
        agentId: 'deal-hunter-bot',
        items: [{ productId: 'prod-herman', productName: 'Herman Miller Aeron Chair', quantity: 1, price: 1395 }],
        subtotal: 1395,
        reasoning: 'Premium ergonomic chair on sale. 10% discount with free shipping. Best price this year.',
        status: 'pending',
      },
      {
        agentId: 'price-tracker-ai',
        items: [{ productId: 'prod-samsung', productName: 'Samsung Galaxy S24 Ultra', quantity: 1, price: 1299 }],
        subtotal: 1299,
        reasoning: 'Price matched target of $1299. Trade-in bonus available. Flagship device with all features.',
        status: 'approved',
      },
      {
        agentId: 'deal-hunter-bot',
        items: [{ productId: 'prod-dyson', productName: 'Dyson V15 Detect Vacuum', quantity: 1, price: 749 }],
        subtotal: 749,
        reasoning: 'Premium vacuum cleaner with laser dust detection. 20% off with promo code. Limited stock.',
        status: 'pending',
      },
    ];

    let intentCount = 0;
    for (const intent of intents) {
      if (!mandateMap[intent.agentId]) {
        console.log(`   ⚠ Skipping intent - mandate not found for ${intent.agentId}`);
        continue;
      }

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
          `INSERT INTO purchase_intents (
            user_id, agent_id, mandate_id, items, subtotal, tax, total, reasoning, status, expires_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP + INTERVAL '48 hours')`,
          [
            DEMO_USER_ID,
            intent.agentId,
            mandateMap[intent.agentId],
            JSON.stringify(intent.items),
            intent.subtotal,
            tax,
            total,
            intent.reasoning,
            intent.status,
          ]
        );
        console.log(`   ✓ Created ${intent.status} intent: ${intent.items[0].productName}`);
        intentCount++;
      }
    }

    // Summary
    console.log('\n✅ Demo data seeding complete!');
    console.log('\n📊 Summary:');
    console.log(`   • ${mandates.length} agent mandates (cart, intent types)`);
    console.log(`   • ${searchQueries.length} search queries with products`);
    console.log(`   • ${totalProducts} products created`);
    console.log(`   • ${intentCount} purchase intents created`);

    console.log('\n🎯 Demo Queries for Product Search:');
    DEMO_QUERIES.PRODUCT_SEARCH.forEach((query, idx) => {
      const hasData = searchQueryMap[query] ? '✓' : '✗';
      console.log(`   ${hasData} "${query}"`);
    });

    console.log('\n🎯 Demo Queries for Intent Search:');
    console.log('   Search for products like: MacBook Pro, Sony headphones, iPad Air, etc.');
    console.log('   These will show up in the intent search results.');

    console.log('\n💡 Usage Tips:');
    console.log('   • Use the product search queries above to see products');
    console.log('   • Use intent search to find purchase intents by product name');
    console.log('   • All data is linked to user:', DEMO_USER_ID);

  } catch (error) {
    console.error('❌ Error seeding demo data:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  seedDemoData()
    .then(() => {
      console.log('\n✨ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { seedDemoData };


