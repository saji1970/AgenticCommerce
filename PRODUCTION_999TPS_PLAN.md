# AgenticCommerce: Production-Grade @ 999 TPS
## Keeping the Current Node.js/TypeScript Stack

---

## TL;DR — 999 TPS IS ACHIEVABLE ON NODE.JS

Node.js can handle 999 TPS. Express.js alone benchmarks at **~15,000 req/s** on simple routes. The bottleneck is NOT the runtime — it's the **database queries, missing caching, single-process architecture, and zero observability** in the current code. Here are the **27 specific changes** required, in priority order.

---

## CURRENT BOTTLENECK ANALYSIS

### Hot Path: Mandate Validation at Checkout (The 999 TPS Target)

Every checkout request does this:

```
1. GET cart items          → 1 DB query
2. Validate mandate token  → jwt.verify (CPU) + 1 DB query (mandate by ID)
3. Check mandate active    → 1 DB query (mandate status)
4. Check parent mandate    → 1 DB query (parent mandate by ID)
5. Validate constraints    → CPU (in-memory)
6. Process payment         → HTTP call to payment gateway
7. Create order            → 1 DB INSERT
8. Create payment record   → 1 DB INSERT
9. Clear cart              → 1 DB DELETE
10. Log audit trail        → 1 DB INSERT
```

**Total: 7 DB queries + 1 external HTTP call + 1 JWT verify per transaction**

At 999 TPS with the current code:
- **DB connections needed:** 999 * 7 queries ≈ 6,993 queries/sec on a pool of **max: 20** connections (mandate-service has DEFAULT pool size — no max set at all)
- **Each connection can do ~200-500 simple queries/sec** → need ~14-35 connections minimum
- **JWT verify is synchronous CPU** → blocks the event loop at scale
- **Single Node.js process** → cannot use more than 1 CPU core
- **No caching** → identical mandate lookups repeated thousands of times

### Capacity Estimate (Current State, Single Instance)

| Resource | Current Config | Max TPS (Estimated) | Bottleneck At |
|----------|---------------|--------------------|----|
| DB pool (backend) | max: 20 | ~200 TPS | Pool exhaustion → requests queue |
| DB pool (mandate-service) | DEFAULT (~10) | ~100 TPS | Pool exhaustion → timeouts |
| Node.js process | Single process | ~400 TPS | CPU-bound JWT verify saturates event loop |
| Payment gateway HTTP | No connection pooling | ~300 TPS | TCP socket exhaustion |
| Express middleware chain | 6 middleware (helmet, cors, json, urlencoded, morgan, secure-payload) | ~5,000 TPS | Not the bottleneck |
| **Combined system** | — | **~80-100 TPS** | DB pool on mandate-service |

**Current estimated max: ~80-100 TPS. Need 10x improvement.**

---

## THE 27 CHANGES — ORGANIZED BY IMPACT

### TIER 1: DATABASE & CONNECTION POOLING (10x improvement → ~800 TPS)

#### Change 1: Tune mandate-service DB pool
**File:** `apps/mandate-service/src/config/database.ts`
**Current:** Default `pg.Pool` (max 10 connections, 30s idle timeout)
**Change to:**
```typescript
const pool = new Pool({
  connectionString: config.database.url,
  max: 50,                        // Up from default 10
  min: 10,                        // Keep 10 warm connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  maxUses: 7500,                  // Recycle connections to prevent leaks
  ssl: { rejectUnauthorized: false },
});
```
**Impact:** 5x more concurrent DB operations

#### Change 2: Tune backend DB pool
**File:** `apps/backend/src/config/database.ts`
**Current:** max: 20
**Change to:** max: 50, min: 10, maxUses: 7500
**Impact:** 2.5x more concurrent DB operations

#### Change 3: Add database connection monitoring
**File:** `apps/*/src/config/database.ts`
**Add:**
```typescript
// Log pool stats every 30s
setInterval(() => {
  console.log(JSON.stringify({
    level: 'info',
    pool: {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount,
    }
  }));
}, 30000);
```
**Impact:** Visibility into pool saturation before it becomes a crash

