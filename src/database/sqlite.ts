import fs from 'fs';
import { config } from '../config';

// Import dinâmico ou nativo de DatabaseSync (Node 22+)
let DatabaseSyncClass: any = null;
try {
  // @ts-ignore
  const sqliteModule = require('node:sqlite');
  DatabaseSyncClass = sqliteModule.DatabaseSync;
} catch (err: any) {
  console.warn('⚠️ [SQLite]: Módulo node:sqlite não disponível nativamente nesta versão.');
}

let sqliteDb: any = null;

export function getSqliteDb(): any {
  if (sqliteDb) return sqliteDb;

  const dbPath = config.sqlite.dbPath;
  if (!fs.existsSync(dbPath)) {
    console.warn(`⚠️ [SQLite]: Arquivo do banco de dados não encontrado em: ${dbPath}`);
    return null;
  }

  if (!DatabaseSyncClass) {
    console.error('❌ [SQLite]: Driver DatabaseSync não inicializado.');
    return null;
  }

  try {
    sqliteDb = new DatabaseSyncClass(dbPath);
    // Configurações de alta performance e concorrência para SQLite (WAL mode)
    sqliteDb.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA busy_timeout = 5000;
      PRAGMA cache_size = -64000;
    `);

    // Inicializa tabela de chaves de API e índices de alta velocidade caso não existam
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chave TEXT UNIQUE NOT NULL,
        nome_cliente TEXT NOT NULL,
        email_cliente TEXT NOT NULL,
        orgao_empresa TEXT,
        limite_req_minuto INTEGER DEFAULT 60,
        limite_req_dia INTEGER DEFAULT 10000,
        requisicoes_hoje INTEGER DEFAULT 0,
        ultimo_reset_dia TEXT DEFAULT (date('now')),
        total_requisicoes INTEGER DEFAULT 0,
        status TEXT DEFAULT 'ATIVO' CHECK(status IN ('ATIVO', 'SUSPENSO', 'REVOGADO')),
        ultimo_acesso DATETIME,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        notas TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_api_keys_chave ON api_keys(chave);
      CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status);
      CREATE INDEX IF NOT EXISTS idx_eqtel_equip_principal ON equipamento_telefones(equipamento_id, principal);
      CREATE INDEX IF NOT EXISTS idx_eqmail_equip_principal ON equipamento_emails(equipamento_id, principal);
    `);
    console.log(`📦 [SQLite] Conectado com sucesso (WAL Mode Ativo) ao banco SIGEM: ${dbPath}`);
    return sqliteDb;
  } catch (err: any) {
    console.error('❌ [SQLite Erro]:', err.message);
    return null;
  }
}

export function closeSqliteDb() {
  if (sqliteDb) {
    try {
      sqliteDb.close();
      sqliteDb = null;
      console.log('📦 [SQLite] Conexão encerrada com sucesso.');
    } catch (err: any) {
      console.error('⚠️ [SQLite Erro ao fechar]:', err.message);
    }
  }
}

export default getSqliteDb;
