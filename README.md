# AgenticCommerce - AI-Powered Mobile Shopping Platform

A full-stack mobile shopping application with AI-powered product search, agent-assisted purchasing, and autonomous commerce capabilities. Built with React Native and Node.js/Express, featuring mandate-based agent authorization, intelligent product discovery, and intent-based shopping.

## 🌟 Key Features

### ✅ Implemented & Live

#### 🤖 Agent-Assisted Shopping
- **Buy with Agent** - One-click agent-assisted cart additions with mandate authorization
- **Purchase Intents** - Create smart purchase intents with 4 types:
  - 💰 **Price Drop Alert** - Get notified when price drops below target
  - 📦 **Back in Stock** - Alert when product becomes available
  - ⏰ **Scheduled Purchase** - Schedule purchases for future dates
  - ⭐ **General Interest** - Express interest without specific conditions

#### 🔐 Mandate System (Agentic Commerce Protocol)
- Cart mandates with configurable constraints
- Intent mandates with daily limits
- Payment mandates for secure transactions
- Full audit trail of agent actions
- User approval workflow for agent decisions

#### 🔍 AI-Powered Search
- **Google Custom Search** integration for product discovery
- **Claude AI** (Anthropic) for:
  - Filtering shoppable products from search results
  - Extracting product data (name, price, specs, images)
  - Generating smart product filters
- Real-time search history tracking

#### 🛒 Shopping Features
- User authentication (JWT with secure token storage)
- Product catalog with AI-extracted details
- Shopping cart management
- User profiles and order history
- Product search with filters

#### 🔗 MCP (Model Context Protocol) Integration
- Extensible server architecture for e-commerce integration
- Custom server support for various shopping platforms

## Tech Stack

### Frontend (Mobile)
- **React Native** 0.81.5 with Expo 54
- **TypeScript** for type safety
- **React Navigation** for routing
- **React Context API** for state management
- **Axios** for API calls
- **React Native Keychain** for secure storage
- **EAS Build** for production builds

### Backend (API)
- **Node.js** with Express
- **TypeScript**
- **PostgreSQL** database
- **Anthropic Claude API** (Sonnet 4.5) for AI processing
- **Google Custom Search API** for product discovery
- **JWT Authentication** with bcrypt
- **Zod** for validation
- **Deployed on Railway**

### Architecture
- **Monorepo** with pnpm workspaces
- **Shared packages** for types and validation
- **Clean architecture** with repositories, services, controllers
- **RESTful API** design

## Project Structure

```
AgenticCommerce/
├── apps/
│   ├── backend/              # Express API server
│   │   ├── src/
│   │   │   ├── config/      # Configuration (env, database)
│   │   │   ├── controllers/ # Route handlers
│   │   │   ├── services/    # Business logic (AI, Search, MCP)
│   │   │   ├── repositories/# Data access layer
│   │   │   ├── middleware/  # Auth, validation, error handling
│   │   │   └── routes/      # API routes
│   │   └── migrations/      # Database migrations
│   └── mobile/              # React Native app
│       ├── src/
│       │   ├── components/  # Reusable UI components
│       │   │   ├── products/# Buy/Intent buttons, modals
│       │   │   ├── mandate/ # Mandate flow components
│       │   │   └── common/  # Common UI components
│       │   ├── contexts/    # React Context providers
│       │   ├── screens/     # App screens
│       │   ├── services/    # API clients
│       │   ├── utils/       # Helper functions
│       │   └── types/       # TypeScript types
├── packages/
│   ├── shared-types/        # Shared TypeScript types
│   └── validation/          # Shared Zod validation schemas
└── package.json
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** v20 or higher
- **pnpm** v8 or higher - `npm install -g pnpm`
- **PostgreSQL** v14 or higher (for local development)
- **Android Studio** or **Xcode** (for mobile development)
- **Expo CLI** - `npm install -g eas-cli` (for building)

### 1. Clone and Install

```bash
# Clone repository
git clone https://github.com/saji1970/AgenticCommerce.git
cd AgenticCommerce

# Install dependencies with hoisted mode (required for Windows path length limits)
pnpm install
```

### 2. Backend Setup (Local Development)

```bash
cd apps/backend

# Copy environment variables
cp .env.example .env