#### Change 4: Add DB read replicas
**Infrastructure change:** PostgreSQL read replica for all SELECT queries
**Implementation:** Create `readPool` and `writePool` in database.ts
```typescript
export const readPool = new Pool({ connectionString: config.database.readUrl, max: 80 });
export const writePool = new Pool({ connectionString: config.database.url, max: 30 });
```
**Impact:** 3-4x read throughput; writes don't compete with reads

#### Change 5: Add missing compound indexes
**New migration file:**
```sql
-- Hot path: mandate validation lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_mandates_user_agent_status
  ON agent_mandates(user_id, agent_id, status) WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_mandates_parent_status
  ON agent_mandates(parent_mandate_id, status) WHERE status = 'active';

-- Hot path: cart items by user (checkout)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cart_items_user_active
  ON cart_items(user_id, created_at DESC);

-- Hot path: mandate by ID + status (most common query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_mandates_id_status
  ON agent_mandates(id, status);
```
**Impact:** Query time drops from ~5ms to ~0.5ms for mandate lookups

#### Change 6: Use prepared statements
**File:** All repository files
**Current:** `await query('SELECT * FROM agent_mandates WHERE id = $1', [id])`
**Change to:**
```typescript
// In repository constructor, prepare the statement once:
const FIND_BY_ID = {
  name: 'find_mandate_by_id',
  text: 'SELECT * FROM agent_mandates WHERE id = $1',
};
// In method:
await query(FIND_BY_ID, [id]);
```
**Impact:** ~20% faster queries (skips parse/plan on repeated queries)

#### Change 7: Batch audit log inserts
**Current:** 1 INSERT per transaction for audit trail
**Change to:** Buffer audit entries, flush every 100ms or 50 entries:
```typescript
class AuditBuffer {
  private buffer: AuditEntry[] = [];
  private timer: NodeJS.Timer;

  add(entry: AuditEntry) {
    this.buffer.push(entry);
    if (this.buffer.length >= 50) this.flush();
  }

  private async flush() {
    const batch = this.buffer.splice(0);
    if (batch.length === 0) return;
    const values = batch.map((e, i) => `($${i*4+1}, $${i*4+2}, $${i*4+3}, $${i*4+4})`).join(',');
    await writePool.query(`INSERT INTO audit_log (...) VALUES ${values}`, batch.flatMap(e => [e.a, e.b, e.c, e.d]));
  }
}
```
**Impact:** 10-50x fewer audit INSERT roundtrips

---

### TIER 2: CACHING (2-3x improvement → theoretically ~2,000 TPS)

#### Change 8: Add Redis for mandate caching
**New dependency:** `ioredis`
**Implementation:**
```typescript
import Redis from 'ioredis';
const redis = new Redis(config.redis.url);

// Cache mandate by ID (hot path — queried on EVERY transaction)
async getById(mandateId: string): Promise<AgentMandate | null> {
  const cached = await redis.get(`mandate:${mandateId}`);
  if (cached) return JSON.parse(cached);

  const result = await query('SELECT * FROM agent_mandates WHERE id = $1', [mandateId]);
  if (result.rows.length === 0) return null;

  const mandate = this.mapRowToMandate(result.rows[0]);
  await redis.set(`mandate:${mandateId}`, JSON.stringify(mandate), 'EX', 60); // 60s TTL
  return mandate;
}

// Invalidate on status change
async updateStatus(mandateId: string, status: string) {
  await redis.del(`mandate:${mandateId}`);
  // ... existing update logic
}
```
**Impact:** ~90% of mandate lookups served from memory (~0.1ms vs ~5ms)

#### Change 9: Cache JWT verification results
**Rationale:** `jwt.verify()` is CPU-bound (~0.5ms per call). Same token verified thousands of times.
```typescript
const tokenCache = new Map<string, { result: any; expiry: number }>();

function verifyMandateToken(token: string) {
  const cached = tokenCache.get(token);
  if (cached && Date.now() < cached.expiry) return cached.result;

  const result = jwt.verify(token, secret);
  tokenCache.set(token, { result, expiry: Date.now() + 60000 }); // 1 min
  return result;
}
```
**Impact:** Eliminates CPU blocking from repeated JWT verification

