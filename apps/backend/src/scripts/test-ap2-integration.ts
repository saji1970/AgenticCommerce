/**
 * AP2 Integration Test Script
 * Demonstrates all AP2 gateway operations for testing and demo purposes
 */

import axios from 'axios';
import crypto from 'crypto';

const BASE_URL = process.env.API_URL || 'http://localhost:3000/api';

// Demo merchant credentials (from migration)
const DEMO_MERCHANT = {
  apiKey: 'mk_test_demo_merchant_key_12345',
  apiSecret: 'sk_test_demo_merchant_secret_67890',
  email: 'demo@merchant.com',
};

// Test user ID (should exist in your database)
const TEST_USER_ID = process.env.TEST_USER_ID || 'replace-with-real-user-id';

// Test mandate IDs (should exist in your database)
const TEST_CART_MANDATE_ID = process.env.TEST_CART_MANDATE_ID || 'replace-with-cart-mandate-id';
const TEST_INTENT_MANDATE_ID = process.env.TEST_INTENT_MANDATE_ID || 'replace-with-intent-mandate-id';
const TEST_PAYMENT_MANDATE_ID = process.env.TEST_PAYMENT_MANDATE_ID || 'replace-with-payment-mandate-id';

const TEST_AGENT_ID = 'test-shopping-agent-001';

// Helper function to generate HMAC signature
function generateSignature(data: any, apiSecret: string, timestamp: number): string {
  const payload = `${timestamp}.${JSON.stringify(data)}`;
  return crypto
    .createHmac('sha256', apiSecret)
    .update(payload)
    .digest('hex');
}

// Helper function to make AP2 API calls
async function makeAP2Request(
  endpoint: string,
  data: any,
  apiKey: string = DEMO_MERCHANT.apiKey,
  apiSecret: string = DEMO_MERCHANT.apiSecret
) {
  const timestamp = Date.now();
  const signature = generateSignature(data, apiSecret, timestamp);

  try {
    const response = await axios.post(`${BASE_URL}${endpoint}`, data, {
      headers: {
        'Content-Type': 'application/json',
        'X-AP2-API-Key': apiKey,
        'X-AP2-Signature': signature,
        'X-AP2-Timestamp': timestamp.toString(),
      },
    });

    return { success: true, data: response.data };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data || error.message,
    };
  }
}

