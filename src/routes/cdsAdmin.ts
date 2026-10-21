import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { mysqlPool } from '../database/mysql';
import { authenticateToken, requireAdmin, RequestWithUser } from '../middlewares/auth';

export const cdsAdminRouter = Router();

// Todas as rotas administrativas requerem perfil de admin
cdsAdminRouter.use(authenticateToken);
cdsAdminRouter.use(requireAdmin);

function generateSecretariaCode(name: string): string {
  return name
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '_');
}

// GET /users - Lista todos os usuários
cdsAdminRouter.get('/users', async (_req: Request, res: Response) => {
  try {
    const [rows] = await mysqlPool.query(
      `SELECT u.id, u.username, u.role, u.secretaria_id, s.name as secretaria_nome 
       FROM users u
       LEFT JOIN secretarias s ON u.secretaria_id = s.id
       ORDER BY u.username`
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Erro ao carregar usuários.' });
  }
});

// POST /users - Cria novo usuário
cdsAdminRouter.post('/users', async (req: Request, res: Response) => {
  try {
    const { username, password, role, secretaria_id } = req.body;

    if (!username || !password || !role || !secretaria_id) {
      return res.status(400).json({ error: 'Todos os campos (usuário, senha, perfil e secretaria) são obrigatórios.' });
    }

    const lowerUsername = username.trim().toLowerCase();

    const [existing] = (await mysqlPool.query('SELECT id FROM users WHERE username = ?', [lowerUsername])) as any[];
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Este nome de usuário já está em uso.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result]: any = await mysqlPool.query(
      'INSERT INTO users (secretaria_id, username, password_hash, role) VALUES (?, ?, ?, ?)',
      [secretaria_id, lowerUsername, passwordHash, role]
    );

    res.status(201).json({ success: true, userId: result.insertId, message: 'Usuário cadastrado com sucesso!' });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Erro ao criar usuário.' });
  }
});

// PUT /users/:id - Atualiza usuário
cdsAdminRouter.put('/users/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const { username, password, role, secretaria_id } = req.body;

    if (!username || !role || !secretaria_id) {
      return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
    }

    const lowerUsername = username.trim().toLowerCase();

    const [existing] = (await mysqlPool.query('SELECT id FROM users WHERE username = ? AND id != ?', [lowerUsername, userId])) as any[];
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Este nome de usuário já está em uso.' });
    }

    if (password && password.trim().length > 0) {
      if (password.trim().length < 6) {
        return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres.' });
      }
      const passwordHash = await bcrypt.hash(password, 10);
      await mysqlPool.query(
        'UPDATE users SET username = ?, password_hash = ?, role = ?, secretaria_id = ? WHERE id = ?',
        [lowerUsername, passwordHash, role, secretaria_id, userId]
      );
    } else {
      await mysqlPool.query(
        'UPDATE users SET username = ?, role = ?, secretaria_id = ? WHERE id = ?',
        [lowerUsername, role, secretaria_id, userId]
      );
    }

    res.json({ success: true, message: 'Usuário atualizado com sucesso!' });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Erro ao atualizar usuário.' });
  }
});

// DELETE /users/:id - Remove usuário
cdsAdminRouter.delete('/users/:id', async (req: RequestWithUser, res: Response) => {
  try {
    const userId = req.params.id;

    if (req.user?.id === Number(userId)) {
      return res.status(400).json({ error: 'Você não pode excluir sua própria conta de administrador.' });
    }

    await mysqlPool.query('DELETE FROM users WHERE id = ?', [userId]);
    res.json({ success: true, message: 'Usuário excluído com sucesso!' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Erro ao excluir usuário.' });
  }
});

// GET /secretarias - Lista secretarias
cdsAdminRouter.get('/secretarias', async (_req: Request, res: Response) => {
  try {
    const [rows] = await mysqlPool.query('SELECT id, name, code FROM secretarias ORDER BY name');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching secretariats:', err);
    res.status(500).json({ error: 'Erro ao carregar secretarias.' });
  }
});

// POST /secretarias - Cria nova secretaria
cdsAdminRouter.post('/secretarias', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'O nome da secretaria é obrigatório.' });
    }

    const trimmedName = name.trim();
    const code = generateSecretariaCode(trimmedName);

    const [existing] = (await mysqlPool.query('SELECT id FROM secretarias WHERE code = ? OR name = ?', [code, trimmedName])) as any[];
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Esta secretaria já está cadastrada.' });
    }

    const [result]: any = await mysqlPool.query(
      'INSERT INTO secretarias (name, code) VALUES (?, ?)',
      [trimmedName, code]
    );

    res.status(201).json({ success: true, secretariaId: result.insertId, name: trimmedName, code });
  } catch (err) {
    console.error('Error creating secretariat:', err);
    res.status(500).json({ error: 'Erro ao criar secretaria.' });
  }
});
