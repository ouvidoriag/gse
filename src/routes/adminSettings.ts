import { Router, Response } from 'express';
import nodemailer from 'nodemailer';
import { getWebhookStatus, processWebhookRetryQueue } from '../services/webhookService';
import { authenticateToken, requireAdmin, RequestWithUser } from '../middlewares/auth';
import mysqlPool, { testMysqlConnection } from '../database/mysql';
import { registrarAuditoria } from '../middlewares/audit';
import { config } from '../config';

export const adminSettingsRouter = Router();

let tableInitialized = false;

const DEFAULT_SETTINGS: Record<string, string> = {
  portal_name: 'Portal Integrado GSE — Gestão de Serviços e Endereços',
  orgao_gestor: 'Ouvidoria Geral do Município — Prefeitura de Duque de Caxias',
  support_email: 'ouvgeral.gestao@gmail.com',
  default_items_per_page: '25',
  session_expiration_hours: String(config.sessionExpirationHours || 8),
  maintenance_banner: '',
  smtp_host: config.smtp.host || 'smtp.gmail.com',
  smtp_port: String(config.smtp.port || 587),
  smtp_user: config.smtp.user || '',
  smtp_pass: config.smtp.pass || '',
  smtp_destinatario: config.smtp.destinatario || 'ouvgeral.gestao@gmail.com',
  google_maps_api_key: process.env.GOOGLE_MAPS_API_KEY || '',
};

export async function ensureSystemSettingsTable(): Promise<void> {
  if (tableInitialized) return;
  await mysqlPool.query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      setting_key VARCHAR(100) NOT NULL PRIMARY KEY,
      setting_value TEXT NULL,
      updated_by VARCHAR(120) NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  for (const [key, val] of Object.entries(DEFAULT_SETTINGS)) {
    await mysqlPool.query(
      `INSERT IGNORE INTO system_settings (setting_key, setting_value, updated_by) VALUES (?, ?, 'SYSTEM_SEED')`,
      [key, val]
    );
  }
  tableInitialized = true;
}

export async function getAllSystemSettingsMap(): Promise<Record<string, string>> {
  const result: Record<string, string> = { ...DEFAULT_SETTINGS };
  try {
    await ensureSystemSettingsTable();
    const [rows]: any = await mysqlPool.query(`SELECT setting_key, setting_value FROM system_settings`);
    for (const r of rows || []) {
      if (r.setting_key && r.setting_value !== null && r.setting_value !== undefined) {
        result[r.setting_key] = String(r.setting_value);
      }
    }
  } catch (_) {
    // Fallback silencioso para DEFAULT_SETTINGS caso o banco esteja indisponível
  }
  return result;
}

export async function getSystemSetting(key: string, fallback = ''): Promise<string> {
  const map = await getAllSystemSettingsMap();
  return map[key] !== undefined && map[key] !== '' ? map[key] : fallback;
}

function maskSecret(val: string): string {
  if (!val || !val.trim()) return '';
  const trimmed = val.trim();
  if (trimmed.length <= 8) return '********';
  return `${trimmed.slice(0, 4)}••••••••${trimmed.slice(-4)}`;
}

// Proteção estrita: somente administradores (role === 'admin')
adminSettingsRouter.use(authenticateToken);
adminSettingsRouter.use(requireAdmin);

/**
 * GET /api/admin/settings
 * Retorna configurações globais, status dos serviços e trilha de auditoria unificada
 */