#### Change 10: Cache active app mandate lookups
**Hot query:** `getActiveAppMandate(userId, agentId)` — called on every createMandate
```typescript
const key = `app_mandate:${userId}:${agentId}`;
// Cache for 30s, invalidate on mandate status change
```
**Impact:** Eliminates the most common DB query in the mandate creation path

---

### TIER 3: NODE.JS SCALING (4x improvement with clustering)

#### Change 11: Add Node.js cluster mode
**File:** `apps/mandate-service/src/server.ts` and `apps/backend/src/server.ts`
**Current:** Single process
**Change to:**
```typescript
import cluster from 'node:cluster';
import os from 'node:os';

const numWorkers = parseInt(process.env.WORKERS || '0') || os.cpus().length;

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} starting ${numWorkers} workers`);
  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }
  cluster.on('exit', (worker, code) => {
    console.error(`Worker ${worker.process.pid} died (code ${code}). Restarting...`);
    cluster.fork();
  });
} else {
  const app = createApp();
  app.listen(config.port, '0.0.0.0');
  console.log(`Worker ${process.pid} started`);
}
```
**Impact:** Utilizes all CPU cores. 4-core machine → 4x throughput. 8-core → 8x.

#### Change 12: Use PM2 as process manager (alternative to cluster mode)
**Simpler approach — no code changes:**
```bash
# ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'mandate-service',
      script: 'dist/server.js',
      instances: 'max',      // One per CPU core
      exec_mode: 'cluster',
      max_memory_restart: '500M',
      env: { NODE_ENV: 'production' }
    },
    {
      name: 'backend',
      script: 'dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      max_memory_restart: '1G',
    }
  ]
};
```
**Impact:** Same as Change 11 but with auto-restart, zero-downtime reload, log management

#### Change 13: Replace Express with Fastify (optional — highest-effort/highest-reward)
**Benchmark comparison:**
| Framework | Requests/sec (hello world) | Requests/sec (JSON body) |
|-----------|---------------------------|--------------------------|
| Express 4 | ~15,000 | ~10,000 |
| Fastify 4 | ~65,000 | ~45,000 |

**Impact:** 3-4x raw throughput. However, requires rewriting all route definitions and middleware. **Recommended only if Express becomes the bottleneck after other changes.**

---

### TIER 4: ASYNC PROCESSING (Decouple hot path)

#### Change 14: Add message queue for non-critical operations
**New dependency:** `bullmq` (Redis-backed job queue) or Kafka
**Move OUT of the checkout hot path:**
- Audit log writes → async queue
- Webhook deliveries → async queue
- Mandate expiration checks → scheduled job
- Usage stats updates → async queue

```typescript
import { Queue } from 'bullmq';

const auditQueue = new Queue('audit', { connection: redis });
const webhookQueue = new Queue('webhooks', { connection: redis });

// In payment flow — fire and forget:
await auditQueue.add('payment_completed', { orderId, mandateTokens, timestamp });
```
**Impact:** Removes 2-3 DB writes from the hot path. Checkout responds ~40% faster.

#### Change 15: Use database transactions for payment atomicity
**Current:** No transactions — order, payment, cart clear are separate queries that can partially fail
**File:** `apps/backend/src/services/payment.service.ts`
```typescript
const client = await writePool.connect();
try {
  await client.query('BEGIN');
  const order = await client.query('INSERT INTO orders ...', [...]);
  const payment = await client.query('INSERT INTO payments ...', [...]);
  await client.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
  await client.query('COMMIT');
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  client.release();
}
```
**Impact:** Data consistency under load. Without this, partial failures at 999 TPS WILL corrupt data.

---

### TIER 5: SECURITY HARDENING (Required for production, any TPS)

#### Change 16: Remove secret defaults — fail fast
**File:** `apps/mandate-service/src/config/env.ts`
```typescript
jwt: {
  secret: process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET is required'); })(),
},
database: {
  url: process.env.DATABASE_URL || (() => { throw new Error('DATABASE_URL is required'); })(),
},
```

#### Change 17: Add rate limiting
**New dependency:** `express-rate-limit` + `rate-limit-redis`
```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