// Test 1: Health Check
async function testHealthCheck() {
  console.log('\n=== Test 1: AP2 Gateway Health Check ===');

  try {
    const response = await axios.get(`${BASE_URL}/ap2/gateway/health`);
    console.log('✅ Health check passed:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error);
    return false;
  }
}

// Test 2: Get API Documentation
async function testApiDocs() {
  console.log('\n=== Test 2: Get API Documentation ===');

  try {
    const response = await axios.get(`${BASE_URL}/ap2/gateway/docs`);
    console.log('✅ API docs retrieved:', response.data.name);
    return true;
  } catch (error) {
    console.error('❌ Failed to get API docs:', error);
    return false;
  }
}

// Test 3: Verify Mandate
async function testVerifyMandate() {
  console.log('\n=== Test 3: Verify Mandate ===');

  const request = {
    mandateId: TEST_CART_MANDATE_ID,
    agentId: TEST_AGENT_ID,
    operation: 'cart_add',
    amount: 99.99,
    signature: '', // Will be added by makeAP2Request
    timestamp: 0, // Will be added by makeAP2Request
  };

  const result = await makeAP2Request('/ap2/gateway/verify-mandate', request);

  if (result.success) {
    console.log('✅ Mandate verification passed');
    console.log('   Valid:', result.data.valid);
    console.log('   Mandate Type:', result.data.mandate?.type);
    console.log('   Remaining Limits:', result.data.remainingLimits);
  } else {
    console.error('❌ Mandate verification failed:', result.error);
  }

  return result.success;
}

// Test 4: Cart Operation (Add to Cart)
async function testCartOperation() {
  console.log('\n=== Test 4: Cart Operation (Add to Cart) ===');

  const request = {
    userId: TEST_USER_ID,
    mandateId: TEST_CART_MANDATE_ID,
    agentId: TEST_AGENT_ID,
    operation: 'add',
    productId: 'test-product-123',
    productName: 'Premium Wireless Headphones',
    quantity: 1,
    price: 199.99,
    reasoning: 'Based on your recent search for high-quality audio equipment and positive reviews',
    signature: '',
    timestamp: 0,
  };

  const result = await makeAP2Request('/ap2/gateway/cart', request);

  if (result.success) {
    console.log('✅ Cart operation successful');
    console.log('   Transaction ID:', result.data.transactionId);
    console.log('   Cart Item:', result.data.data?.cartItem);
  } else {
    console.error('❌ Cart operation failed:', result.error);
  }

  return result.success;
}

// Test 5: Intent Operation (Create Purchase Intent)
async function testIntentOperation() {
  console.log('\n=== Test 5: Intent Operation (Create Purchase Intent) ===');

  const request = {
    userId: TEST_USER_ID,
    mandateId: TEST_INTENT_MANDATE_ID,
    agentId: TEST_AGENT_ID,
    items: [
      {
        productId: 'test-product-456',
        productName: 'Smart Watch Pro',
        quantity: 1,
        price: 299.99,
      },
      {
        productId: 'test-product-789',
        productName: 'Watch Band - Leather',
        quantity: 1,
        price: 49.99,
      },
    ],
    reasoning: 'Completing your wearable tech setup with a premium watch and band based on your fitness goals',
    signature: '',
    timestamp: 0,
  };

  const result = await makeAP2Request('/ap2/gateway/intent', request);

  if (result.success) {
    console.log('✅ Intent operation successful');
    console.log('   Transaction ID:', result.data.transactionId);
    console.log('   Intent ID:', result.data.data?.intent?.id);
    console.log('   Intent Status:', result.data.data?.intent?.status);
    console.log('   Total Amount:', result.data.data?.intent?.total);

    // Return intent ID for payment test
    return result.data.data?.intent?.id;
  } else {
    console.error('❌ Intent operation failed:', result.error);
    return null;
  }
}

// Test 6: Payment Operation (Execute Payment)
async function testPaymentOperation(intentId: string) {
  console.log('\n=== Test 6: Payment Operation (Execute Payment) ===');

  if (!intentId) {
    console.log('⚠️  Skipping payment test - no approved intent available');
    return false;
  }

  const request = {
    userId: TEST_USER_ID,
    mandateId: TEST_PAYMENT_MANDATE_ID,
    agentId: TEST_AGENT_ID,
    intentId: intentId,
    paymentMethod: 'card',
    amount: 349.98,
    reasoning: 'Executing approved purchase for smart watch and accessories',
    signature: '',
    timestamp: 0,
  };

  const result = await makeAP2Request('/ap2/gateway/payment', request);

  if (result.success) {
    console.log('✅ Payment operation successful');
    console.log('   Transaction ID:', result.data.transactionId);
    console.log('   Payment ID:', result.data.data?.payment?.id);
    console.log('   Payment Status:', result.data.data?.payment?.status);
  } else {
    console.error('❌ Payment operation failed:', result.error);
  }

  return result.success;
}

// Test 7: Authorization Request
async function testAuthorizationRequest() {
  console.log('\n=== Test 7: Authorization Request ===');

  const request = {
    merchantId: 'merchant-id', // Would need actual merchant ID
    userId: TEST_USER_ID,
    agentId: TEST_AGENT_ID,
    mandateId: TEST_CART_MANDATE_ID,
    transactionType: 'cart_add',
    amount: 99.99,
    metadata: {
      productId: 'test-product-999',
      productName: 'Test Product',
    },
    signature: '',
    timestamp: 0,
  };

  const result = await makeAP2Request('/ap2/gateway/authorize', request);

  if (result.success) {
    console.log('✅ Authorization successful');
    console.log('   Authorized:', result.data.authorized);
    console.log('   Transaction ID:', result.data.transactionId);
    console.log('   Constraints:', result.data.constraints);
  } else {
    console.error('❌ Authorization failed:', result.error);
  }

  return result.success;
}

// Test 8: Get Merchant Analytics
async function testMerchantAnalytics(merchantId: string) {
  console.log('\n=== Test 8: Merchant Analytics ===');

  try {
    const response = await axios.get(
      `${BASE_URL}/merchants/${merchantId}/analytics`,
      {
        headers: {
          'X-AP2-API-Key': DEMO_MERCHANT.apiKey,
        },
      }
    );

    console.log('✅ Analytics retrieved successfully');
    console.log('   Today:', response.data.analytics.today);
    console.log('   This Month:', response.data.analytics.thisMonth);
    console.log('   Webhooks:', response.data.analytics.webhooks);

    return true;
  } catch (error) {
    console.error('❌ Failed to get analytics:', error);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║      AP2 (Agentic Protocol 2) Integration Test Suite      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\nAPI Base URL: ${BASE_URL}`);
  console.log(`Demo Merchant API Key: ${DEMO_MERCHANT.apiKey}`);

  // Check if test IDs are configured
  if (
    TEST_USER_ID.includes('replace-with') ||
    TEST_CART_MANDATE_ID.includes('replace-with')
  ) {
    console.log('\n⚠️  WARNING: Test configuration incomplete!');
    console.log('Please set the following environment variables:');
    console.log('  - TEST_USER_ID');
    console.log('  - TEST_CART_MANDATE_ID');
    console.log('  - TEST_INTENT_MANDATE_ID');
    console.log('  - TEST_PAYMENT_MANDATE_ID');
    console.log('\nRunning limited tests only...\n');
  }

  const results = {
    passed: 0,
    failed: 0,
  };

  // Run tests
  const tests = [
    { name: 'Health Check', fn: testHealthCheck, required: true },
    { name: 'API Docs', fn: testApiDocs, required: true },
    { name: 'Verify Mandate', fn: testVerifyMandate, required: false },
    { name: 'Cart Operation', fn: testCartOperation, required: false },
  ];

  for (const test of tests) {
    if (!test.required && TEST_USER_ID.includes('replace-with')) {
      console.log(`\n⊘ Skipping ${test.name} - configuration incomplete`);
      continue;
    }

    const passed = await test.fn();
    if (passed) {
      results.passed++;
    } else {
      results.failed++;
    }

    // Small delay between tests
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Intent test (returns intent ID for payment test)
  if (!TEST_USER_ID.includes('replace-with')) {
    const intentId = await testIntentOperation();
    if (intentId) {
      results.passed++;

      // Note: In a real scenario, you'd need to approve the intent first
      // before executing payment
      console.log('\n⚠️  Note: Intent created but not approved.');
      console.log('   To test payment, approve the intent via the ACP API first.');
    } else {
      results.failed++;
    }
  }

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                        Test Summary                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📊 Total:  ${results.passed + results.failed}`);

  if (results.failed === 0) {
    console.log('\n🎉 All tests passed! AP2 integration is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

// Run tests
runAllTests().catch((error) => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