adminSettingsRouter.get('/', async (_req: RequestWithUser, res: Response) => {
  try {
    await ensureSystemSettingsTable();
    const rawSettings = await getAllSystemSettingsMap();
    const mysqlOk = await testMysqlConnection();

    // Contadores rápidos do ecossistema
    let totalApiKeys = 0;
    let activeApiKeys = 0;
    let totalUsers = 0;
    let totalServicos = 0;
    let totalEquipamentos = 0;

    try {
      const [[kRow]]: any = await mysqlPool.query(
        `SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS ativos FROM api_keys`
      );
      totalApiKeys = Number(kRow?.total || 0);
      activeApiKeys = Number(kRow?.ativos || 0);
    } catch (_) {}

    try {
      const [[uRow]]: any = await mysqlPool.query(`SELECT COUNT(*) AS total FROM users`);
      totalUsers = Number(uRow?.total || 0) + 1; // +1 admin master env
    } catch (_) {}

    try {
      const [[sRow]]: any = await mysqlPool.query(`SELECT COUNT(*) AS total FROM services WHERE status = 'published'`);
      totalServicos = Number(sRow?.total || 0);
    } catch (_) {}

    try {
      const [[eRow]]: any = await mysqlPool.query(`SELECT COUNT(*) AS total FROM equipamentos`);
      totalEquipamentos = Number(eRow?.total || 0);
    } catch (_) {}

    // Últimos 100 registros de auditoria global
    let auditLogs: any[] = [];
    try {
      const [aRows]: any = await mysqlPool.query(`
        SELECT
          id,
          tabela_afetada,
          registro_id,
          operacao,
          usuario,
          ip,
          dispositivo,
          localizacao,
          criado_em
        FROM auditoria
        ORDER BY id DESC
        LIMIT 100
      `);
      auditLogs = aRows || [];
    } catch (_) {}

    const googleEffectiveKey = rawSettings.google_maps_api_key || process.env.GOOGLE_MAPS_API_KEY || '';
    const smtpConfigured = Boolean((rawSettings.smtp_host || config.smtp.host) && (rawSettings.smtp_user || config.smtp.user));

    const safeSettings = {
      ...rawSettings,
      smtp_pass: rawSettings.smtp_pass ? '********' : '',
      smtp_pass_configured: Boolean(rawSettings.smtp_pass || config.smtp.pass),
      google_maps_api_key_masked: maskSecret(googleEffectiveKey),
      google_maps_api_key: googleEffectiveKey ? '********' : '',
      google_maps_configured: Boolean(googleEffectiveKey && googleEffectiveKey.length > 10),
    };

    res.json({
      success: true,
      settings: safeSettings,
      status: {
        mysqlConnected: mysqlOk,
        smtpConfigured,
        googleGeocodingConfigured: Boolean(googleEffectiveKey && googleEffectiveKey.length > 10),
        nodeEnv: config.nodeEnv,
        port: config.port,
        totalApiKeys,
        activeApiKeys,
        totalUsers,
        totalServicos,
        totalEquipamentos,
        duqueIaWebhook: getWebhookStatus(),
      },
      auditLogs,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Erro ao carregar configurações: ' + err.message });
  }
});

/**
 * PUT /api/admin/settings
 * Salva preferências e parâmetros globais do sistema com registro na trilha de auditoria
 */
adminSettingsRouter.put('/', async (req: RequestWithUser, res: Response) => {
  try {
    await ensureSystemSettingsTable();
    const prevSettings = await getAllSystemSettingsMap();
    const allowedKeys = Object.keys(DEFAULT_SETTINGS);
    const incoming = req.body || {};
    const updatedKeys: Record<string, string> = {};
    const username = req.user?.username || 'admin';

    for (const key of allowedKeys) {
      if (incoming[key] === undefined) continue;
      const val = String(incoming[key]);

      // Ignora campos mascarados não alterados pelo administrador
      if ((key === 'smtp_pass' || key === 'google_maps_api_key') && (val === '********' || val.includes('••••'))) {
        continue;
      }

      await mysqlPool.query(
        `INSERT INTO system_settings (setting_key, setting_value, updated_by)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)`,
        [key, val, username]
      );

      updatedKeys[key] = (key === 'smtp_pass' || key === 'google_maps_api_key')
        ? (val ? '[ATUALIZADO]' : '[REMOVIDO]')
        : val;
    }

    const sanitizedPrev: Record<string, string> = {};
    for (const k of Object.keys(updatedKeys)) {
      sanitizedPrev[k] = (k === 'smtp_pass' || k === 'google_maps_api_key')
        ? (prevSettings[k] ? '[CONFIGURADO]' : '[VAZIO]')
        : (prevSettings[k] || '');
    }

    await registrarAuditoria(
      'system_settings',
      'GLOBAL',
      'UPDATE',
      sanitizedPrev,
      updatedKeys,
      username,
      1,
      req
    );

    res.json({
      success: true,
      message: 'Configurações globais do sistema salvas com sucesso!',
      updated: Object.keys(updatedKeys),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Erro ao salvar configurações: ' + err.message });
  }
});

/**
 * POST /api/admin/settings/test-smtp
 * Valida a conectividade com o servidor SMTP configurado
 */
adminSettingsRouter.post('/test-smtp', async (req: RequestWithUser, res: Response) => {
  try {
    const saved = await getAllSystemSettingsMap();
    const host = String(req.body?.smtp_host || saved.smtp_host || config.smtp.host || '').trim();
    const port = Number(req.body?.smtp_port || saved.smtp_port || config.smtp.port || 587);
    const user = String(req.body?.smtp_user || saved.smtp_user || config.smtp.user || '').trim();
    const rawPass = req.body?.smtp_pass;
    const pass = (rawPass && rawPass !== '********')
      ? String(rawPass)
      : (saved.smtp_pass || config.smtp.pass || '');

    if (!host || !user || !pass) {
      return res.status(400).json({
        success: false,
        error: 'Preencha Host SMTP, Usuário e Senha/App Password antes de testar a conexão.',
      });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transporter.verify();
    res.json({
      success: true,
      message: `Conexão SMTP autenticada com sucesso em ${host}:${port}!`,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: `Falha na verificação SMTP: ${err.message}`,
    });
  }
});

/**
 * GET /api/admin/settings/webhook
 * Retorna o status da integração e fila de retentativas do Webhook Duque IA
 */
adminSettingsRouter.get('/webhook', (_req: RequestWithUser, res: Response) => {
  res.json({
    success: true,
    data: getWebhookStatus(),
  });
});

/**
 * POST /api/admin/settings/webhook/retry
 * Força o processamento imediato dos eventos pendentes na fila de retentativas
 */
adminSettingsRouter.post('/webhook/retry', async (_req: RequestWithUser, res: Response) => {
  try {
    const result = await processWebhookRetryQueue();
    res.json({
      success: true,
      message: `Processamento de retentativas executado. Processados: ${result.processed}, Enviados: ${result.sent}, Pendentes: ${result.failed}`,
      result,
      status: getWebhookStatus(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Erro ao processar retentativas: ' + err.message });
  }
});