const limiter = rateLimit({
  store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),
  windowMs: 60 * 1000,     // 1 minute
  max: 100,                 // 100 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
});

// Tighter limits for mandate creation
const mandateCreateLimiter = rateLimit({
  store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),
  windowMs: 60 * 1000,
  max: 10,                  // 10 mandate creates per minute per IP
});

app.use('/api/', limiter);
app.use('/api/mandates/register', mandateCreateLimiter);
```

#### Change 18: Add structured logging (Pino)
**Replace:** All `console.log` statements
**New dependency:** `pino` + `pino-http`
```typescript
import pino from 'pino';
import pinoHttp from 'pino-http';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(process.env.NODE_ENV !== 'production' && {
    transport: { target: 'pino-pretty' },
  }),
});

// HTTP request logging (replaces morgan)
app.use(pinoHttp({ logger, autoLogging: true }));
```
**Impact:** JSON-structured logs → ingestible by Splunk/ELK/Datadog. Morgan doesn't do structured logging.

#### Change 19: Add request ID propagation
```typescript
import { randomUUID } from 'crypto';

app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] as string || randomUUID();
  res.setHeader('x-request-id', req.id);
  next();
});
```

#### Change 20: Add graceful shutdown to mandate-service
**File:** `apps/mandate-service/src/server.ts`
**Current:** Missing SIGTERM handler (server just dies)
```typescript
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, draining connections...');
  server.close(() => {
    pool.end(() => {
      redis.quit(() => {
        logger.info('All connections closed. Exiting.');
        process.exit(0);
      });
    });
  });
  // Force exit after 10s if drain doesn't complete
  setTimeout(() => process.exit(1), 10000);
});
```

#### Change 21: Add health check depth
**Current:** Returns `{ status: 'ok' }` without checking anything
```typescript
app.get('/health', async (req, res) => {
  try {
    const dbStart = Date.now();
    await pool.query('SELECT 1');
    const dbLatency = Date.now() - dbStart;

    const redisStart = Date.now();
    await redis.ping();
    const redisLatency = Date.now() - redisStart;

    res.json({
      status: 'ok',
      uptime: process.uptime(),
      db: { status: 'connected', latencyMs: dbLatency },
      redis: { status: 'connected', latencyMs: redisLatency },
      pool: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
      },
      memory: process.memoryUsage(),
    });
  } catch (err) {
    res.status(503).json({ status: 'degraded', error: err.message });
  }
});
```

---

### TIER 6: OBSERVABILITY (Required to operate at 999 TPS)

#### Change 22: Add Prometheus metrics
**New dependency:** `prom-client`
```typescript
import promClient from 'prom-client';

promClient.collectDefaultMetrics();

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
});

const mandateValidations = new promClient.Counter({
  name: 'mandate_validations_total',
  help: 'Total mandate validations',
  labelNames: ['result'], // 'valid', 'invalid', 'error'
});

const dbQueryDuration = new promClient.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries',
  labelNames: ['query_name'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.send(await promClient.register.metrics());
});
```

#### Change 23: Add OpenTelemetry distributed tracing
**New dependency:** `@opentelemetry/api`, `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`
```typescript
// tracing.ts — must be imported BEFORE any other imports
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({ url: process.env.OTEL_ENDPOINT }),
  instrumentations: [getNodeAutoInstrumentations()],
  serviceName: 'mandate-service',
});
sdk.start();
```
**Impact:** See exactly where time is spent across backend ↔ mandate-service ↔ DB at 999 TPS

---

### TIER 7: INFRASTRUCTURE (Required for sustained 999 TPS)

#### Change 24: Kubernetes with HPA
**Current:** Single Railway instance
**Target:** Kubernetes with Horizontal Pod Autoscaler
```yaml
# deployment.yaml
spec:
  replicas: 3                    # Minimum 3 pods
  template:
    spec:
      containers:
      - name: mandate-service
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 2000m
            memory: 1Gi
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 15
          periodSeconds: 20
