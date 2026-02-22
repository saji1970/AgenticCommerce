# AgenticCommerce: Production Readiness Analysis
## Migration to JPMC-Grade Technology Stack

**Prepared:** February 2026
**Scope:** Mandate Service, Backend API, Payment Gateway, Admin Dashboard, Mobile Apps

---

## EXECUTIVE SUMMARY

JPMC runs **~8,000 microservices** on their internal **Photon Framework** — a Spring Boot-based platform that standardizes security, observability, resiliency, and cloud-native patterns. The current AgenticCommerce stack (Node.js/Express/TypeScript) is an excellent prototype but has significant gaps to close for bank-grade production deployment.

**Recommendation:** Migrate the **mandate-service** and **payment-gateway** to Spring Boot (the trust-critical path). Keep the **backend API** (product search, AI chat) on Node.js. Keep **admin** on React. Keep **mobile apps** on React Native/Expo.

---

## PART 1: JPMC TECHNOLOGY STACK ALIGNMENT

### What JPMC Uses (Research-Based)

| Layer | JPMC Standard | Current AgenticCommerce | Gap |
|-------|--------------|------------------------|-----|
| **Backend framework** | Spring Boot (Photon Framework) — Java 17/21 | Express.js + TypeScript | HIGH — mandate-service is trust-critical |
| **Database** | Oracle, PostgreSQL, MongoDB | PostgreSQL (raw `pg`) | LOW — PostgreSQL is used at JPMC |
| **ORM / Data access** | Spring Data JPA / JDBC Template | Raw SQL with `pg` library | MEDIUM — no query builder safety net |
| **Message bus** | Kafka, IBM MQ | None | HIGH — no async event processing |
| **Cache** | Redis, Hazelcast | None | HIGH — no caching layer |
| **Container runtime** | Kubernetes (OpenShift) | Railway (PaaS) | HIGH — no K8s manifests |
| **CI/CD** | Jenkins, internal GitOps pipelines | None configured | HIGH — no pipeline |
| **Secrets management** | HashiCorp Vault, CyberArk | `.env` files, hardcoded fallbacks | CRITICAL |
| **Key management** | HSM (Thales Luna, AWS CloudHSM) | Software Ed25519 keys in memory | CRITICAL |
| **Identity / Auth** | OAuth 2.0 + OpenID Connect (Okta/Ping) | Custom JWT implementation | HIGH |
| **API Gateway** | Kong, Apigee, internal gateway | None (Express routes directly exposed) | HIGH |
| **Observability** | Prometheus + Grafana, Splunk, Jaeger, ELK | `console.log` + Morgan HTTP logs | CRITICAL |
| **Logging** | Structured JSON (Splunk/ELK ingest) | `console.log` (unstructured) | CRITICAL |
| **Tracing** | Jaeger / OpenTelemetry | None | HIGH |
| **Metrics** | Prometheus / Datadog | None | HIGH |
| **Service mesh** | Istio / internal mesh | None | MEDIUM |
| **Load balancing** | F5, NGINX, K8s Ingress | Railway default | HIGH |
| **Rate limiting** | Kong / API Gateway level | None on mandate-service | HIGH |
| **Frontend** | React, Angular | React + Vite + Tailwind | OK |
| **Mobile** | React Native, Swift, Kotlin | React Native + Expo | OK |

---

## PART 2: CURRENT CODEBASE AUDIT

### What's Good (Keep These)

| Area | Status | Details |
|------|--------|---------|
| Health endpoints | PRESENT | `/health` on backend + mandate-service |
| Helmet (HTTP security headers) | PRESENT | Both services use `helmet` |
| CORS configuration | PRESENT | Configurable origin |
| Parameterized SQL queries | PRESENT | All repos use `$1, $2` — no SQL injection |
| Zod validation | PRESENT | Schema validation on inputs |
| JWT token signing | PRESENT | `jsonwebtoken` library |
| Ed25519 crypto | PRESENT | Key manager with proper key generation |
| Graceful shutdown (SIGTERM) | PARTIAL | Backend + payment-gateway have it; mandate-service MISSING |
| Error handler middleware | PRESENT | Centralized error handling |
| Password hashing | PRESENT | `bcrypt` with salt rounds |
| AP2 HMAC signatures | PRESENT | Request + webhook signing |

