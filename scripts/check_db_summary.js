const { DatabaseSync } = require('node:sqlite');
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function run() {
  console.log('======================================================');
  console.log('📊 RAIO-X COMPLETO DOS BANCOS DE DADOS DO PROJETO');
  console.log('======================================================\n');

  // 1. SQLITE
  const dbPath = path.join(__dirname, '../dados/enderecos_duque_de_caxias_v2.db');
  const sqlite = new DatabaseSync(dbPath);

  console.log('📦 1. BANCO SQLITE (enderecos_duque_de_caxias_v2.db):');
  console.log('   Caminho: ' + dbPath);
  const pragma = sqlite.prepare('PRAGMA integrity_check').all();
  console.log('   Integridade Física (PRAGMA integrity_check): ' + JSON.stringify(pragma[0]));
  
  const fk = sqlite.prepare('PRAGMA foreign_key_check').all();
  console.log('   Chaves Estrangeiras Violadas: ' + fk.length);

  const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
  console.log('\n   📋 Tabelas e Quantidade de Registros:');
  for (const t of tables) {
    const c = sqlite.prepare(`SELECT count(*) as count FROM "${t.name}"`).get().count;
    console.log(`      • ${t.name.padEnd(26)}: ${c} registros`);
  }

  const views = sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'view' ORDER BY name").all();
  console.log('\n   👁️ Views:');
  for (const v of views) {
    const c = sqlite.prepare(`SELECT count(*) as count FROM "${v.name}"`).get().count;
    console.log(`      • ${v.name.padEnd(26)}: ${c} registros`);
  }

  console.log('\n   🏥 Distribuição de Equipamentos por Categoria:');
  const cats = sqlite.prepare(`
    SELECT c.nome as categoria, COUNT(e.id) as total 
    FROM categorias c 
    LEFT JOIN equipamentos e ON e.categoria_id = c.id 
    GROUP BY c.id 
    ORDER BY total DESC
  `).all();
  cats.forEach(c => console.log(`      • ${c.categoria.padEnd(30)}: ${c.total}`));

  console.log('\n   📍 Distribuição de Equipamentos por Distrito:');
  const dists = sqlite.prepare(`
    SELECT d.numero, d.nome as distrito, COUNT(e.id) as total
    FROM distritos d
    LEFT JOIN bairros b ON b.distrito_id = d.id
    LEFT JOIN enderecos end ON end.bairro_id = b.id
    LEFT JOIN equipamentos e ON e.endereco_id = end.id
    GROUP BY d.id
    ORDER BY d.numero
  `).all();
  dists.forEach(d => console.log(`      • ${d.numero}º Distrito (${d.distrito.padEnd(20)}): ${d.total} equipamentos`));

  // 2. MYSQL
  console.log('\n🐬 2. BANCO MYSQL (carta_de_servico):');
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'carta_de_servico'
    });

    const [rowsStatus] = await pool.query('SELECT status, COUNT(*) as total FROM services GROUP BY status');
    console.log('   📋 Status dos Serviços Municipais:');
    rowsStatus.forEach(s => console.log(`      • Status "${s.status}": ${s.total} serviços`));

    const [rowsSec] = await pool.query(`
      SELECT sec.code, sec.name, COUNT(s.id) as total
      FROM secretarias sec
      LEFT JOIN services s ON s.secretaria_id = sec.id AND s.status = 'published'
      GROUP BY sec.id
      ORDER BY total DESC
    `);
    console.log(`\n   🏛️ Top Secretarias com mais Serviços Cadastrados (Total: ${rowsSec.length} secretarias):`);
    rowsSec.slice(0, 8).forEach(s => console.log(`      • ${s.code.padEnd(20)} - ${(s.name || '').slice(0, 32).padEnd(32)}: ${s.total} serviços`));

    const [orphanCheck] = await pool.query('SELECT COUNT(*) as orfaos FROM services WHERE secretaria_id NOT IN (SELECT id FROM secretarias)');
    console.log(`\n   Integridade Referencial: Serviços Órfãos = ${orphanCheck[0].orfaos}`);
    await pool.end();
  } catch(e) {
    console.log('   ⚠️ Erro ao conectar ao MySQL:', e.message);
  }

  console.log('\n======================================================');
}

run();
