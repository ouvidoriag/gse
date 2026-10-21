const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

console.log('===========================================================');
console.log('🚀 ATUALIZANDO DADOS DE COMUNIDADES A PARTIR DE ACOESCOMUNITARIAS');
console.log('===========================================================');

const ACOES_DIR = 'C:/Users/501379.PMDC/Desktop/acoescomuniatrias';
const DESKTOP_GEOJSON_DIR = 'C:/Users/501379.PMDC/Desktop/geojson_comunidades';
const ANTIGA_MASTER = 'C:/Users/501379.PMDC/Desktop/acaoantiga/src/data/simac_master_db.json';
const DB_PATH = path.join(__dirname, '../dados/enderecos_duque_de_caxias_v2.db');

// 1. Copiar Limite Municipal de Duque de Caxias
const caxiasSrc = path.join(ACOES_DIR, 'geojson_comunidades/Duque_de_Caxias.geojson');
const caxiasDst1 = path.join(__dirname, '../public/sigem/dados/geojson/Duque_de_Caxias.geojson');
const caxiasDst2 = path.join(__dirname, '../dados/Duque_de_Caxias.geojson');
if (fs.existsSync(caxiasSrc)) {
  fs.copyFileSync(caxiasSrc, caxiasDst1);
  fs.copyFileSync(caxiasSrc, caxiasDst2);
  console.log('✅ Limite de Duque de Caxias copiado para public/sigem/dados/geojson e dados/');
}

// 2. Copiar cep_lookup.json
const cepSrc = path.join(ACOES_DIR, 'src/data/cep_lookup.json');
const cepDst = path.join(__dirname, '../dados/cep_lookup.json');
if (fs.existsSync(cepSrc)) {
  fs.copyFileSync(cepSrc, cepDst);
  console.log('✅ cep_lookup.json copiado para dados/');
}

// 3. Copiar pastas individuais dos 10 complexos
const destGeoDir = path.join(__dirname, '../dados/geojson_comunidades');
if (!fs.existsSync(destGeoDir)) fs.mkdirSync(destGeoDir, { recursive: true });

const folders = fs.readdirSync(DESKTOP_GEOJSON_DIR).filter(f => {
  const p = path.join(DESKTOP_GEOJSON_DIR, f);
  return fs.statSync(p).isDirectory();
});

folders.forEach(folder => {
  const srcF = path.join(DESKTOP_GEOJSON_DIR, folder);
  const dstF = path.join(destGeoDir, folder);
  if (!fs.existsSync(dstF)) fs.mkdirSync(dstF, { recursive: true });
  fs.readdirSync(srcF).forEach(file => {
    fs.copyFileSync(path.join(srcF, file), path.join(dstF, file));
  });
});
console.log(`✅ ${folders.length} pastas de complexos copiadas para dados/geojson_comunidades/`);

// 4. Carregar os 66 registros de acoescomuniatrias
const acoesTodasPath = path.join(ACOES_DIR, 'geojson_comunidades/_TODAS_COMUNIDADES.geojson');
const acoesGeo = JSON.parse(fs.readFileSync(acoesTodasPath, 'utf8'));
console.log(`✅ Base _TODAS_COMUNIDADES.geojson carregada (${acoesGeo.features.length} comunidades oficiais)`);

// 5. Carregar antiga base para recuperar ruas e setores independentes
const antigaList = JSON.parse(fs.readFileSync(ANTIGA_MASTER, 'utf8'));
console.log(`✅ Base legada carregada (${antigaList.length} itens com ruas)`);

