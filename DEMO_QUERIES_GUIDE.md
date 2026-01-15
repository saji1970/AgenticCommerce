# Demo Queries Guide

This guide lists all the demo queries that have sample data pre-seeded in the database. Use these queries to demonstrate the product search and intent search functionality.

## 🎯 Product Search Queries

These queries will return products with full details:

### Electronics
- **`ergonomic chair`** - Returns 3 ergonomic office chairs (Herman Miller, Steelcase, Autonomous)
- **`wireless headphones`** - Returns 3 premium headphones (Sony, Bose, Apple)
- **`laptop under 1000`** - Returns 3 laptops under $1000 (MacBook Air, Dell XPS, HP Spectre)
- **`smartphone`** - Returns 3 flagship smartphones (iPhone 15 Pro, Samsung S24 Ultra, Google Pixel 8 Pro)
- **`gaming mouse`** - Returns 2 gaming mice (Logitech G Pro, Razer DeathAdder)
- **`mechanical keyboard`** - Returns 2 mechanical keyboards (Keychron, Corsair)
- **`monitor 4k`** - Returns 2 4K monitors (LG UltraFine, Dell UltraSharp)
- **`tablet`** - Returns 2 tablets (iPad Air, Samsung Galaxy Tab S9)
- **`smartwatch`** - Returns 2 smartwatches (Apple Watch Series 9, Samsung Galaxy Watch 6)
- **`desk lamp`** - Returns 2 desk lamps (BenQ ScreenBar, TaoTronics)

## 🛒 Intent Search Queries

Search for these product names to see purchase intents:

- **`MacBook Pro`** - Shows pending intent for MacBook Pro 16" M3 Max ($2,499)
- **`Sony headphones`** - Shows approved intent for Sony WH-1000XM5 ($349)
- **`iPad Air`** - Shows executed intent for iPad Air 11" M2 ($599)
- **`AirPods Pro`** - Shows pending intent for AirPods Pro bundle ($228)
- **`Apple Watch`** - Shows rejected intent for Apple Watch Series 9 ($399)
- **`Samsung Galaxy`** - Shows approved intent for Samsung Galaxy S24 Ultra ($1,299)
- **`Dyson vacuum`** - Shows pending intent for Dyson V15 Detect ($749)
- **`Herman Miller chair`** - Shows pending intent for Herman Miller Aeron ($1,395)

## 📝 How to Use

### For Product Search Demo:
1. Open the app and navigate to the search screen
2. Type any of the product search queries listed above
3. You'll see multiple products with:
   - Product name, description, price
   - Image, source, availability
   - Rating and review count
   - Direct links to product pages

### For Intent Search Demo:
1. Navigate to the intents screen
2. Search for any of the product names listed above
3. You'll see purchase intents with:
   - Product details and pricing
   - Agent reasoning
   - Status (pending, approved, executed, rejected)
   - Expiration dates

## 🔧 Seeding Demo Data

To seed or refresh the demo data, run:

```bash
cd apps/backend
npx ts-node src/scripts/seed-demo-search-data.ts
```

Or use the API endpoint (if available):
```
GET /api/seed-demo-temp
```

## 📊 Data Overview

- **User ID**: `cfd469c6-266e-4134-a5bc-b485dd583e1c`
- **Search Queries**: 10 queries with completed status
- **Products**: ~25 products across different categories
- **Agent Mandates**: 3 mandates (cart, intent types)
- **Purchase Intents**: 8 intents with various statuses

## 💡 Tips

1. **Product Search**: Use natural language queries like "ergonomic chair" or "laptop under 1000"
2. **Intent Search**: Search by product name to find related purchase intents
3. **Filters**: Use price filters, source filters, and sorting options
4. **Frequently Searched**: The home screen shows products from frequently searched queries

## 🎬 Demo Flow Suggestions

### Product Search Demo:
1. Start with "ergonomic chair" - shows 3 options at different price points
2. Try "wireless headphones" - shows premium options
3. Search "laptop under 1000" - shows budget-friendly laptops
4. Use filters to narrow down results

### Intent Search Demo:
1. Search "MacBook Pro" - shows pending intent with reasoning
2. Search "Sony headphones" - shows approved intent
3. Search "iPad Air" - shows executed intent
4. Filter by status (pending, approved, executed, rejected)

## 🔄 Refreshing Data

If you need to refresh the demo data:
1. Clear existing data (optional)
2. Run the seed script again
3. All queries will be recreated with fresh data

---

**Note**: All demo data is linked to the demo user ID. Make sure you're logged in as this user to see the data.


