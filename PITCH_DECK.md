# AgenticCommerce: Product Pitch Deck
### From: Product Management, Digital Commerce & AI Platforms
### To: Head of Products, Consumer & Commercial Banking
### Date: February 2026

---

## SLIDE 1: TITLE SLIDE

# AgenticCommerce
## Secure Authorization Infrastructure for AI-Agent Commerce

**Tagline:** *"Let AI agents shop for your customers — with bank-grade controls."*

**Subtitle:** A working prototype of the mandate-based authorization layer that positions [BANK NAME] as the trust infrastructure for the age of agentic commerce.

---

## SLIDE 2: THE MARKET SHIFT

# AI Agents Are About to Spend Trillions

- **87% of consumers** say they would let an AI assistant handle routine purchases if they trusted the guardrails *(Gartner 2025)*
- **Google (AP2)** and **OpenAI/Stripe (ACP)** have published open protocols for AI-agent payments — the rails are being built *now*
- The global AI-commerce market is projected to reach **$14.1B by 2028** (CAGR 32.4%)
- **Every major fintech and Big Tech player** is racing to own the trust layer between AI agents and payment rails

### The question is not *whether* AI agents will spend money on behalf of consumers.
### The question is: **Who controls the guardrails?**

> If banks don't own this layer, Google, Apple, and Stripe will.

---

## SLIDE 3: THE PROBLEM

# Uncontrolled AI Spending Is a Liability Waiting to Happen

| Risk | Without Controls | With AgenticCommerce |
|------|-----------------|---------------------|
| **Unauthorized purchases** | AI buys a $5,000 flight without approval | Per-transaction, daily, and monthly spending caps enforced cryptographically |
| **Fraud surface** | No audit trail of *why* agent acted | Every action signed, token-chained, and stored as immutable evidence |
| **Regulatory exposure** | No consumer consent mechanism | Explicit mandate approval with biometric signature |
| **Dispute resolution** | "The AI did it" — bank absorbs the loss | Full mandate token chain links every charge back to user consent |
| **Compliance gaps** | No PCI/GDPR/SOC2 story for AI spending | Built-in: no card data in tokens, user-owned mandates, append-only audit |

> **Core insight:** Banks already solve authorization for *humans* (cards, PINs, 3DS). AgenticCommerce extends that model to **AI agents** — using the same trust principles banks already understand.

---

## SLIDE 4: THE SOLUTION

# AgenticCommerce: A 4-Mandate Authorization Framework

A hierarchical mandate system that gives consumers **granular, revocable control** over what AI agents can spend — and gives the bank a **complete audit trail** for every AI-initiated transaction.

```
                    +------------------+
                    |   APP MANDATE    |  <-- Master authorization per AI agent
                    |  $500/txn max    |      "I trust ChatGPT to shop for me,
                    |  $1000/day       |       up to these limits"
                    |  $5000/month     |
                    +--------+---------+
                             |
              +--------------+--------------+
              |              |              |
     +--------v---+  +------v-----+  +-----v--------+
     |    CART     |  |   INTENT   |  |   PAYMENT    |
     |   MANDATE   |  |  MANDATE   |  |   MANDATE    |
     | max 10 items|  | auto <$50  |  | $500/txn max |
     | electronics |  | flights OK |  | card ending  |
     |   only      |  |            |  |    4242      |
     +-------------+  +------------+  +--------------+
```

**Every mandate:**
- Requires **explicit user approval** (signature + optional biometrics)
- Produces a **cryptographic JWT token** — verifiable, time-limited, revocable
- **Cascades constraints** — child mandates can never exceed parent limits
- Creates an **immutable audit entry** linked to the financial transaction

---

## SLIDE 5: HOW IT WORKS — USER JOURNEY

# From "Hey Siri, book me a flight" to Settled Payment in 6 Steps

