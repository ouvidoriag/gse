import crypto from 'crypto';
import mysqlPool from '../database/mysql';
import { getSqliteDb } from '../database/sqlite';

export interface WebhookEventPayload {
  evento: string;
  modulo: 'cds' | 'sigem';
  id: string | number;
  versao: number;
  alterado_em: string;
  alteracoes?: Record<string, { anterior: any; novo: any }>;
  dados_atuais: Record<string, any>;
}

export interface WebhookConfig {
  enabled: boolean;
  url: string;
  secret: string;
  timeoutMs: number;
}

export function getWebhookConfig(): WebhookConfig {
  return {
    enabled: process.env.DUQUE_IA_WEBHOOK_ENABLED === 'true',
    url: process.env.DUQUE_IA_WEBHOOK_URL || 'http://localhost:3001/api/webhook/gse',
    secret: process.env.DUQUE_IA_WEBHOOK_SECRET || 'duque_ia_gse_secret_key_2026',
    timeoutMs: Number(process.env.DUQUE_IA_WEBHOOK_TIMEOUT_MS) || 5000,
  };
}

export function signWebhookPayload(payloadString: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
}

/**
 * Garante que a tabela de retentativas exista no SQLite sem alterar nenhuma tabela existente.
 */
function initWebhookQueueTable(): void {
  try {
    const db = getSqliteDb();
    db.prepare(`
      CREATE TABLE IF NOT EXISTS duque_ia_webhook_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id TEXT UNIQUE,
        evento TEXT NOT NULL,
        modulo TEXT NOT NULL,
        record_id TEXT NOT NULL,
        versao INTEGER NOT NULL,
        alterado_em TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        attempts INTEGER DEFAULT 0,
        last_error TEXT,
        next_retry_at INTEGER,
        created_at TEXT
      )
    `).run();

    // Índice para buscas rápidas de retentativas
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_duque_ia_webhook_status 
      ON duque_ia_webhook_queue (status, next_retry_at)
    `).run();
  } catch (err) {
    console.warn('[Webhook Duque IA] Aviso ao inicializar fila de retentativas no SQLite:', err);
  }
}

// Inicializa a tabela silenciosamente
initWebhookQueueTable();

/**
 * Remove campos sensíveis como senhas, hashes e segredos antes de enviar à Duque IA.
 */
function sanitizePublicData(data: Record<string, any>): Record<string, any> {
  if (!data || typeof data !== 'object') return {};
  const clean: Record<string, any> = {};
  const forbiddenPatterns = [
    /password/i,
    /senha/i,
    /hash/i,
    /salt/i,
    /token/i,
    /api_key/i,
    /(?:^|_)secret(?:$|_)/i // Protege 'secret', 'jwt_secret', etc., sem bloquear 'secretaria' ou 'secretaria_nome'
  ];

  for (const [key, value] of Object.entries(data)) {
    if (!forbiddenPatterns.some(pattern => pattern.test(key))) {
      clean[key] = value;
    }
  }
  return clean;
}

/**
 * Constrói o payload público completo de um serviço municipal (CDS).
 */
export async function buildServicePublicPayload(serviceId: number): Promise<Record<string, any>> {
  try {
    const [rows]: any = await mysqlPool.query(`
      SELECT s.*, sec.name as secretaria_nome,
             GROUP_CONCAT(DISTINCT c.name ORDER BY c.name SEPARATOR '; ') as categoria_nome
      FROM services s
      LEFT JOIN secretarias sec ON s.secretaria_id = sec.id
      LEFT JOIN service_categories sc ON s.id = sc.service_id
      LEFT JOIN categories c ON sc.category_id = c.id
      WHERE s.id = ?
      GROUP BY s.id, sec.name
    `, [serviceId]);

    if (!rows || rows.length === 0) return { id: serviceId, status: 'archived' };

    const s = rows[0];
    const [phones]: any = await mysqlPool.query('SELECT phone FROM service_phones WHERE service_id = ?', [serviceId]);
    const [emails]: any = await mysqlPool.query('SELECT email FROM service_emails WHERE service_id = ?', [serviceId]);
    const [links]: any = await mysqlPool.query('SELECT link FROM service_links WHERE service_id = ?', [serviceId]);
    const [steps]: any = await mysqlPool.query('SELECT step_number, description FROM service_steps WHERE service_id = ? ORDER BY step_number ASC', [serviceId]);
    const [docs]: any = await mysqlPool.query('SELECT document_name FROM service_documents WHERE service_id = ?', [serviceId]);
    const [priorities]: any = await mysqlPool.query('SELECT priority_name FROM service_priorities WHERE service_id = ?', [serviceId]);

    const publicData = {
      id: s.id,
      nome: s.name,
      secretaria_id: s.secretaria_id,
      secretaria_nome: s.secretaria_nome || 'Prefeitura Municipal de Duque de Caxias',
      categorias: s.categoria_nome ? s.categoria_nome.split(';').map((c: string) => c.trim()) : [],
      descricao: s.description || '',
      como_acessar: s.how_to_access || '',
      endereco: s.address || '',
      quem_pode_solicitar: s.who_can_request || '',
      tempo_espera: s.waiting_time || '',
      prazo_maximo: s.max_deadline || '',
      custo: s.cost || 'Gratuito',
      norma_regulamentadora: s.regulation_norm || '',
      status: s.status || 'published',
      telefones: (phones || []).map((p: any) => p.phone),
      emails: (emails || []).map((e: any) => e.email),
      links: (links || []).map((l: any) => l.link),
      passos: (steps || []).map((st: any) => `${st.step_number}. ${st.description}`),
      documentos: (docs || []).map((d: any) => d.document_name),
      prioridades: (priorities || []).map((pr: any) => pr.priority_name),
      atualizado_em: s.updated_at ? new Date(s.updated_at).toISOString() : new Date().toISOString()
    };

    return sanitizePublicData(publicData);
  } catch (err) {
    console.error(`[Webhook Duque IA] Erro ao extrair payload do serviço #${serviceId}:`, err);
    return { id: serviceId };
  }
}

