import { TokenPayload } from '@agentic-commerce/shared-types';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      mcpAuthMode?: 'jwt' | 'mcp_connecting_app';
      mcpConnectingApp?: { id: string; name: string };
    }
  }
}
