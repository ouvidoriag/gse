import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UserPayload, RequestWithUser } from '../types';

export { UserPayload, RequestWithUser };

export function authenticateToken(req: RequestWithUser, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'] || (req.headers['x-auth-token'] as string);
  let token: string | null = null;

  if (authHeader) {
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else {
      token = authHeader.trim();
    }
  } else if (req.query && req.query.token) {
    token = String(req.query.token).trim();
  }

  if (!token) {
    return res.status(401).json({
      error: 'Acesso não autorizado',
      message: 'Token de autenticação não fornecido.',
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as UserPayload;
    req.user = decoded;
    next();
  } catch (err: any) {
    return res.status(403).json({
      error: 'Token inválido ou expirado',
      message: err.message,
    });
  }
}

export function requireAdmin(req: RequestWithUser, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Acesso negado. Apenas administradores podem acessar este recurso.',
    });
  }
  next();
}