---
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
spec:
  minReplicas: 3
  maxReplicas: 12
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

#### Change 25: PostgreSQL tuning
```sql
-- postgresql.conf
max_connections = 200              -- Up from default 100
shared_buffers = 2GB               -- 25% of available RAM
effective_cache_size = 6GB         -- 75% of available RAM
work_mem = 64MB
maintenance_work_mem = 512MB
random_page_cost = 1.1             -- For SSD storage
effective_io_concurrency = 200     -- For SSD storage
wal_buffers = 64MB
checkpoint_completion_target = 0.9
default_statistics_target = 100

-- Connection pooling via PgBouncer (between app and PostgreSQL)
-- pgbouncer.ini
[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 50
```

#### Change 26: Load balancer + NGINX reverse proxy
```nginx
upstream mandate_service {
    least_conn;
    server mandate-1:3001;
    server mandate-2:3001;
    server mandate-3:3001;
    keepalive 64;
}

server {
    listen 443 ssl http2;

    location /api/mandates/ {
        proxy_pass http://mandate_service;
        proxy_http_version 1.1;
        proxy_set_header Connection "";  # Enable keepalive
        proxy_set_header X-Request-Id $request_id;
    }
}
```

#### Change 27: Redis cluster for caching + rate limiting
```
Redis Sentinel (3 nodes) or Redis Cluster (6 nodes)
- Primary: writes (mandate cache invalidation, rate limit counters)
- Replicas: reads (mandate cache lookups)
- Memory: 2-4GB per node (mandate objects are small ~1KB each)
```

---

## CAPACITY MATH: 999 TPS AFTER ALL CHANGES

| Component | Config | Capacity |
|-----------|--------|----------|
| **Node.js workers** | 4 workers per pod × 3 pods = 12 processes | ~12,000 req/s raw Express |
| **DB pool** | 50 conn × 3 pods = 150 connections to PgBouncer | ~3,000 queries/sec |
| **Redis cache** | 90% hit rate on mandate lookups | 6 of 7 DB queries eliminated per txn |
| **Effective DB load** | 999 TPS × 1.5 queries (after caching) = ~1,500 queries/sec | Well within 3,000 capacity |
| **JWT verify** | Cached → <0.01ms per repeat token | Not a bottleneck |
| **Audit writes** | Batched → 20 INSERTs/sec instead of 999 | Not a bottleneck |
| **Overall** | 3 pods × 4 workers × ~300 TPS/worker | **~3,600 TPS capacity** |

**Result: ~3.6x headroom above 999 TPS target.** System can burst to ~2,000 TPS before needing HPA scale-up.

---

## PRIORITY IMPLEMENTATION ORDER

### Sprint 1 (Week 1-2) — Foundations
| # | Change | Effort | Impact |
|---|--------|--------|--------|
| 1 | Tune mandate-service DB pool | 1 hour | 5x DB capacity |
| 2 | Tune backend DB pool | 1 hour | 2.5x DB capacity |
| 5 | Add compound indexes | 2 hours | 10x faster mandate queries |
| 6 | Prepared statements | 4 hours | 20% faster queries |
| 15 | DB transactions for payments | 4 hours | Data consistency (CRITICAL) |
| 16 | Remove secret defaults | 1 hour | Security (CRITICAL) |
| 20 | Graceful shutdown | 1 hour | No dropped requests on deploy |

### Sprint 2 (Week 3-4) — Caching + Clustering
| # | Change | Effort | Impact |
|---|--------|--------|--------|
| 8 | Redis mandate cache | 8 hours | 90% fewer DB reads |
| 9 | JWT verification cache | 2 hours | Eliminate CPU bottleneck |
| 10 | App mandate cache | 2 hours | Eliminate hot query |
| 11 | Node.js cluster mode | 4 hours | 4x throughput (multi-core) |
| 17 | Rate limiting | 4 hours | DDoS protection |

