const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('🏛️  TESTES DA API EXTERNA v1 — AUTENTICAÇÃO POR CHAVE & DADOS');
console.log('================================================================\n');

const BASE_URL = 'http://localhost:3032';
const dbPath = path.join(__dirname, '..', 'dados', 'enderecos_duque_de_caxias_v2.db');
const db = new DatabaseSync(dbPath);

async function runTests() {
  let passed = 0;
  let failed = 0;

  function ok(condition, msg) {
    if (condition) {
      console.log(`  ✅ [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${msg}`);
      failed++;
    }
  }

  // 1. Preparar Chaves de Teste no SQLite
  const validTestKey = 'pmdc_test_valida_1234567890abcdef';
  const suspendedTestKey = 'pmdc_test_suspensa_9876543210fedcba';

  db.prepare('DELETE FROM api_keys WHERE chave LIKE ?').run('pmdc_test_%');

  db.prepare(`
    INSERT INTO api_keys (chave, nome_cliente, email_cliente, orgao_empresa, limite_req_minuto, limite_req_dia, status)
    VALUES (?, 'TCE - Tribunal de Contas', 'tce@rj.gov.br', 'TCE-RJ', 100, 5000, 'ATIVO')
  `).run(validTestKey);

  db.prepare(`
    INSERT INTO api_keys (chave, nome_cliente, email_cliente, orgao_empresa, limite_req_minuto, limite_req_dia, status)
    VALUES (?, 'Parceiro Suspenso', 'suspenso@teste.com', 'Empresa X', 10, 100, 'SUSPENSO')
  `).run(suspendedTestKey);

  console.log('--- 1. BLOQUEIOS DE SEGURANÇA E AUTENTICAÇÃO ---');

  // Teste 1: Sem chave
  const rNoKey = await fetch(`${BASE_URL}/api/v1/servicos`);
  ok(rNoKey.status === 401, 'Requisição sem X-API-Key é bloqueada com HTTP 401');
  const dNoKey = await rNoKey.json();
  ok(dNoKey.success === false, 'Corpo da resposta sem chave indica erro de credencial');

  // Teste 2: Chave inexistente / forjada
  const rFake = await fetch(`${BASE_URL}/api/v1/servicos`, {
    headers: { 'X-API-Key': 'pmdc_live_chave_falsa_inexistente' }
  });
  ok(rFake.status === 403, 'Chave inexistente é sumariamente rejeitada com HTTP 403');

  // Teste 3: Chave suspensa
  const rSuspended = await fetch(`${BASE_URL}/api/v1/servicos`, {
    headers: { 'X-API-Key': suspendedTestKey }
  });
  ok(rSuspended.status === 403, 'Chave com status SUSPENSO é bloqueada com HTTP 403');

  console.log('\n--- 2. CONSULTAS COM CHAVE VÁLIDA (AUTORIZADA) ---');

  // Teste 4: Endpoint /api/v1/me
  const rMe = await fetch(`${BASE_URL}/api/v1/me`, {
    headers: { 'X-API-Key': validTestKey }
  });
  ok(rMe.status === 200, 'Endpoint /api/v1/me responde HTTP 200 com chave válida');
  const dMe = await rMe.json();
  ok(dMe.client?.nome_cliente === 'TCE - Tribunal de Contas', 'Identificação do cliente correta no /me');
  ok(rMe.headers.get('x-ratelimit-limit') === '5000', 'Header X-RateLimit-Limit retornado corretamente');

  // Teste 5: Carta de Serviços (/api/v1/servicos)
  const rServ = await fetch(`${BASE_URL}/api/v1/servicos?limit=10`, {
    headers: { 'X-API-Key': validTestKey }
  });
  ok(rServ.status === 200, 'Listagem de serviços responde HTTP 200');
  const dServ = await rServ.json();
  ok(dServ.success === true, 'Flag success === true em /servicos');
  ok(dServ.data?.length === 10, 'Paginação limit=10 respeitada');
  ok(dServ.total >= 368, `Total de serviços catalogados retornado (total: ${dServ.total})`);

  // Teste 6: Filtro de busca de serviços por termo
  const rServBusca = await fetch(`${BASE_URL}/api/v1/servicos?q=saude`, {
    headers: { 'X-API-Key': validTestKey }
  });
  const dServBusca = await rServBusca.json();
  ok(dServBusca.total > 0, `Busca por 'saude' encontrou ${dServBusca.total} serviços`);

  // Teste 7: Detalhes de um serviço (/api/v1/servicos/:id)
  const firstId = dServ.data[0].id;
  const rServDetail = await fetch(`${BASE_URL}/api/v1/servicos/${firstId}`, {
    headers: { 'X-API-Key': validTestKey }
  });
  ok(rServDetail.status === 200, `Detalhes do serviço ID ${firstId} respondem HTTP 200`);
  const dServDetail = await rServDetail.json();
  ok(Array.isArray(dServDetail.data?.etapas), 'Serviço detalhado contém array de etapas');
  ok(Array.isArray(dServDetail.data?.documentos_exigidos), 'Serviço detalhado contém array de documentos');

  // Teste 8: SIGEM Equipamentos (/api/v1/equipamentos)
  const rEq = await fetch(`${BASE_URL}/api/v1/equipamentos?limit=15`, {
    headers: { 'X-API-Key': validTestKey }
  });
  ok(rEq.status === 200, 'Listagem de equipamentos responde HTTP 200');
  const dEq = await rEq.json();
  ok(dEq.total === 466, `Total de equipamentos do SIGEM confere (obteve: ${dEq.total})`);
  ok(dEq.data?.length === 15, 'Paginação limit=15 respeitada');
  ok(dEq.data[0].latitude !== undefined && dEq.data[0].longitude !== undefined, 'Equipamentos contêm coordenadas GPS');

  // Teste 9: Filtro de equipamentos por Distrito
  const rEqDist = await fetch(`${BASE_URL}/api/v1/equipamentos?distrito=1`, {
    headers: { 'X-API-Key': validTestKey }
  });
  const dEqDist = await rEqDist.json();
  ok(dEqDist.total > 0, `Equipamentos do 1º Distrito retornados com sucesso (total: ${dEqDist.total})`);

  // Teste 10: Território (Distritos e Bairros)
  const rDist = await fetch(`${BASE_URL}/api/v1/distritos`, {
    headers: { 'X-API-Key': validTestKey }
  });
  const dDist = await rDist.json();
  ok(dDist.total === 4, 'Endpoint /distritos retorna exatamente os 4 distritos municipais');

  const rBairros = await fetch(`${BASE_URL}/api/v1/bairros`, {
    headers: { 'X-API-Key': validTestKey }
  });
  const dBairros = await rBairros.json();
  ok(dBairros.total >= 117, `Endpoint /bairros retorna todos os bairros da cidade (${dBairros.total})`);

  // Teste 11: Secretarias e Estatísticas
  const rSec = await fetch(`${BASE_URL}/api/v1/secretarias`, {
    headers: { 'X-API-Key': validTestKey }
  });
  const dSec = await rSec.json();
  ok(dSec.total === 18, 'Endpoint /secretarias retorna as 18 secretarias');

  const rStats = await fetch(`${BASE_URL}/api/v1/estatisticas`, {
    headers: { 'X-API-Key': validTestKey }
  });
  const dStats = await rStats.json();
  ok(dStats.dados?.total_servicos_publicados >= 368, 'Estatísticas mostram serviços publicados');
  ok(dStats.dados?.total_equipamentos_georreferenciados === 466, 'Estatísticas mostram 466 equipamentos');

  console.log('\n--- 3. PORTAL DO DESENVOLVEDOR (DOCUMENTAÇÃO PÚBLICA) ---');

  // Teste 12: Acesso à documentação (livre de chave)
  const rDocs = await fetch(`${BASE_URL}/docs`);
  ok(rDocs.status === 200, 'Página de documentação (/docs) acessível publicamente (HTTP 200)');
  const textDocs = await rDocs.text();
  ok(textDocs.includes('Portal do Desenvolvedor'), 'Conteúdo do Portal do Desenvolvedor renderizado com sucesso');

  // Limpeza
  db.prepare('DELETE FROM api_keys WHERE chave LIKE ?').run('pmdc_test_%');
  db.close();

  console.log('\n================================================================');
  console.log(`🏁 RESULTADO DOS TESTES: ${passed} APROVADOS | ${failed} FALHAS`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
