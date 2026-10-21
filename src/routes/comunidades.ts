import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { mysqlPool } from '../database/mysql';

export const comunidadesRouter = Router();

const geojsonPath = path.join(__dirname, '..', '..', 'public', 'sigem', 'dados', 'geojson', 'comunidades.geojson');
const masterPath = path.join(__dirname, '..', '..', 'dados', 'comunidades_master.json');

let cachedGeojson: any = null;
let cachedMaster: any[] | null = null;

function ensureDataLoaded() {
  if (!cachedGeojson && fs.existsSync(geojsonPath)) {
    try {
      cachedGeojson = JSON.parse(fs.readFileSync(geojsonPath, 'utf-8'));
    } catch (err: any) {
      console.error('❌ [comunidadesRouter] Erro ao carregar comunidades.geojson:', err.message);
    }
  }

  if (!cachedMaster && fs.existsSync(masterPath)) {
    try {
      cachedMaster = JSON.parse(fs.readFileSync(masterPath, 'utf-8'));
    } catch (err: any) {
      console.error('❌ [comunidadesRouter] Erro ao carregar comunidades_master.json:', err.message);
    }
  }
}

/**
 * Algoritmo Ray-Casting para teste de Ponto em Polígono (Point-in-Polygon)
 */
function isPointInPolygon(point: [number, number], polygon: number[][][]): boolean {
  const [lng, lat] = point;
  let inside = false;

  for (const ring of polygon) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1];
      const xj = ring[j][0], yj = ring[j][1];

      const intersect = ((yi > lat) !== (yj > lat)) &&
        (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
  }

  return inside;
}

/**
 * GET /api/comunidades/resumo
 * Indicadores gerais do módulo de comunidades
 */
