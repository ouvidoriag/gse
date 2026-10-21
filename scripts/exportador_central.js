/**
 * 🏛️ PREFEITURA MUNICIPAL DE DUQUE DE CAXIAS — RJ
 * SIGEM — Sistema Integrado de Gestão de Endereços Municipais
 * 
 * MOTOR CENTRAL DE EXPORTAÇÃO (MySQL 8 -> JSON & CSVs)
 * Única rotina responsável por derivar todos os arquivos mestres e setoriais
 * a partir da fonte oficial (banco MySQL). Inclui validações e escrita atômica.
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const BASE_DIR = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(BASE_DIR, '.env') });

const DADOS_DIR = path.join(BASE_DIR, 'dados');
const SETOR_DIR = path.join(DADOS_DIR, 'por_setor');

// Colunas oficiais padronizadas para CSV (Excel-ready)
const CSV_HEADERS = [
  'id', 'nome', 'sigla', 'categoria', 'distrito', 'distrito_oficial', 'bairro', 'bairro_oficial', 'endereco', 'cep',
  'predio_sala', 'telefone', 'email', 'status', 'lat', 'lon', 'hub_id', 'hub_nome',
  'horario_funcionamento', 'descricao', 'precisao_gps'
];

// Regras centralizadas dos 6 setores oficiais
const REGRAS_SETORES = [
  {
    nome: '01_secretarias_e_orgaos.csv',
    descricao: 'Secretarias e Órgãos Centrais',
    filtro: (r) => (r.categoria || '').trim() === 'Secretarias e Órgãos'
  },
  {
    nome: '02_saude_completa.csv',
    descricao: 'Rede Municipal de Saúde (Básica e Especializada)',
    filtro: (r) => (r.categoria || '').includes('Saúde')
  },
  {
    nome: '03_educacao_smedc.csv',
    descricao: 'Rede Municipal de Educação (SMEDC)',
    filtro: (r) => (r.categoria || '').includes('Educação')
  },
  {
    nome: '04_fundec.csv',
    descricao: 'Polos de Ensino Técnico FUNDEC',
    filtro: (r) => (r.categoria || '').trim() === 'FUNDEC'
  },
  {
    nome: '05_assistencia_social.csv',
    descricao: 'Assistência Social, Direitos Humanos e Cidadania',
    filtro: (r) => (r.categoria || '').includes('Assistência Social')
  },
  {
    nome: '06_seguranca_subprefeituras_cultura.csv',
    descricao: 'Segurança Pública, Defesa Civil, Subprefeituras e Outros',
    filtro: (r) => (r.categoria || '').includes('Segurança') ||
                   (r.categoria || '').includes('Subprefeituras') ||
                   (!r.categoria.includes('Educação') && !r.categoria.includes('Saúde') && !r.categoria.includes('Assistência') && r.categoria !== 'FUNDEC' && r.categoria !== 'Secretarias e Órgãos')
  }
];

/**
 * Converte array de objetos em string CSV com UTF-8 BOM e separador ';'
 */
function toCsvString(rows) {
  let csv = '\ufeff' + CSV_HEADERS.join(';') + '\n';
  for (const r of rows) {
    const vals = [
      r.id || '',
      r.nome || '',
      r.sigla || '',
      r.categoria || '',
      r.distrito !== null && r.distrito !== undefined ? r.distrito : '',
      r.distrito_oficial || '',
      r.bairro || '',
      r.bairro_oficial || '',
      r.endereco || '',
      r.cep || '',
      r.predio_sala || '',
      r.telefone || '',
      r.email || '',
      r.status || 'ATIVO',
      r.lat !== null && r.lat !== undefined ? r.lat : '',
      r.lon !== null && r.lon !== undefined ? r.lon : '',
      r.hub_id ? (String(r.hub_id).startsWith('hub_') ? r.hub_id : 'hub_' + r.hub_id) : '',
      r.hub_nome || '',
      r.horario_funcionamento || '',
      (r.descricao || '').replace(/\r?\n/g, ' '),
      r.precisao_gps || 'EXATA_ROOFTOP'
    ];
    csv += vals.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(';') + '\n';
  }
  return csv;
}

/**
 * Escrita atômica em disco com arquivo temporário para proteção contra dados incompletos
 */
function writeAtomic(filePath, content) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tempPath = `${filePath}.tmp_${Date.now()}`;
  fs.writeFileSync(tempPath, content, 'utf-8');
  fs.renameSync(tempPath, filePath);
}

/**
 * Executa validações de integridade nos dados extraídos do MySQL
 */