# Update .env with your credentials:
# - PostgreSQL credentials
# - Anthropic API key (get from https://console.anthropic.com)
# - Google Custom Search API credentials

# Run migrations
psql -U postgres -d agentic_commerce -f migrations/001_create_users_table.sql
# ... run other migrations

# Start backend
pnpm dev
```

Backend will run at `http://localhost:3000`

### 3. Mobile App Setup

```bash
cd apps/mobile

# Start Expo development server
pnpm start

# For Android emulator
pnpm android

# For iOS simulator (macOS only)
pnpm ios
```

### 4. Build Production APK

```bash
cd apps/mobile

# Build with EAS (requires Expo account)
eas build --platform android --profile production

# Download APK from build page
# Install to device/emulator
```

## 🔑 API Keys Configuration

The app requires two API services for AI-powered search:

### 1. Anthropic Claude API
- Get API key: https://console.anthropic.com/settings/keys
- Free tier: $5 credit
- Used for: Product filtering, data extraction, filter generation
- Cost: ~$0.03-$0.15 per search

### 2. Google Custom Search API
- API Key: https://console.cloud.google.com/apis/credentials
- Search Engine ID: https://programmablesearchengine.google.com/
- Free tier: 100 queries/day
- Used for: Product search on the web

**Set in Railway (Production):**
```bash
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxx
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
GOOGLE_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_SEARCH_ENGINE_ID=0123456789abcdefg
```

See `API_KEYS_SETUP.md` for detailed configuration guide.

## 📱 Live Deployment

### Backend (Railway)
- **URL**: https://agenticcommerce-production.up.railway.app
- **Health Check**: https://agenticcommerce-production.up.railway.app/api/health
- **Status**: ✅ Live
- **Database**: PostgreSQL on Railway
- **Auto-deploy**: Enabled (pushes to master branch)

### Mobile App
- **Platform**: Android (iOS coming soon)
- **Build System**: EAS Build (Expo)
- **Latest Build**: Check releases or EAS dashboard
- **Status**: ✅ Production builds available

## 🎯 How It Works

### Buy Flow
1. User browses products (AI-extracted from web)
2. Clicks **"Buy Now"** on product detail screen
3. System checks for active **cart mandate**
4. If no mandate → User signs mandate with constraints
5. If mandate exists → Shows confirmation modal
6. User confirms → Agent adds product to cart via **ACP**
7. Success notification + cart updates

### Intent Flow
1. User views a product
2. Clicks **"Create Intent"** button
3. System checks for active **intent mandate**
4. If no mandate → User signs mandate
5. User selects intent type (Price Drop, Availability, Time-Based, General)
6. Fills type-specific form (e.g., target price for price drop)
7. System generates reasoning via AI
8. Creates intent via **ACP (Agentic Commerce Protocol)**
9. Intent tracked for future action

### AI Search Flow
1. User enters search query
2. Backend calls **Google Custom Search** API
3. Returns 10 URLs with snippets
4. **Claude AI** filters for shoppable products
5. Fetches HTML from shoppable URLs
6. **Claude AI** extracts product data (name, price, image, specs)
7. Saves products to database
8. Returns results with generated filters

## 🗄️ Database Schema

### Core Tables
- `users` - User accounts and profiles
- `products` - Product catalog (AI-extracted)
- `search_queries` - Search history and status
- `product_filters` - AI-generated search filters
- `cart_items` - Shopping cart
- `orders` - Order history
- `order_items` - Order line items

### Mandate Tables
- `mandates` - Agent authorization mandates
- `purchase_intents` - User purchase intentions
- `agent_actions` - Audit log of agent activities

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/users/profile` - Get user profile (protected)
- `PUT /api/users/profile` - Update profile (protected)

### Products
- `POST /api/products/ai-search` - AI-powered product search
- `GET /api/products` - List products
- `GET /api/products/:id` - Get product details
- `GET /api/products/search-history` - Get search history
- `DELETE /api/products/:id` - Delete product

### Cart
- `GET /api/cart` - Get cart items
- `POST /api/cart` - Add to cart
- `PUT /api/cart/:id` - Update cart item
- `DELETE /api/cart/:id` - Remove from cart
- `DELETE /api/cart` - Clear cart

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders` - List orders
- `GET /api/orders/:id` - Get order details

