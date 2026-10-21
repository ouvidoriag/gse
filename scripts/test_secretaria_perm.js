const assert = require('assert');

async function runTest() {
  const baseUrl = 'http://localhost:3032';

  console.log('================================================================');
  console.log('🧪 TESTE DE AUTORIZAÇÃO E ISOLAMENTO SETORIAL NO SIGEM');
  console.log('================================================================\n');

  // 1. Login com Saúde (secretaria_municipal_de_saude)
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'secretaria_municipal_de_saude', password: 'mudar123' })
  });

  const loginData = await loginRes.json();
  assert.strictEqual(loginRes.status, 200, 'Login da Saúde deve retornar 200');
  assert.ok(loginData.token, 'Deve retornar token JWT');
  console.log(`✅ [TESTE 1] Login da Saúde realizado com sucesso:`);
  console.log(`   Usuário: ${loginData.user.username}`);
  console.log(`   Secretaria: ${loginData.user.secretariaNome} (ID MySQL: ${loginData.user.secretariaId})`);
  console.log(`   Role: ${loginData.user.role}`);

  const token = loginData.token;

  // 2. Visualização: Saúde pode ver TODOS os 449 equipamentos no SIGEM
  const listRes = await fetch(`${baseUrl}/api/sigem/equipamentos`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const listData = await listRes.json();
  assert.strictEqual(listRes.status, 200);
  assert.strictEqual(listData.total_resultados, 466, 'Usuário da Saúde deve poder ver TODOS os 466 equipamentos da cidade');
  console.log(`\n✅ [TESTE 2] Visualização completa da cidade garantida:`);
  console.log(`   Total de equipamentos visíveis pela Saúde: ${listData.total_resultados}`);

  // 3. Edição de equipamento da própria Saúde (rec_25 - CRAESM)
  const editSaudeRes = await fetch(`${baseUrl}/api/sigem/equipamentos/rec_25`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      descricao: 'Teste de permissão da Saúde - Atualizado com sucesso!'
    })
  });
  const editSaudeData = await editSaudeRes.json();
  assert.strictEqual(editSaudeRes.status, 200, 'Deve autorizar edição do equipamento da Saúde');
  console.log(`\n✅ [TESTE 3] Edição autorizada para equipamento da própria secretaria:`);
  console.log(`   Equipamento: ${editSaudeData.data.nome}`);
  console.log(`   Secretaria Gestora: ${editSaudeData.data.secretaria_sigla} - ${editSaudeData.data.secretaria_nome}`);

  // 4. Edição de equipamento de OUTRA secretaria (Educação - SMEDC)
  const equipEducacao = listData.data.find(e => e.secretaria_sigla === 'SMEDC');
  assert.ok(equipEducacao, 'Deve encontrar equipamento da Educação na lista');

  const editOutraRes = await fetch(`${baseUrl}/api/sigem/equipamentos/${equipEducacao.id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      nome: 'Tentativa indevida de alteração da Educação pela Saúde'
    })
  });
  const editOutraData = await editOutraRes.json();
  assert.strictEqual(editOutraRes.status, 403, 'Deve BLOQUEAR com HTTP 403 edição de equipamento de outra secretaria');
  console.log(`\n✅ [TESTE 4] Bloqueio setorial HTTP 403 confirmado para equipamento de outra secretaria:`);
  console.log(`   Alvo: ${equipEducacao.nome} (${equipEducacao.secretaria_sigla})`);
  console.log(`   Resposta da API: "${editOutraData.error}"`);

  // 5. Exclusão de equipamento de OUTRA secretaria deve ser bloqueada com 403
  const delOutraRes = await fetch(`${baseUrl}/api/sigem/equipamentos/${equipEducacao.id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const delOutraData = await delOutraRes.json();
  assert.strictEqual(delOutraRes.status, 403, 'Deve bloquear exclusão com 403');
  console.log(`\n✅ [TESTE 5] Bloqueio de exclusão cruzada confirmado:`);
  console.log(`   Resposta da API: "${delOutraData.error}"`);

  // 6. Criação de novo equipamento pela Saúde -> Deve ser automaticamente vinculado à SMS
  const createRes = await fetch(`${baseUrl}/api/sigem/equipamentos`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      nome: 'Unidade Básica de Saúde Teste PMDC - SMS',
      categoria: 'Saúde Básica (APS / USF / UBS)',
      bairro: 'Centro',
      endereco: 'Rua General Dionísio',
      numero: '100',
      status: 'Ativo'
    })
  });
  const createData = await createRes.json();
  assert.strictEqual(createRes.status, 201, 'Deve permitir criação de equipamento por editor da Saúde');
  assert.strictEqual(createData.data.secretaria_sigla, 'SMS', 'Novo equipamento deve estar vinculado à SMS');
  console.log(`\n✅ [TESTE 6] Cadastro de equipamento pela Saúde:`);
  console.log(`   ID Gerado: ${createData.data.id}`);
  console.log(`   Secretaria Vinculada: ${createData.data.secretaria_sigla} - ${createData.data.secretaria_nome}`);

  // 7. Limpeza: A própria Saúde pode excluir seu equipamento recém-criado
  const cleanRes = await fetch(`${baseUrl}/api/sigem/equipamentos/${createData.data.id}?hard=true`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  assert.strictEqual(cleanRes.status, 200, 'Saúde pode excluir seu próprio equipamento criado');
  console.log(`\n✅ [TESTE 7] Exclusão autorizada do próprio equipamento:`);
  console.log(`   Equipamento temporário removido com sucesso.`);

  // 8. Rota de Secretarias com Totais
  const secRes = await fetch(`${baseUrl}/api/sigem/secretarias`);
  const secData = await secRes.json();
  assert.strictEqual(secRes.status, 200);
  assert.ok(secData.data.length >= 18);
  const smsStats = secData.data.find(s => s.sigla === 'SMS');
  assert.strictEqual(smsStats.total_equipamentos, 95);
  console.log(`\n✅ [TESTE 8] Endpoint /api/sigem/secretarias retorna 18 secretarias:`);
  console.log(`   SMS (Saúde): ${smsStats.total_equipamentos} equipamentos vinculados.`);

  console.log('\n================================================================');
  console.log('🏁 HOMOLOGAÇÃO TOTAL: 8 TESTES APROVADOS (100% SUCESSO)');
  console.log('================================================================');
}

runTest().catch(err => {
  console.error('❌ Falha no teste:', err);
  process.exit(1);
});