// Mapeamento semântico antigo -> 66 comunidades oficiais
const legacyToOfficialMap = {
  'Favela do Lixão': 'Comunidade Vila Nova (Lixão)',
  'Dique da Prainha': 'Comunidade Dique da Prainha',
  'Vila Ideal': 'Comunidade da Vila Ideal',
  'Avenida São Vicente': 'Comunidade da Av. São Vicente',
  'Vila Operária': 'Comunidade da Vila Operária',
  '6. Vila Operária (parte)': 'Comunidade da Vila Operária',
  'Vila Beira Mar': 'Comunidade Vila Beira Mar',
  'Parque das Missões': 'Comunidade do Parque das Missões',
  'Chatuba': 'Comunidade da Chatuba',
  'Paraopeba': 'Comunidade da Paraopeba',
  'Favela do Dick 1': 'Comunidade do Dick 1',
  'Dick 2': 'Comunidade Dick 2',
  'Favela do Barro Vermelho': 'Comunidade do Barro Vermelho',
  'Favela da Jaqueira': 'Comunidade da Jaqueira',
  'Favela do Pantanal': 'Comunidade do Pantanal',
  'Comunidade do Calombé': 'Comunidade do Calombé',
  'Avenida do Calombé': 'Comunidade do Calombé',
  'Comunidade da Fumacinha': 'Comunidade da Fumacinha',
  'Vila Actura': 'Comunidade da Vila Actura',
  'Avenida Actura': 'Comunidade da Vila Actura',
  'Parque Bom Retiro': 'Comunidade do Bom Retiro',
  'Jardim Ana Clara (Cantinho do Vov-)': 'Comunidade do Ana Clara',
  'Favela do Ana': 'Comunidade do Ana Clara',
  'Parque Chuno': 'Comunidade do Parque Chuno',
  'Favela do Rasta': 'Comunidade do Rasta',
  'Favela do Cangulo': 'Comunidade do Cangulo',
  'Favela Rua da Lama': 'Comunidade da Rua da Lama',
  'Favela do Buraco Quente': 'Comunidade do Buraco Quente',
  'Favela da Coraia': 'Comunidade do Coreia',
  'Favela da Beiralinha': 'Comunidade da Beira Linha',
  'Morro do Bento': 'Comunidade do São Bento',
  'Suo Bento': 'Comunidade do São Bento',
  'Favela da Cova do Boi': 'Comunidade da Cova do Boi',
  'Favela do Parque Angola A': 'Comunidade do Parque Angola A',
  'Favela do Parque Angola B': 'Comunidade do Parque Angola A',
  'Parque Vitaria': 'Comunidade do Parque Vitória',
  'Garibaldi': 'Comunidade Garibalde',
  'Favela do Celta': 'Comunidade do Celta',
  'Parque Muísa': 'Comunidade do Parque do Muísa',
  'Parque Panorama': 'Comunidade do Parque Panorama',
  'Jurema (Pilar)': 'Comunidade da Jurema',
  'Jardim Vista Alegre': 'Comunidade Jardim Vista Alegre',
  'Pilar': 'Comunidade do Pilar',
  'Loteamento Pilar': 'Comunidade do Pilar',
  'Morro do Sao Pedro': 'Comunidade Morro do São Pedro',
  'Favela do Corte 8': 'Comunidade do Corte Oito',
  'Morro do Coqueirinho': 'Comunidade do Morro do Coqueirinho',
  'Favela da Mangueirinha': 'Comunidade da Mangueirinha',
  'Comunidade Morro da Lagoinha': 'Comunidade do Morro da Lagoinha',
  'Favela do Santuário': 'Comunidade do Santuário',
  'Favela do Sapo A': 'Comunidade do Morro Sapo',
  'Favela do Sapo B': 'Comunidade do Morro Sapo',
  'Favela do Parque Eldorado': 'Comunidade do Parque Eldorado',
  '21. Vai Quem Quer (parte)': 'Comunidade do Vai Quem Quer',
  'Comunidade Rodrigues Alves': 'Comunidade Rodrigues Alves',
  'Comunidade do Quinze': 'Comunidade do Quinze',
  'Favela Santa Lúcia A': 'Comunidade de Santa Lúcia',
  'Favela Santa Lúcia B': 'Comunidade de Santa Lúcia',
  'Nova Campinas A': 'Comunidade Nova Campinas A',
  'Nova Campinas B': 'Comunidade Nova Campinas B',
  'Favela de Santa Cruz da Serra A': 'Comunidade de Santa Cruz da Serra',
  'Favela de Santa Cruz da Serra A (Parte 2)': 'Comunidade de Santa Cruz da Serra',
  'Favela de Santa Cruz da Serra A (Parte 3)': 'Comunidade de Santa Cruz da Serra',
  'Favela de Santa Cruz da Serra B': 'Comunidade de Santa Cruz da Serra',
  'Parque Impario': 'Comunidade de Parque Paulista'
};

// Limpeza de nomes dos 36 setores independentes
const independentCleanNames = {
  'Favela Beco da GlCria': 'Favela Beco da Glória',
  'Morro da Jacatir o': 'Morro do Jacatirão',
  'Nossa Senhora das Grabas': 'Nossa Senhora das Graças',
  '4. São Sebastião (parte)': 'São Sebastião',
  '5. Parque Brasil Novo': 'Parque Brasil Novo',
  '8. Fronteira': 'Fronteira',
  '9. Vila São Sebastião (parte)': 'Vila São Sebastião',
  '10. Teixeira Mendes (parte)': 'Teixeira Mendes',
  '11. São Borja': 'São Borja',
  '12. Candeúba (parte)': 'Candeúba',
  '13. Pistóia': 'Pistóia',
  '14. Anajás': 'Anajás',
  '20.Cachopa': 'Cachopa',
  '27. Vasquinho': 'Vasquinho'
};

