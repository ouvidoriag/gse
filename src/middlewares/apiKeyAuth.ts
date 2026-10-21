import { Request, Response, NextFunction } from 'express';
import { mysqlPool } from '../database/mysql';
import { getSqliteDb } from '../database/sqlite';

export interface ApiKeyClient {
  id: number;
  chave: string;
  nome_cliente: string;
  email_cliente: string;
  orgao_empresa: string | null;
  limite_req_minuto: number;
  limite_req_dia: number;
  requisicoes_hoje: number;
  total_requisicoes: number;
  status: string;
}

export interface RequestWithApiKey extends Request {
  apiKeyClient?: ApiKeyClient;
}

// Controle de taxa por minuto em memória (para evitar sobrecarga de I/O)
const minuteRateMap = new Map<string, { count: number; resetAt: number }>();

// Limpeza periódica automática da memória para evitar vazamentos em servidores de longa duração
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of minuteRateMap.entries()) {
    if (now > data.resetAt) {
      minuteRateMap.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

export async function requireApiKey(req: RequestWithApiKey, res: Response, next: NextFunction) {
  // 1. Extração da chave da requisição (Header X-API-Key, Authorization Bearer ou query param)
  let key = (req.headers['x-api-key'] || req.headers['x-api-token']) as string | undefined;

  if (!key && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && (parts[0] === 'Bearer' || parts[0] === 'ApiKey')) {
      key = parts[1];
    }
  }

  if (!key && req.query.api_key) {
    key = String(req.query.api_key);
  }

  if (!key || typeof key !== 'string' || !key.trim()) {
    return res.status(401).json({
      success: false,
      error: 'Chave de API não informada.',
      message: "O acesso à API externa requer uma Chave de API válida no header 'X-API-Key'.",
      ajuda: {
        header_esperado: 'X-API-Key: pmdc_live_...',
        documentacao: '/api/v1/docs',
      },
    });
  }

  const cleanKey = key.trim();

  try {
    let row: any = null;
    let isSqlite = false;

    // Tenta primeiro consultar no MySQL
    try {
      const [rows]: any = await mysqlPool.query('SELECT * FROM api_keys WHERE chave = ?', [cleanKey]);
      if (rows && rows.length > 0) {
        row = rows[0];
      }
    } catch (mysqlErr: any) {
      console.warn('⚠️ [apiKeyAuth]: Consulta ao MySQL falhou:', mysqlErr?.message);
    }

    // Fallback: se não encontrou no MySQL, verifica se foi cadastrada via SQLite (modo híbrido/CLI)
    if (!row) {
      try {
        const sqlite = getSqliteDb();
        if (sqlite) {
          const stmt = sqlite.prepare('SELECT * FROM api_keys WHERE chave = ?');
          const sqliteRow = stmt.get(cleanKey);
          if (sqliteRow) {
            row = sqliteRow;
            isSqlite = true;
          }
        }
      } catch (sqliteErr: any) {
        console.warn('⚠️ [apiKeyAuth]: Consulta ao SQLite falhou:', sqliteErr?.message);
      }
    }

    if (!row) {
      return res.status(403).json({
        success: false,
        error: 'Chave de API inválida.',
        message: 'A chave fornecida não foi encontrada no registro da Prefeitura de Duque de Caxias.',
      });
    }

    if (row.status !== 'ATIVO') {
      return res.status(403).json({
        success: false,
        error: `Chave de API ${row.status.toLowerCase()}.`,
        message: `Esta chave de acesso encontra-se com status [${row.status}]. Entre em contato com a administração.`,
      });
    }

    const now = Date.now();
    const todayStr = new Date().toISOString().slice(0, 10);

    // 2. Validação de Rate Limit por Minuto
    const limitMin = row.limite_req_minuto || 60;
    let rateData = minuteRateMap.get(cleanKey);
    if (!rateData || now > rateData.resetAt) {
      rateData = { count: 1, resetAt: now + 60000 };
      minuteRateMap.set(cleanKey, rateData);
    } else {
      rateData.count++;
      if (rateData.count > limitMin) {
        return res.status(429).json({
          success: false,
          error: 'Limite por minuto excedido.',
          message: `Sua cota de ${limitMin} requisições por minuto foi atingida. Aguarde alguns segundos.`,
          limite_minuto: limitMin,
        });
      }
    }

    // 3. Validação e Registro de Cota Diária no Banco
    const limitDia = row.limite_req_dia || 10000;
    let requisicoesHoje = row.requisicoes_hoje || 0;

    if (row.ultimo_reset_dia !== todayStr) {
      // Novo dia civil: reinicia contagem diária
      requisicoesHoje = 1;
      if (isSqlite) {
        try {
          const sqlite = getSqliteDb();
          if (sqlite) {
            sqlite.prepare(`
              UPDATE api_keys
              SET requisicoes_hoje = 1,
                  ultimo_reset_dia = ?,
                  total_requisicoes = total_requisicoes + 1,
                  ultimo_acesso = datetime('now', 'localtime')
              WHERE id = ?
            `).run(todayStr, row.id);
          }
        } catch (_) {}
      } else {
        await mysqlPool.query(`
          UPDATE api_keys
          SET requisicoes_hoje = 1,
              ultimo_reset_dia = ?,
              total_requisicoes = total_requisicoes + 1,
              ultimo_acesso = NOW()
          WHERE id = ?
        `, [todayStr, row.id]);
      }
    } else {
      if (requisicoesHoje >= limitDia) {
        return res.status(429).json({
          success: false,
          error: 'Limite diário atingido.',
          message: `Sua cota de ${limitDia} requisições/dia para esta chave foi esgotada hoje.`,
          limite_diario: limitDia,
        });
      }

      requisicoesHoje++;
      if (isSqlite) {
        try {
          const sqlite = getSqliteDb();
          if (sqlite) {
            sqlite.prepare(`
              UPDATE api_keys
              SET requisicoes_hoje = requisicoes_hoje + 1,
                  total_requisicoes = total_requisicoes + 1,
                  ultimo_acesso = datetime('now', 'localtime')
              WHERE id = ?
            `).run(row.id);
          }
        } catch (_) {}
      } else {
        await mysqlPool.query(`
          UPDATE api_keys
          SET requisicoes_hoje = requisicoes_hoje + 1,
              total_requisicoes = total_requisicoes + 1,
              ultimo_acesso = NOW()
          WHERE id = ?
        `, [row.id]);
      }
    }

    // Headers informativos de Rate Limit
    res.setHeader('X-RateLimit-Limit', limitDia);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limitDia - requisicoesHoje));
    res.setHeader('X-RateLimit-Reset-Day', todayStr);

    req.apiKeyClient = {
      id: row.id,
      chave: row.chave,
      nome_cliente: row.nome_cliente,
      email_cliente: row.email_cliente,
      orgao_empresa: row.orgao_empresa,
      limite_req_minuto: limitMin,
      limite_req_dia: limitDia,
      requisicoes_hoje: requisicoesHoje,
      total_requisicoes: (row.total_requisicoes || 0) + 1,
      status: row.status,
    };

    next();
  } catch (err: any) {
    console.error('[apiKeyAuth] Erro ao validar chave:', err);
    return res.status(500).json({ success: false, error: 'Falha interna ao validar credenciais da API.' });
  }
}
