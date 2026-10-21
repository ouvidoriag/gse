const { DatabaseSync } = require('node:sqlite');
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function check() {
  console.log('=== 1. VERIFICAÇÃO SQLITE (enderecos_duque_de_caxias_v2.db) ===');
  const db = new DatabaseSync(path.join(__dirname, '../dados/enderecos_duque_de_caxias_v2.db'));
  
  const integrity = db.prepare('PRAGMA integrity_check').all();
  console.log('PRAGMA integrity_check:', integrity);

  const fkCheck = db.prepare('PRAGMA foreign_key_check').all();
  console.log('PRAGMA foreign_key_check (violações):', fkCheck);

  // Inspect violation:
  if (fkCheck.length > 0) {
    for (const v of fkCheck) {
      const row = db.prepare(`SELECT rowid, id, nome, hub_id FROM ${v.table} WHERE rowid = ?`).get(v.rowid);
      console.log('Violação encontrada:', v, 'Registro:', row);
    }
  }

  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  for (const t of tables) {
    if (t.name.startsWith('sqlite_')) continue;
    const count = db.prepare(`SELECT count(*) as count FROM "${t.name}"`).get().count;
    console.log(`  Table [${t.name}]: ${count} registros`);
  }

  // Check orphan addresses
  const orphanEnd = db.prepare(`
    SELECT id, logradouro, numero, cep, latitude, longitude
    FROM enderecos 
    WHERE id NOT IN (SELECT DISTINCT endereco_id FROM equipamentos WHERE endereco_id IS NOT NULL)
  `).all();
  console.log(`\nEndereços órfãos em enderecos: ${orphanEnd.length}`);
  if (orphanEnd.length > 0) {
    console.log('Primeiros 3 órfãos:', orphanEnd.slice(0, 3));
  }

  // Check hubs_predios
  const hubs = db.prepare('SELECT * FROM hubs_predios').all();
  console.log(`\nHubs / Prédios: ${hubs.length}`);
  console.log(hubs);

  console.log('\n=== 2. VERIFICAÇÃO MYSQL (carta_de_servico) ===');
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'carta_de_servico',
    });

    const [mysqlTables] = await pool.query('SHOW TABLES');
    const dbName = process.env.DB_NAME || 'carta_de_servico';
    const tableKey = `Tables_in_${dbName}`;
    for (const row of mysqlTables) {
      const tbl = row[tableKey] || Object.values(row)[0];
      const [[{ count }]] = await pool.query(`SELECT count(*) as count FROM \`${tbl}\``);
      console.log(`  Table [${tbl}]: ${count} registros`);
    }

    // Check orphan child records in MySQL
    console.log('\nVerificando integridade referencial no MySQL:');
    const childTables = [
      { tbl: 'service_categories', fk: 'service_id' },
      { tbl: 'service_documents', fk: 'service_id' },
      { tbl: 'service_emails', fk: 'service_id' },
      { tbl: 'service_links', fk: 'service_id' },
      { tbl: 'service_phones', fk: 'service_id' },
      { tbl: 'service_priorities', fk: 'service_id' },
      { tbl: 'service_steps', fk: 'service_id' },
      { tbl: 'service_history', fk: 'service_id' },
    ];
    for (const c of childTables) {
      const [orphans] = await pool.query(`
        SELECT count(*) as count FROM \`${c.tbl}\` WHERE \`${c.fk}\` NOT IN (SELECT id FROM services)
      `);
      console.log(`  - Filhos órfãos em ${c.tbl} (${c.fk}): ${orphans[0].count}`);
    }

    // Check secretarias references
    const [orphanSec] = await pool.query(`
      SELECT count(*) as count FROM services WHERE secretaria_id NOT IN (SELECT id FROM secretarias)
    `);
    console.log(`  - Serviços com secretaria_id inexistente: ${orphanSec[0].count}`);

    // Check users references
    const [orphanUsers] = await pool.query(`
      SELECT count(*) as count FROM users WHERE secretaria_id IS NOT NULL AND secretaria_id NOT IN (SELECT id FROM secretarias)
    `);
    console.log(`  - Usuários com secretaria_id inexistente: ${orphanUsers[0].count}`);

    // Check services status distribution
    const [statusDist] = await pool.query(`
      SELECT status, count(*) as count FROM services GROUP BY status
    `);
    console.log('\nDistribuição de status em services:');
    console.log(statusDist);

    // Check invalid hub_id in equipamentos
    const invalidHubs = db.prepare(`
      SELECT id, nome, hub_id 
      FROM equipamentos 
      WHERE hub_id IS NOT NULL AND hub_id != '' AND hub_id NOT IN (SELECT id FROM hubs_predios)
    `).all();
    console.log(`\nEquipamentos com hub_id inexistente: ${invalidHubs.length}`);
    if (invalidHubs.length > 0) console.log(invalidHubs);

    // Check foreign key constraints
    const [fkRules] = await pool.query(`
      SELECT TABLE_NAME, CONSTRAINT_NAME, DELETE_RULE 
      FROM information_schema.REFERENTIAL_CONSTRAINTS 
      WHERE CONSTRAINT_SCHEMA = ?
    `, [dbName]);
    console.log('\nRegras de chaves estrangeiras no MySQL:');
    console.table(fkRules);

    // Check if any service has empty or null name
    const [emptyServices] = await pool.query(`
      SELECT count(*) as count FROM services WHERE name IS NULL OR TRIM(name) = ''
    `);
    console.log(`  - Serviços sem nome/título: ${emptyServices[0].count}`);

    await pool.end();
  } catch (myErr) {
    console.error('Erro ao conectar no MySQL:', myErr.message);
  }
}

check().catch(console.error);
