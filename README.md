# Agentic Commerce AI App

AI-powered autonomous shopping platform that enables intelligent product discovery, comparison, and purchasing across iOS, Android, and AR/VR platforms.

## 🚀 Features

- **AI Agent with Natural Language Interface**: Powered by Claude API for conversational shopping
- **Multi-Retailer Discovery**: Search and compare products across multiple retailers via MCP
- **Flexible Payment Processing**: Support for Stripe, Razorpay, PayPal, and Square payment gateways
- **Cross-Platform**: React Native for iOS/Android, React Native VR for immersive experiences
- **User Preference Learning**: Personalized recommendations based on shopping history
- **Trust & Verification**: Retailer reputation scoring and review aggregation

## 📦 Project Structure

```
agentic-commerce/
├── apps/
│   ├── backend/          # Node.js/TypeScript backend API
│   └── vr/               # React Native VR app
├── packages/
│   ├── shared/           # Shared TypeScript types and utilities
│   ├── ai-agent/         # AI agent logic and LLM integration
│   ├── mcp-client/       # Model Context Protocol client
│   └── payment/          # Stripe payment processing
└── infrastructure/       # Railway deployment configs
```

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express with TypeScript
- **Database**: PostgreSQL (transactions), Redis (caching)
- **AI/ML**: Anthropic Claude API
- **Payments**: Configurable (Stripe, Razorpay, PayPal, Square)
- **Search**: Elasticsearch
- **Message Queue**: RabbitMQ

### AR/VR
- **Framework**: React Native VR / React 360
- **3D Rendering**: Three.js
- **Platforms**: Meta Quest, Apple Vision Pro

## 🚀 Getting Started

### Prerequisites

```bash
node >= 18.0.0
npm >= 9.0.0
```

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Run development servers
npm run dev
```

### Development

```bash
# Run backend only
npm run backend

# Run all services
npm run dev
```

## 🌐 Deployment

This project is configured for deployment on [Railway](https://railway.app/).

```bash
# Deploy to Railway
railway up
```

## 📝 Environment Variables

Required environment variables:

```
# AI/LLM
ANTHROPIC_API_KEY=your_claude_api_key

# Payment Gateway (choose one: stripe, razorpay, paypal, square)
PAYMENT_GATEWAY=stripe
PAYMENT_API_KEY=your_payment_api_key
PAYMENT_API_SECRET=your_payment_api_secret  # Required for some gateways
PAYMENT_WEBHOOK_SECRET=your_webhook_secret

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname
REDIS_URL=redis://host:6379

# MCP
MCP_SERVER_URLS=http://retailer1.mcp,http://retailer2.mcp
```

See [PAYMENT_GATEWAYS.md](./PAYMENT_GATEWAYS.md) for detailed payment gateway configuration.

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific package tests
npm test -- --filter=backend
```

## 📄 License

Proprietary - All rights reserved

## 🤝 Contributing

This is a private project. Please contact the maintainers for contribution guidelines.