### Critical Gaps

| # | Gap | Severity | Current State | Required State |
|---|-----|----------|---------------|----------------|
| 1 | **Secrets in code** | CRITICAL | `JWT_SECRET` defaults to `'your-secret-key'` in env.ts:12 | Must come from Vault/KMS; fail-fast if missing |
| 2 | **No structured logging** | CRITICAL | `console.log` everywhere | Structured JSON logs (Winston/Pino) with correlation IDs |
| 3 | **No metrics/tracing** | CRITICAL | Zero observability | OpenTelemetry + Prometheus metrics + distributed tracing |
| 4 | **Software keys only** | CRITICAL | Ed25519 keys generated in memory | HSM-backed key storage; keys never leave hardware |
| 5 | **No rate limiting** | HIGH | Open endpoints | Per-IP, per-user, per-agent rate limits |
| 6 | **No API gateway** | HIGH | Express routes directly exposed | Kong/Apigee with OAuth2 token validation |
| 7 | **No message queue** | HIGH | Synchronous request/response only | Kafka for mandate events, webhook delivery, audit log |
| 8 | **No request ID / correlation** | HIGH | Cannot trace requests across services | `X-Request-Id` propagation across all services |
| 9 | **No circuit breaker** | HIGH | Service-to-service calls have no fallback | Resilience4j (Java) or `opossum` (Node) |
| 10 | **No OpenAPI spec** | HIGH | No API documentation | Swagger/OpenAPI 3.0 spec for all endpoints |
| 11 | **CORS wildcard** | HIGH | `CORS_ORIGIN` defaults to `'*'` | Explicit allowlisted origins |
| 12 | **No DB connection pooling config** | MEDIUM | Default `pg` pool settings | Tuned pool size, idle timeout, connection retry |
| 13 | **No DB migration runner** | MEDIUM | Manual SQL file execution | Flyway (Java) or `node-pg-migrate` with version tracking |
| 14 | **No integration tests** | MEDIUM | 78 unit/mock tests only | Integration tests against real DB + E2E tests |
| 15 | **No request size limits** | MEDIUM | Express default (100KB) | Explicit limits per endpoint |
| 16 | **Mandate-service: no SIGTERM handler** | MEDIUM | Server just stops | Drain connections, close DB pool, then exit |
| 17 | **No input sanitization** | MEDIUM | Zod validates shape, not XSS | Sanitize HTML/script content in string inputs |
| 18 | **ContentSecurityPolicy disabled** | MEDIUM | `contentSecurityPolicy: false` in app.ts | Proper CSP policy for admin portal |
| 19 | **No retry logic for DB** | LOW | Single connection attempt | Exponential backoff on connection failure |
| 20 | **No feature flags** | LOW | Hard-coded behavior | LaunchDarkly or equivalent for gradual rollout |

---

## PART 3: SPRING BOOT MIGRATION PLAN

### What to Migrate vs. Keep

| Service | Recommendation | Reasoning |
|---------|---------------|-----------|
| **mandate-service** | MIGRATE to Spring Boot | Trust-critical; handles authorization, token signing, audit. Must align with JPMC Photon patterns. Java's security ecosystem (BouncyCastle, Spring Security, Vault integration) is more mature for banking. |
| **payment-gateway** | MIGRATE to Spring Boot | Financial transaction processing; needs circuit breakers, retry patterns, and integration with bank payment rails (ISO 20022, SWIFT). Java dominates this domain. |
| **backend** (products/search/AI) | KEEP on Node.js | Product search, AI chat, NLP — these are I/O-bound, real-time workloads where Node.js excels. Not trust-critical. Add observability and hardening. |
| **admin** | KEEP on React | Frontend only. Add CSP, RBAC, audit logging. |
| **mobile / mandate-app** | KEEP on React Native | Mobile apps. Add certificate pinning, biometric attestation. |

### Spring Boot Mandate Service Architecture