// Função para calcular centroide WGS84
function calcCentroid(coords, type) {
  let pts = [];
  if (type === 'Polygon') {
    pts = coords[0] || [];
  } else if (type === 'MultiPolygon') {
    pts = (coords[0] && coords[0][0]) || [];
  }
  if (!pts || pts.length === 0) return { lat: -22.785, lon: -43.31 };
  let sumLon = 0, sumLat = 0;
  pts.forEach(p => { sumLon += p[0]; sumLat += p[1]; });
  return { lat: Number((sumLat / pts.length).toFixed(6)), lon: Number((sumLon / pts.length).toFixed(6)) };
}

// Montar lista consolidada com os 66 oficiais primeiro
const masterList = [];
let nextId = 1;

// 1. Processar as 66 comunidades oficiais de acoescomuniatrias
acoesGeo.features.forEach(feat => {
  const p = feat.properties;
  const nomeOficial = p.Comunidade || p.name;
  const complexo = p.complexo || p.Complexo;
  const complexoOficial = p.Complexo || p.complexo;
  const corHex = p.fill || p.cor_hex || '#ff5500';
  const distritoStr = p.Distrito || '1° Distrito';
  const distritoId = parseInt(distritoStr.replace(/\D/g, '') || '1', 10);
  const ids = p.IDS_comunidade ? parseFloat(p.IDS_comunidade) : null;
  const classe = p.Classe_comunidade || 'Média prioridade';

  const centroid = calcCentroid(feat.geometry.coordinates, feat.geometry.type);

  // Buscar ruas associadas na base antiga
  let ruas = [];
  let ceps = [];

  antigaList.forEach(a => {
    let matches = false;
    if (a.nome.toLowerCase() === nomeOficial.toLowerCase()) matches = true;
    if (legacyToOfficialMap[a.nome] === nomeOficial) matches = true;

    if (matches) {
      (a.ruas || []).forEach(r => { if (!ruas.includes(r)) ruas.push(r); });
      (a.ceps || []).forEach(c => { if (!ceps.some(x => x.cep === c.cep)) ceps.push(c); });
    }
  });

  masterList.push({
    id: nextId++,
    nome: nomeOficial,
    complexo: complexo.toUpperCase(),
    complexo_oficial: complexoOficial,
    cor_hex: corHex,
    distrito: distritoStr,
    distrito_id: distritoId,
    bairro: ceps[0]?.bairro || 'Duque de Caxias',
    ids: ids,
    classe_prioridade: classe,
    latitude: centroid.lat,
    longitude: centroid.lon,
    fill_opacity: p['fill-opacity'] || 0.65,
    stroke: p.stroke || corHex,
    stroke_width: p['stroke-width'] || 2,
    ruas: ruas,
    ceps: ceps,
    geometria: feat.geometry,
    origem: 'SIMAC_GRANDES_COMPLEXOS_OFICIAL'
  });
});

console.log(`✅ 66 Comunidades dos Grandes Complexos consolidadas.`);

// 2. Processar as comunidades e setores independentes da antiga
antigaList.forEach(a => {
  const isCovered = masterList.some(m => m.nome.toLowerCase() === a.nome.toLowerCase() || legacyToOfficialMap[a.nome] === m.nome);
  if (isCovered) return;

  const nomeLimpo = independentCleanNames[a.nome] || a.nome;
  const centroid = calcCentroid(a.geometria.coordinates, a.geometria.type);

  masterList.push({
    id: nextId++,
    nome: nomeLimpo,
    complexo: 'OUTROS SETORES',
    complexo_oficial: 'Outros Setores e Comunidades Independentes',
    cor_hex: '#64748b',
    distrito: '2º Distrito',
    distrito_id: 2,
    bairro: a.ceps && a.ceps[0] ? a.ceps[0].bairro : 'Duque de Caxias',
    ids: 0.65,
    classe_prioridade: 'Prioridade média',
    latitude: centroid.lat,
    longitude: centroid.lon,
    fill_opacity: 0.55,
    stroke: '#64748b',
    stroke_width: 2,
    ruas: a.ruas || [],
    ceps: a.ceps || [],
    geometria: a.geometria,
    origem: 'SIMAC_SETORES_INDEPENDENTES'
  });
});

console.log(`✅ Total final de comunidades no sistema: ${masterList.length}`);

// Gravar Master JSON
const masterJsonPath = path.join(__dirname, '../dados/comunidades_master.json');
fs.writeFileSync(masterJsonPath, JSON.stringify(masterList, null, 2), 'utf8');
console.log(`✅ Arquivo dados/comunidades_master.json gerado com sucesso.`);

