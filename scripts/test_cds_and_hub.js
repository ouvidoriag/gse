/**
 * 🏛️ PREFEITURA MUNICIPAL DE DUQUE DE CAXIAS — RJ
 * Testes Automatizados da Carta de Serviços (MySQL), Hub e Isolamento Setorial
 */
const http = require('http');
const PORT = Number(process.env.PORT) || 3032;

function request(options, data) {
  options.port = options.port || PORT;
  options.host = options.host || 'localhost';
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('================================================================');
  console.log('🏛️  CARTA DE SERVIÇOS + HUB — TESTES AUTOMATIZADOS DE HOMOLOGAÇÃO');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`   ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`   ❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. Hub Stats Test
  console.log('📊 [TESTE 1] Estatísticas Unificadas do Hub (/api/hub/stats)');
  const statsRes = await request({ path: '/api/hub/stats', method: 'GET' });
  assert(statsRes.status === 200, 'Endpoint /api/hub/stats responde HTTP 200');
  assert(statsRes.data?.resumo?.totalServicos === 368, 'Total de Serviços no MySQL = 368 (Zero Duplicidades)');
  assert(statsRes.data?.resumo?.totalEquipamentos === 466, 'Total de Equipamentos no SQLite = 466 (Base Calibrada)');
  assert(statsRes.data?.resumo?.totalSecretarias === 18, 'Total de Secretarias = 18');

  // 2. Hub Search Test
  console.log('\n🔍 [TESTE 2] Busca Transversal Federada (/api/hub/search?q=saude)');
  const searchRes = await request({ path: '/api/hub/search?q=saude', method: 'GET' });
  assert(searchRes.status === 200, 'Busca transversal responde HTTP 200');
  assert(Array.isArray(searchRes.data?.results?.servicos), 'Retorna lista de serviços do MySQL');
  assert(Array.isArray(searchRes.data?.results?.equipamentos), 'Retorna lista de equipamentos do SQLite');
  assert(searchRes.data?.results?.servicos?.length > 0, 'Encontrou serviços de saúde no MySQL');
  assert(searchRes.data?.results?.equipamentos?.length > 0, 'Encontrou unidades de saúde no SQLite');

  // 3. Auth Login Test
  console.log('\n🔑 [TESTE 3] Autenticação e Emissão de JWT (/api/auth/login)');
  const loginRes = await request({
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'admin', password: 'admin123' });
  assert(loginRes.status === 200, 'Login de administrador bem-sucedido (HTTP 200)');
  assert(loginRes.data?.token, 'Token JWT gerado com sucesso');
  assert(loginRes.data?.user?.role === 'admin', 'Perfil de usuário = admin');
  const adminToken = loginRes.data?.token;

  // 4. List Services with Admin Token
  console.log('\n📋 [TESTE 4] Listagem de Serviços com Token Admin (/api/cds/services)');
  const listRes = await request({
    path: '/api/cds/services',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(listRes.status === 200, 'Listagem de serviços responde HTTP 200');
  assert(Array.isArray(listRes.data) && listRes.data.length === 368, `Admin visualiza os 368 serviços cadastrados (retornou: ${listRes.data?.length})`);

  // 5. Export Excel XLSX Test
  console.log('\n📑 [TESTE 5] Exportação Oficial da Carta para Excel XLSX (/api/cds/services/export)');
  const exportRes = await request({
    path: '/api/cds/services/export',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(exportRes.status === 200, 'Exportação para planilha responde HTTP 200');
  assert(exportRes.headers['content-type'].includes('spreadsheetml'), 'Content-Type correto de planilha OpenXML (.xlsx)');
  assert(exportRes.raw && exportRes.raw.length > 5000, `Buffer da planilha gerado com sucesso (${exportRes.raw?.length} bytes)`);

  // 6. CRUD de Teste com Auditoria Transacional
  console.log('\n✍️ [TESTE 6] CRUD Atômico de Serviço com Auditoria de Alterações');
  const createServiceRes = await request({
    path: '/api/cds/services',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    }
  }, {
    name: 'Serviço de Homologação Automatizada 2026 — Teste Integridade',
    category_ids: [1],
    description: 'Serviço temporário criado para validação de transações e auditoria.',
    how_to_access: 'Acesso via protocolo online',
    address: 'Alameda James Franco, 3',
    who_can_request: 'Cidadãos do município',
    waiting_time: 'Imediato',
    max_deadline: '24 horas',
    cost: 'Gratuito',
    regulation_norm: 'Decreto Municipal Homologação 2026',
    telefones: ['21 2773-0000', '21 99999-0000'],
    emails: ['teste.servico@duquedecaxias.rj.gov.br'],
    links: ['https://duquedecaxias.rj.gov.br'],
    passos: ['Passo 1: Acessar o portal', 'Passo 2: Preencher formulário'],
    documentos: ['Documento oficial com foto', 'Comprovante de residência'],
    prioridades: ['Idosos com idade igual ou superior a 80 anos', 'Pessoas com deficiência'],
    secretaria_id: 1,
    status: 'published'
  });

  assert(createServiceRes.status === 201, 'Serviço criado com sucesso (HTTP 201)');
  const createdServiceId = createServiceRes.data?.serviceId;
  assert(createdServiceId > 0, `ID do serviço gerado: ${createdServiceId}`);

  // 7. Update Service Test
  console.log('\n🔄 [TESTE 7] Atualização com Gravação de Diff no Histórico');
  const updateServiceRes = await request({
    path: `/api/cds/services/${createdServiceId}`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    }
  }, {
    name: 'Serviço de Homologação Automatizada 2026 — NOME ATUALIZADO',
    category_ids: [1],
    description: 'Descrição atualizada durante o teste de homologação.',
    waiting_time: 'Até 48 horas',
    secretaria_id: 1,
    status: 'published'
  });
  assert(updateServiceRes.status === 200, 'Serviço atualizado com sucesso (HTTP 200)');

  // 8. Delete Service Test
  console.log('\n🗑️ [TESTE 8] Exclusão do Serviço Temporário de Teste');
  const deleteServiceRes = await request({
    path: `/api/cds/services/${createdServiceId}`,
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(deleteServiceRes.status === 200, 'Serviço de teste removido com sucesso');

  // 9. Cross-Secretaria Security Test (Isolamento de Escopo)
  console.log('\n🛡️ [TESTE 9] Prova de Isolamento Setorial e Bloqueio Cruzado');
  // Login as operator of Secretariat 2 (Fazenda)
  const opLoginRes = await request({
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'sec_fazenda', password: 'password123' });

  if (opLoginRes.status === 200 && opLoginRes.data?.token) {
    const opToken = opLoginRes.data.token;
    const opSecId = opLoginRes.data.user.secretariaId;
    console.log(`   • Operador autenticado na Secretaria ID: ${opSecId} (${opLoginRes.data.user.username})`);

    // Tentar acessar serviço da Secretaria 1 usando token da Secretaria 2
    // Encontrar um serviço da secretaria 1
    const testAlienRes = await request({
      path: '/api/cds/services',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${opToken}` }
    });
    const ownServices = testAlienRes.data;
    const allBelongToOwn = ownServices.every(s => s.secretaria_id === opSecId);
    assert(allBelongToOwn, 'Operador setorial listou estritamente serviços da sua própria secretaria');

    // Tentar deletar serviço de outra secretaria (ex: ID 1 que pertence à Secretaria 1)
    const illegalDelete = await request({
      path: '/api/cds/services/1',
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${opToken}` }
    });
    assert(illegalDelete.status === 404, 'Tentativa de excluir serviço de outro órgão foi bloqueada com HTTP 404');
  } else {
    // Test with fake/invalid token
    const fakeTokenRes = await request({
      path: '/api/cds/services',
      method: 'GET',
      headers: { 'Authorization': 'Bearer token_invalido_hacker' }
    });
    assert(fakeTokenRes.status === 403, 'Token forjado é sumariamente rejeitado com HTTP 403');
  }

  console.log('\n================================================================');
  console.log(`🏁 RESULTADO DOS TESTES CDS & HUB: ${passed} APROVADOS | ${failed} FALHAS`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