/**
 * Constrói o payload público completo de um equipamento municipal (SIGEM).
 */
export async function buildEquipamentoPublicPayload(equipId: string): Promise<Record<string, any>> {
  try {
    const [rows]: any = await mysqlPool.query(`
      SELECT e.*, end.logradouro, end.numero, end.complemento, end.cep,
             end.latitude, end.longitude, end.precisao_geo, end.bairro_oficial, end.distrito_oficial,
             b.nome as bairro_nome, b.distrito_id,
             cat.nome as categoria_nome,
             h.nome as hub_nome, h.codigo_hub,
             sec.code as secretaria_sigla, sec.name as secretaria_nome
      FROM equipamentos e
      LEFT JOIN enderecos end ON e.endereco_id = end.id
      LEFT JOIN bairros b ON end.bairro_id = b.id
      LEFT JOIN categorias cat ON e.categoria_id = cat.id
      LEFT JOIN hubs_predios h ON e.hub_id = h.id
      LEFT JOIN equipamento_secretarias es ON e.id = es.equipamento_id
      LEFT JOIN secretarias sec ON es.secretaria_id = sec.id
      WHERE e.id = ?
      LIMIT 1
    `, [equipId]);

    if (!rows || rows.length === 0) return { id: equipId, status: 'desativado' };

    const eq = rows[0];
    const [tels]: any = await mysqlPool.query('SELECT ddd, numero, tipo, whatsapp FROM equipamento_telefones WHERE equipamento_id = ?', [equipId]);
    const [emails]: any = await mysqlPool.query('SELECT email FROM equipamento_emails WHERE equipamento_id = ?', [equipId]);

    const telefonesFormatados = (tels || []).map((t: any) => {
      const num = t.ddd ? `(${t.ddd}) ${t.numero}` : t.numero;
      return t.whatsapp ? `${num} (WhatsApp)` : num;
    });

    const publicData = {
      id: eq.id,
      nome: eq.nome,
      sigla: eq.sigla || '',
      categoria: eq.categoria_nome || 'Geral',
      secretaria_sigla: eq.secretaria_sigla || 'PMDC',
      secretaria_nome: eq.secretaria_nome || 'Prefeitura Municipal de Duque de Caxias',
      status: eq.status || 'Ativo',
      horario_funcionamento: eq.horario_funcionamento || '',
      descricao: eq.descricao || '',
      codigo_cnes: eq.codigo_cnes || null,
      codigo_inep: eq.codigo_inep || null,
      endereco_completo: `${eq.logradouro || ''}, ${eq.numero || 's/nº'}${eq.complemento ? ' - ' + eq.complemento : ''} - ${eq.bairro_oficial || eq.bairro_nome || ''}, Duque de Caxias - RJ, CEP ${eq.cep || ''}`.trim(),
      logradouro: eq.logradouro || '',
      numero: eq.numero || '',
      complemento: eq.complemento || '',
      bairro: eq.bairro_nome || '',
      bairro_oficial: eq.bairro_oficial || '',
      distrito: eq.distrito_id || 1,
      distrito_oficial: eq.distrito_oficial || '',
      cep: eq.cep || '',
      latitude: eq.latitude !== null ? Number(eq.latitude) : null,
      longitude: eq.longitude !== null ? Number(eq.longitude) : null,
      precisao_geo: eq.precisao_geo || 'APROXIMADO_LOGRADOURO',
      hub_id: eq.codigo_hub || null,
      hub_nome: eq.hub_nome || null,
      predio_sala: eq.predio_sala || '',
      telefones: telefonesFormatados,
      emails: (emails || []).map((em: any) => em.email),
      atualizado_em: eq.atualizado_em ? new Date(eq.atualizado_em).toISOString() : new Date().toISOString()
    };

    return sanitizePublicData(publicData);
  } catch (err) {
    console.error(`[Webhook Duque IA] Erro ao extrair payload do equipamento #${equipId}:`, err);
    return { id: equipId };
  }
}