```
mandate-service-spring/
├── src/main/java/com/bank/mandate/
│   ├── MandateServiceApplication.java          # Spring Boot entry
│   ├── config/
│   │   ├── SecurityConfig.java                 # Spring Security + OAuth2
│   │   ├── DatabaseConfig.java                 # DataSource, Flyway, connection pool
│   │   ├── VaultConfig.java                    # HashiCorp Vault integration
│   │   ├── KafkaConfig.java                    # Event bus configuration
│   │   ├── MetricsConfig.java                  # Micrometer + Prometheus
│   │   └── HsmConfig.java                      # HSM key provider
│   ├── controller/
│   │   ├── MandateController.java              # REST endpoints
│   │   ├── SignatureController.java
│   │   └── PaymentController.java
│   ├── service/
│   │   ├── MandateService.java                 # Business logic
│   │   ├── TokenService.java                   # JWT signing via HSM
│   │   ├── AuditService.java                   # Immutable audit log
│   │   ├── SecurityGuardService.java           # Constraint validation
│   │   └── EventPublisher.java                 # Kafka event producer
│   ├── repository/
│   │   ├── MandateRepository.java              # Spring Data JPA
│   │   ├── AuditLogRepository.java
│   │   └── SignatureRepository.java
│   ├── model/
│   │   ├── Mandate.java                        # JPA entity
│   │   ├── MandateToken.java
│   │   └── AuditEntry.java
│   ├── crypto/
│   │   ├── HsmKeyManager.java                  # HSM-backed Ed25519/RSA
│   │   ├── TokenSigner.java                    # JWT via Nimbus JOSE
│   │   └── HashChainService.java               # SHA-256 audit chain
│   ├── event/
│   │   ├── MandateCreatedEvent.java
│   │   ├── MandateApprovedEvent.java
│   │   └── PaymentAuthorizedEvent.java
│   ├── exception/
│   │   ├── GlobalExceptionHandler.java         # @ControllerAdvice
│   │   ├── MandateNotFoundException.java
│   │   └── InsufficientPermissionsException.java
│   └── filter/
│       ├── RequestIdFilter.java                # X-Request-Id propagation
│       ├── RateLimitFilter.java
│       └── Ap2AuthFilter.java                  # AP2 HMAC verification
├── src/main/resources/
│   ├── application.yml                         # Spring config
│   ├── application-prod.yml                    # Production overrides
│   ├── db/migration/                           # Flyway migrations
│   │   ├── V1__create_mandate_tables.sql
│   │   ├── V2__create_audit_tables.sql
│   │   └── V3__add_app_mandate_support.sql
│   └── logback-spring.xml                      # Structured JSON logging
├── src/test/java/com/bank/mandate/
│   ├── service/MandateServiceTest.java         # Unit tests (JUnit 5 + Mockito)
│   ├── controller/MandateControllerTest.java   # MockMvc tests
│   ├── integration/MandateIntegrationTest.java # @SpringBootTest + Testcontainers
│   └── crypto/TokenSignerTest.java
├── Dockerfile                                  # Multi-stage build
├── helm/                                       # Kubernetes Helm chart
│   ├── Chart.yaml
│   ├── values.yaml
│   └── templates/
│       ├── deployment.yaml
│       ├── service.yaml
│       ├── ingress.yaml
│       ├── hpa.yaml                            # Horizontal Pod Autoscaler
│       └── configmap.yaml
├── build.gradle.kts                            # Gradle build (JPMC standard)
└── docker-compose.yml                          # Local dev stack
```

### Key Spring Boot Dependencies (build.gradle.kts)

```kotlin
dependencies {
    // Spring Boot Core
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-actuator")

    // OAuth2 Resource Server (JWT validation)
    implementation("org.springframework.boot:spring-boot-starter-oauth2-resource-server")

    // Database
    implementation("org.postgresql:postgresql")
    implementation("org.flywaydb:flyway-core")
    implementation("com.zaxxer:HikariCP") // Connection pooling (included in starter-data-jpa)

    // Kafka Events
    implementation("org.springframework.kafka:spring-kafka")

    // Crypto & JWT
    implementation("com.nimbusds:nimbus-jose-jwt:9.37")
    implementation("org.bouncycastle:bcprov-jdk18on:1.77")

    // Observability
    implementation("io.micrometer:micrometer-registry-prometheus")
    implementation("io.opentelemetry:opentelemetry-api")
    implementation("io.opentelemetry.instrumentation:opentelemetry-spring-boot-starter")
    implementation("net.logstash.logback:logstash-logback-encoder:7.4") // Structured JSON logs

    // Resilience
    implementation("io.github.resilience4j:resilience4j-spring-boot3")

    // Secrets
    implementation("org.springframework.cloud:spring-cloud-starter-vault-config")

    // API Documentation
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.3.0")

    // Redis Cache
    implementation("org.springframework.boot:spring-boot-starter-data-redis")

    // Testing
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
    testImplementation("org.testcontainers:junit-jupiter")
    testImplementation("org.testcontainers:postgresql")
    testImplementation("org.testcontainers:kafka")
}
```

