import jwt from 'jsonwebtoken';
import { TokenPayload } from '@agentic-commerce/shared-types';
import { config } from '../config/env';

export const generateToken = (payload: Omit<TokenPayload, 'iat' | 'exp'>): string => {
  return jwt.sign(payload, config.jwt.secret as jwt.Secret, {
    expiresIn: config.jwt.expiresIn,
  } as jwt.SignOptions);
};

export const verifyToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, config.jwt.secret as jwt.Secret) as TokenPayload;
  } catch (error) {
    throw new Error('Invalid token');
  }
};
