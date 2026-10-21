const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');

const db = new DatabaseSync('dados/enderecos_duque_de_caxias_v2.db');
const schema = db.prepare("SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL ORDER BY type, name").all();

let output = '';
schema.forEach(item => {
  output += `\n-- ${item.type.toUpperCase()}: ${item.name}\n${item.sql};\n`;
});

fs.writeFileSync('dados/backups/sqlite_schema_dump.sql', output);
console.log('✅ SQLite Schema salvo em dados/backups/sqlite_schema_dump.sql');