/**
 * Envia o evento de Webhook ou o armazena na fila de retentativa se a Duque IA estiver offline.
 * Execução 100% assíncrona (não-bloqueante para o fluxo principal do GSE).
 */
export function dispatchWebhookEvent(
  evento: string,
  modulo: 'cds' | 'sigem',
  recordId: string | number,
  alteracoes: Record<string, { anterior: any; novo: any }> = {},
  dadosAtuais: Record<string, any>
): void {
  // Dispara em background sem bloquear o caller
  setImmediate(async () => {
    const config = getWebhookConfig();
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const alteradoEm = new Date().toISOString();

    const payload: WebhookEventPayload = {
      evento,
      modulo,
      id: recordId,
      versao: Date.now(),
      alterado_em: alteradoEm,
      alteracoes: Object.keys(alteracoes).length > 0 ? alteracoes : undefined,
      dados_atuais: sanitizePublicData(dadosAtuais)
    };

    const payloadJson = JSON.stringify(payload);

    // Se estiver desativado pelo .env, apenas registra e retorna silenciosamente
    if (!config.enabled) {
      // Manter desativado até a Duque IA estar pronta para receber
      return;
    }

    try {
      const signature = signWebhookPayload(payloadJson, config.secret);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'GSE-DuqueIA-Webhook/1.0',
          'x-signature': `sha256=${signature}`,
          'x-hub-signature-256': `sha256=${signature}`,
          'x-event-id': eventId,
          'x-event-type': evento
        },
        body: payloadJson,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        console.log(`[Webhook Duque IA] ✅ Evento "${evento}" (#${recordId}) entregue com sucesso à Duque IA.`);
        return;
      }

      const responseBody = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}: ${responseBody.substring(0, 150)}`);
    } catch (err: any) {
      console.warn(`[Webhook Duque IA] ⚠️ Falha ao entregar evento "${evento}" (#${recordId}) à Duque IA (${err.message}). Armazenando na fila de retentativas.`);
      enqueueForRetry(eventId, evento, modulo, String(recordId), payload.versao, alteradoEm, payloadJson, err.message);
    }
  });
}

/**
 * Salva evento na fila do SQLite para retentativa posterior sem sobrescrever versões mais recentes.
 */
