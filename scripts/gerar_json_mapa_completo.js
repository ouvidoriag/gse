/**
 * 🗺️ GERADOR DA BASE GEOESPACIAL INTEGRADA — DUQUE DE CAXIAS (RJ)
 * Consolida em um único JSON estruturado para mapas:
 *  1. 466 Equipamentos Públicos Municipais (Saúde, Educação, Assistência Social, Secretarias, FUNDEC, Segurança)
 *  2. 20 Linhas de Ônibus Tarifa Zero (Traçados KML vetoriais completos com geometria GeoJSON LineString)
 *  3. 1.864 Pontos de Parada de Ônibus (Coordenadas, direção e sequência de embarque)
 *  4. Divisão Territorial Municipal (4 Distritos e 118 Bairros Oficiais)
 */

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

// Caminhos dos diretórios
const SQLITE_DB_PATH = path.join(__dirname, '../dados/enderecos_duque_de_caxias_v2.db');
const TZ_BASE_DIR = 'C:/Users/501379.PMDC/Desktop/tzappgeral';
const KML_DIR = path.join(TZ_BASE_DIR, 'CBTMonitoramento/kml-exports');
const STOPS_DIR = path.join(TZ_BASE_DIR, 'CBTMonitoramento/data/stops');

// Destinos de saída
const OUTPUT_TARGETS = [
  path.join(TZ_BASE_DIR, 'dados_mapa_duque_de_caxias.json'),
  path.join(TZ_BASE_DIR, 'TZ-APP/public/dados_mapa_duque_de_caxias.json'),
  path.join(__dirname, '../public/shared/dados_mapa_duque_de_caxias.json')
];

// Mapeamento oficial das 20 Linhas do Tarifa Zero
const LINE_METADATA = {
  'DC-TZ01': { kml: 'DC_598.kml', nome: 'Capivari x Figueira', cor: '#0284c7' },
  'DC-TZ02': { kml: 'DC_555.kml', nome: 'Aviário x Xerém', cor: '#16a34a' },
  'DC-TZ03': { kml: 'DC_532.kml', nome: 'Parque Eldorado x Xerém (via Cantão)', cor: '#ea580c' },
  'DC-TZ04': { kml: 'DC_600.kml', nome: 'Vila Operária x Hosp. Daniel Lipp', cor: '#dc2626' },
  'DC-TZ05': { kml: 'DC_537.kml', nome: 'Vila Maria Helena x Parque Equitativa', cor: '#9333ea' },
  'DC-TZ06': { kml: 'DC_549.kml', nome: 'Jardim Primavera x Bom Retiro', cor: '#0891b2' },
  'DC-TZ07': { kml: 'DC_526.kml', nome: 'Jardim Gramacho x Hosp. Moacyr do Carmo', cor: '#d97706' },
  'DC-TZ08': { kml: 'DC_527.kml', nome: 'Jardim Anhangá x Santa Cruz da Serra', cor: '#4f46e5' },
  'DC-TZ09': { kml: 'DC_550.kml', nome: 'Vila Canaan x Santa Cruz da Serra', cor: '#059669' },
  'DC-TZ10': { kml: 'DC_535.kml', nome: 'Santo Antônio x Xerém', cor: '#db2777' },
  'DC-TZ11': { kml: 'DC_554.kml', nome: 'Xerém x Tinguá', cor: '#ca8a04' },
  'DC-TZ12': { kml: 'DC_539.kml', nome: 'Saracuruna x Jardim Ana Clara', cor: '#2563eb' },
  'DC-TZ13': { kml: 'DC_547.kml', nome: 'Jardim Primavera x Hosp. Adão Pereira Nunes', cor: '#7c3aed' },
  'DC-TZ14': { kml: 'DC_533.kml', nome: 'Saraiva x Jardim Primavera', cor: '#15803d' },
  'DC-TZ15': { kml: 'DC_524.kml', nome: 'Pilar x Cidade dos Meninos', cor: '#c026d3' },
  'DC-TZ16': { kml: 'DC_559.kml', nome: 'Parque das Missões x Hosp. Moacyr do Carmo', cor: '#b91c1c' },
  'DC-TZ17': { kml: 'DC_553.kml', nome: 'Vila do Sase x Garrão', cor: '#0d9488' },
  'DC-TZ18': { kml: 'DC_595.kml', nome: 'Pilar x Cangulo (via Reduc)', cor: '#475569' },
  'DC-TZ19': { kml: 'DC_545.kml', nome: 'Santa Cruz da Serra x Taquara', cor: '#e11d48' },
  'DC-TZ20': { kml: 'DC_577.kml', nome: 'Parque Beira Mar x Estação Duque de Caxias', cor: '#4338ca' }
};

