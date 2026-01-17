# Backend Integration with Mandate Service

## Current Status

❌ **The agentic commerce backend is NOT currently using the mandate service APIs from pure-wonder.**

The backend has its own:
- `MandateService` (in `apps/backend/src/services/mandate.service.ts`)
- `MandateRepository` (direct database access)
- `MerchantRepository` (AP2 merchants, different from mandate service merchants)

## Mandate Service APIs Available

The mandate service (`pure-wonder`) provides these APIs:

### Merchants API
- `GET /api/merchants` - List all merchants
- `POST /api/merchants` - Create merchant
- `GET /api/merchants/:id` - Get merchant by ID
- `PUT /api/merchants/:id` - Update merchant
- `DELETE /api/merchants/:id` - Delete merchant

### AI Agent Apps API
- `GET /api/ai-agent-apps` - List all AI agent apps
- `POST /api/ai-agent-apps` - Create AI agent app
- `GET /api/ai-agent-apps/:id` - Get AI agent app by ID
- `PUT /api/ai-agent-apps/:id` - Update AI agent app
- `DELETE /api/ai-agent-apps/:id` - Delete AI agent app

## Integration Options

### Option 1: Add Mandate Service Client to Backend

Create a service to interact with the mandate service APIs:

```typescript
// apps/backend/src/services/mandate-service-client.service.ts
import axios from 'axios';

export class MandateServiceClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.MANDATE_SERVICE_URL || 'http://localhost:3001';
  }

  async getActiveAgentApps() {
    const response = await axios.get(`${this.baseUrl}/api/ai-agent-apps?active=true`);
    return response.data.data;
  }

  async getMerchant(id: string) {
    const response = await axios.get(`${this.baseUrl}/api/merchants/${id}`);
    return response.data.data;
  }

  // ... other methods
}
```

### Option 2: Environment Variable

Add to `apps/backend/.env`:
```env
MANDATE_SERVICE_URL=https://pure-wonder-production.up.railway.app
```

### Option 3: Use Agent Apps from Mandate Service

Update the backend to fetch agent apps from the mandate service:

```typescript
// In apps/backend/src/services/mandate.service.ts
import { MandateServiceClient } from './mandate-service-client.service';

export class MandateService {
  private mandateServiceClient: MandateServiceClient;

  constructor() {
    this.mandateServiceClient = new MandateServiceClient();
  }

  async validateMandateAccess(userId: string, agentId: string, mandateId: string) {
    // Get agent app from mandate service
    const agentApps = await this.mandateServiceClient.getActiveAgentApps();
    const agentApp = agentApps.find(app => app.agent_id === agentId);
    
    if (!agentApp) {
      throw new Error('Agent app not found');
    }

    // Continue with mandate validation...
  }
}
```

## Recommended Integration

1. **Add `MANDATE_SERVICE_URL` to backend environment**
2. **Create `MandateServiceClient` service** to call mandate service APIs
3. **Update `MandateService`** to use mandate service for agent apps
4. **Use mandate service merchants** for configuration management

## Benefits of Integration

✅ **Centralized Configuration** - Merchants and agent apps managed in one place
✅ **Service Separation** - Backend focuses on business logic, mandate service on configuration
✅ **Independent Deployment** - Update configuration without redeploying backend
✅ **Consistent Data** - All services use same merchant/agent app data

## Implementation Steps

1. Add `MANDATE_SERVICE_URL` to backend `.env`
2. Create `MandateServiceClient` service
3. Update `MandateService` to fetch agent apps from mandate service
4. Update merchant-related code to use mandate service APIs (if needed)
5. Test integration

## Current Architecture

```
┌─────────────────┐         ┌──────────────────┐
│  Backend        │         │  Mandate Service │
│  (Agentic       │         │  (Pure Wonder)   │
│   Commerce)     │         │                  │
├─────────────────┤         ├──────────────────┤
│ - MandateService│   ❌    │ - Merchants API  │
│ - MandateRepo   │  NOT    │ - Agent Apps API │
│ - MerchantRepo  │  USED   │ - Admin UI       │
└─────────────────┘         └──────────────────┘
```

## Desired Architecture

```
┌─────────────────┐         ┌──────────────────┐
│  Backend        │────────▶│  Mandate Service │
│  (Agentic       │   API   │  (Pure Wonder)   │
│   Commerce)     │  Calls  │                  │
├─────────────────┤         ├──────────────────┤
│ - MandateService│         │ - Merchants API  │
│   (uses client) │         │ - Agent Apps API │
└─────────────────┘         └──────────────────┘
```
