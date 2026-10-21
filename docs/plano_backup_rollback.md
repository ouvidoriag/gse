# 🛡️ Plano de Backup, Restauração & Rollback
## Portal Unificado PMDC — Carta de Serviços ao Cidadão + SIGEM
**Prefeitura Municipal de Duque de Caxias — RJ**  
**Versão:** 2.1 (Atualizada com Bases Vetoriais de Ônibus e Tabela de API Keys)  
**Data:** 20/10/2026  

---

## 1. Estratégia de Backup dos Bancos de Dados e Dados Vetoriais

Devido à arquitetura **Dual-Engine** somada aos datasets espaciais em GeoJSON, a rotina de segurança contempla procedimentos específicos e independentes para cada componente.

### 1.1 Backup do MySQL (`carta_de_servico`)
O MySQL armazena o catálogo de 372 serviços, operadores setoriais e o histórico de alterações.

- **Comando de Backup Lógico Oficial:**
  ```powershell
  mysqldump -u root -p --single-transaction --quick --routines --triggers --default-character-set=utf8mb4 carta_de_servico > dados/backups/mysql_carta_de_servico_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql
  ```
  *(A flag `--single-transaction` garante consistência ACID sem bloquear leitura ou escrita dos operadores durante a execução).*

- **Procedimento de Restauração:**
  ```powershell
  mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS carta_de_servico DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
  mysql -u root -p carta_de_servico < dados/backups/mysql_carta_de_servico_backup.sql
  ```

---

### 1.2 Backup do SQLite (`enderecos_duque_de_caxias_v2.db`)
O SQLite armazena o cadastro territorial dos 466 equipamentos, 118 bairros, 4 distritos, logs de auditoria e as credenciais `api_keys`.

- **Cópia Segura (Online / Hot Backup com `VACUUM INTO`):**
  Para evitar corrupção por escrita concorrente, o backup é gerado via comando `VACUUM INTO`:
  ```powershell
  node -e "
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync('./dados/enderecos_duque_de_caxias_v2.db');
  const backupPath = './dados/backups/sqlite_sigem_' + Date.now() + '.db';
  db.exec(\`VACUUM INTO '\${backupPath}';\`);
  db.close();
  console.log('Backup SQLite gerado com sucesso em:', backupPath);
  "
  ```

- **Procedimento de Restauração:**
  1. Parar o processo Express (`npm stop` ou encerrar tarefa de desenvolvimento).
  2. Substituir o arquivo danificado pelo backup íntegro:
     ```powershell
     Copy-Item -Path "dados/backups/sqlite_sigem_XXXXX.db" -Destination "dados/enderecos_duque_de_caxias_v2.db" -Force
     ```
  3. Reiniciar a aplicação:
     ```powershell
     npm run dev
     ```

---

### 1.3 Backup dos Datasets Espaciais GeoJSON (Mobilidade & Linhas)
Os arquivos vetoriais de ônibus residem em `public/sigem/dados/geojson/`:
- `rotas_onibus_tarifa_zero.geojson` (20 linhas)
- `paradas_onibus_tarifa_zero.geojson` (1.795 paradas)

Rotina de backup automatizada em caso de edição cartográfica:
```powershell
Copy-Item -Path "public/sigem/dados/geojson/*" -Destination "dados/backups/geojson_$(Get-Date -Format 'yyyyMMdd')/" -Recurse -Force
```

---

## 2. Plano de Rollback e Contingência de Código

1. **Rollback de Compilação (`dist/`):**
   Caso a compilação do TypeScript falhe em produção, manter cópia da pasta `dist/` prévia:
   ```powershell
   Copy-Item -Path "dist" -Destination "dist_backup" -Recurse -Force
   ```
2. **Reversão Imediata de Processo com PM2:**
   Se executado via PM2 (`ecosystem.config.js`):
   ```bash
   pm2 reload unificados
   ```
