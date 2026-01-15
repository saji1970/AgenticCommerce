# Seed Demo Data to Railway Database

This guide explains how to install all demo queries, products, mandates, and intents to your Railway database.

## 🎯 What Gets Seeded

- **10 Product Search Queries** with ~25 products
- **8 Purchase Intents** with various statuses
- **3 Agent Mandates** (cart and intent types)
- All linked to demo user: `cfd469c6-266e-4134-a5bc-b485dd583e1c`

## 🚀 Quick Start

### Option 1: Using the PowerShell Script (Recommended)

```powershell
cd apps/backend
.\seed-railway-demo.ps1
```

The script will:
1. Try to get `DATABASE_URL` from Railway CLI (if logged in)
2. If not available, prompt you to set it manually
3. Run the seed script with the Railway database connection

### Option 2: Manual Setup

#### Step 1: Get DATABASE_URL from Railway

**Via Railway Dashboard:**
1. Go to https://railway.app
2. Select your project
3. Click on your PostgreSQL service
4. Go to the **Variables** tab
5. Copy the `DATABASE_URL` value

**Via Railway CLI:**
```bash
railway login
railway link  # Link to your project if not already linked
railway variables --json | ConvertFrom-Json | Where-Object { $_.name -eq 'DATABASE_URL' } | Select-Object -ExpandProperty value
```

#### Step 2: Set DATABASE_URL and Run Seed

**PowerShell:**
```powershell
cd apps/backend
$env:DATABASE_URL = "postgresql://user:password@host:port/database"
pnpm seed:demo
```

**Command Prompt:**
```cmd
cd apps\backend
set DATABASE_URL=postgresql://user:password@host:port/database
pnpm seed:demo
```

**Bash/Linux/Mac:**
```bash
cd apps/backend
export DATABASE_URL="postgresql://user:password@host:port/database"
pnpm seed:demo
```

## 📋 Demo Queries Available After Seeding

### Product Search Queries
- `ergonomic chair` - 3 chairs (Herman Miller, Steelcase, Autonomous)
- `wireless headphones` - 3 headphones (Sony, Bose, Apple)
- `laptop under 1000` - 3 laptops (MacBook Air, Dell XPS, HP Spectre)
- `smartphone` - 3 phones (iPhone 15 Pro, Samsung S24 Ultra, Google Pixel 8 Pro)
- `gaming mouse` - 2 mice (Logitech G Pro, Razer DeathAdder)
- `mechanical keyboard` - 2 keyboards (Keychron, Corsair)
- `monitor 4k` - 2 monitors (LG UltraFine, Dell UltraSharp)
- `tablet` - 2 tablets (iPad Air, Samsung Galaxy Tab S9)
- `smartwatch` - 2 watches (Apple Watch Series 9, Samsung Galaxy Watch 6)
- `desk lamp` - 2 lamps (BenQ ScreenBar, TaoTronics)

### Intent Search Queries
Search for these product names to see purchase intents:
- `MacBook Pro` - Pending intent ($2,499)
- `Sony headphones` - Approved intent ($349)
- `iPad Air` - Executed intent ($599)
- `AirPods Pro` - Pending intent ($228)
- `Apple Watch` - Rejected intent ($399)
- `Samsung Galaxy` - Approved intent ($1,299)
- `Dyson vacuum` - Pending intent ($749)
- `Herman Miller chair` - Pending intent ($1,395)

## ✅ Verification

After seeding, you can verify the data:

1. **Check search queries:**
   ```sql
   SELECT COUNT(*) FROM search_queries WHERE user_id = 'cfd469c6-266e-4134-a5bc-b485dd583e1c';
   -- Should return 10
   ```

2. **Check products:**
   ```sql
   SELECT COUNT(*) FROM products WHERE user_id = 'cfd469c6-266e-4134-a5bc-b485dd583e1c';
   -- Should return ~25
   ```

3. **Check intents:**
   ```sql
   SELECT COUNT(*) FROM purchase_intents WHERE user_id = 'cfd469c6-266e-4134-a5bc-b485dd583e1c';
   -- Should return 8
   ```

4. **Test in the app:**
   - Search for "ergonomic chair" - should show 3 products
   - Search for "MacBook Pro" in intents - should show pending intent

## 🔄 Re-seeding

If you need to refresh the demo data:

1. The script is **idempotent** - it won't create duplicates
2. It checks for existing records before inserting
3. You can run it multiple times safely
4. To completely reset, you may need to delete existing records first

## 🐛 Troubleshooting

### Error: "password authentication failed"
- **Cause:** DATABASE_URL is incorrect or not set
- **Fix:** Verify DATABASE_URL from Railway dashboard

### Error: "relation does not exist"
- **Cause:** Database migrations not run
- **Fix:** Run all migrations on Railway database first

### Error: "Unauthorized" (Railway CLI)
- **Cause:** Not logged in to Railway CLI
- **Fix:** Run `railway login` first

### Error: "Project not linked"
- **Cause:** Railway CLI not linked to project
- **Fix:** Run `railway link` in the project directory

## 📚 Related Documentation

- `DEMO_QUERIES_GUIDE.md` - Complete list of demo queries
- `MANDATE_FLOW_DOCUMENTATION.md` - How mandates work
- `apps/backend/src/scripts/seed-demo-search-data.ts` - Seed script source code

---

**Note:** All demo data is linked to user ID `cfd469c6-266e-4134-a5bc-b485dd583e1c`. Make sure you're logged in as this user in the app to see the demo data.