| Step | What Happens | Who Acts | Screenshot |
|------|-------------|----------|------------|
| **1. Setup** | Customer registers an AI agent with spending limits | Customer in Mobile App | `[SCREENSHOT: AppMandateSetupScreen — spending limits form with $500/$1000/$5000 fields, 2FA toggle]` |
| **2. Approve** | Customer reviews & signs the master mandate | Customer in Mandate App | `[SCREENSHOT: MandateDetailScreen — signature pad, limit summary, biometric prompt]` |
| **3. Shop** | AI agent searches flights, hotels, products via natural language | AI Agent in Chat | `[SCREENSHOT: AIChatScreen — "Flights from NYC to Delhi" with results cards]` |
| **4. Cart** | AI agent adds items to cart (child mandate auto-created) | AI Agent + System | `[SCREENSHOT: CartScreen — items with mandate badges showing authorization status]` |
| **5. Checkout** | All mandate tokens collected and validated against hierarchy | System | `[SCREENSHOT: CheckoutScreen — payment form with mandate verification checkmarks]` |
| **6. Audit** | Complete token chain persisted on order + payment records | System + Admin | `[SCREENSHOT: Admin DashboardPage — mandate status charts, transaction volume, AP2 stats]` |

---

## SLIDE 6: LIVE DEMO — WHAT WE BUILT

# A Working End-to-End Prototype

### Consumer Mobile App (React Native / Expo)
- AI Chat assistant with **natural-language product search** (flights, hotels, products)
- Product browsing, cart management, and full checkout flow
- **Mandate setup screen** — configure per-agent spending limits
- Deep-link integration with the Mandate Approval app
- Order history with mandate token audit trail

`[SCREENSHOT: Mobile app home screen showing AI Chat tab, Products tab, Cart tab, Profile tab]`

### Mandate Approval App (React Native / Expo)
- Dashboard of all mandates — active, pending, expired, revoked
- **Signature pad** for mandate approval
- **Limits editor** — adjust constraints before approving
- **Biometric authentication** integration
- Deep-link callbacks back to the shopping app

`[SCREENSHOT: Mandate app dashboard showing App Mandates section, Pending section, Active section]`

### Merchant Admin Dashboard (React / Tailwind)
- Real-time analytics: merchants, agents, users, mandate status, transaction volume
- AP2 transaction monitoring and volume tracking
- Mandate lifecycle management (by status, by type)
- Certificate management and system health monitoring
- Audit log viewer
- Purchase intent tracking

`[SCREENSHOT: Admin dashboard showing stat cards (Merchants, AI Agents, Users, Active Mandates, Volume) and charts]`

---

## SLIDE 7: SECURITY ARCHITECTURE

# Bank-Grade Security, Built In From Day One

### Cryptographic Foundation
| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Mandate tokens** | JWT (HMAC-SHA256) | Time-limited, verifiable authorization proof |
| **Artifact signing** | Ed25519 key pairs | Non-repudiation — every mandate approval is digitally signed |
| **AP2 request auth** | HMAC-SHA256 signatures | Tamper-proof merchant-to-gateway communication |
| **Hash chains** | SHA-256 | Append-only audit trail integrity |
| **Key management** | Ed25519 + RSA-2048 | Modern + legacy system interoperability |

### Constraint Enforcement
- **Cascading limits:** Child mandate can *never* exceed parent mandate constraints
- **Real-time validation:** Every transaction checked against active mandate hierarchy
- **Category restrictions:** Allow/block specific merchant categories per agent
- **Merchant allowlists:** Restrict agents to approved merchants only
- **Time-bound:** All mandates auto-expire; no indefinite authorizations

### Compliance Posture
| Standard | How We Comply |
|----------|--------------|
| **PCI-DSS** | No card numbers in mandate tokens — only `last4` stored |
| **GDPR** | User owns all mandates; full revocation with reason; per-user data queries |
| **SOC 2** | Append-only audit log; immutable token chains on financial records |
| **Strong Customer Auth (SCA)** | Optional 2FA enforcement per mandate; biometric signing |

---

## SLIDE 8: PROTOCOL COMPLIANCE

# Built on Open Standards: AP2 + ACP

AgenticCommerce implements **both** emerging industry protocols — positioning [BANK NAME] as interoperable with the entire ecosystem from day one.

### Google AP2 (Agentic Protocol 2)
- HMAC-SHA256 signed requests with **replay protection** (5-minute timestamp window)
- Merchant **tiered authorization** (Starter / Business / Enterprise)
- **Webhook event system** — mandate.created, payment.completed, intent.approved, etc.
- Exponential backoff retry (2/4/8/16 min, max 5 attempts)
- Full gateway API: `/authorize`, `/verify-mandate`, `/cart`, `/intent`, `/payment`

