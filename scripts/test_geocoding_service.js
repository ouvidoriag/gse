const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { validatePointInDistricts, geocodeLocation, CAXIAS_BBOX } = require('../dist/services/geocodingService');

async function runTests() {
  console.log('🧪 ========================================================');
  console.log('🧪 TESTES DE GEOCODIFICAÇÃO, VALIDAÇÃO ESPACIAL E PERSISTÊNCIA');
  console.log('🧪 ========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // --- SEÇÃO 1: VALIDAÇÃO ESPACIAL POLIGONAL (RAY-CASTING) ---
  console.log('--- 1. Validação Espacial Poligonal (Ray-Casting) ---');

  // TESTE 1: Ray-casting no 1º Distrito (Centro / Praça do Pacificador)
  const t1 = validatePointInDistricts(-22.787184, -43.309531);
  assert(t1.insideCaxias === true, 'Ponto do Centro está dentro de Duque de Caxias');
  assert(t1.districtId === 1, `Ponto do Centro pertence ao 1º Distrito (obteve: ${t1.districtId})`);

  // TESTE 2: Ray-casting no 2º Distrito (Jardim Primavera / Prefeitura)
  const t2 = validatePointInDistricts(-22.685150, -43.283990);
  assert(t2.insideCaxias === true, 'Paço Municipal está dentro de Duque de Caxias');
  assert(t2.districtId === 2, `Paço Municipal pertence ao 2º Distrito (obteve: ${t2.districtId})`);

  // TESTE 3: Ray-casting no 3º Distrito (Imbariê / Santa Cruz da Serra)
  const t3 = validatePointInDistricts(-22.6299, -43.2564);
  assert(t3.insideCaxias === true, 'Polo de Imbariê está dentro de Duque de Caxias');
  assert(t3.districtId === 3, `Polo de Imbariê pertence ao 3º Distrito (obteve: ${t3.districtId})`);

  // TESTE 4: Ray-casting no 4º Distrito (Xerém / Mantiquira)
  const t4 = validatePointInDistricts(-22.5757, -43.3063);
  assert(t4.insideCaxias === true, 'Polo de Xerém está dentro de Duque de Caxias');
  assert(t4.districtId === 4, `Polo de Xerém pertence ao 4º Distrito (obteve: ${t4.districtId})`);

  // TESTE 5: Ponto fora dos limites (Magé / Piabetá)
  const t5 = validatePointInDistricts(-22.60928, -43.17933);
  assert(t5.insideCaxias === false, 'Estação Piabetá é detectada fora dos 4 distritos municipais');

  // TESTE 6: Bounding Box ampliada para Xerém
  assert(CAXIAS_BBOX.maxLat === -22.450, 'Bounding box cobre o alto de Xerém (lat -22.45)');
  assert(CAXIAS_BBOX.minLat === -22.860, 'Bounding box cobre o litoral sul de Duque de Caxias (lat -22.86)');

  // --- SEÇÃO 2: SERVIÇO DE GEOCODIFICAÇÃO E FALLBACKS ---
  console.log('\n--- 2. Serviço de Geocodificação e Tratamento de Chave ---');

  // TESTE 7: Geocodificação com fallback para centróide e preservação de precisão
  const g1 = await geocodeLocation({
    logradouro: 'Avenida Presidente Kennedy',
    numero: '1000',
    bairro: 'Centro',
    distrito: 1,
  });
  assert(g1.success === true, 'Serviço de geocodificação responde com sucesso');
  assert(typeof g1.lat === 'number' && typeof g1.lon === 'number', `Coordenadas numéricas válidas obtidas: (${g1.lat}, ${g1.lon})`);
  assert(['NUMERO_EXATO', 'APROXIMADO_LOGRADOURO', 'CENTROIDE_BAIRRO'].includes(g1.precisao_geo), `Classificação de precisão definida: ${g1.precisao_geo}`);

  // TESTE 8: Geocodificação no 4º Distrito (Xerém)
  const g2 = await geocodeLocation({
    logradouro: 'Estrada Rio d Ouro',
    numero: 's/n',
    bairro: 'Xerém',
    distrito: 4,
  });
  assert(g2.success === true, 'Geocodificação em Xerém processada com sucesso');
  assert(g2.districtId === 4, `Distrito atribuído corretamente para Xerém (obteve: ${g2.districtId})`);

  // TESTE 9: Validação e rejeição de chave Google inválida enviada pelo cliente
  const gBadKey = await geocodeLocation({
    logradouro: 'Rua Marechal Deodoro',
    bairro: '25 de Agosto',
    distrito: 1,
    userKey: 'chave_invalida_123',
  });
  assert(gBadKey.success === true, 'Consulta sobrevive com segurança a chave inválida (caindo no fallback sem erro fatal)');

  // --- SEÇÃO 3: BANCO SQLITE, INTEGRIDADE E PERSISTÊNCIA ---
  console.log('\n--- 3. Integridade e Persistência no SQLite ---');

  const dbPath = path.join(__dirname, '..', 'dados', 'enderecos_duque_de_caxias_v2.db');
  const db = new DatabaseSync(dbPath);

  // TESTE 10: Integridade física do banco e chaves estrangeiras
  const integrity = db.prepare('PRAGMA integrity_check').all();
  assert(integrity[0]?.integrity_check === 'ok', 'PRAGMA integrity_check: 100% íntegro');

  const fKeyCheck = db.prepare('PRAGMA foreign_key_check').all();
  assert(fKeyCheck.length === 0, 'PRAGMA foreign_key_check: Zero erros de FK');

  // TESTE 11: rec_455 migrado com sucesso para Centro, 1º Distrito
  const rec455 = db.prepare(`
    SELECT eq.id, eq.nome, en.bairro_id, b.nome as b_nome, b.distrito_id
    FROM equipamentos eq
    JOIN enderecos en ON eq.endereco_id = en.id
    JOIN bairros b ON en.bairro_id = b.id
    WHERE eq.id = 'rec_455'
  `).get();
  assert(rec455.bairro_id === 4, `rec_455 vinculado a bairro_id = 4 (Centro) [obteve: ${rec455.bairro_id}]`);
  assert(rec455.distrito_id === 1, `rec_455 pertence ao 1º Distrito [obteve: ${rec455.distrito_id}]`);

  // TESTE 12: Bairro espúrio id = 8 inexistente e sem endereços órfãos
  const b8Count = db.prepare('SELECT count(*) as total FROM bairros WHERE id = 8').get().total;
  assert(b8Count === 0, 'Bairro espúrio ID 8 excluído');
  const orfaosB8 = db.prepare('SELECT count(*) as total FROM enderecos WHERE bairro_id = 8').get().total;
  assert(orfaosB8 === 0, 'Zero endereços vinculados a bairro_id = 8');

  // TESTE 13: rec_464, rec_465, rec_466 preservados no cadastro sem reatribuição automática a Magé
  const stations = db.prepare(`
    SELECT eq.id, b.nome as bairro, b.distrito_id
    FROM equipamentos eq
    JOIN enderecos en ON eq.endereco_id = en.id
    JOIN bairros b ON en.bairro_id = b.id
    WHERE eq.id IN ('rec_464', 'rec_465', 'rec_466')
  `).all();
  assert(stations.length === 3, 'As 3 estações do ramal existem no banco');
  const allPreserved = stations.every(s => s.bairro === 'Duque de Caxias' && s.distrito_id === 1);
  assert(allPreserved, 'As 3 estações mantiveram os dados originais sem modificação forçada para Magé');

  // TESTE 14: Persistência de precisao_geo no SQLite
  // Teste de ciclo de vida completo: atualiza precisao_geo, fecha transação e lê da view
  const testEquipId = 'rec_455';
  const origEnd = db.prepare('SELECT endereco_id FROM equipamentos WHERE id = ?').get(testEquipId);
  const prevPrec = db.prepare('SELECT precisao_geo FROM enderecos WHERE id = ?').get(origEnd.endereco_id).precisao_geo;

  // Atualiza para NUMERO_EXATO
  db.prepare("UPDATE enderecos SET precisao_geo = 'NUMERO_EXATO' WHERE id = ?").run(origEnd.endereco_id);
  const viewRow1 = db.prepare('SELECT precisao_geo FROM vw_equipamentos_consolidada WHERE id = ?').get(testEquipId);
  assert(viewRow1.precisao_geo === 'NUMERO_EXATO', 'Persistência: precisao_geo gravado como NUMERO_EXATO e refletido na view consolidada');

  // Atualiza para APROXIMADO_LOGRADOURO
  db.prepare("UPDATE enderecos SET precisao_geo = 'APROXIMADO_LOGRADOURO' WHERE id = ?").run(origEnd.endereco_id);
  const viewRow2 = db.prepare('SELECT precisao_geo FROM vw_equipamentos_consolidada WHERE id = ?').get(testEquipId);
  assert(viewRow2.precisao_geo === 'APROXIMADO_LOGRADOURO', 'Persistência: precisao_geo alterado para APROXIMADO_LOGRADOURO e refletido na view consolidada');

  // Restaura valor original
  db.prepare("UPDATE enderecos SET precisao_geo = ? WHERE id = ?").run(prevPrec || 'NUMERO_EXATO', origEnd.endereco_id);

  // TESTE 15: Trilha de auditoria da migração
  const auditRow = db.prepare("SELECT * FROM auditoria WHERE usuario = 'MIGRACAO_SISTEMA' ORDER BY id DESC LIMIT 1").get();
  assert(auditRow !== undefined, 'Registro de auditoria da migração rec_455 encontrado no histórico');

  db.close();

  console.log(`\n========================================================`);
  console.log(`TOTAL DE TESTES: ${passed + failed} | APROVADOS: ${passed} | FALHAS: ${failed}`);
  console.log(`========================================================`);

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTests().catch(err => {
  console.error('Erro na execução dos testes:', err);
  process.exit(1);
});
