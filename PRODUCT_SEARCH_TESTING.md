# Product Search Testing Guide

This document describes the test cases and testing procedures for the product search functionality.

## Test Framework Setup

The project uses **Jest** for unit testing and includes a manual test script for integration testing.

### Installation

Test dependencies are already installed:
- `jest` - Testing framework
- `@types/jest` - TypeScript types for Jest
- `ts-jest` - TypeScript preprocessor for Jest

### Running Tests

```bash
# Run all unit tests
cd apps/backend
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run manual integration tests with different prompts
pnpm test:search

# Test with a specific query
pnpm test:search "Find ergonomic chairs under $200"
```

## Test Cases

### Unit Tests (`src/__tests__/product.search.test.ts`)

#### NLP Search Tests

1. **Basic Query Parsing**
   - Tests natural language query parsing
   - Verifies extracted search criteria (product type, price, etc.)

2. **Price Range Queries**
   - Tests queries with min/max price constraints
   - Example: "MacBook Pro between $1500 and $2500"

3. **Local Store Preference**
   - Tests detection of local shopping intent
   - Example: "Where can I buy AirPods Pro near me in Atlanta?"

4. **Travel Queries**
   - Tests detection of travel vs product queries
   - Example: "Book a flight from Atlanta to Pune"

#### AI Search Tests

1. **Google Shopping Integration**
   - Verifies Google Shopping API is used for product searches
   - Tests `useShopping: true` parameter

2. **Regular Search for Travel**
   - Verifies regular Google Search is used for travel queries
   - Tests `useShopping: false` parameter

3. **Price Filtering**
   - Tests filtering products by price range
   - Verifies only products within range are returned

4. **Sorting**
   - Tests sorting online products by price (low to high)
   - Tests sorting in-store products by distance (nearest first)

## Manual Testing Script

The manual test script (`src/scripts/test-product-search.ts`) allows you to test the search functionality with real API calls.

### Test Queries Included

The script includes 20+ test queries covering:

1. **Basic Product Searches**
   - "Find ergonomic chairs under $200"
   - "MacBook Pro"
   - "iPhone 15 Pro Max"

2. **Price Range Queries**
   - "Laptops between $500 and $1500"
   - "Headphones under $100"
   - "Gaming chairs above $300"

3. **Local Store Queries**
   - "Where can I buy AirPods Pro near me in Atlanta?"
   - "Show me stores selling Sony headphones with good discounts"
   - "Find local stores with MacBook Pro in stock"

4. **Travel Queries**
   - "Book a flight from Atlanta to Pune on 1/28/2026, back on 2/2/2026 if under $1000"
   - "Hotels in Paris for next week"
   - "Cheap flights to Tokyo"

5. **Intent Creation Queries**
   - "Notify me when iPhone 16 is available"
   - "Buy MacBook Pro if price drops below $2000"
   - "Alert me when this product goes on sale"

6. **Complex Queries**
   - "Best deals on gaming laptops with RTX 4070"
   - "Ergonomic office chairs with lumbar support under $250"
   - "Wireless headphones with noise cancellation and good battery life"

### Usage

```bash
# Test all queries
cd apps/backend
pnpm test:search

# Test a specific query
pnpm test:search "Find ergonomic chairs under $200"
```

### Output

The script displays:
- **Parsed Query**: Extracted search criteria (product type, price range, location preferences, etc.)
- **Search Results**: Number of products found, processing time, sources used
- **Top Products**: First 5 products with name, price, and source
- **Intent/Mandate**: If any intent or mandate was created

## Environment Setup

For manual testing, ensure these environment variables are set:

```env
# Required for AI search
ANTHROPIC_API_KEY=your_anthropic_api_key
ANTHROPIC_MODEL=claude-sonnet-4-20250514

# Required for Google Search
GOOGLE_API_KEY=your_google_api_key
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id

# Database connection
DATABASE_URL=postgresql://...

# Optional: Test user ID
TEST_USER_ID=your_user_id
```

## Test Scenarios

### Scenario 1: Basic Product Search
**Query**: "Find ergonomic chairs under $200"

**Expected**:
- Product type: "chair"
- Max price: 200
- Currency: USD
- Use Google Shopping API
- Results sorted by price (low to high)

### Scenario 2: Local Store Search
**Query**: "Where can I buy AirPods Pro near me in Atlanta?"

**Expected**:
- Product type: "headphones"
- Prefer local stores: true
- User city: "Atlanta"
- Search radius: 25 miles
- Results sorted by distance (nearest first)

### Scenario 3: Travel Search
**Query**: "Book a flight from Atlanta to Pune on 1/28/2026"

**Expected**:
- Product type: "flight"
- Is travel: true
- Origin: "Atlanta"
- Destination: "Pune"
- Start date: "2026-01-28"
- Use regular Google Search (not Shopping)

### Scenario 4: Price Range Search
**Query**: "Laptops between $500 and $1500"

**Expected**:
- Product type: "laptop"
- Min price: 500
- Max price: 1500
- Results filtered to price range
- Results sorted by price

## Troubleshooting

### No Products Found

1. **Check API Keys**: Ensure `ANTHROPIC_API_KEY` and `GOOGLE_API_KEY` are set
2. **Check Database**: Verify database connection and demo data
3. **Check Logs**: Review console output for errors
4. **Demo User**: If using demo user, ensure demo data is seeded

### API Errors

1. **Rate Limiting**: Add delays between queries
2. **Invalid API Key**: Verify API keys are correct
3. **Model Availability**: Check if the specified Anthropic model is available

### Test Failures

1. **Mock Issues**: Ensure all dependencies are properly mocked
2. **Type Errors**: Run `pnpm type-check` to verify TypeScript types
3. **Database**: Ensure test database is set up correctly

## Continuous Integration

To add tests to CI/CD:

```yaml
# Example GitHub Actions
- name: Run tests
  run: |
    cd apps/backend
    pnpm test
    pnpm test:coverage
```

## Coverage Goals

Target coverage:
- **Services**: 80%+
- **Controllers**: 70%+
- **Repositories**: 90%+

View coverage report:
```bash
cd apps/backend
pnpm test:coverage
open coverage/lcov-report/index.html
```

## Next Steps

1. Add more edge case tests
2. Add performance tests
3. Add integration tests with real API calls (with mocking)
4. Add E2E tests for complete search flow
5. Add load testing for concurrent searches