### OpenAI/Stripe ACP (Agentic Commerce Protocol)
- **Scoped tokens** with granular permissions per action type
- **Idempotent operations** — safe to retry without double-charging
- **Structured audit trails** — every commerce action linked to authorization chain
- **Unified commerce actions** — standardized cart/intent/payment interfaces

### Why Both?
> Google and OpenAI are betting on different AI agent ecosystems. By supporting both protocols, [BANK NAME] becomes the **neutral trust layer** that works with *any* AI agent — regardless of which ecosystem wins.

`[SCREENSHOT: AP2 Gateway health endpoint or API docs page showing supported operations]`

---

## SLIDE 9: MERCHANT INTEGRATION

# Simple Onboarding for Merchants — Powerful Controls for the Bank

### Merchant Capabilities
- **Self-service registration** with API key provisioning
- **Tiered transaction limits** (Starter: $10K/txn, Business: $50K, Enterprise: $100K)
- **Webhook configuration** for real-time event notifications
- **Key rotation** — merchants can rotate API credentials without downtime
- **Analytics dashboard** — transaction volume, mandate usage, intent conversion

### Merchant Admin Views
- Transaction history with filtering
- Mandate monitoring across their customer base
- Intent tracking (pending / approved / rejected / executed)
- Profile and settings management

`[SCREENSHOT: Admin MerchantDetailPage showing merchant profile, tier, API keys, webhook config]`

---

## SLIDE 10: AI AGENT INTEGRATION

# Any AI Agent. Any Commerce Use Case.

### Built-In AI Shopping Assistant
The prototype includes a **conversational commerce interface** that demonstrates the full agent-to-mandate flow:

| Query Type | Example | What Happens |
|-----------|---------|-------------|
| **Flights** | "Flights from New York to Delhi in March" | NLP parses origin/destination/dates, returns flight cards with prices |
| **Hotels** | "Hotels in Paris under $200/night" | Location + budget extraction, hotel results with ratings |
| **Products** | "Ergonomic office chair under $500" | Category + price range search, product cards with buy buttons |
| **Car rentals** | "Car rental in Los Angeles for a week" | Location + duration extraction, rental options |

### Agent Registration Flow
1. Agent registers via API → receives `agentId`
2. User sets spending limits for that agent → **APP mandate**
3. Agent operates within those limits → child mandates auto-created per action
4. Every agent action produces auditable mandate tokens

`[SCREENSHOT: AIChatScreen showing a flight search conversation with product cards and mandate offer]`

---

## SLIDE 11: TECHNICAL ARCHITECTURE

# Production-Ready Microservices Architecture

```
+-------------------+     +-------------------+     +-------------------+
|   Mobile App      |     |   Mandate App     |     |   Admin Dashboard |
|   (React Native)  |     |   (React Native)  |     |   (React + Vite)  |
+--------+----------+     +--------+----------+     +--------+----------+
         |                         |                          |
         |    Deep Links           |                          |
         +----------+--------------+                          |
                    |                                         |
         +----------v-----------------------------------------v----------+
         |                    API Gateway (Express.js)                    |
         |  Auth: JWT (users) | X-Api-Key (merchants) | X-AP2-* (AP2)   |
         +------+----------------------------+-------------------+-------+
                |                            |                   |
    +-----------v----------+    +------------v-------+    +------v-------+
    |   Backend Service    |    |  Mandate Service   |    |   Payment    |
    |   (Port 3000)        |    |  (Port 3001)       |    |   Gateway    |
    |                      |    |                    |    |              |
    |  - Products API      |    |  - Mandate CRUD    |    |  - Payment   |
    |  - Cart API          |    |  - Token signing   |    |    routing   |
    |  - Orders API        |    |  - Crypto (Ed25519)|    |  - Provider  |
    |  - AP2 Gateway       |    |  - Audit logging   |    |    abstraction|
    |  - Merchant API      |    |  - Security guard  |    |              |
    +-----------+----------+    +------------+-------+    +--------------+
                |                            |
    +-----------v----------------------------v-----------+
    |              PostgreSQL Database                    |
    |  users | products | carts | orders | payments      |
    |  agent_mandates | merchants | ap2_transactions     |
    |  ap2_webhook_deliveries | agent_actions            |
    +----------------------------------------------------+
```

