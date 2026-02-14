# AgenticCommerce - Complete Technical Architecture & Functionality

## Overview

AgenticCommerce is a full-stack AI-powered mobile shopping platform with autonomous agent capabilities. The system consists of **5 backend services** and **2 Android mobile applications** working together to enable AI-assisted shopping with mandate-based authorization.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Mobile Applications                       │
├──────────────────────────┬──────────────────────────────────┤
│  Shopping Cart AI App     │   User Mandate AI App            │
│  (React Native + Expo)    │   (React Native)                 │
└──────────────┬───────────┴──────────────┬───────────────────┘
               │                           │
               │                           │
┌──────────────▼───────────┐   ┌──────────▼───────────────────┐
│   Backend API            │   │   Mandate Service             │
│   (Express + TypeScript) │   │   (Express + TypeScript)       │
└──────────────┬───────────┘   └──────────┬───────────────────┘
               │                           │
               │                           │
┌──────────────▼───────────┐   ┌──────────▼───────────────────┐
│   Payment Gateway         │   │   PostgreSQL Database          │
│   (Mock Service)         │   │   (Shared across services)     │
└───────────────────────────┘   └────────────────────────────────┘
```

---

## 📱 1. Mobile App - Shopping Cart AI App

**Location:** `apps/mobile/`  
**Technology:** React Native 0.81.5, Expo 54, TypeScript  
**Package:** `@agentic-commerce/mobile`

### Core Functionality

#### 1.1 Authentication & User Management
- **JWT-based authentication** with secure token storage using `react-native-keychain`
- User registration and login
- Profile management
- Secure token refresh

#### 1.2 AI-Powered Product Search
- **Google Custom Search API** integration for product discovery
- **Claude AI (Anthropic Sonnet 4.5)** for:
  - Filtering shoppable products from search results
  - Extracting product data (name, price, specs, images)
  - Generating smart product filters
- Real-time search history tracking
- Product catalog with AI-extracted details

#### 1.3 Shopping Cart Management
- Add/remove items from cart
- Update quantities
- Cart persistence
- Real-time cart synchronization

#### 1.4 Agent-Assisted Shopping (ACP - Agentic Commerce Protocol)

**Buy with Agent Flow:**
1. User clicks "Buy Now" on product
2. System checks for active **cart mandate**
3. If no mandate → User signs mandate with constraints
4. If mandate exists → Shows confirmation modal
5. User confirms → Agent adds product to cart via ACP
6. Success notification + cart updates

**Purchase Intents (4 Types):**
- 💰 **Price Drop Alert** - Notify when price drops below target
- 📦 **Back in Stock** - Alert when product becomes available
- ⏰ **Scheduled Purchase** - Schedule purchases for future dates
- ⭐ **General Interest** - Express interest without specific conditions

**Intent Creation Flow:**
1. User views product
2. Clicks "Create Intent" button
3. System checks for active **intent mandate**
4. If no mandate → User signs mandate
5. User selects intent type and fills form
6. System generates reasoning via AI
7. Creates intent via ACP
8. Intent tracked for future action

#### 1.5 Mandate Management
- View active mandates
- Create new mandates (cart, intent, payment)
- Approve/reject pending mandates
- Deep linking integration with Mandate App

#### 1.6 Navigation Structure
- **Bottom Tab Navigator** with 5 tabs:
  - 🏠 Home - Welcome screen with frequently searched products
  - 🛍️ Products - Product search and browsing
  - ⭐ Intents - Purchase intent management
  - 🛒 Cart - Shopping cart
  - 👤 Profile - User profile and settings

### Technical Stack

**Dependencies:**
- `@react-navigation/native` - Navigation
- `@react-navigation/bottom-tabs` - Tab navigation
- `@react-navigation/stack` - Stack navigation
- `axios` - HTTP client
- `expo-secure-store` - Secure storage
- `react-native-keychain` - Keychain access
- `react-native-biometrics` - Biometric authentication
- `zod` - Schema validation

**State Management:**
- React Context API for:
  - `AuthContext` - Authentication state
  - `ProductContext` - Product data
  - `CartContext` - Shopping cart
  - `MandateContext` - Mandate management
  - `IntentContext` - Purchase intents

**Services:**
- `auth.service.ts` - Authentication API calls
- `product.service.ts` - Product search and management
- `cart.service.ts` - Cart operations
- `mandate.service.ts` - Mandate operations
- `acp.service.ts` - Agentic Commerce Protocol operations
- `payment.service.ts` - Payment processing

### Deep Linking
- Handles callbacks from Mandate App:
  - `agenticcommerce://payment-callback?mandateId=xxx&status=approved`
  - `agenticcommerce://intent-callback?mandateId=xxx&status=approved`