function enqueueForRetry(
  eventId: string,
  evento: string,
  modulo: string,
  recordId: string,
  versao: number,
  alteradoEm: string,
  payloadJson: string,
  errorMessage: string
): void {
  try {
    const db = getSqliteDb();

    // 1. Evita notificações duplicadas ou antigas:
    // Se já houver um evento pendente para este mesmo registro, marca como sobrescrito/obsoleto,
    // pois este novo evento já contém o payload completo mais recente!
    db.prepare(`
      UPDATE duque_ia_webhook_queue
      SET status = 'superseded'
      WHERE modulo = ? AND record_id = ? AND status = 'pending'
    `).run(modulo, recordId);

    // 2. Insere o novo evento com retentativa programada para daqui a 60 segundos
    const nextRetry = Date.now() + 60000;
    db.prepare(`
      INSERT INTO duque_ia_webhook_queue 
      (event_id, evento, modulo, record_id, versao, alterado_em, payload_json, status, attempts, last_error, next_retry_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 1, ?, ?, ?)
    `).run(eventId, evento, modulo, recordId, versao, alteradoEm, payloadJson, errorMessage, nextRetry, alteradoEm);
  } catch (e) {
    console.error('[Webhook Duque IA] Erro ao salvar na fila de retentativas do SQLite:', e);
  }
}

/**
 * Processador de retentativas agendadas em segundo plano.
 */
export async function processWebhookRetryQueue(): Promise<{ processed: number; sent: number; failed: number }> {
  const config = getWebhookConfig();
  if (!config.enabled) return { processed: 0, sent: 0, failed: 0 };

  const db = getSqliteDb();
  const now = Date.now();

  const pendingList = db.prepare(`
    SELECT * FROM duque_ia_webhook_queue
    WHERE status = 'pending' AND next_retry_at <= ? AND attempts < 6
    ORDER BY id ASC
    LIMIT 20
  `).all(now) as any[];

  let sent = 0;
  let failed = 0;

  for (const item of pendingList) {
    try {
      const signature = signWebhookPayload(item.payload_json, config.secret);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

      const res = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'GSE-DuqueIA-Webhook/1.0',
          'x-signature': `sha256=${signature}`,
          'x-hub-signature-256': `sha256=${signature}`,
          'x-event-id': item.event_id,
          'x-event-type': item.evento
        },
        body: item.payload_json,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        db.prepare(`UPDATE duque_ia_webhook_queue SET status = 'sent', last_error = NULL WHERE id = ?`).run(item.id);
        sent++;
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err: any) {
      failed++;
      const nextAttempts = item.attempts + 1;
      // Backoff progressivo: 1m, 3m, 7m, 15m, 30m
      const backoffInterval = Math.pow(2, nextAttempts) * 60000;
      const nextRetry = Date.now() + backoffInterval;
      const finalStatus = nextAttempts >= 6 ? 'failed' : 'pending';

      db.prepare(`
        UPDATE duque_ia_webhook_queue
        SET attempts = ?, last_error = ?, next_retry_at = ?, status = ?
        WHERE id = ?
      `).run(nextAttempts, err.message, nextRetry, finalStatus, item.id);
    }
  }

  return { processed: pendingList.length, sent, failed };
}

// Inicia worker de retentativa a cada 60s em background
const retryTimer = setInterval(() => {
  processWebhookRetryQueue().catch(() => {});
}, 60000);

if (typeof retryTimer.unref === 'function') {
  retryTimer.unref();
}

/**
 * Retorna status operacional e estatísticas do Webhook para painel administrativo ou auditoria.
 */
export function getWebhookStatus(): Record<string, any> {
  const config = getWebhookConfig();
  try {
    const db = getSqliteDb();
    const pending = db.prepare(`SELECT count(*) as total FROM duque_ia_webhook_queue WHERE status = 'pending'`).get() as any;
    const sent = db.prepare(`SELECT count(*) as total FROM duque_ia_webhook_queue WHERE status = 'sent'`).get() as any;
    const failed = db.prepare(`SELECT count(*) as total FROM duque_ia_webhook_queue WHERE status = 'failed'`).get() as any;
    const recent = db.prepare(`SELECT id, event_id, evento, modulo, record_id, status, attempts, alterado_em, last_error FROM duque_ia_webhook_queue ORDER BY id DESC LIMIT 5`).all();

    return {
      enabled: config.enabled,
      url: config.url,
      hasSecret: Boolean(config.secret && config.secret.length > 5),
      timeoutMs: config.timeoutMs,
      queue: {
        pending: pending?.total || 0,
        sent: sent?.total || 0,
        failed: failed?.total || 0
      },
      recentEvents: recent || []
    };
  } catch (_) {
    return {
      enabled: config.enabled,
      url: config.url,
      hasSecret: Boolean(config.secret),
      queue: { pending: 0, sent: 0, failed: 0 },
      recentEvents: []
    };
  }
}