### Key Technical Decisions
| Decision | Rationale |
|----------|-----------|
| **Separate mandate service** | Mandate lifecycle is a distinct security domain; can be independently scaled and audited |
| **Raw SQL (no ORM)** | Full control over query performance; parameterized queries prevent SQL injection |
| **JSONB for constraints** | Flexible schema evolution without migrations; constraint types can evolve per mandate type |
| **JWT mandate tokens** | Industry-standard, verifiable, time-limited; works across services without shared state |
| **Ed25519 signing** | Modern, fast, compact signatures; 64-byte signatures vs 256+ for RSA |

---

## SLIDE 12: STRATEGIC POSITIONING

# Why [BANK NAME] Should Own This Layer

### The Competitive Landscape
| Player | What They're Building | Their Gap |
|--------|----------------------|-----------|
| **Google** | AP2 protocol + Wallet integration | No consumer relationship; needs banks for settlement |
| **Apple** | Apple Pay + AI (Siri/Apple Intelligence) | Closed ecosystem; merchants want open standards |
| **Stripe** | ACP protocol + payment rails | No consumer trust; B2B only |
| **PayPal** | AI shopping assistant | Limited mandate/authorization layer |
| **Visa/Mastercard** | Tokenization + network rules | Network-level only; no consumer-facing agent controls |

### [BANK NAME]'s Unique Advantages
1. **Trusted consumer relationship** — 60M+ customers already trust us with their money
2. **Existing KYC/AML infrastructure** — agent onboarding is a natural extension
3. **Settlement capability** — we *are* the payment rail; no intermediary needed
4. **Regulatory credibility** — we already comply with PCI, SOC 2, GDPR, SCA
5. **Merchant network** — existing acquiring relationships become agent-commerce enabled

### Revenue Opportunities
| Stream | Model | Estimated TAM |
|--------|-------|--------------|
| **Mandate-as-a-Service** | Per-mandate fee (creation + monthly active) | $2-5B by 2028 |
| **Agent Authorization API** | Per-API-call pricing for fintechs/merchants | $1-3B by 2028 |
| **Premium Agent Controls** | Subscription for advanced limits, analytics, alerts | $500M-1B by 2028 |
| **Interchange uplift** | Higher-margin AI-agent transactions | 15-25bps premium |

---

## SLIDE 13: COMPETITIVE MOAT

# First-Mover in Bank-Grade Agent Authorization

### What We Demonstrated (Working Prototype)
- Full 4-mandate hierarchy (APP / CART / INTENT / PAYMENT)
- Cryptographic token chain from consent to settlement
- Dual-protocol compliance (Google AP2 + OpenAI ACP)
- Consumer mobile app with AI agent shopping assistant
- Separate mandate approval app with biometric signing
- Merchant admin dashboard with real-time analytics
- Ed25519 digital signatures + HMAC-SHA256 gateway auth
- 78 automated tests across 5 test suites

### What Competitors Cannot Easily Replicate
1. **Consumer trust** — a Google or Stripe "mandate app" doesn't carry the same weight as a [BANK NAME] authorization
2. **Regulatory moat** — bank-issued mandates have legal standing that tech-company tokens do not
3. **Existing card rails** — mandates layer *on top of* existing card/ACH infrastructure
4. **Cross-agent neutrality** — we authorize *all* agents, not just our own

---

## SLIDE 14: ROADMAP

# From Prototype to Production: 3 Phases

### Phase 1: Foundation (Q2 2026) — *Current state + hardening*
- [ ] Security audit and penetration testing
- [ ] HSM integration for key management (replace software keys)
- [ ] OAuth 2.0 / OpenID Connect integration for consumer auth
- [ ] Production PostgreSQL cluster with read replicas
- [ ] CI/CD pipeline and automated compliance checks

### Phase 2: Pilot (Q3-Q4 2026) — *Internal launch*
- [ ] Integration with [BANK NAME] card issuing platform
- [ ] Real payment processor integration (replace mock gateway)
- [ ] Internal pilot: [BANK NAME] AI assistant as first agent
- [ ] Merchant pilot: 5-10 top merchants onboarded
- [ ] Consumer pilot: 10,000 customers (invite-only)
- [ ] Regulatory approval for AI-agent transaction type

### Phase 3: Scale (2027) — *Market launch*
- [ ] Public API launch for third-party AI agents
- [ ] Apple Pay / Google Pay mandate integration
- [ ] Open Banking (PSD2) directive compliance
- [ ] Multi-currency / cross-border support
- [ ] Agent marketplace — discovery + trust scores
- [ ] Real-time fraud detection tuned for agent behavior patterns

