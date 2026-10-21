import { Router, Response } from 'express';
import crypto from 'crypto';
import { authenticateToken, requireAdmin, RequestWithUser } from '../middlewares/auth';
import mysqlPool from '../database/mysql';
import { registrarAuditoria } from '../middlewares/audit';

export const adminApiKeysRouter = Router();

// Apenas administradores autenticados com token JWT
adminApiKeysRouter.use(authenticateToken);
adminApiKeysRouter.use(requireAdmin);

/**
 * Gera uma chave de API segura no padrão 'pmdc_live_<hex>'
 */
export function generateKeyString(prefix = 'pmdc_live_'): string {
  return `${prefix}${crypto.randomBytes(20).toString('hex')}`;
}

/**
 * Listar todas as Chaves de API cadastradas
 */
adminApiKeysRouter.get('/', async (req: RequestWithUser, res: Response) => {
  try {
    const [keys]: any = await mysqlPool.query(`
      SELECT 
        id,
        chave,
        nome_cliente,
        email_cliente,
        orgao_empresa,
        limite_req_minuto,
        limite_req_dia,
        requisicoes_hoje,
        ultimo_reset_dia,
        total_requisicoes,
        status,
        ultimo_acesso,
        criado_em,
        notas
      FROM api_keys
      ORDER BY id DESC
    `);

    res.json({ success: true, total: keys.length, data: keys });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Erro ao listar chaves: ' + err.message });
  }
});

/**
 * Criar / Emitir uma nova Chave de API
 */
adminApiKeysRouter.post('/', async (req: RequestWithUser, res: Response) => {
  try {
    const {
      nome_cliente,
      email_cliente,
      orgao_empresa,
      limite_req_minuto,
      limite_req_dia,
      notas,
      custom_key,
    } = req.body;

    if (!nome_cliente || !email_cliente) {
      return res.status(400).json({
        success: false,
        error: 'Nome do cliente e e-mail são obrigatórios para emissão da chave.',
      });
    }

    const chave = custom_key && String(custom_key).trim().length >= 16
      ? String(custom_key).trim()
      : generateKeyString();

    const limitMin = Number(limite_req_minuto) || 60;
    const limitDia = Number(limite_req_dia) || 10000;

    const [result]: any = await mysqlPool.query(`
      INSERT INTO api_keys (
        chave, nome_cliente, email_cliente, orgao_empresa,
        limite_req_minuto, limite_req_dia, status, notas
      ) VALUES (?, ?, ?, ?, ?, ?, 'ATIVO', ?)
    `, [
      chave,
      String(nome_cliente).trim(),
      String(email_cliente).trim(),
      orgao_empresa ? String(orgao_empresa).trim() : null,
      limitMin,
      limitDia,
      notas ? String(notas).trim() : null
    ]);

    const newId = Number(result.insertId);

    // Auditoria
    await registrarAuditoria(
      'api_keys',
      String(newId),
      'INSERT',
      null,
      { nome_cliente, email_cliente, chave_prefix: chave.slice(0, 15) + '...', limitMin, limitDia },
      req.user?.username || 'admin',
      req.user?.id || 1,
      req
    );

    res.status(201).json({
      success: true,
      message: 'Chave de API gerada e ativada com sucesso.',
      data: {
        id: newId,
        chave,
        nome_cliente,
        email_cliente,
        orgao_empresa,
        limite_req_minuto: limitMin,
        limite_req_dia: limitDia,
        status: 'ATIVO',
      },
    });
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY' || (err.message && err.message.includes('Duplicate entry'))) {
      return res.status(409).json({ success: false, error: 'Chave de API já existente. Tente novamente.' });
    }
    res.status(500).json({ success: false, error: 'Erro ao gerar chave: ' + err.message });
  }
});

/**
 * Atualizar status da Chave (ATIVO, SUSPENSO, REVOGADO)
 */
adminApiKeysRouter.patch('/:id/status', async (req: RequestWithUser, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    const validStatus = ['ATIVO', 'SUSPENSO', 'REVOGADO'];
    if (!status || !validStatus.includes(String(status).toUpperCase())) {
      return res.status(400).json({ success: false, error: 'Status inválido. Use ATIVO, SUSPENSO ou REVOGADO.' });
    }

    const [rows]: any = await mysqlPool.query('SELECT * FROM api_keys WHERE id = ?', [id]);
    const current = rows[0];
    if (!current) {
      return res.status(404).json({ success: false, error: 'Chave não encontrada.' });
    }

    const novoStatus = String(status).toUpperCase();
    await mysqlPool.query('UPDATE api_keys SET status = ? WHERE id = ?', [novoStatus, id]);

    await registrarAuditoria(
      'api_keys',
      String(id),
      'UPDATE',
      { status: current.status },
      { status: novoStatus },
      req.user?.username || 'admin',
      req.user?.id || 1,
      req
    );

    res.json({ success: true, message: `Status alterado para [${novoStatus}] com sucesso.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Erro ao alterar status: ' + err.message });
  }
});

/**
 * Excluir permanentemente uma Chave de API
 */
adminApiKeysRouter.delete('/:id', async (req: RequestWithUser, res: Response) => {
  try {
    const id = Number(req.params.id);
    const [rows]: any = await mysqlPool.query('SELECT * FROM api_keys WHERE id = ?', [id]);
    const current = rows[0];
    if (!current) {
      return res.status(404).json({ success: false, error: 'Chave não encontrada.' });
    }

    await mysqlPool.query('DELETE FROM api_keys WHERE id = ?', [id]);

    await registrarAuditoria(
      'api_keys',
      String(id),
      'DELETE',
      { nome_cliente: current.nome_cliente, email: current.email_cliente },
      null,
      req.user?.username || 'admin',
      req.user?.id || 1,
      req
    );

    res.json({ success: true, message: 'Chave excluída permanentemente com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Erro ao excluir chave: ' + err.message });
  }
});