---

## 📱 2. Mobile App - User Mandate AI App

**Location:** `apps/mandate-app/`  
**Technology:** React Native 0.81.5, TypeScript  
**Package:** `@agentic-commerce/user-mandate-app`

### Core Functionality

#### 2.1 Mandate Management Dashboard
- **Dashboard Screen** - Overview of:
  - Active AI apps count
  - Active mandates count
  - Pending approvals
  - Combined spending limits (daily/monthly)
- **Mandates Screen** - List all mandates with:
  - Status (active, pending, revoked)
  - Agent name and type
  - Constraints and limits
  - Creation/expiration dates
- **Mandate Detail Screen** - Detailed view with:
  - Full mandate information
  - Constraints breakdown
  - Usage statistics
  - Revoke/approve actions

#### 2.2 AI Apps Management
- **AI Apps Screen** - Manage registered AI agent applications:
  - View all registered agents
  - Configure app-specific limits
  - View agent capabilities
  - Manage agent authorizations

#### 2.3 Mandate Signing & Approval
- **Hardware-secured mandate signing** using:
  - Device secure element (Android Keystore)
  - Cryptographic key generation (Ed25519)
  - Digital signature creation
  - Public key registration
- **Signature Pad** - Touch-based signature capture
- **Mandate Limits Editor** - Configure spending limits:
  - Daily spending limit
  - Monthly spending limit
  - Per-transaction limit
  - Item value limits

#### 2.4 Settings & Configuration
- **Default Limits Screen** - Set default spending limits
- **Payment Methods Screen** - Manage payment methods
- **CA Configuration** - Certificate Authority settings
- User profile management

#### 2.5 Deep Linking
- Receives deep links from Shopping Cart App:
  - `mandate://mandate/{mandateId}?cartData={encodedData}`
  - `mandate://mandate/{mandateId}?intentData={encodedData}`
- Opens mandate detail screen with context data

### Technical Stack

**Dependencies:**
- `@react-navigation/native` - Navigation
- `@react-navigation/bottom-tabs` - Tab navigation
- `@react-navigation/stack` - Stack navigation
- `axios` - HTTP client
- `react-native-keychain` - Secure key storage
- `react-native-biometrics` - Biometric authentication
- `react-native-svg` - SVG rendering (for signature pad)

**Services:**
- `mandate-service.client.ts` - Mandate Service API client
- `crypto.service.ts` - Cryptographic operations
- `secure-element.service.ts` - Secure element access
- `signature.service.ts` - Digital signature creation
- `public-key.service.ts` - Public key management
- `certificate-manager.service.ts` - Certificate management
- `ca-server.service.ts` - Certificate Authority server client

**Security Features:**
- Hardware-backed key storage
- Ed25519 cryptographic signatures
- Public key attestation
- Secure element integration

### Navigation Structure
- **Bottom Tab Navigator:**
  - 🏠 Dashboard - Overview and stats
  - 🤖 AI Apps - Manage AI agent applications
  - 📋 Mandates - View and manage mandates
  - ⚙️ Settings - Configuration and preferences

---

## 🔧 3. Backend API - Agentic Commerce