---

## SLIDE 15: THE ASK

# What We Need to Move Forward

### Investment Request
| Item | Cost Estimate | Timeline |
|------|--------------|----------|
| **Engineering team** (6 FTE: 2 backend, 2 mobile, 1 security, 1 infra) | $1.8M/year | Ongoing |
| **Security audit + pen test** | $150K | Q2 2026 |
| **HSM infrastructure** | $200K | Q2 2026 |
| **Pilot program operations** | $300K | Q3-Q4 2026 |
| **Total Phase 1+2** | **~$2.5M** | 9 months |

### What We're Asking For
1. **Executive sponsorship** — this needs to be a strategic initiative, not a skunkworks project
2. **Engineering headcount** — 6 dedicated engineers for 12 months
3. **Access to card issuing APIs** — to connect mandates to real payment rails
4. **Merchant partnerships team** — to onboard pilot merchants
5. **Legal/compliance review** — to establish regulatory framework for AI-agent mandates

### Expected ROI
- **Break-even in 18 months** from pilot merchant fees + interchange uplift
- **$50M+ annual revenue** by 2028 from mandate-as-a-service
- **Defensive value:** Prevents Big Tech from disintermediating [BANK NAME] in agent commerce

---

## SLIDE 16: CLOSING

# The Window Is Closing

> Google published AP2 in 2025. OpenAI and Stripe published ACP the same year.
> Every major AI lab is building shopping agents.
> The infrastructure to authorize and control those agents **does not yet exist at bank grade.**

**We have a working prototype. We have protocol compliance. We have a clear path to production.**

The bank that owns the mandate layer for AI-agent commerce will define the next generation of consumer financial services.

**That bank should be [BANK NAME].**

---

## APPENDIX A: GLOSSARY

| Term | Definition |
|------|-----------|
| **Mandate** | A cryptographically signed authorization that defines what an AI agent is permitted to do |
| **APP Mandate** | Master authorization — sets overall spending limits for an AI agent |
| **CART Mandate** | Authorization for an agent to add items to a shopping cart |
| **INTENT Mandate** | Authorization for an agent to express purchase intent (e.g., "I want to book this flight") |
| **PAYMENT Mandate** | Authorization for an agent to execute a payment transaction |
| **AP2** | Agentic Protocol 2 — Google's open protocol for AI agent payment authorization |
| **ACP** | Agentic Commerce Protocol — OpenAI/Stripe's standard for AI agent shopping and checkout |
| **Mandate Token** | A JWT that proves an AI agent has been authorized to perform a specific action |
| **Constraint Cascading** | Parent mandate limits always override child mandates (more restrictive wins) |

---

## APPENDIX B: SCREENSHOT PLACEMENT GUIDE

Use this checklist when preparing the PowerPoint:

| Slide | Screenshot Needed | Source Screen |
|-------|------------------|---------------|
| 5 — Step 1 | App Mandate Setup form | Mobile App > `AppMandateSetupScreen` |
| 5 — Step 2 | Mandate approval with signature pad | Mandate App > `MandateDetailScreen` |
| 5 — Step 3 | AI chat with flight search results | Mobile App > `AIChatScreen` |
| 5 — Step 4 | Cart with mandate-authorized items | Mobile App > `CartScreen` |
| 5 — Step 5 | Checkout with mandate validation | Mobile App > `CheckoutScreen` |
| 5 — Step 6 | Admin dashboard with analytics | Admin > `DashboardPage` |
| 6 — Mobile App | Home screen with tab navigation | Mobile App > `HomeScreen` |
| 6 — Mandate App | Dashboard with mandate sections | Mandate App > `DashboardScreen` |
| 6 — Admin | Full dashboard with charts | Admin > `DashboardPage` |
| 8 — AP2 | AP2 gateway health/docs endpoint | Browser > `/api/ap2/gateway/docs` |
| 9 — Merchant | Merchant detail page | Admin > `MerchantDetailPage` |
| 10 — AI Chat | Conversation with product cards | Mobile App > `AIChatScreen` |

---

*Prepared by Product Management, Digital Commerce & AI Platforms Division*
*Prototype repository: AgenticCommerce (internal)*
*Contact: [PM Name] | [PM Email]*
