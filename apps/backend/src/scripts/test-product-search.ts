/**
 * Manual test script for product search with different prompts
 * 
 * Usage:
 *   pnpm tsx src/scripts/test-product-search.ts
 * 
 * Or with specific query:
 *   pnpm tsx src/scripts/test-product-search.ts "Find ergonomic chairs under $200"
 */

import { ProductService } from '../services/product.service';
import { config } from '../config/env';

// Test queries covering different scenarios
const testQueries = [
  // Basic product search
  'Find ergonomic chairs under $200',
  'MacBook Pro',
  'iPhone 15 Pro Max',
  
  // Price range queries
  'Laptops between $500 and $1500',
  'Headphones under $100',
  'Gaming chairs above $300',
  
  // Local store queries
  'Where can I buy AirPods Pro near me in Atlanta?',
  'Show me stores selling Sony headphones with good discounts',
  'Find local stores with MacBook Pro in stock',
  
  // Travel queries
  'Book a flight from Atlanta to Pune on 1/28/2026, back on 2/2/2026 if under $1000',
  'Hotels in Paris for next week',
  'Cheap flights to Tokyo',
  
  // Intent creation queries
  'Notify me when iPhone 16 is available',
  'Buy MacBook Pro if price drops below $2000',
  'Alert me when this product goes on sale',
  
  // Complex queries
  'Best deals on gaming laptops with RTX 4070',
  'Ergonomic office chairs with lumbar support under $250',
  'Wireless headphones with noise cancellation and good battery life',
];

async function testProductSearch() {
  const productService = new ProductService();
  
  // Get test user ID from environment or use demo user
  const testUserId = process.env.TEST_USER_ID || '73ff4490-66d9-4899-8dfd-885d208a1269';
  
  // Get query from command line args or use all test queries
  const queryArg = process.argv[2];
  const queriesToTest = queryArg ? [queryArg] : testQueries;

  console.log('🧪 Testing Product Search with Different Prompts\n');
  console.log(`Using user ID: ${testUserId}\n`);
  console.log(`Testing ${queriesToTest.length} query(ies)...\n`);
  console.log('='.repeat(80));

  for (let i = 0; i < queriesToTest.length; i++) {
    const query = queriesToTest[i];
    console.log(`\n📝 Test ${i + 1}/${queriesToTest.length}: "${query}"`);
    console.log('-'.repeat(80));

    try {
      const startTime = Date.now();
      
      // Perform NLP search
      const result = await productService.performNLPSearch(testUserId, query, false);
      
      const duration = Date.now() - startTime;

      // Display parsed query
      console.log('\n✅ Parsed Query:');
      console.log(`   Search Query: ${result.parsedQuery.searchQuery}`);
      console.log(`   Product Type: ${result.parsedQuery.productType}`);
      if (result.parsedQuery.maxPrice) {
        console.log(`   Max Price: $${result.parsedQuery.maxPrice}`);
      }
      if (result.parsedQuery.minPrice) {
        console.log(`   Min Price: $${result.parsedQuery.minPrice}`);
      }
      console.log(`   Currency: ${result.parsedQuery.currency}`);
      console.log(`   Prefer Local Stores: ${result.parsedQuery.preferLocalStores || false}`);
      console.log(`   Prefer Online: ${result.parsedQuery.preferOnline || false}`);
      console.log(`   Is Travel: ${result.parsedQuery.isTravel || false}`);
      console.log(`   Is Product: ${result.parsedQuery.isProduct !== false}`);
      console.log(`   Confidence: ${result.parsedQuery.confidence}%`);
      if (result.parsedQuery.shouldCreateIntent) {
        console.log(`   Should Create Intent: ${result.parsedQuery.intentType}`);
      }

      // Display search results
      const searchResponse = result.searchResponse;
      console.log(`\n📦 Search Results: ${searchResponse.products.length} products found`);
      console.log(`   Processing Time: ${duration}ms`);
      console.log(`   Sources Used: ${searchResponse.metadata.sourcesUsed.join(', ')}`);
      
      if (searchResponse.products.length > 0) {
        console.log('\n   Top Products:');
        searchResponse.products.slice(0, 5).forEach((product, idx) => {
          console.log(`   ${idx + 1}. ${product.name}`);
          if (product.price) {
            console.log(`      Price: $${product.price} ${product.currency}`);
          }
          if (product.source) {
            console.log(`      Source: ${product.source}`);
          }
        });
      } else {
        console.log('   ⚠️  No products found');
      }

      // Display intent if created
      if (result.intentCreated) {
        console.log(`\n🎯 Intent Created: ${result.intentCreated.id}`);
      }

      // Display mandate if created
      if (result.mandateCreated) {
        console.log(`\n📋 Mandate Created: ${result.mandateCreated.id}`);
        console.log(`   Status: ${result.mandateCreated.status}`);
      }

    } catch (error: any) {
      console.error(`\n❌ Error testing query: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
    }

    // Add delay between queries to avoid rate limiting
    if (i < queriesToTest.length - 1) {
      console.log('\n⏳ Waiting 2 seconds before next query...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Testing complete!');
}

// Run tests
if (require.main === module) {
  testProductSearch()
    .then(() => {
      console.log('\n✨ All tests completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test suite failed:', error);
      process.exit(1);
    });
}

export { testProductSearch };
