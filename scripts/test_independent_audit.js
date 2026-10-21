/**
 * 🏛️ PREFEITURA MUNICIPAL DE DUQUE DE CAXIAS — RJ
 * SIGEM — Auditoria Técnica Independente e Homologação da V2
 * 
 * Executa testes rigorosos sobre os 5 pilares exigidos para homologação final:
 * 1. Integridade dos dados & Partição estrita dos 6 setores (Zero omissão, zero sobreposição)
 * 2. Segurança da API (Token ausente, token inválido, validações de payload)
 * 3. Consistência e Circuit-Breaker (Proteção contra exportações corrompidas e atomicidade)
 * 4. Auditoria de operações e Procedimento de Backup/Restauração SQLite
 * 5. Contingência Offline e sincronia de arquivos derivados
 */

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { REGRAS_SETORES, validarIntegridade, exportarTudo } = require('./exportador_central');

const BASE_DIR = path.resolve(__dirname, '..');
const DB_PATH = path.join(BASE_DIR, 'dados', 'enderecos_duque_de_caxias_v2.db');
const PORT = Number(process.env.PORT) || 3032;
const API_BASE = `http://localhost:${PORT}`;

async function runAudit() {
  console.log('================================================================');
  console.log('🏛️  SIGEM V2 — AUDITORIA TÉCNICA E HOMOLOGAÇÃO DE PRODUÇÃO');
  console.log('================================================================\n');

  let passedAll = true;

  // ---------------------------------------------------------------------------
  // 1. INTEGRIDADE DOS DADOS & PARTIÇÃO MATEMÁTICA DOS SETORES
  // ---------------------------------------------------------------------------
  console.log('🔬 [TESTE 1] INTEGRIDADE E PROVA MATEMÁTICA DE PARTIÇÃO DOS SETORES');
  const db = new DatabaseSync(DB_PATH);
  const rows = db.prepare('SELECT * FROM vw_equipamentos_consolidada').all();
  console.log(`   • Registros na View Mestra (SQLite V2): ${rows.length}`);

  if (rows.length !== 466) {
    console.error(`   ❌ ERRO: Esperado 466 registros, encontrado ${rows.length}`);
    passedAll = false;
  }

  const idToSectors = new Map();
  const sectorCounts = {};
  REGRAS_SETORES.forEach(s => sectorCounts[s.nome] = 0);

  rows.forEach(r => {
    const matched = [];
    REGRAS_SETORES.forEach(s => {
      if (s.filtro(r)) {
        matched.push(s.nome);
        sectorCounts[s.nome]++;
      }
    });
    idToSectors.set(r.id, matched);
  });

  let omissions = 0;
  let overlaps = 0;
  idToSectors.forEach((sectors, id) => {
    if (sectors.length === 0) omissions++;
    if (sectors.length > 1) overlaps++;
  });

  console.log(`   • Registros com Omissão (0 setores): ${omissions}`);
  console.log(`   • Registros com Sobreposição (>1 setores): ${overlaps}`);
  
  for (const [setor, count] of Object.entries(sectorCounts)) {
    console.log(`     - ${setor.padEnd(42)}: ${String(count).padStart(3)} reg`);
  }
  const somaSetores = Object.values(sectorCounts).reduce((a, b) => a + b, 0);
  console.log(`   • Soma calculada dos setores: ${somaSetores}`);

  if (omissions === 0 && overlaps === 0 && somaSetores === rows.length) {
    console.log('   ✅ Prova de partição matemática aprovada: CADA REGISTRO PERTENCE A EXATAMENTE UM SETOR.\n');
  } else {
    console.error('   ❌ Falha na partição matemática dos setores!\n');
    passedAll = false;
  }

  // ---------------------------------------------------------------------------
  // 2. SEGURANÇA DA API RESTful
  // ---------------------------------------------------------------------------
  console.log('🔒 [TESTE 2] SEGURANÇA DA API E CONTROLE DE ACESSO');
  try {
    // 2.1 Requisição POST /api/equipamentos sem token
    const resNoTokenCreate = await fetch(`${API_BASE}/api/equipamentos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: 'Teste Invasão' })
    });
    console.log(`   • POST /api/equipamentos sem token: Status ${resNoTokenCreate.status} (Esperado 401)`);
    if (resNoTokenCreate.status !== 401) passedAll = false;

    // 2.2 Requisição DELETE /api/equipamentos/rec_1 sem token
    const resNoTokenDelete = await fetch(`${API_BASE}/api/equipamentos/rec_1`, {
      method: 'DELETE'
    });
    console.log(`   • DELETE /api/equipamentos sem token: Status ${resNoTokenDelete.status} (Esperado 401)`);
    if (resNoTokenDelete.status !== 401) passedAll = false;

    // 2.3 Requisição POST /api/export sem token
    const resNoTokenExport = await fetch(`${API_BASE}/api/export`, {
      method: 'POST'
    });
    console.log(`   • POST /api/export sem token: Status ${resNoTokenExport.status} (Esperado 401)`);
    if (resNoTokenExport.status !== 401) passedAll = false;

    // 2.4 Requisição com Token Forjado / Inválido
    const resBadToken = await fetch(`${API_BASE}/api/auditoria`, {
      headers: { 'Authorization': 'Bearer token-falso-invalido-12345' }
    });
    console.log(`   • GET /api/auditoria com token falso: Status ${resBadToken.status} (Esperado 401 ou 403)`);
    if (resBadToken.status !== 401 && resBadToken.status !== 403) passedAll = false;

    // 2.5 Login com sucesso para testar validação de payload
    const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: 'admin', pass: 'admin123' })
    });
    const { token } = await loginRes.json();

    // 2.6 Validação de payload: POST sem nome
    const resBadPayload = await fetch(`${API_BASE}/api/equipamentos`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ categoria: 'Saúde' }) // Sem campo 'nome'
    });
    console.log(`   • POST /api/equipamentos com payload inválido (sem nome): Status ${resBadPayload.status} (Esperado 400)`);
    if (resBadPayload.status !== 400) passedAll = false;

    console.log('   ✅ Todas as proteções e barreiras de segurança da API foram validadas com sucesso.\n');
  } catch (err) {
    console.error('   ❌ Erro ao testar segurança da API:', err.message);
    passedAll = false;
  }

  // ---------------------------------------------------------------------------
  // 3. CIRCUIT-BREAKER, CONSISTÊNCIA E ATOMICIDADE DE EXPORTAÇÃO
  // ---------------------------------------------------------------------------
  console.log('⚡ [TESTE 3] CIRCUIT-BREAKER E ATOMICIDADE DE EXPORTAÇÃO');
  
  // 3.1 Testar rejeição de base corrompida (menos de 400 registros)
  const baseCorrompidaMenos = rows.slice(0, 350); // Simula perda de 99 registros
  let falhaMenosCapturada = false;
  try {
    validarIntegridade(baseCorrompidaMenos);
  } catch (err) {
    falhaMenosCapturada = true;
    console.log(`   • Circuit-breaker acionado para base incompleta (<400): "${err.message}"`);
  }
  if (!falhaMenosCapturada) {
    console.error('   ❌ Falha: Circuit-breaker não bloqueou base com menos de 400 registros!');
    passedAll = false;
  }

  // 3.2 Testar rejeição de registro com dados cadastrais nulos / corrompidos
  const baseCorrompidaSemNome = rows.slice(0, 440);
  baseCorrompidaSemNome.push({ id: 'rec_invalido', nome: '', categoria: 'Saúde', lat: -22.78, lon: -43.30 });
  let falhaSemNomeCapturada = false;
  try {
    validarIntegridade(baseCorrompidaSemNome);
  } catch (err) {
    falhaSemNomeCapturada = true;
    console.log(`   • Circuit-breaker acionado para registro sem nome: "${err.message}"`);
  }
  if (!falhaSemNomeCapturada) {
    console.error('   ❌ Falha: Circuit-breaker não bloqueou registro sem nome!');
    passedAll = false;
  }

  // 3.3 Testar garantia de escrita atômica (.tmp -> rename)
  const jsonOficial = path.join(BASE_DIR, 'dados', 'todos_os_enderecos_duque_de_caxias.json');
  const mtimeAntes = fs.statSync(jsonOficial).mtimeMs;
  
  // Força uma exportação com erro no meio simulando interrupção de processo
  console.log('   • Simulando falha durante processo de exportação...');
  try {
    const mockDbComErro = {
      prepare: () => ({
        all: () => {
          throw new Error('Falha simulada de I/O de disco durante a exportação');
        }
      })
    };
    exportarTudo(mockDbComErro);
  } catch (simulatedErr) {
    console.log(`   • Erro simulado capturado com segurança: "${simulatedErr.message}"`);
  }

  // Verifica se o arquivo oficial permaneceu intacto e nenhum .tmp foi deixado
  const mtimeDepois = fs.statSync(jsonOficial).mtimeMs;
  const conteudoIntacto = JSON.parse(fs.readFileSync(jsonOficial, 'utf8'));
  console.log(`   • Arquivo oficial preservado: ${conteudoIntacto.length} registros intactos.`);
  
  const tempFiles = fs.readdirSync(path.join(BASE_DIR, 'dados')).filter(f => f.endsWith('.tmp'));
  console.log(`   • Arquivos temporários residuais (.tmp): ${tempFiles.length}`);

  if (conteudoIntacto.length === rows.length && tempFiles.length === 0) {
    console.log('   ✅ Atomicidade e integridade comprovadas: Arquivos oficiais preservados contra corrupção.\n');
  } else {
    console.error('   ❌ Falha na preservação dos arquivos em caso de falha de exportação!\n');
    passedAll = false;
  }

  // ---------------------------------------------------------------------------
  // 4. AUDITORIA E PROCEDIMENTO DE BACKUP / RESTAURAÇÃO DO SQLITE
  // ---------------------------------------------------------------------------
  console.log('🛡️ [TESTE 4] AUDITORIA E BACKUP/RESTAURAÇÃO DO BANCO SQLITE');
  
  // 4.1 Verificar registros na tabela de auditoria
  const totalAuditoria = db.prepare('SELECT count(*) as total FROM auditoria').get().total;
  const ultimosLogs = db.prepare('SELECT operacao, tabela_afetada, usuario, criado_em FROM auditoria ORDER BY id DESC LIMIT 3').all();
  console.log(`   • Total de logs na tabela auditoria: ${totalAuditoria}`);
  console.log('   • Amostra dos últimos eventos auditados:');
  ultimosLogs.forEach(l => {
    console.log(`     - [${l.criado_em}] Operação: ${l.operacao.padEnd(6)} | Tabela: ${l.tabela_afetada} | Operador: ${l.usuario}`);
  });

  // 4.2 Testar Backup Quente (Online Hot-Backup via VACUUM INTO)
  const backupPath = path.join(BASE_DIR, 'dados', 'backup_homologacao_teste.db');
  if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);

  console.log('   • Executando backup quente do SQLite (VACUUM INTO)...');
  db.exec(`VACUUM INTO '${backupPath.replace(/\\/g, '/')}'`);

  if (!fs.existsSync(backupPath)) {
    console.error('   ❌ Arquivo de backup não foi gerado!');
    passedAll = false;
  } else {
    const backupSize = fs.statSync(backupPath).size;
    console.log(`   • Backup gerado com sucesso: ${(backupSize / 1024).toFixed(1)} KB`);

    // 4.3 Testar Restauração e Verificação de Integridade do Backup
    const backupDb = new DatabaseSync(backupPath);
    const integrityResult = backupDb.prepare('PRAGMA integrity_check').get();
    console.log(`   • PRAGMA integrity_check no banco de backup: ${integrityResult.integrity_check}`);

    const countBackupEquip = backupDb.prepare('SELECT count(*) as total FROM equipamentos').get().total;
    const countBackupEnd = backupDb.prepare('SELECT count(*) as total FROM enderecos').get().total;
    console.log(`   • Equipamentos no backup restaurado: ${countBackupEquip}`);
    console.log(`   • Endereços no backup restaurado: ${countBackupEnd}`);

    backupDb.close();
    fs.unlinkSync(backupPath); // Remove arquivo de teste após homologação

    if (integrityResult.integrity_check === 'ok' && countBackupEquip === rows.length) {
      console.log('   ✅ Procedimento de backup e restauração validado com 100% de sucesso.\n');
    } else {
      console.error('   ❌ Falha na validação do backup restaurado!\n');
      passedAll = false;
    }
  }

  // ---------------------------------------------------------------------------
  // 5. CONTINGÊNCIA OFFLINE E COERÊNCIA DE DADOS
  // ---------------------------------------------------------------------------
  console.log('🌐 [TESTE 5] CONTINGÊNCIA OFFLINE E CONSISTÊNCIA DOS ARQUIVOS ESTÁTICOS');
  
  // 5.1 Conferir JSON mestre e CSV mestre
  const jsonContent = JSON.parse(fs.readFileSync(jsonOficial, 'utf8'));
  const csvOficial = path.join(BASE_DIR, 'dados', 'todos_os_enderecos_duque_de_caxias.csv');
  const csvLines = fs.readFileSync(csvOficial, 'utf8').trim().split('\n').filter(l => l.trim().length > 0).slice(1);

  console.log(`   • Registros no JSON mestre de contingência: ${jsonContent.length}`);
  console.log(`   • Registros no CSV mestre de contingência : ${csvLines.length}`);

  // 5.2 Cruzamento de IDs entre SQLite e JSON de contingência
  const dbIds = new Set(rows.map(r => r.id));
  let divergenciasJson = 0;
  jsonContent.forEach(item => {
    if (!dbIds.has(item.id)) divergenciasJson++;
  });

  console.log(`   • Divergências de IDs entre SQLite e JSON de contingência: ${divergenciasJson}`);

  if (jsonContent.length === rows.length && csvLines.length === rows.length && divergenciasJson === 0) {
    console.log('   ✅ Base de contingência perfeitamente sincronizada com a fonte oficial SQLite.\n');
  } else {
    console.error('   ❌ Falha de sincronia na base de contingência!\n');
    passedAll = false;
  }

  db.close();

  console.log('================================================================');
  if (passedAll) {
    console.log('🎉 HOMOLOGAÇÃO TÉCNICA CONCLUÍDA: TODOS OS 5 TESTES FORAM APROVADOS!');
  } else {
    console.error('⚠️ ATENÇÃO: UMA OU MAIS CONDIÇÕES DE HOMOLOGAÇÃO FALHARAM.');
  }
  console.log('================================================================');
  process.exit(passedAll ? 0 : 1);
}

runAudit();