comunidadesRouter.get('/resumo', async (_req: Request, res: Response) => {
  try {
    const [comRow]: any = await mysqlPool.query('SELECT COUNT(*) as c FROM comunidades');
    const [compRow]: any = await mysqlPool.query('SELECT COUNT(*) as c FROM complexos');
    const [ruasRow]: any = await mysqlPool.query('SELECT COUNT(*) as c FROM comunidade_ruas');
    const [cepsRow]: any = await mysqlPool.query('SELECT COUNT(*) as c FROM comunidade_ceps');

    const totalCom = comRow[0]?.c || 0;
    const totalComp = compRow[0]?.c || 0;
    const totalRuas = ruasRow[0]?.c || 0;
    const totalCeps = cepsRow[0]?.c || 0;

    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json({
      success: true,
      municipio: 'Duque de Caxias - RJ',
      fonte: 'SIMAC / OGM PMDC / IBGE 2022',
      dados: {
        total_comunidades: totalCom,
        total_complexos: totalComp,
        total_ruas_mapeadas: totalRuas,
        total_ceps_vinculados: totalCeps,
      },
      atualizado_em: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Erro ao obter resumo: ' + err.message });
  }
});

/**
 * GET /api/comunidades/complexos
 * Lista os 10 grandes complexos e suas características
 */
comunidadesRouter.get('/complexos', async (_req: Request, res: Response) => {
  try {
    const [rows]: any = await mysqlPool.query(`
      SELECT id, nome, cor_hex, distrito, total_comunidades, total_ruas
      FROM complexos
      ORDER BY total_comunidades DESC, nome ASC
    `);

    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json({ success: true, total: (rows || []).length, data: rows || [] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Erro ao listar complexos: ' + err.message });
  }
});

/**
 * GET /api/comunidades/geojson
 * Exporta o GeoJSON completo com os 102 polígonos estilizados
 */
comunidadesRouter.get('/geojson', (_req: Request, res: Response) => {
  ensureDataLoaded();
  if (!cachedGeojson) {
    return res.status(503).json({ success: false, error: 'GeoJSON de comunidades indisponível' });
  }

  res.setHeader('Content-Type', 'application/geo+json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=600');
  res.send(cachedGeojson);
});

/**
 * GET /api/comunidades/limite-municipal
 * Exporta o limite/contorno territorial oficial de Duque de Caxias
 */
const limiteCaxiasPath = path.join(__dirname, '..', '..', 'public', 'sigem', 'dados', 'geojson', 'Duque_de_Caxias.geojson');
let cachedLimiteCaxias: any = null;

comunidadesRouter.get('/limite-municipal', (_req: Request, res: Response) => {
  if (!cachedLimiteCaxias && fs.existsSync(limiteCaxiasPath)) {
    try {
      cachedLimiteCaxias = JSON.parse(fs.readFileSync(limiteCaxiasPath, 'utf-8'));
    } catch (e: any) {
      console.error('Erro ao ler Duque_de_Caxias.geojson:', e.message);
    }
  }

  if (!cachedLimiteCaxias) {
    return res.status(404).json({ success: false, error: 'Limite municipal não localizado' });
  }

  res.setHeader('Content-Type', 'application/geo+json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(cachedLimiteCaxias);
});

/**
 * GET /api/comunidades/cep-lookup/:cep
 * Consulta rápida de CEP local
 */
const cepLookupFile = path.join(__dirname, '..', '..', 'dados', 'cep_lookup.json');
let cachedCepLookup: Record<string, any> | null = null;

comunidadesRouter.get('/cep-lookup/:cep', (req: Request, res: Response) => {
  if (!cachedCepLookup && fs.existsSync(cepLookupFile)) {
    try {
      cachedCepLookup = JSON.parse(fs.readFileSync(cepLookupFile, 'utf-8'));
    } catch (e: any) {
      console.error('Erro ao ler cep_lookup.json:', e.message);
    }
  }

  const cleanCep = String(req.params.cep || '').replace(/\D/g, '');
  if (!cachedCepLookup || !cachedCepLookup[cleanCep]) {
    return res.status(404).json({ success: false, error: 'CEP não encontrado no cadastro local' });
  }

  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.json({ success: true, cep: cleanCep, dados: cachedCepLookup[cleanCep] });
});

/**
 * GET /api/comunidades/ponto
 * Descobre em qual comunidade e complexo uma coordenada geográfica (lat, lon) está inserida
 */
comunidadesRouter.get('/ponto', (req: Request, res: Response) => {
  ensureDataLoaded();
  if (!cachedMaster) {
    return res.status(503).json({ success: false, error: 'Base mestre de geometrias indisponível' });
  }

  const lat = parseFloat(String(req.query.lat || req.query.latitude));
  const lon = parseFloat(String(req.query.lon || req.query.lng || req.query.longitude));

  if (isNaN(lat) || isNaN(lon)) {
    return res.status(400).json({ success: false, error: 'Parâmetros de latitude (lat) e longitude (lon) são obrigatórios.' });
  }

  const point: [number, number] = [lon, lat];
  let encontrada: any = null;

  for (const c of cachedMaster) {
    const geom = c.geometria;
    if (!geom) continue;

    if (geom.type === 'Polygon') {
      if (isPointInPolygon(point, geom.coordinates)) {
        encontrada = c;
        break;
      }
    } else if (geom.type === 'MultiPolygon') {
      for (const poly of geom.coordinates) {
        if (isPointInPolygon(point, poly)) {
          encontrada = c;
          break;
        }
      }
      if (encontrada) break;
    }
  }

  if (!encontrada) {
    return res.status(404).json({
      success: false,
      mensagem: 'O ponto informado não está situado no interior de nenhuma das 102 comunidades cadastradas.',
      coordenadas: { lat, lon }
    });
  }

  res.json({
    success: true,
    data: {
      id: encontrada.id,
      nome: encontrada.nome,
      complexo: encontrada.complexo,
      cor_hex: encontrada.cor_hex,
      distrito: encontrada.distrito,
      ids_social: encontrada.ids_social,
      classe_prioridade: encontrada.classe_prioridade,
      total_ruas: encontrada.total_ruas,
      coordenadas: { lat, lon }
    }
  });
});

/**
 * GET /api/comunidades
 * Lista todas as comunidades com filtros e paginação
 */
comunidadesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(150, Math.max(1, parseInt(String(req.query.limit || '50'), 10)));
    const offset = (page - 1) * limit;

    const { q, complexo, distrito, prioridade } = req.query;

    let whereSql = 'WHERE 1=1';
    const params: any[] = [];

    if (q) {
      whereSql += ' AND (nome LIKE ? OR complexo LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }

    if (complexo) {
      whereSql += ' AND complexo = ?';
      params.push(String(complexo));
    }

    if (distrito) {
      whereSql += ' AND distrito LIKE ?';
      params.push(`%${distrito}%`);
    }

    if (prioridade) {
      whereSql += ' AND classe_prioridade LIKE ?';
      params.push(`%${prioridade}%`);
    }

    const [countRows]: any = await mysqlPool.query(`SELECT COUNT(*) as total FROM comunidades ${whereSql}`, params);
    const total = countRows[0]?.total || 0;

    const [rows]: any = await mysqlPool.query(`
      SELECT 
        id, nome, complexo, cor_hex, distrito, latitude, longitude,
        ids_social, classe_prioridade, origem_cartografica, total_ruas
      FROM comunidades
      ${whereSql}
      ORDER BY complexo ASC, nome ASC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    res.setHeader('Cache-Control', 'public, max-age=120');
    res.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: rows
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Erro ao listar comunidades: ' + err.message });
  }
});

/**
 * GET /api/comunidades/:id
 * Detalhes da comunidade com ruas e CEPs vinculados
 */
comunidadesRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (!id || isNaN(id)) {
      return res.status(400).json({ success: false, error: 'ID inválido' });
    }

    const [rows]: any = await mysqlPool.query('SELECT * FROM comunidades WHERE id = ?', [id]);
    const row = rows[0];
    if (!row) {
      return res.status(404).json({ success: false, error: 'Comunidade não encontrada' });
    }

    const [ruasRows]: any = await mysqlPool.query('SELECT nome_rua FROM comunidade_ruas WHERE comunidade_id = ? ORDER BY nome_rua ASC', [id]);
    const ruas = (ruasRows || []).map((r: any) => r.nome_rua);
    const [ceps]: any = await mysqlPool.query('SELECT cep, logradouro, bairro, localidade, uf, ibge, ddd FROM comunidade_ceps WHERE comunidade_id = ?', [id]);

    // Buscar equipamentos públicos no raio aproximado (se houver coordenadas)
    let equipamentosProximos: any[] = [];
    if (row.latitude && row.longitude) {
      const [eqRows]: any = await mysqlPool.query(`
        SELECT id, nome, categoria, logradouro, numero, bairro, lat, lon
        FROM vw_equipamentos_consolidada
        WHERE lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?
        LIMIT 5
      `, [
        Number(row.latitude) - 0.015,
        Number(row.latitude) + 0.015,
        Number(row.longitude) - 0.015,
        Number(row.longitude) + 0.015
      ]);
      equipamentosProximos = eqRows || [];
    }

    res.setHeader('Cache-Control', 'public, max-age=120');
    res.json({
      success: true,
      data: {
        ...row,
        ruas,
        ceps: ceps || [],
        equipamentos_proximos: equipamentosProximos
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Erro ao detalhar comunidade: ' + err.message });
  }
});

/**
 * GET /api/comunidades/:id/ruas
 * Lista paginada das ruas de uma comunidade
 */
comunidadesRouter.get('/:id/ruas', async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { q, page, limit } = req.query;

    const pNum = Math.max(1, parseInt(String(page || '1'), 10));
    const lNum = Math.min(200, Math.max(1, parseInt(String(limit || '50'), 10)));
    const offset = (pNum - 1) * lNum;

    let whereSql = 'WHERE comunidade_id = ?';
    const params: any[] = [id];

    if (q) {
      whereSql += ' AND nome_rua LIKE ?';
      params.push(`%${q}%`);
    }

    const [countRows]: any = await mysqlPool.query(`SELECT COUNT(*) as total FROM comunidade_ruas ${whereSql}`, params);
    const total = countRows[0]?.total || 0;

    const [rows]: any = await mysqlPool.query(`
      SELECT id, nome_rua
      FROM comunidade_ruas
      ${whereSql}
      ORDER BY nome_rua ASC
      LIMIT ? OFFSET ?
    `, [...params, lNum, offset]);

    res.setHeader('Cache-Control', 'public, max-age=180');
    res.json({
      success: true,
      total,
      page: pNum,
      limit: lNum,
      totalPages: Math.ceil(total / lNum),
      data: rows || []
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Erro ao listar ruas: ' + err.message });
  }
});

export default comunidadesRouter;