---

## PART 4: PRODUCTION HARDENING CHECKLIST (BOTH STACKS)

### Phase 1: Immediate (Weeks 1-4) — Harden Current Node.js Stack

These can be done NOW without migration to unblock a demo/pilot:

- [ ] **Remove all secret defaults** — fail-fast if `JWT_SECRET`, `DATABASE_URL` missing
- [ ] **Add structured logging** — replace `console.log` with Winston/Pino + JSON format
- [ ] **Add request ID middleware** — generate UUID, propagate via `X-Request-Id` header
- [ ] **Add rate limiting** — `express-rate-limit` on all public endpoints
- [ ] **Add SIGTERM handler** to mandate-service — drain connections before exit
- [ ] **Add explicit CORS origins** — remove wildcard `*` default
- [ ] **Add request body size limits** — `express.json({ limit: '1mb' })` per endpoint
- [ ] **Add OpenAPI spec** — `swagger-jsdoc` + `swagger-ui-express`
- [ ] **Add health check depth** — check DB connectivity, not just "status: ok"
- [ ] **Enable CSP** — configure proper Content-Security-Policy for admin portal
- [ ] **Add node-pg-migrate** — versioned, tracked database migrations
- [ ] **Add input sanitization** — strip HTML/script from user-provided strings
- [ ] **Add Helmet HSTS** — force HTTPS in production
- [ ] **Pin all dependency versions** — remove `^` from package.json
- [ ] **Add `npm audit`** — CI step to check for known vulnerabilities

### Phase 2: Observability (Weeks 2-6)

- [ ] **OpenTelemetry SDK** — auto-instrument Express, pg, HTTP clients
- [ ] **Prometheus metrics endpoint** — `/metrics` with request duration, error rates, active connections
- [ ] **Distributed tracing** — Jaeger/Zipkin export for cross-service trace visibility
- [ ] **Structured audit log** — every mandate action → append-only log table with hash chain
- [ ] **Alert rules** — error rate > 1%, p99 latency > 2s, mandate approval failures
- [ ] **Dashboard** — Grafana dashboards for mandate lifecycle, payment success rates

### Phase 3: Spring Boot Migration (Weeks 4-16)

- [ ] **mandate-service** → Spring Boot (follow architecture above)
- [ ] **payment-gateway** → Spring Boot
- [ ] **Spring Security** — OAuth2 resource server for JWT validation
- [ ] **Spring Data JPA** — replace raw SQL with typed repositories
- [ ] **Flyway migrations** — port all 9 SQL migration files
- [ ] **Kafka integration** — mandate events, webhook delivery queue
- [ ] **Redis caching** — mandate lookups, token validation cache
- [ ] **Resilience4j** — circuit breaker for payment gateway calls
- [ ] **Spring Actuator** — `/actuator/health`, `/actuator/metrics`, `/actuator/info`
- [ ] **Micrometer + Prometheus** — automatic metric collection
- [ ] **Testcontainers** — integration tests with real PostgreSQL + Kafka

### Phase 4: Infrastructure (Weeks 8-20)

- [ ] **Kubernetes deployment** — Helm charts with HPA, resource limits, readiness/liveness probes
- [ ] **HSM integration** — Thales Luna or AWS CloudHSM for Ed25519 key management
- [ ] **HashiCorp Vault** — all secrets from Vault; zero secrets in env vars
- [ ] **API Gateway** — Kong or Apigee in front of all services
- [ ] **mTLS** — mutual TLS between all internal services
- [ ] **Network policies** — K8s network policies restricting pod-to-pod communication
- [ ] **WAF** — Web Application Firewall in front of public endpoints
- [ ] **DDoS protection** — CloudFlare or AWS Shield
- [ ] **Backup & DR** — PostgreSQL streaming replication, cross-region failover
- [ ] **Penetration testing** — OWASP ZAP + manual pen test by certified firm
- [ ] **SOC 2 Type II audit** — engage auditor early
- [ ] **PCI-DSS Level 1** — if handling card data directly (may be SAQ-A if tokenized)