**Location:** `apps/backend/`  
**Technology:** Node.js, Express, TypeScript, PostgreSQL  
**Package:** `@agentic-commerce/backend`  
**Port:** 3000 (default)  
**Deployment:** Railway (https://agenticcommerce-production.up.railway.app)

### Core Functionality

#### 3.1 Authentication & Authorization
- **JWT-based authentication** with bcrypt password hashing
- User registration and login
- Token refresh mechanism
- Protected route middleware

**Endpoints:**
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/users/profile` - Get user profile (protected)
- `PUT /api/users/profile` - Update profile (protected)

#### 3.2 AI-Powered Product Search
- **Google Custom Search API** integration
- **Claude AI (Anthropic Sonnet 4.5)** for:
  - Product filtering from search results
  - Product data extraction (name, price, specs, images)
  - Smart filter generation
- **MCP (Model Context Protocol)** integration for extensible e-commerce
- Search history tracking
- Product catalog management

**Endpoints:**
- `POST /api/products/ai-search` - AI-powered product search
- `GET /api/products` - List products with pagination
- `GET /api/products/:id` - Get product details
- `GET /api/products/search-history` - Get search history
- `DELETE /api/products/:id` - Delete product

**Search Flow:**
1. User enters search query
2. Backend calls Google Custom Search API
3. Returns 10 URLs with snippets
4. Claude AI filters for shoppable products
5. Fetches HTML from shoppable URLs
6. Claude AI extracts product data
7. Saves products to database
8. Returns results with generated filters

#### 3.3 Shopping Cart Management
- Add/remove items
- Update quantities
- Cart persistence
- User-specific carts

**Endpoints:**
- `GET /api/cart` - Get cart items
- `POST /api/cart` - Add to cart
- `PUT /api/cart/:id` - Update cart item
- `DELETE /api/cart/:id` - Remove from cart
- `DELETE /api/cart` - Clear cart

#### 3.4 Agentic Commerce Protocol (ACP)

**Cart Mandate Operations:**
- `POST /api/acp/cart/add` - Agent adds to cart (requires cart mandate)
  - Validates mandate constraints
  - Checks spending limits
  - Adds item to cart
  - Logs agent action

**Intent Mandate Operations:**
- `POST /api/acp/intents` - Create purchase intent (requires intent mandate)
  - Validates mandate
  - Creates intent with reasoning
  - Sets status (pending/approved)
- `GET /api/acp/intents` - List user intents
- `POST /api/acp/intents/:intentId/approve` - Approve intent
- `POST /api/acp/intents/:intentId/reject` - Reject intent

**Payment Mandate Operations:**
- `POST /api/acp/payment/execute` - Agent executes payment (requires payment mandate)
  - Validates mandate
  - Processes payment via Payment Gateway
  - Updates order status

**Agent Actions Audit:**
- `GET /api/acp/actions` - Get agent action history
  - All agent actions logged with:
    - Timestamp
    - Agent ID
    - Action type
    - Mandate ID
    - Result

#### 3.5 Mandate Management
- Create mandates (cart, intent, payment)
- List user mandates
- Approve/revoke mandates
- Mandate validation

**Endpoints:**
- `POST /api/mandates` - Create mandate
- `GET /api/mandates` - List mandates
- `GET /api/mandates/:id` - Get mandate details
- `POST /api/mandates/:id/approve` - Approve mandate
- `POST /api/mandates/:id/revoke` - Revoke mandate

#### 3.6 Agent Management
- Register agents
- List available agents
- Agent status management

**Endpoints:**
- `GET /api/agents` - List all agents
- `GET /api/agents/active` - Get active agents
- `GET /api/agents/agent-id/:agentId` - Get agent by ID

#### 3.7 Payment Processing
- Integration with Payment Gateway
- Order creation
- Payment status tracking

**Endpoints:**
- `POST /api/payments/process` - Process payment
- `GET /api/orders` - List orders
- `POST /api/orders` - Create order

#### 3.8 Admin Portal
- Serves admin SPA static files
- Admin API endpoints for system management

### Technical Stack

**Dependencies:**
- `express` - Web framework
- `@anthropic-ai/sdk` - Claude AI integration
- `@google/generative-ai` - Google AI (alternative)
- `@modelcontextprotocol/sdk` - MCP integration
- `pg` - PostgreSQL client
- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT tokens
- `zod` - Schema validation
- `axios` - HTTP client
- `helmet` - Security headers
- `cors` - CORS middleware
- `morgan` - HTTP logging

**Architecture:**
- **Clean Architecture** with:
  - Controllers - Route handlers
  - Services - Business logic
  - Repositories - Data access
  - Middleware - Auth, validation, error handling

**Database:**
- PostgreSQL with migrations
- Tables:
  - `users` - User accounts
  - `products` - Product catalog
  - `search_queries` - Search history
  - `product_filters` - AI-generated filters
  - `cart_items` - Shopping cart
  - `orders` - Order history
  - `order_items` - Order line items
  - `agent_mandates` - Mandates
  - `purchase_intents` - Purchase intents
  - `agent_actions` - Audit log

---

## 🔐 4. Mandate Service

**Location:** `apps/mandate-service/`  
**Technology:** Node.js, Express, TypeScript, PostgreSQL  
**Package:** `@agentic-commerce/mandate-service`  
**Port:** 3001 (default)

### Core Functionality

#### 4.1 Merchant Management
- Register merchants
- Manage merchant settings
- API key rotation
- Merchant verification

**V1 API Endpoints:**
- `POST /api/v1/merchants/register` - Register merchant
- `POST /api/v1/merchants/:id/verify` - Verify merchant
- `GET /api/v1/merchants` - List merchants
- `PUT /api/v1/merchants/:id/settings` - Update settings
- `POST /api/v1/merchants/:id/rotate-keys` - Rotate API keys

#### 4.2 AI Agent App Management
- Register AI agent applications
- Manage agent capabilities
- Agent key rotation
- Agent suspension/revocation

**V1 API Endpoints:**
- `POST /api/v1/agents/register` - Register agent
- `GET /api/v1/agents/:agentId` - Get agent details
- `POST /api/v1/agents/:agentId/rotate-keys` - Rotate keys
- `POST /api/v1/agents/:agentId/suspend` - Suspend agent
- `POST /api/v1/agents/:agentId/revoke` - Revoke agent

#### 4.3 Mandate Management (V1 API)
- Create mandate drafts
- Submit signed mandates
- Activate mandates
- Revoke mandates
- Validate mandates for execution

**V1 API Endpoints:**
- `POST /api/v1/mandates/draft` - Create mandate draft
- `POST /api/v1/mandates/submit-signed` - Submit signed mandate
- `POST /api/v1/mandates/:id/activate` - Activate mandate
- `POST /api/v1/mandates/:id/revoke` - Revoke mandate
- `GET /api/v1/mandates/:id` - Get mandate status
- `GET /api/v1/mandates/user/:userId` - Get user mandates
- `POST /api/v1/mandates/validate` - Validate for execution

#### 4.4 Payment Authorization
- Request payment authorization
- Payment result callbacks
- Payment artifact retrieval

**V1 API Endpoints:**
- `POST /api/v1/payments/authorize` - Request authorization
- `POST /api/v1/payments/callback` - Payment callback
- `GET /api/v1/payments/artifact/:id` - Get payment artifact

#### 4.5 Public Key Registration
- Register user public keys
- Key attestation
- Device ID tracking

**V1 API Endpoints:**
- `POST /api/v1/keys/register` - Register public key

#### 4.6 Audit Logging
- Mandate audit logs
- Security event logs
- Chain integrity verification

**V1 API Endpoints:**
- `GET /api/v1/audit/mandate/:mandateId` - Get mandate audit log
- `GET /api/v1/audit/security` - Get security events
- `GET /api/v1/audit/integrity` - Verify chain integrity

### Technical Stack

**Dependencies:**
- `express` - Web framework
- `pg` - PostgreSQL client
- `jsonwebtoken` - JWT tokens
- `bcrypt` - Password hashing
- `zod` - Schema validation
- `helmet` - Security headers
- `cors` - CORS middleware
- `morgan` - HTTP logging

**Authentication:**
- JWT authentication
- API key authentication for merchants
- Caller type validation (user, merchant, system)

**Database:**
- Shared PostgreSQL database
- Tables:
  - `merchants` - Merchant configuration
  - `ai_agent_apps` - AI agent applications
  - `mandates` - Mandate records
  - `user_public_keys` - User public keys
  - `audit_logs` - Audit trail

---

## 💳 5. Payment Gateway

**Location:** `apps/payment-gateway/`  
**Technology:** Node.js, Express, TypeScript  
**Package:** `@agentic-commerce/payment-gateway`  
**Port:** 3002 (default)

### Core Functionality

#### 5.1 Payment Processing
- **Mock payment gateway** that always approves payments
- Simulates payment processing delay (100-500ms)
- Generates transaction IDs
- Returns payment status

**Endpoints:**
- `POST /process` - Process payment
  - Request body:
    ```json
    {
      "amount": 100.00,
      "currency": "USD",
      "paymentMethod": "card",
      "cardDetails": {...},
      "metadata": {...}
    }
    ```
  - Response:
    ```json
    {
      "success": true,
      "transactionId": "TXN_1234567890_ABC123",
      "status": "approved",
      "amount": 100.00,
      "currency": "USD",
      "processedAt": "2024-01-01T00:00:00.000Z",
      "gateway": "Mock Payment Gateway"
    }
    ```

#### 5.2 Health Check
- `GET /health` - Service health status

### Technical Stack

**Dependencies:**
- `express` - Web framework
- `cors` - CORS middleware
- `helmet` - Security headers

**Note:** This is a mock service for development/testing. In production, this would integrate with real payment processors (Stripe, PayPal, etc.).

---

## 🖥️ 6. Admin Portal

**Location:** `apps/admin/`  
**Technology:** React, TypeScript, Vite, Tailwind CSS  
**Package:** `@agentic-commerce/admin`

### Core Functionality

#### 6.1 Admin Dashboard
- System overview
- User management
- Product management
- Order management
- Mandate monitoring
- Agent action audit logs

#### 6.2 Analytics & Reporting
- Sales analytics
- User activity
- Agent performance
- System health metrics

### Technical Stack

**Dependencies:**
- `react` - UI library
- `react-router-dom` - Routing
- `@tanstack/react-query` - Data fetching
- `axios` - HTTP client
- `tailwindcss` - Styling
- `recharts` - Charts
- `lucide-react` - Icons

**Build:**
- Vite for build tooling
- Served as static files from backend

---

## 🔄 System Integration & Data Flow

### 1. Product Search Flow
```
Mobile App → Backend API → Google Search API
                ↓
         Claude AI (Filter & Extract)
                ↓
         PostgreSQL (Save Products)
                ↓
         Mobile App (Display Results)
```

### 2. Buy with Agent Flow
```
Mobile App → Check Mandate → Mandate App (if needed)
                ↓
         Sign Mandate → Mandate Service
                ↓
         Backend API → Validate Mandate
                ↓
         Add to Cart → PostgreSQL
                ↓
         Mobile App (Update Cart)
```

### 3. Intent Creation Flow
```
Mobile App → Check Intent Mandate → Mandate App (if needed)
                ↓
         Create Intent → Backend API
                ↓
         Validate Mandate → Mandate Service
                ↓
         Save Intent → PostgreSQL
                ↓
         Mobile App (Display Intent)
```

### 4. Payment Flow
```
Mobile App → Backend API → Validate Payment Mandate
                ↓
         Payment Gateway → Process Payment
                ↓
         Create Order → PostgreSQL
                ↓
         Mobile App (Order Confirmation)
```

---

## 🔐 Security Features

### Authentication & Authorization
- JWT tokens with expiration
- Secure token storage (React Native Keychain)
- Password hashing with bcrypt (10 rounds)
- Protected API routes with middleware

### Mandate Security
- Hardware-backed key storage (Android Keystore)
- Ed25519 cryptographic signatures
- Public key attestation
- Mandate constraint validation
- Spending limit enforcement

### API Security
- Helmet security headers
- CORS configuration
- Input validation with Zod
- SQL injection protection (parameterized queries)
- Audit logging for all agent actions

---

## 📊 Database Schema

### Core Tables
- `users` - User accounts and profiles
- `products` - Product catalog (AI-extracted)
- `search_queries` - Search history and status
- `product_filters` - AI-generated search filters
- `cart_items` - Shopping cart
- `orders` - Order history
- `order_items` - Order line items

### Mandate Tables
- `agent_mandates` - Agent authorization mandates
- `purchase_intents` - User purchase intentions
- `agent_actions` - Audit log of agent activities
- `merchants` - Merchant configuration
- `ai_agent_apps` - AI agent applications
- `user_public_keys` - User public keys for signatures

---

## 🚀 Deployment

### Backend API
- **Platform:** Railway
- **URL:** https://agenticcommerce-production.up.railway.app
- **Database:** PostgreSQL on Railway
- **Auto-deploy:** Enabled (pushes to master branch)

### Mandate Service
- **Platform:** Railway (separate service)
- **Database:** Shared PostgreSQL

### Payment Gateway
- **Platform:** Railway (separate service)
- **Note:** Mock service for development

### Mobile Apps
- **Platform:** Android (APK builds)
- **Build System:** EAS Build (Expo)
- **Status:** Production builds available

---

## 📦 Monorepo Structure

```
AgenticCommerce/
├── apps/
│   ├── backend/              # Express API server
│   ├── mandate-service/      # Mandate management service
│   ├── payment-gateway/      # Payment processing service
│   ├── mobile/               # Shopping Cart AI App
│   ├── mandate-app/          # User Mandate AI App
│   └── admin/                # Admin portal (React SPA)
├── packages/
│   ├── shared-types/         # Shared TypeScript types
│   └── validation/           # Shared Zod validation schemas
└── package.json              # Root workspace config
```

**Package Manager:** pnpm with workspaces

---

## 🔑 API Keys Required

### Anthropic Claude API
- **Purpose:** AI product filtering and extraction
- **Model:** `claude-sonnet-4-5-20250929`
- **Cost:** ~$0.03-$0.15 per search
- **Free Tier:** $5 credit

### Google Custom Search API
- **Purpose:** Product search on the web
- **Free Tier:** 100 queries/day
- **Requires:** API Key + Search Engine ID

---

## 📝 Key Features Summary

### ✅ Implemented
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
- Hardware-secured mandate signing
- Deep linking between apps

### 🚧 In Progress
- Intent execution (price monitoring, availability checks)
- Push notifications for intents
- Payment integration (real payment processors)
- Multi-agent support

### 📋 Planned
- iOS app build
- Email/SMS notifications
- Product recommendations
- Wishlist functionality
- Social sharing
- Multiple payment methods
- Subscription management

---

## 🛠️ Development Commands

### Backend
```bash
cd apps/backend
pnpm dev          # Start with hot reload
pnpm build        # Build for production
pnpm start        # Start production server
```

### Mandate Service
```bash
cd apps/mandate-service
pnpm dev          # Start with hot reload
pnpm build        # Build for production
pnpm start        # Start production server
```

### Payment Gateway
```bash
cd apps/payment-gateway
pnpm dev          # Start with hot reload
pnpm build        # Build for production
pnpm start        # Start production server
```

### Mobile App (Shopping Cart)
```bash
cd apps/mobile
pnpm start        # Start Expo dev server
pnpm android      # Run on Android
pnpm ios          # Run on iOS (macOS only)
```

### Mandate App
```bash
cd apps/mandate-app
pnpm start        # Start React Native
pnpm android      # Run on Android
pnpm ios          # Run on iOS (macOS only)
```

### Admin Portal
```bash
cd apps/admin
pnpm dev          # Start Vite dev server
pnpm build        # Build for production
```

---

## 📚 Additional Documentation

- `README.md` - Main project documentation
- `API_KEYS_SETUP.md` - API keys configuration
- `MANDATE_SERVICE_README.md` - Mandate service details
- `BUY_INTENT_IMPLEMENTATION.md` - Buy & Intent features
- `MANDATE_SYSTEM_SUMMARY.md` - Mandate system overview
- `BUILD_ANDROID_APK.md` - Android build instructions

---

## 👨‍💻 Author

Saji Pillai

---

## 📄 License

MIT
