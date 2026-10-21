import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { mysqlPool } from '../database/mysql';
import { authenticateToken, RequestWithUser, UserPayload } from '../middlewares/auth';
import { registrarAuditoria } from '../middlewares/audit';

export const authRouter = Router();

authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password, user, pass } = req.body;
    const loginUser = (username || user || '').trim();
    const loginPass = (password || pass || '').trim();

    if (!loginUser || !loginPass) {
      return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const expSec = nowSec + config.sessionExpirationHours * 3600;

    // 1. Verificação de Administrador Padrão (.env)
    if (loginUser === config.admin.username && loginPass === config.admin.password) {
      let adminId = 19;
      try {
        const [adminRows]: any = await mysqlPool.query(
          "SELECT id FROM users WHERE username = ? OR role = 'admin' ORDER BY id ASC LIMIT 1",
          [config.admin.username]
        );
        if (adminRows && adminRows[0]?.id) {
          adminId = adminRows[0].id;
        }
      } catch (_) {}

      const userPayload: UserPayload = {
        id: adminId,
        username: config.admin.username,
        name: config.admin.name,
        role: 'admin',
        iat: nowSec,
        exp: expSec,
      };

      const token = jwt.sign(userPayload, config.jwtSecret);
      registrarAuditoria('auth', config.admin.username, 'INSERT', null, { event: 'LOGIN_SUCCESS', ip: req.ip }, config.admin.username, 1, req);

      return res.json({
        success: true,
        token,
        user: {
          username: config.admin.username,
          name: config.admin.name,
          role: 'admin',
        },
        expiresIn: config.sessionExpirationHours * 3600,
        timestamp: Date.now(),
      });
    }

    // 2. Verificação no Banco MySQL (Usuários de Secretarias e Admins do Banco)
    try {
      const [rows]: any = await mysqlPool.query(
        `SELECT u.id, u.username, u.password_hash, u.role, u.secretaria_id, s.name as secretaria_nome
         FROM users u
         LEFT JOIN secretarias s ON u.secretaria_id = s.id
         WHERE LOWER(u.username) = LOWER(?)
            OR LOWER(REPLACE(REPLACE(REPLACE(u.username, 'secretaria_municipal_de_', ''), 'secretaria_municipal_da_', ''), 'secretaria_municipal_do_', '')) = LOWER(?)
            OR LOWER(s.name) = LOWER(?)
         LIMIT 1`,
        [loginUser, loginUser, loginUser]
      );

      if (rows.length > 0) {
        const dbUser = rows[0];
        const match = await bcrypt.compare(loginPass, dbUser.password_hash);

        if (match) {
          const userPayload: UserPayload = {
            id: dbUser.id,
            username: dbUser.username,
            name: dbUser.role === 'admin' ? config.admin.name : (dbUser.secretaria_nome || dbUser.username),
            role: dbUser.role || 'editor',
            secretariaId: dbUser.secretaria_id,
            secretariaNome: dbUser.secretaria_nome,
            iat: nowSec,
            exp: expSec,
          };

          const token = jwt.sign(userPayload, config.jwtSecret);
          registrarAuditoria('auth', dbUser.username, 'INSERT', null, { event: 'LOGIN_SUCCESS', ip: req.ip }, dbUser.username, 1, req);

          return res.json({
            success: true,
            token,
            user: {
              id: dbUser.id,
              username: dbUser.username,
              name: userPayload.name,
              role: dbUser.role,
              secretariaId: dbUser.secretaria_id,
              secretariaNome: dbUser.secretaria_nome,
            },
            expiresIn: config.sessionExpirationHours * 3600,
            timestamp: Date.now(),
          });
        }
      }
    } catch (mysqlErr: any) {
      console.warn('⚠️ [MySQL Auth Fallback]: Erro ao consultar usuários do MySQL:', mysqlErr.message);
    }

    // Se chegou aqui, credenciais inválidas
    registrarAuditoria('auth', loginUser || 'desconhecido', 'INSERT', null, { event: 'LOGIN_FAILED', tentativa: loginUser }, loginUser || 'desconhecido', 1, req);
    return res.status(401).json({
      success: false,
      error: 'Credenciais inválidas. Verifique seu usuário e senha.',
    });
  } catch (err: any) {
    console.error('❌ [Erro no Login Unificado]:', err);
    return res.status(500).json({ error: 'Erro interno do servidor ao autenticar.' });
  }
});

authRouter.get('/me', authenticateToken, (req: RequestWithUser, res: Response) => {
  return res.json({
    authenticated: true,
    user: req.user,
  });
});

authRouter.post('/logout', (req: Request, res: Response) => {
  return res.json({
    success: true,
    message: 'Sessão encerrada com sucesso.',
  });
});