// Estilo visual por categoria
const CATEGORY_STYLES = {
  'Saúde': {
    icone: 'hospital',
    cor: '#e11d48',
    cor_fundo: '#ffe4e6',
    camada: 'saude'
  },
  'Educação': {
    icone: 'school',
    cor: '#2563eb',
    cor_fundo: '#dbeafe',
    camada: 'educacao'
  },
  'Assistência Social': {
    icone: 'heart-handshake',
    cor: '#059669',
    cor_fundo: '#d1fae5',
    camada: 'assistencia_social'
  },
  'Secretarias e Órgãos': {
    icone: 'landmark',
    cor: '#d97706',
    cor_fundo: '#fef3c7',
    camada: 'secretarias'
  },
  'FUNDEC': {
    icone: 'graduation-cap',
    cor: '#7c3aed',
    cor_fundo: '#ede9fe',
    camada: 'fundec'
  },
  'Segurança Pública': {
    icone: 'shield',
    cor: '#475569',
    cor_fundo: '#f1f5f9',
    camada: 'seguranca'
  },
  'Defesa Civil': {
    icone: 'alert-triangle',
    cor: '#ea580c',
    cor_fundo: '#ffedd5',
    camada: 'seguranca'
  }
};

// Fórmula Haversine para cálculo de distância entre pontos
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Extrair coordenadas de um arquivo KML
function parseKmlCoordinates(kmlContent) {
  const match = kmlContent.match(/<coordinates>([\s\S]*?)<\/coordinates>/i);
  if (!match) return { latLngs: [], geoJsonCoords: [], distanceKm: 0 };

  const rawCoords = match[1].trim().split(/\s+/);
  const latLngs = [];
  const geoJsonCoords = [];
  let totalDistance = 0;

  for (let i = 0; i < rawCoords.length; i++) {
    const parts = rawCoords[i].split(',');
    if (parts.length >= 2) {
      const lon = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lon)) {
        latLngs.push([lat, lon]);
        geoJsonCoords.push([lon, lat]);
        if (latLngs.length > 1) {
          const prev = latLngs[latLngs.length - 2];
          totalDistance += haversineKm(prev[0], prev[1], lat, lon);
        }
      }
    }
  }

  return {
    latLngs,
    geoJsonCoords,
    distanceKm: Math.round(totalDistance * 100) / 100
  };
}

