import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { mysqlPool } from '../database/mysql';
import { authenticateToken, RequestWithUser } from '../middlewares/auth';
import { config } from '../config';

export const cdsProfileRouter = Router();

// PUT /profile - Altera o username e/ou a senha do usuário autenticado
cdsProfileRouter.put('/profile', authenticateToken, async (req: RequestWithUser, res: Response) => {
  try {
    const userId = req.user?.id;
    const { username, password } = req.body;

    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'O nome do usuário é obrigatório.' });
    }

    const cleanedUsername = username.trim().toLowerCase();

    // 1. Verifica se o username já está em uso por outro usuário
    const [existingUsers]: any = await mysqlPool.query(
      'SELECT id FROM users WHERE username = ? AND id != ?',
      [cleanedUsername, userId]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Este nome de usuário já está em uso por outro operador.' });
    }

    // 2. Monta a query de atualização dinamicamente
    let updateQuery = 'UPDATE users SET username = ?';
    const params: any[] = [cleanedUsername];

    if (password && password.trim() !== '') {
      if (password.length < 6) {
        return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      updateQuery += ', password_hash = ?';
      params.push(hashedPassword);
    }

    updateQuery += ' WHERE id = ?';
    params.push(userId);

    await mysqlPool.query(updateQuery, params);

    // 3. Busca os dados atualizados para gerar o novo token
    const [updatedUsers]: any = await mysqlPool.query(
      `SELECT u.id, u.username, u.role, u.secretaria_id, s.name as secretaria_nome
       FROM users u
       LEFT JOIN secretarias s ON u.secretaria_id = s.id
       WHERE u.id = ?`,
      [userId]
    );

    if (updatedUsers.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const updatedUser = updatedUsers[0];
    const newToken = jwt.sign(
      {
        id: updatedUser.id,
        username: updatedUser.username,
        secretariaId: updatedUser.secretaria_id,
        secretariaNome: updatedUser.secretaria_nome,
        role: updatedUser.role,
      },
      config.jwtSecret,
      { expiresIn: `${config.sessionExpirationHours}h` }
    );

    return res.json({
      success: true,
      message: 'Perfil atualizado com sucesso!',
      token: newToken,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        secretariaId: updatedUser.secretaria_id,
        secretariaNome: updatedUser.secretaria_nome,
        role: updatedUser.role,
      },
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    return res.status(500).json({ error: 'Erro interno do servidor ao atualizar perfil.' });
  }
});
