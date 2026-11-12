const assert = require('assert');
const { 
  getWebhookConfig, 
  signWebhookPayload, 
  buildServicePublicPayload, 
  buildEquipamentoPublicPayload,
  getWebhookStatus 
} = require('../dist/services/webhookService.js');

async function runTests() {
  console.log('🧪 Iniciando testes do Webhook Duque IA com Payload Completo...');

  // 1. Configuração
  const config = getWebhookConfig();
  console.log('1. Configuração carregada:', {
    enabled: config.enabled,
    url: config.url,
    hasSecret: Boolean(config.secret)
  });
  assert.strictEqual(typeof config.enabled, 'boolean');
  assert.strictEqual(typeof config.url, 'string');

  // 2. Assinatura HMAC-SHA256
  const payloadTest = JSON.stringify({ teste: 'duque_ia', timestamp: 12345 });
  const sig = signWebhookPayload(payloadTest, 'chave_secreta_teste');
  console.log('2. Assinatura HMAC gerada:', sig);
  assert.strictEqual(typeof sig, 'string');
  assert.strictEqual(sig.length, 64); // SHA-256 hex é 64 chars

  // 3. Payload Completo de Serviço (CDS)
  console.log('3. Testando extração de dados públicos de Serviço (CDS)...');
  const serviceData = await buildServicePublicPayload(1);
  console.log('   -> Serviço #1:', {
    id: serviceData.id,
    nome: serviceData.nome,
    secretaria: serviceData.secretaria_nome,
    custo: serviceData.custo,
    status: serviceData.status,
    total_campos: Object.keys(serviceData).length
  });
  assert.ok(serviceData.nome, 'O serviço deve ter nome');
  assert.ok(serviceData.secretaria_nome, 'O serviço deve ter secretaria_nome');
  assert.strictEqual(serviceData.password, undefined, 'Não deve conter senhas');

  // 4. Payload Completo de Equipamento (SIGEM)
  console.log('4. Testando extração de dados públicos de Equipamento (SIGEM)...');
  const equipData = await buildEquipamentoPublicPayload('rec_397');
  console.log('   -> Equipamento rec_397 (Hospital Veterinário):', {
    id: equipData.id,
    nome: equipData.nome,
    sigla: equipData.sigla,
    categoria: equipData.categoria,
    endereco: equipData.endereco_completo,
    bairro: equipData.bairro_oficial || equipData.bairro,
    status: equipData.status,
    total_campos: Object.keys(equipData).length
  });
  assert.ok(equipData.nome, 'O equipamento deve ter nome');
  assert.strictEqual(equipData.password, undefined, 'Não deve conter senhas');

  // 5. Status da Fila e Operação
  const status = getWebhookStatus();
  console.log('5. Status operacional do Webhook:', status);
  assert.strictEqual(typeof status.enabled, 'boolean');
  assert.ok(status.queue, 'Deve conter contadores da fila');

  console.log('\n✅ Todos os testes do Webhook Duque IA passaram com sucesso!');
  process.exit(0);
}

runTests().catch(err => {
  console.error('❌ Falha nos testes do Webhook:', err);
  process.exit(1);
});