### Sprint 3 (Week 5-6) — Observability + Async
| # | Change | Effort | Impact |
|---|--------|--------|--------|
| 18 | Structured logging (Pino) | 8 hours | Debuggable at scale |
| 19 | Request ID propagation | 2 hours | Cross-service tracing |
| 22 | Prometheus metrics | 4 hours | Real-time dashboards |
| 23 | OpenTelemetry tracing | 4 hours | Find bottlenecks |
| 14 | Async audit + webhook queue | 8 hours | 40% faster checkout |
| 7 | Batch audit inserts | 4 hours | 50x fewer audit writes |

### Sprint 4 (Week 7-8) — Infrastructure
| # | Change | Effort | Impact |
|---|--------|--------|--------|
| 24 | Kubernetes + HPA | 2 days | Auto-scaling |
| 25 | PostgreSQL tuning + PgBouncer | 1 day | 3,000+ queries/sec |
| 26 | NGINX reverse proxy | 4 hours | Load balancing + keepalive |
| 27 | Redis cluster | 4 hours | Cache high availability |
| 4 | DB read replicas | 4 hours | Read scalability |
| 21 | Deep health checks | 2 hours | K8s readiness/liveness |

---

## COST ESTIMATE

| Resource | Specification | Monthly Cost |
|----------|--------------|-------------|
| **Kubernetes cluster** | 3 nodes, 4 vCPU / 8GB each (AWS EKS or GKE) | ~$400/month |
| **PostgreSQL** | RDS db.r6g.large (2 vCPU, 16GB) + 1 read replica | ~$500/month |
| **PgBouncer** | Runs on K8s (no extra cost) | $0 |
| **Redis** | ElastiCache r6g.large (2 nodes, primary + replica) | ~$200/month |
| **NGINX Ingress** | Runs on K8s | $0 |
| **Monitoring** | Grafana Cloud free tier or self-hosted | $0-50/month |
| **Load Balancer** | AWS ALB | ~$50/month |
| **Total** | | **~$1,150-1,200/month** |

Compared to the cost of migrating to Spring Boot (~$300K+ in engineering time), hardening the current Node.js stack costs **~$1,200/month infra + 8 weeks of 2 engineers**.

---

## WHAT YOU DO NOT NEED TO CHANGE

| Item | Why It's Fine |
|------|--------------|
| Express.js framework | Not the bottleneck with clustering. Fastify gains are marginal vs. effort |
| TypeScript/Node.js runtime | V8 is fast. Mandate validation is I/O-bound, not CPU-bound (after JWT caching) |
| Raw SQL (no ORM) | Actually FASTER than an ORM. Parameterized queries prevent injection. Keep it |
| PostgreSQL database | Scales to 10,000+ TPS with proper tuning. No need for NoSQL |
| JWT for mandate tokens | Industry standard. CPU cost solved by caching |
| React Native mobile apps | Not on the hot path |
| React admin dashboard | Not on the hot path |
| pnpm monorepo structure | Build-time concern only; no runtime impact |

---

## LOAD TESTING PLAN

Before going production, validate with:

```bash
# Install k6
# k6 load test script
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 100 },   // Ramp to 100 TPS
    { duration: '2m', target: 500 },   // Ramp to 500 TPS
    { duration: '3m', target: 999 },   // Target: 999 TPS
    { duration: '5m', target: 999 },   // Hold at 999 TPS for 5 min
    { duration: '1m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'],  // 95th < 200ms, 99th < 500ms
    http_req_failed: ['rate<0.01'],                   // <1% error rate
  },
};

export default function () {
  // Simulate the checkout hot path
  const res = http.post('https://api.example.com/api/payments/process', JSON.stringify({
    paymentMethod: 'card',
    mandateToken: 'test-token',
  }), { headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ...' } });

  check(res, { 'status 200': (r) => r.status === 200 });
}
```

**Pass criteria for 999 TPS:**
- p95 latency < 200ms
- p99 latency < 500ms
- Error rate < 0.1%
- No connection pool exhaustion
- No OOM kills
- CPU utilization < 70% across all pods
