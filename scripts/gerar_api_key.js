/**
 * 🏛️ PREFEITURA MUNICIPAL DE DUQUE DE CAXIAS — RJ
 * PORTAL UNIFICADO PMDC (SIGEM + CARTA DE SERVIÇOS)
 * 
 * GERADOR DE API KEYS (CLI)
 * Registra chaves de acesso diretamente no banco unificado MySQL 8
 * e espelha localmente no banco SQLite para compatibilidade offline.
 */

const path = require('path');
const crypto = require('crypto');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Driver SQLite nativo para espelhamento
let DatabaseSyncClass = null;
try {
  const sqliteModule = require('node:sqlite');
  DatabaseSyncClass = sqliteModule.DatabaseSync;
} catch (_) {}

const args = process.argv.slice(2);
const nomeCliente = args[0] || 'Parceiro Institucional PMDC';
const emailCliente = args[1] || 'desenvolvimento@parceiro.gov.br';
const orgaoEmpresa = args[2] || 'Órgão Conveniado';
const limitMin = Number(args[3]) || 60;
const limitDia = Number(args[4]) || 10000;

async function gerarApiKey() {
  const chave = `pmdc_live_${crypto.randomBytes(20).toString('hex')}`;
  let mysqlId = null;
  let sqliteId = null;

  // 1. Inserção no MySQL (Banco Primário Unificado)
  let pool = null;
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'carta_de_servico',
    });

    const [result] = await pool.query(`
      INSERT INTO api_keys (
        chave, nome_cliente, email_cliente, orgao_empresa,
        limite_req_minuto, limite_req_dia, status, notas
      ) VALUES (?, ?, ?, ?, ?, ?, 'ATIVO', 'Chave gerada via CLI')
    `, [chave, nomeCliente, emailCliente, orgaoEmpresa, limitMin, limitDia]);

    mysqlId = result.insertId;
  } catch (err) {
    console.error('⚠️ [MySQL Erro]:', err.message);
  } finally {
    if (pool) await pool.end();
  }

  // 2. Espelhamento no SQLite (Banco Local / Offline)
  const sqlitePath = path.join(__dirname, '..', 'dados', 'enderecos_duque_de_caxias_v2.db');
  if (DatabaseSyncClass) {
    try {
      const db = new DatabaseSyncClass(sqlitePath);
      db.exec(`
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
      `);

      const res = db.prepare(`
        INSERT INTO api_keys (
          chave, nome_cliente, email_cliente, orgao_empresa,
          limite_req_minuto, limite_req_dia, status, notas
        ) VALUES (?, ?, ?, ?, ?, ?, 'ATIVO', 'Chave gerada via CLI')
      `).run(chave, nomeCliente, emailCliente, orgaoEmpresa, limitMin, limitDia);

      sqliteId = res.lastInsertRowid;
      db.close();
    } catch (sqliteErr) {
      console.warn('⚠️ [SQLite Espelhamento]:', sqliteErr.message);
    }
  }

  console.log('================================================================');
  console.log('🏛️  PREFEITURA MUNICIPAL DE DUQUE DE CAXIAS — NOVA CHAVE DE API');
  console.log('================================================================');
  console.log(`🔑 CHAVE GERADA : ${chave}`);
  console.log(`👤 CLIENTE      : ${nomeCliente}`);
  console.log(`📧 E-MAIL       : ${emailCliente}`);
  console.log(`🏢 ÓRGÃO/EMPRESA: ${orgaoEmpresa}`);
  console.log(`⚡ LIMITE/MIN   : ${limitMin} req/minuto`);
  console.log(`📅 LIMITE/DIA   : ${limitDia} req/dia`);
  console.log(`🐬 ID NO MYSQL  : ${mysqlId || 'Falha ao conectar no MySQL'}`);
  console.log(`📦 ID NO SQLITE : ${sqliteId || 'Não espelhado'}`);
  console.log('================================================================');
  console.log('\n📖 Como o cliente deve utilizar no cURL:');
  console.log(`curl -X GET "http://localhost:3032/api/v1/servicos" \\`);
  console.log(`     -H "X-API-Key: ${chave}"\n`);
  console.log('📖 Em JavaScript / Node / Python:');
  console.log(`fetch('http://localhost:3032/api/v1/equipamentos', {`);
  console.log(`  headers: { 'X-API-Key': '${chave}' }`);
  console.log(`})\n`);
}

gerarApiKey().catch(console.error);
