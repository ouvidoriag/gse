/**
 * 🏛️ PREFEITURA MUNICIPAL DE DUQUE DE CAXIAS — RJ
 * SUÍTE UNIFICADA DE TESTES E HOMOLOGAÇÃO GERAL (TEST RUNNER)
 * Executa todos os testes de integridade, lógica espacial, exportação e APIs.
 */
const { execSync, spawn } = require('child_process');
const http = require('http');

const PORT = Number(process.env.PORT) || 3032;

function checkServerOnline() {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${PORT}/api/hub/stats`, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function runScript(title, scriptPath) {
  console.log(`\n▶️  Executando: ${title} (${scriptPath})...`);
  const start = Date.now();
  try {
    const output = execSync(`node ${scriptPath}`, { stdio: 'pipe', encoding: 'utf8' });
    const elapsed = Date.now() - start;
    console.log(`   ✅ [PASS] Concluído em ${elapsed}ms`);
    return { name: title, script: scriptPath, passed: true, elapsed, error: null };
  } catch (err) {
    const elapsed = Date.now() - start;
    console.log(`   ❌ [FAIL] Falha em ${elapsed}ms`);
    const errMsg = err.stdout ? err.stdout.slice(-500) : (err.message || 'Erro desconhecido');
    return { name: title, script: scriptPath, passed: false, elapsed, error: errMsg };
  }
}

async function main() {
  console.log('================================================================');
  console.log('🏛️  PORTAL UNIFICADO PMDC — BATERIA EXECUTIVA DE TESTES (ALL)');
  console.log('================================================================');

  const isOnline = await checkServerOnline();
  console.log(`📡 Status do Servidor Express (porta ${PORT}): ${isOnline ? '🟢 ONLINE' : '🟡 OFFLINE (Apenas testes in-process/offline serão executados)'}`);

  const results = [];

  // 1. Testes In-Process e Banco de Dados (Offline / Diretos)
  results.push(runScript('Integridade de Bancos (MySQL & SQLite)', 'scripts/check_full_integrity.js'));
  results.push(runScript('Geocodificação e Precisão Espacial', 'scripts/test_geocoding_service.js'));
  results.push(runScript('Motor de Exportação e Circuit-Breaker', 'scripts/exportador_central.js'));

  // 2. Testes de Integração HTTP (Online)
  if (isOnline) {
    results.push(runScript('Auditoria Independente & Prova Matemática', 'scripts/test_independent_audit.js'));
    results.push(runScript('Carta de Serviços & Hub Geral', 'scripts/test_cds_and_hub.js'));
    results.push(runScript('CRUD & Autenticação SIGEM', 'scripts/test_crud_and_auth.js'));
    results.push(runScript('API Externa & Rate Limiting', 'scripts/test_external_api.js'));
    results.push(runScript('Isolamento Setorial & Permissões', 'scripts/test_secretaria_perm.js'));
  } else {
    console.log('\n💡 Dica: Para rodar os testes de API HTTP (test:cds, test:sigem, audit:sigem), inicie o servidor com "npm start" ou "npm run dev".');
  }

  // Relatório Executivo
  console.log('\n================================================================');
  console.log('📊 PAINEL CONSOLIDADO DE HOMOLOGAÇÃO');
  console.log('================================================================');
  let passedCount = 0;
  results.forEach((r, idx) => {
    if (r.passed) {
      passedCount++;
      console.log(` ${idx + 1}. [✅ PASS] ${r.name.padEnd(45)} (${r.elapsed}ms)`);
    } else {
      console.log(` ${idx + 1}. [❌ FAIL] ${r.name.padEnd(45)} (${r.elapsed}ms)`);
    }
  });

  console.log('================================================================');
  console.log(`🏁 Total de Suítes: ${results.length} | Aprovadas: ${passedCount} | Falhas: ${results.length - passedCount}`);
  console.log('================================================================\n');

  if (passedCount !== results.length) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Erro fatal no executor de testes:', err);
  process.exit(1);
});
