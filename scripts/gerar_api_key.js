const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(__dirname, '..', 'dados', 'enderecos_duque_de_caxias_v2.db');
const db = new DatabaseSync(dbPath);

// Argumentos da linha de comando:
// node scripts/gerar_api_key.js "Nome do Parceiro" "email@dominio.com" [orgao/empresa] [limite_min] [limite_dia]
const args = process.argv.slice(2);

const nomeCliente = args[0] || 'Parceiro Institucional PMDC';
const emailCliente = args[1] || 'desenvolvimento@parceiro.gov.br';
const orgaoEmpresa = args[2] || 'Órgão Conveniado';
const limitMin = Number(args[3]) || 60;
const limitDia = Number(args[4]) || 10000;

// Garante tabela
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

const chave = `pmdc_live_${crypto.randomBytes(20).toString('hex')}`;

try {
  const result = db.prepare(`
    INSERT INTO api_keys (
      chave, nome_cliente, email_cliente, orgao_empresa,
      limite_req_minuto, limite_req_dia, status, notas
    ) VALUES (?, ?, ?, ?, ?, ?, 'ATIVO', 'Chave gerada via CLI')
  `).run(chave, nomeCliente, emailCliente, orgaoEmpresa, limitMin, limitDia);

  console.log('================================================================');
  console.log('🏛️  PREFEITURA MUNICIPAL DE DUQUE DE CAXIAS — NOVA CHAVE DE API');
  console.log('================================================================');
  console.log(`🔑 CHAVE GERADA : ${chave}`);
  console.log(`👤 CLIENTE      : ${nomeCliente}`);
  console.log(`📧 E-MAIL       : ${emailCliente}`);
  console.log(`🏢 ÓRGÃO/EMPRESA: ${orgaoEmpresa}`);
  console.log(`⚡ LIMITE/MIN   : ${limitMin} req/minuto`);
  console.log(`📅 LIMITE/DIA   : ${limitDia} req/dia`);
  console.log(`🆔 ID REGISTRO  : ${result.lastInsertRowid}`);
  console.log('================================================================');
  console.log('\n📖 Como o cliente deve utilizar no cURL:');
  console.log(`curl -X GET "http://localhost:3032/api/v1/servicos" \\`);
  console.log(`     -H "X-API-Key: ${chave}"\n`);
  console.log('📖 Em JavaScript / Node / Python:');
  console.log(`fetch('http://localhost:3032/api/v1/equipamentos', {`);
  console.log(`  headers: { 'X-API-Key': '${chave}' }`);
  console.log(`})\n`);
} catch (err) {
  console.error('❌ Erro ao registrar chave:', err.message);
} finally {
  db.close();
}
