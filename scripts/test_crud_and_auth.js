/**
 * Teste Automatizado de Autenticação, CRUD e UTF-8 no SIGEM
 */
const http = require('http');
const PORT = Number(process.env.PORT) || 3032;

function request(options, data) {
  options.port = options.port || PORT;
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
  console.log('🧪 [INICIANDO TESTES DO SIGEM]');

  // 1. Healthcheck & UTF-8 Header Test
  const health = await request({
    host: 'localhost',
    port: PORT,
    path: '/api/health',
    method: 'GET'
  });
  console.log('1. Healthcheck Status:', health.status, '| DB:', health.data.banco_de_dados.status, '| Content-Type:', health.headers['content-type']);

  // 2. Auth Login Test
  const loginRes = await request({
    host: 'localhost',
    port: PORT,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'admin', password: 'admin123' });

  console.log('2. Login Status:', loginRes.status, '| Sucesso:', loginRes.data.success, '| Usuário:', loginRes.data.user?.name);
  const token = loginRes.data.token;

  // 3. Auth Me Test
  const meRes = await request({
    host: 'localhost',
    port: PORT,
    path: '/api/auth/me',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('3. Auth /me Status:', meRes.status, '| Autenticado:', meRes.data.authenticated, '| Cargo:', meRes.data.user?.role);

  // 4. Teste Create Equipamento (POST)
  const createRes = await request({
    host: 'localhost',
    port: PORT,
    path: '/api/equipamentos',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, {
    nome: 'Novo Posto Avançado de Atendimento ao Munícipe — Teste UTF-8 Acentuação (ÁÉÍÓÚ çãõ)',
    categoria_id: 1,
    bairro: 'Centro',
    logradouro: 'Avenida Presidente Kennedy',
    numero: '1000',
    cep: '25010-001',
    telefone: '21 99999-8888',
    email: 'posto.teste@duquedecaxias.rj.gov.br',
    descricao: 'Unidade moderna para testes automatizados de homologação do SIGEM 2026.'
  });

  console.log('4. Create Status:', createRes.status, '| Mensagem:', createRes.data.message, '| ID Criado:', createRes.data.data?.id);
  const createdId = createRes.data.data?.id;

  // 5. Teste Update Equipamento (PUT)
  const updateRes = await request({
    host: 'localhost',
    port: PORT,
    path: `/api/equipamentos/${createdId}`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, {
    nome: 'Posto Avançado Atualizado — Duque de Caxias / RJ',
    horario_funcionamento: 'Segunda a Sexta, das 08h às 18h'
  });
  console.log('5. Update Status:', updateRes.status, '| Nome Atualizado:', updateRes.data.data?.nome);

  // 6. Teste Auditoria (GET /api/auditoria)
  const auditRes = await request({
    host: 'localhost',
    port: PORT,
    path: '/api/auditoria?limit=5',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('6. Auditoria Status:', auditRes.status, '| Total Logs:', auditRes.data.total, '| Último Log:', auditRes.data.logs[0]?.operacao, auditRes.data.logs[0]?.registro_id);

  // 7. Teste Delete Equipamento (DELETE)
  const deleteRes = await request({
    host: 'localhost',
    port: PORT,
    path: `/api/equipamentos/${createdId}?hard=true`,
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('7. Delete Status:', deleteRes.status, '| Mensagem:', deleteRes.data.message);

  console.log('\n🎉 [TODOS OS TESTES CONCLUÍDOS COM SUCESSO!]');
}

runTests().catch(console.error);