// Gravar GeoJSON para o Leaflet do SIGEM
const geojsonFeatures = masterList.map(c => ({
  type: 'Feature',
  id: c.id,
  properties: {
    id: c.id,
    nome: c.nome,
    complexo: c.complexo,
    complexo_oficial: c.complexo_oficial,
    distrito: c.distrito,
    distrito_id: c.distrito_id,
    bairro: c.bairro,
    ids: c.ids,
    classe_prioridade: c.classe_prioridade,
    cor_hex: c.cor_hex,
    fill: c.cor_hex,
    'fill-opacity': c.fill_opacity,
    stroke: c.stroke,
    'stroke-width': c.stroke_width,
    total_ruas: c.ruas.length,
    total_ceps: c.ceps.length,
    origem: c.origem
  },
  geometry: c.geometria
}));

const geojsonCollection = {
  type: 'FeatureCollection',
  name: 'Comunidades_Duque_de_Caxias_SIMAC_2026',
  crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
  features: geojsonFeatures
};

const geojsonPath = path.join(__dirname, '../public/sigem/dados/geojson/comunidades.geojson');
fs.writeFileSync(geojsonPath, JSON.stringify(geojsonCollection, null, 2), 'utf8');
console.log(`✅ public/sigem/dados/geojson/comunidades.geojson gerado com sucesso.`);

// 6. Atualizar SQLite
const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = OFF;');

// Reconstruir tabelas
db.exec(`
DELETE FROM comunidade_ruas;
DELETE FROM comunidade_ceps;
DELETE FROM comunidades;
DELETE FROM complexos;
`);

// Agrupar complexos
const complexosMap = {};
masterList.forEach(c => {
  if (!complexosMap[c.complexo]) {
    complexosMap[c.complexo] = {
      nome: c.complexo_oficial || c.complexo,
      codigo: c.complexo,
      cor_hex: c.cor_hex,
      distrito: c.distrito,
      distrito_id: c.distrito_id,
      total_comunidades: 0,
      total_ruas: 0
    };
  }
  complexosMap[c.complexo].total_comunidades++;
  complexosMap[c.complexo].total_ruas += c.ruas.length;
});

const stmtComplexo = db.prepare(`
  INSERT INTO complexos (nome, cor_hex, distrito, total_comunidades, total_ruas)
  VALUES (?, ?, ?, ?, ?)
`);

Object.values(complexosMap).forEach(cx => {
  stmtComplexo.run(cx.nome, cx.cor_hex, cx.distrito, cx.total_comunidades, cx.total_ruas);
});
console.log(`✅ Tabela complexos atualizada (${Object.keys(complexosMap).length} complexos).`);

// Inserir comunidades, ruas e ceps
const stmtComunidade = db.prepare(`
  INSERT INTO comunidades (id, nome, complexo, cor_hex, distrito, latitude, longitude, ids_social, classe_prioridade, origem_cartografica, total_ruas)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const stmtRua = db.prepare(`
  INSERT INTO comunidade_ruas (comunidade_id, nome_rua)
  VALUES (?, ?)
`);

const stmtCep = db.prepare(`
  INSERT INTO comunidade_ceps (comunidade_id, cep, logradouro, bairro, localidade, uf, ibge, ddd)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

let totalRuasInseridas = 0;
let totalCepsInseridos = 0;

masterList.forEach(c => {
  stmtComunidade.run(
    c.id,
    c.nome,
    c.complexo,
    c.cor_hex,
    c.distrito,
    c.latitude,
    c.longitude,
    c.ids,
    c.classe_prioridade,
    c.origem,
    c.ruas.length
  );

  c.ruas.forEach(r => {
    stmtRua.run(c.id, r);
    totalRuasInseridas++;
  });

  c.ceps.forEach(cepObj => {
    const ofc = cepObj.oficial || {};
    stmtCep.run(
      c.id,
      String(cepObj.cep || ''),
      String(ofc.logradouro || cepObj.logradouro || ''),
      String(ofc.bairro || cepObj.bairro || c.bairro || 'Duque de Caxias'),
      String(ofc.localidade || cepObj.localidade || 'Duque de Caxias'),
      String(ofc.uf || cepObj.uf || 'RJ'),
      String(ofc.ibge || cepObj.ibge || '3301702'),
      String(ofc.ddd || cepObj.ddd || '21')
    );
    totalCepsInseridos++;
  });
});

db.exec('PRAGMA foreign_keys = ON;');
console.log(`✅ SQLite sincronizado com sucesso:`);
console.log(`   - ${masterList.length} comunidades`);
console.log(`   - ${totalRuasInseridas} ruas`);
console.log(`   - ${totalCepsInseridos} ceps`);
console.log('===========================================================');