### Phase 5: Banking Integration (Weeks 16-30)

- [ ] **OAuth2/OIDC integration** — bank's identity provider (Okta/Ping)
- [ ] **Card issuing API** — connect mandates to real card authorization
- [ ] **ISO 20022 messaging** — payment instruction format for bank settlement
- [ ] **SWIFT integration** — cross-border payment support
- [ ] **Real-time fraud detection** — ML model for anomalous agent behavior
- [ ] **Regulatory reporting** — automated mandate/transaction reports for compliance
- [ ] **Data residency** — ensure data stays in required jurisdictions
- [ ] **Multi-tenancy** — one deployment serving multiple bank divisions

---

## PART 5: EFFORT ESTIMATION

| Phase | Duration | Team Size | Key Deliverables |
|-------|----------|-----------|-----------------|
| **Phase 1: Harden Node.js** | 4 weeks | 2 backend engineers | Logging, rate limiting, secrets, OpenAPI, CORS |
| **Phase 2: Observability** | 4 weeks | 1 SRE + 1 backend | OpenTelemetry, Prometheus, Grafana, alerting |
| **Phase 3: Spring Boot Migration** | 12 weeks | 3 Java engineers | Mandate-service + payment-gateway on Spring Boot |
| **Phase 4: Infrastructure** | 12 weeks | 2 DevOps/SRE | K8s, HSM, Vault, API Gateway, mTLS, WAF |
| **Phase 5: Banking Integration** | 14 weeks | 2 backend + 1 compliance | OAuth2, card APIs, ISO 20022, fraud detection |
| **Total** | **~30 weeks** (with overlap) | **6-8 engineers** | Production-grade banking platform |

---

## PART 6: SHOULD YOU MIGRATE MANDATE-SERVICE TO SPRING BOOT?

### YES — Arguments For Migration

1. **JPMC's Photon Framework is Spring Boot** — 8,000 microservices on this stack. Your mandate-service would plug directly into their ecosystem (security scanning, deployment pipelines, observability, compliance automation)
2. **Java dominates banking** — Spring Security, BouncyCastle, Nimbus JOSE, HSM drivers are all Java-first. The cryptographic ecosystem is deeper and better audited
3. **Thread-per-request model** — mandate validation is CPU-bound (JWT verification, constraint checking). Java's thread model handles this better than Node's event loop under high concurrency
4. **Spring Actuator is free observability** — health checks, metrics, info, env, loggers — all out of the box
5. **Testcontainers** — spin up real PostgreSQL + Kafka in JUnit tests. The Java testing ecosystem for integration tests is superior
6. **Enterprise buy-in** — presenting a Spring Boot service to a JPMC architecture review board will face zero resistance. Presenting a Node.js Express service will require justification

### NO (Partial) — Arguments Against Full Migration

1. **The backend (product search, AI chat) is I/O-bound** — Node.js handles concurrent HTTP calls (to SerpAPI, Anthropic, Google AI) more efficiently. Keep this on Node
2. **React Native mobile apps** — no reason to migrate these
3. **Admin dashboard (React)** — no reason to migrate this
4. **Migration time** — 12 weeks for Spring Boot vs 4 weeks to harden existing Node.js. If time-to-pilot matters, harden first, migrate later

### RECOMMENDED APPROACH

**Hybrid architecture:**

```
                        [API Gateway - Kong/Apigee]
                                    |
                    +---------------+---------------+
                    |               |               |
             [Backend API]   [Mandate Service]  [Payment Gateway]
              Node.js/TS      Spring Boot         Spring Boot
              (products,      (mandates,          (payment
               AI chat,        tokens,             processing,
               search)         audit)              settlement)
                    |               |               |
                    +-------+-------+-------+-------+
                            |               |
                      [PostgreSQL]     [Kafka]
                            |
                      [Redis Cache]
```