### Mandates (ACP)
- `POST /api/mandates` - Create mandate
- `GET /api/mandates` - List mandates
- `POST /api/mandates/:id/approve` - Approve mandate
- `POST /api/mandates/:id/revoke` - Revoke mandate

### Agentic Commerce Protocol (ACP)
- `POST /api/acp/cart/add` - Agent adds to cart (requires cart mandate)
- `POST /api/acp/intents` - Create purchase intent (requires intent mandate)
- `GET /api/acp/intents` - List user intents
- `POST /api/acp/intents/:id/approve` - Approve intent
- `POST /api/acp/intents/:id/reject` - Reject intent
- `GET /api/acp/actions` - Get agent action history

## 🔐 Security Features

- **bcrypt** password hashing (10 rounds)
- **JWT** authentication with expiration
- **React Native Keychain** for secure token storage
- **Helmet** security headers
- **CORS** configuration
- **Input validation** with Zod schemas
- **SQL injection protection** (parameterized queries)
- **Mandate-based authorization** for agent actions
- **Audit logging** for all agent activities

## 🛠️ Development

### Backend Development

```bash
cd apps/backend

# Start with hot reload
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Type check
pnpm type-check
```

### Mobile Development

```bash
cd apps/mobile

# Start Expo dev server
pnpm start

# Run on Android
pnpm android

# Run on iOS (macOS only)
pnpm ios

# Build production APK
eas build --platform android --profile production
```

### Shared Packages

```bash
# Build shared types and validation
pnpm --filter @agentic-commerce/shared-types build
pnpm --filter @agentic-commerce/validation build

# Or build all shared packages
pnpm build:shared
```

## 📚 Additional Documentation

- `API_KEYS_SETUP.md` - API keys configuration guide
- `CHECK_API_KEYS.md` - API key verification guide
- `BUY_INTENT_IMPLEMENTATION.md` - Buy & Intent feature documentation
- `MANDATE_SYSTEM_SUMMARY.md` - Mandate system overview
- `BUILD_ANDROID_APK.md` - Android build instructions
- `DEPLOYMENT_STATUS.md` - Current deployment status

## 🐛 Troubleshooting

### Windows Path Length Issues
If you encounter path length errors during Android build:
```bash
# Use hoisted node-linker (already in .npmrc)
pnpm install

# Verify .npmrc contains:
# node-linker=hoisted
# shamefully-hoist=true
```

### AI Search Not Working
1. Check API keys are set in Railway environment variables
2. Verify Anthropic model name: `claude-sonnet-4-5-20250929` (with hyphens, not dots)
3. Check Railway logs for errors
4. Test API keys with curl commands (see `API_KEYS_SETUP.md`)

### Mobile App Build Fails
```bash
# Clear cache and rebuild
cd apps/mobile
rm -rf node_modules .expo
pnpm install
eas build --clear-cache --platform android
```

### Database Connection Issues
```bash
# Check PostgreSQL is running
pg_isready

# Verify database exists
psql -U postgres -l | grep agentic_commerce

# Check Railway database connection
# Railway provides DATABASE_URL automatically
```

## 🎯 Roadmap

### Completed ✅
- User authentication and profiles
- AI-powered product search
- Product catalog management
- Shopping cart
- Order management
- Mandate system (ACP)
- Buy with agent
- Purchase intents (4 types)
- Agent action audit logs
- Railway deployment
- EAS mobile builds

### In Progress 🚧
- Intent execution (price monitoring, availability checks)
- Push notifications for intents
- Payment integration
- Multi-agent support

### Planned 📋
- iOS app build
- Email/SMS notifications
- Product recommendations
- Wishlist functionality
- Social sharing
- Multiple payment methods
- Subscription management

## 📄 License

MIT

## 👨‍💻 Author

Saji Pillai

## 🤝 Contributing

This is a demonstration project. Feel free to fork and adapt for your own use.

## 🔗 Links

- **Live Backend**: https://agenticcommerce-production.up.railway.app
- **GitHub**: https://github.com/saji1970/AgenticCommerce
- **Railway Dashboard**: https://railway.app
- **Expo Dashboard**: https://expo.dev