async function buildMapData() {
  console.log('================================================================');
  console.log('🗺️  INICIANDO CONSOLIDAÇÃO DA BASE GEOESPACIAL MUNICIPAL');
  console.log('================================================================');

  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
  function updateBounds(lat, lng) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }

  // 1. CARREGAMENTO TERRITORIAL DO SQLITE
  console.log('\n📦 1. Lendo Divisão Territorial do SQLite...');
  const db = new DatabaseSync(SQLITE_DB_PATH);

  const distritosRaw = db.prepare('SELECT id, numero, nome FROM distritos ORDER BY numero ASC').all();
  const bairrosRaw = db.prepare('SELECT id, nome, distrito_id, cep_padrao FROM bairros ORDER BY nome ASC').all();

  const divisaoTerritorial = distritosRaw.map(d => {
    const bairrosDistrito = bairrosRaw
      .filter(b => b.distrito_id === d.id)
      .map(b => b.nome);
    return {
      distrito_numero: d.numero,
      nome_oficial: d.nome,
      total_bairros: bairrosDistrito.length,
      bairros: bairrosDistrito
    };
  });
  console.log(`   ✅ ${divisaoTerritorial.length} distritos e ${bairrosRaw.length} bairros mapeados.`);

  // 2. CARREGAMENTO DOS 466 EQUIPAMENTOS PÚBLICOS
  console.log('\n🏛️  2. Lendo 466 Equipamentos Públicos Calibrados...');
  const equipRaw = db.prepare('SELECT * FROM vw_equipamentos_consolidada ORDER BY id ASC').all();

  const equipamentosPublicos = equipRaw.map(eq => {
    const lat = Number(eq.lat);
    const lng = Number(eq.lon);
    updateBounds(lat, lng);

    let style = CATEGORY_STYLES[eq.categoria] || {
      icone: 'map-pin',
      cor: '#475569',
      cor_fundo: '#f1f5f9',
      camada: 'outros'
    };

    if (eq.nome && eq.nome.toLowerCase().includes('defesa civil')) {
      style = CATEGORY_STYLES['Defesa Civil'];
    }

    return {
      id: String(eq.id),
      nome: eq.nome,
      categoria: eq.categoria,
      secretaria_responsavel: eq.secretaria_nome || 'Prefeitura Municipal',
      distrito: Number(eq.distrito) || 1,
      distrito_oficial: eq.distrito_oficial || `Distrito ${eq.distrito}`,
      bairro: eq.bairro || eq.bairro_oficial || 'Centro',
      endereco_formatado: eq.endereco || `${eq.logradouro || ''}, ${eq.numero || 'S/N'}`,
      logradouro: eq.logradouro || '',
      numero: eq.numero || 'S/N',
      cep: eq.cep || '',
      telefone: eq.telefone || null,
      email: eq.email || null,
      horario_funcionamento: eq.horario_funcionamento || 'Horário de expediente comercial',
      precisao_geografica: eq.precisao_gps || 'CALIBRADA',
      coordenadas: [lat, lng],
      estilo_visual: {
        icone: style.icone,
        cor_primaria: style.cor,
        cor_fundo: style.cor_fundo,
        camada_id: style.camada
      },
      geojson: {
        type: 'Feature',
        properties: {
          id: eq.id,
          nome: eq.nome,
          categoria: eq.categoria,
          bairro: eq.bairro || eq.bairro_oficial,
          distrito: eq.distrito,
          telefone: eq.telefone
        },
        geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        }
      }
    };
  });
  console.log(`   ✅ ${equipamentosPublicos.length} equipamentos públicos formatados.`);

  // 3. CARREGAMENTO DAS 20 ROTAS KML DO TARIFA ZERO
  console.log('\n🚌 3. Processando 20 Traçados KML das Linhas de Ônibus...');
  const linhasTarifaZero = [];

  for (const [linhaId, meta] of Object.entries(LINE_METADATA)) {
    const kmlPath = path.join(KML_DIR, meta.kml);
    let trajetoLatLng = [];
    let geoJsonCoords = [];
    let distanceKm = 0;

    if (fs.existsSync(kmlPath)) {
      const kmlContent = fs.readFileSync(kmlPath, 'utf8');
      const parsed = parseKmlCoordinates(kmlContent);
      trajetoLatLng = parsed.latLngs;
      geoJsonCoords = parsed.geoJsonCoords;
      distanceKm = parsed.distanceKm;

      trajetoLatLng.forEach(pt => updateBounds(pt[0], pt[1]));
    } else {
      console.warn(`   ⚠️ Arquivo KML não encontrado: ${meta.kml}`);
    }

    const [origem, destino] = meta.nome.split(/\s+x\s+/);

    linhasTarifaZero.push({
      linha_id: linhaId,
      nome_linha: meta.nome,
      origem: (origem || '').trim(),
      destino: (destino || '').trim(),
      arquivo_kml: meta.kml,
      cor_identificacao: meta.cor,
      total_pontos_gps: trajetoLatLng.length,
      extensao_estimada_km: distanceKm,
      trajeto_lat_lng: trajetoLatLng,
      geojson: {
        type: 'Feature',
        properties: {
          linha_id: linhaId,
          nome: meta.nome,
          cor: meta.cor,
          extensao_km: distanceKm,
          pontos: trajetoLatLng.length
        },
        geometry: {
          type: 'LineString',
          coordinates: geoJsonCoords
        }
      }
    });
  }
  console.log(`   ✅ ${linhasTarifaZero.length} linhas do Tarifa Zero processadas com geometria LineString.`);

  // 4. CARREGAMENTO DOS PONTOS DE PARADA
  console.log('\n🚏 4. Carregando Pontos de Parada de Ônibus...');
  const paradasPorLinha = {};
  let totalStopsCount = 0;

  for (const linhaId of Object.keys(LINE_METADATA)) {
    const stopFile = path.join(STOPS_DIR, `${linhaId.replace('-', '_')}.json`);
    if (fs.existsSync(stopFile)) {
      try {
        const rawStops = JSON.parse(fs.readFileSync(stopFile, 'utf8'));
        paradasPorLinha[linhaId] = rawStops.map((s, idx) => {
          const lat = Number(s.Latitude);
          const lng = Number(s.Longitude);
          updateBounds(lat, lng);
          totalStopsCount++;

          return {
            id: `stop_${linhaId}_${idx + 1}`,
            linha_id: linhaId,
            nome_ponto: (s.PointName || `Parada ${idx + 1}`).trim(),
            direcao: s.Direction || 'ida',
            sequencia: idx + 1,
            coordenadas: [lat, lng],
            geojson: {
              type: 'Feature',
              properties: {
                linha_id: linhaId,
                nome: (s.PointName || `Parada ${idx + 1}`).trim(),
                direcao: s.Direction || 'ida',
                sequencia: idx + 1
              },
              geometry: {
                type: 'Point',
                coordinates: [lng, lat]
              }
            }
          };
        });
      } catch (err) {
        console.warn(`   ⚠️ Erro ao ler paradas de ${linhaId}:`, err.message);
        paradasPorLinha[linhaId] = [];
      }
    } else {
      paradasPorLinha[linhaId] = [];
    }
  }
  console.log(`   ✅ ${totalStopsCount} pontos de parada catalogados.`);

  // 5. ESTRUTURA FINAL CONSOLIDADA DO JSON
  const mapaConsolidado = {
    metadata: {
      titulo: 'Base Geoespacial e Territorial Integrada — Duque de Caxias',
      subtitulo: 'Equipamentos Públicos Municipais e Malha Viária do Programa Tarifa Zero',
      municipio: 'Duque de Caxias',
      estado: 'RJ',
      codigo_ibge: '3301702',
      versao: '2.5.0',
      gerado_em: new Date().toISOString(),
      centro_mapa: {
        latitude: -22.7858,
        longitude: -43.3077,
        zoom_padrao: 12
      },
      bounding_box: {
        min_latitude: Math.round(minLat * 1000000) / 1000000,
        max_latitude: Math.round(maxLat * 1000000) / 1000000,
        min_longitude: Math.round(minLng * 1000000) / 1000000,
        max_longitude: Math.round(maxLng * 1000000) / 1000000
      },
      totais: {
        equipamentos_publicos: equipamentosPublicos.length,
        linhas_onibus_tarifa_zero: linhasTarifaZero.length,
        pontos_de_parada: totalStopsCount,
        distritos: divisaoTerritorial.length,
        bairros: bairrosRaw.length
      }
    },
    camadas_mapa: {
      categorias_equipamentos: [
        { id: 'saude', nome: 'Saúde (Hospitais, UPAs, USF, CAPS)', cor: '#e11d48', icone: 'hospital', total: 95 },
        { id: 'educacao', nome: 'Educação (Escolas e Creches SMEDC)', cor: '#2563eb', icone: 'school', total: 209 },
        { id: 'assistencia_social', nome: 'Assistência Social (CRAS, CREAS)', cor: '#059669', icone: 'heart-handshake', total: 47 },
        { id: 'secretarias', nome: 'Secretarias e Órgãos Centrais', cor: '#d97706', icone: 'landmark', total: 33 },
        { id: 'fundec', nome: 'FUNDEC (Ensino Técnico e Polos)', cor: '#7c3aed', icone: 'graduation-cap', total: 35 },
        { id: 'seguranca', nome: 'Segurança Pública e Defesa Civil', cor: '#475569', icone: 'shield', total: 47 }
      ],
      linhas_onibus: linhasTarifaZero.map(l => ({
        linha_id: l.linha_id,
        nome: l.nome_linha,
        cor: l.cor_identificacao,
        extensao_km: l.extensao_estimada_km,
        total_paradas: (paradasPorLinha[l.linha_id] || []).length
      }))
    },
    divisao_territorial: divisaoTerritorial,
    linhas_tarifa_zero: linhasTarifaZero,
    paradas_onibus: paradasPorLinha,
    equipamentos_publicos: equipamentosPublicos
  };

  // 6. GERAÇÃO DOS ARQUIVOS GEOJSON ESPECÍFICOS PARA O SIGEM
  const sigemGeojsonDir = path.join(__dirname, '../public/sigem/dados/geojson');
  if (!fs.existsSync(sigemGeojsonDir)) {
    fs.mkdirSync(sigemGeojsonDir, { recursive: true });
  }

  // FeatureCollection das 20 Linhas
  const rotasGeojson = {
    type: 'FeatureCollection',
    features: linhasTarifaZero.map(l => l.geojson)
  };
  const rotasPath = path.join(sigemGeojsonDir, 'rotas_onibus_tarifa_zero.geojson');
  fs.writeFileSync(rotasPath, JSON.stringify(rotasGeojson, null, 2), 'utf8');
  console.log(`   📄 Salvo GeoJSON de Rotas: ${rotasPath}`);

  // FeatureCollection de todas as Paradas
  const paradasFeatures = [];
  for (const stops of Object.values(paradasPorLinha)) {
    for (const s of stops) {
      paradasFeatures.push(s.geojson);
    }
  }
  const paradasGeojson = {
    type: 'FeatureCollection',
    features: paradasFeatures
  };
  const paradasPath = path.join(sigemGeojsonDir, 'paradas_onibus_tarifa_zero.geojson');
  fs.writeFileSync(paradasPath, JSON.stringify(paradasGeojson, null, 2), 'utf8');
  console.log(`   📄 Salvo GeoJSON de Paradas: ${paradasPath}`);

  // 7. GRAVAÇÃO DOS ARQUIVOS DE SAÍDA
  console.log('\n💾 5. Gravando JSON Geoespacial nos Destinos...');
  const jsonContent = JSON.stringify(mapaConsolidado, null, 2);
  const sizeMb = (Buffer.byteLength(jsonContent, 'utf8') / (1024 * 1024)).toFixed(2);

  for (const targetPath of OUTPUT_TARGETS) {
    const parentDir = path.dirname(targetPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(targetPath, jsonContent, 'utf8');
    console.log(`   📄 Salvo: ${targetPath} (${sizeMb} MB)`);
  }

  console.log('\n================================================================');
  console.log('🏁 CONSOLIDAÇÃO CONCLUÍDA COM SUCESSO!');
  console.log(`📊 Total Equipamentos : ${mapaConsolidado.metadata.totais.equipamentos_publicos}`);
  console.log(`🚌 Total Linhas Ônibus: ${mapaConsolidado.metadata.totais.linhas_onibus_tarifa_zero}`);
  console.log(`🚏 Total Paradas Ônibus: ${mapaConsolidado.metadata.totais.pontos_de_parada}`);
  console.log(`📍 Bounding Box       : [${mapaConsolidado.metadata.bounding_box.min_latitude}, ${mapaConsolidado.metadata.bounding_box.min_longitude}] a [${mapaConsolidado.metadata.bounding_box.max_latitude}, ${mapaConsolidado.metadata.bounding_box.max_longitude}]`);
  console.log('================================================================\n');

  return mapaConsolidado;
}

buildMapData().catch(err => {
  console.error('❌ Falha na geração do JSON:', err);
  process.exit(1);
});
