import { TokenPayload } from '@agentic-commerce/shared-types';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}
