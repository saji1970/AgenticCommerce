import { Request } from 'express';
import { AIAgentAppRepository } from '../repositories/ai-agent-app.repository';

const agentAppRepo = new AIAgentAppRepository();

/**
 * Reads agent app token from X-Agent-App-Token or Authorization: Bearer aat_...
 */
export function extractAgentAppToken(req: Request): string | undefined {
  const raw = req.headers['x-agent-app-token'];
  if (typeof raw === 'string' && raw.trim()) {
    return raw.trim();
  }
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    const t = auth.slice(7).trim();
    if (t.startsWith('aat_')) {
      return t;
    }
  }
  return undefined;
}

/**
 * If a token is sent, it must match an active ai_agent_apps row for the given agent_id.
 * If no token is sent, the request is allowed (backward compatible).
 */
export async function assertOptionalAgentAppToken(
  req: Request,
  agentId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const token = extractAgentAppToken(req);
  if (!token) {
    return { ok: true };
  }

  const app = await agentAppRepo.getByApiKey(token);
  if (!app || app.status !== 'active' || app.agent_id !== agentId) {
    return { ok: false, message: 'Invalid or mismatched agent app token' };
  }
  return { ok: true };
}