- **Trust-critical path** (mandates + payments) → Spring Boot
- **I/O-bound path** (search + AI) → Node.js (hardened)
- **Shared infrastructure** → PostgreSQL, Kafka, Redis, Vault, K8s

---

## PART 7: JPMC MINIMUM CONTROL REQUIREMENTS MAPPING

Based on JPMC's published Supplier Minimum Control Requirements:

| JPMC Requirement | Current Status | Action Required |
|-----------------|----------------|-----------------|
| **Multi-Factor Authentication** | Optional 2FA toggle per mandate | Mandatory MFA for mandate approval; integrate with bank IdP |
| **Encryption at rest** | PostgreSQL TDE (if configured) | Ensure TDE enabled; application-level encryption for PII |
| **Encryption in transit** | HTTPS (Railway provides TLS) | mTLS between internal services; certificate pinning on mobile |
| **Access control** | JWT-based, role in token | RBAC with principle of least privilege; admin roles audit logged |
| **Logging and monitoring** | Console.log only | Centralized SIEM integration (Splunk); tamper-evident logs |
| **Vulnerability management** | None | `npm audit` / Snyk in CI; CVE scanning on container images |
| **Incident response** | None | Runbook for mandate compromise; automated revocation |
| **Data classification** | Not implemented | Tag PII fields; separate handling for card data vs. metadata |
| **Disaster recovery** | Single Railway instance | Multi-AZ PostgreSQL; RPO < 1hr, RTO < 4hr |
| **Penetration testing** | None | Annual pen test by qualified firm (CREST/OSCP certified) |
| **Security training** | N/A | Developer security training; OWASP Top 10 awareness |
| **Third-party risk** | No vendor assessment | SerpAPI, Anthropic, Google AI — need vendor security reviews |

---

## APPENDIX: QUICK REFERENCE — TECHNOLOGY MAPPING

| Concern | Current | JPMC-Grade Target |
|---------|---------|-------------------|
| Language (mandate) | TypeScript/Node.js | Java 21 + Spring Boot 3.x |
| Language (backend) | TypeScript/Node.js | TypeScript/Node.js (hardened) |
| Framework | Express.js | Spring Boot (Photon-aligned) |
| Database | PostgreSQL (raw pg) | PostgreSQL (Spring Data JPA + HikariCP) |
| Migrations | Manual SQL files | Flyway |
| Auth | Custom JWT | Spring Security + OAuth2/OIDC |
| Secrets | .env files | HashiCorp Vault |
| Crypto keys | In-memory Ed25519 | HSM-backed (Thales Luna / CloudHSM) |
| Logging | console.log | Logback + JSON (Splunk/ELK ingest) |
| Metrics | None | Micrometer + Prometheus + Grafana |
| Tracing | None | OpenTelemetry + Jaeger |
| Events | Synchronous HTTP | Apache Kafka |
| Cache | None | Redis |
| Rate limiting | None | Spring Cloud Gateway / Bucket4j |
| Circuit breaker | None | Resilience4j |
| API docs | None | SpringDoc OpenAPI 3.0 |
| Container | Railway Nixpacks | Docker + Kubernetes (Helm) |
| CI/CD | None | Jenkins / GitHub Actions + SonarQube |
| Testing | 78 unit tests (Jest) | JUnit 5 + Mockito + Testcontainers |
| Security scanning | None | Snyk + SonarQube + OWASP ZAP |
| Load testing | None | Gatling / k6 |

---

*Sources:*
- [JPMC Photon Framework — Medium](https://medium.com/next-at-chase/driving-native-cloud-adoption-at-scale-through-a-microservice-framework-a461e87bb8f2)
- [JPMC Engineering Experience](https://www.jpmorgan.com/technology/technology-blog/our-commitment-to-the-engineer-experience)
- [JPMC Minimum Control Requirements](https://www.jpmorganchase.com/content/dam/jpmc/jpmorgan-chase-and-co/documents/supplier-minimum-control-requirements.pdf)
- [JPMC PCI Compliance Guide](https://www.jpmorgan.com/insights/payments/security-trust/pci-compliance-guide-protect-payment-data-and-prevent-fraud)
- [JPMC Software Delivery at Scale](https://www.jpmorgan.com/technology/technology-blog/driving-enterprise-software-delivery)
- [OWASP Key Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html)