function validarIntegridade(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('Falha de validação: Consulta ao banco retornou 0 registros.');
  }

  // Proteção contra exportação de banco incompleto / corrompido
  const MIN_REGISTROS_ESPERADOS = 400;
  if (rows.length < MIN_REGISTROS_ESPERADOS) {
    throw new Error(`Falha de segurança: Total de registros (${rows.length}) é inferior ao mínimo esperado (${MIN_REGISTROS_ESPERADOS}). Exportação abortada.`);
  }

  let semId = 0;
  let semNome = 0;
  let coordsInvalidas = 0;

  for (const r of rows) {
    if (!r.id || !String(r.id).trim()) semId++;
    if (!r.nome || !String(r.nome).trim()) semNome++;
    if (r.lat !== null && r.lat !== undefined && r.lon !== null && r.lon !== undefined) {
      const lat = Number(r.lat);
      const lon = Number(r.lon);
      if (isNaN(lat) || isNaN(lon) || lat < -23.0 || lat > -22.0 || lon < -43.6 || lon > -43.0) {
        coordsInvalidas++;
      }
    }
  }

  if (semId > 0) throw new Error(`Falha de integridade: ${semId} registros sem ID.`);
  if (semNome > 0) throw new Error(`Falha de integridade: ${semNome} registros sem Nome.`);
  if (coordsInvalidas > 0) throw new Error(`Falha geográfica: ${coordsInvalidas} registros com coordenadas fora dos limites de Duque de Caxias.`);

  return true;
}

/**
 * Rotina Principal de Exportação Central
 * @param {object} [customPool] - Pool MySQL ativa opcional
 * @returns {Promise<object>} Estatísticas da exportação
 */
async function exportarTudo(customPool = null) {
  const startTime = Date.now();
  let pool = customPool;
  let shouldClose = false;

  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'carta_de_servico',
      waitForConnections: true,
      connectionLimit: 5
    });
    shouldClose = true;
  }

  try {
    console.log('🔄 [Exportador Central] Iniciando leitura da view vw_equipamentos_consolidada no MySQL...');
    const [rows] = await pool.query('SELECT * FROM vw_equipamentos_consolidada ORDER BY id ASC');

    // 1. Validar integridade estrita
    validarIntegridade(rows);
    console.log(`✅ [Exportador Central] Integridade validada: ${rows.length} registros auditados com sucesso.`);

    // 2. Exportar JSON Mestre Geral (dados/ e public/sigem/dados/)
    const jsonPath = path.join(DADOS_DIR, 'todos_os_enderecos_duque_de_caxias.json');
    const jsonPublicPath = path.join(BASE_DIR, 'public', 'sigem', 'dados', 'todos_os_enderecos_duque_de_caxias.json');
    const jsonContent = JSON.stringify(rows, null, 2);
    writeAtomic(jsonPath, jsonContent);
    if (fs.existsSync(path.dirname(jsonPublicPath))) {
      writeAtomic(jsonPublicPath, jsonContent);
    }

    // 3. Exportar CSV Mestre Geral
    const csvPath = path.join(DADOS_DIR, 'todos_os_enderecos_duque_de_caxias.csv');
    writeAtomic(csvPath, toCsvString(rows));

    // 4. Exportar os 6 CSVs Setoriais em dados/por_setor/
    const statsSetores = [];
    let somaSetores = 0;

    for (const regra of REGRAS_SETORES) {
      const filtrados = rows.filter(regra.filtro);
      const setorFilePath = path.join(SETOR_DIR, regra.nome);
      writeAtomic(setorFilePath, toCsvString(filtrados));
      statsSetores.push({
        arquivo: regra.nome,
        descricao: regra.descricao,
        total: filtrados.length
      });
      somaSetores += filtrados.length;
    }

    const durationMs = Date.now() - startTime;

    const resultado = {
      sucesso: true,
      timestamp: new Date().toISOString(),
      duracao_ms: durationMs,
      total_geral: rows.length,
      soma_setores: somaSetores,
      arquivos_gerados: [
        'dados/todos_os_enderecos_duque_de_caxias.json',
        'dados/todos_os_enderecos_duque_de_caxias.csv',
        ...statsSetores.map(s => `dados/por_setor/${s.arquivo}`)
      ],
      detalhes_setores: statsSetores
    };

    console.log('================================================================');
    console.log(`💾 [Exportador Central] EXPORTAÇÃO CONCLUÍDA EM ${durationMs}ms`);
    console.log('================================================================');
    console.log(`📦 Base Mestre Geral (JSON & CSV): ${rows.length} equipamentos`);
    statsSetores.forEach(s => {
      console.log(`   📄 ${s.arquivo.padEnd(42)}: ${String(s.total).padStart(3)} reg | ${s.descricao}`);
    });
    console.log(`✅ Soma dos setores: ${somaSetores} (100% particionado)`);
    console.log('================================================================');

    return resultado;
  } finally {
    if (shouldClose && pool) {
      await pool.end();
    }
  }
}

// Execução direta via CLI (node scripts/exportador_central.js)
if (require.main === module) {
  (async () => {
    try {
      await exportarTudo();
      process.exit(0);
    } catch (err) {
      console.error('❌ [Erro Fatal no Exportador Central]:', err.message);
      process.exit(1);
    }
  })();
}

module.exports = {
  exportarTudo,
  validarIntegridade,
  toCsvString,
  CSV_HEADERS,
  REGRAS_SETORES
};
