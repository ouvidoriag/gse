import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

export const onibusRouter = Router();

const rotasPath = path.join(__dirname, '..', '..', 'public', 'sigem', 'dados', 'geojson', 'rotas_onibus_tarifa_zero.geojson');
const paradasPath = path.join(__dirname, '..', '..', 'public', 'sigem', 'dados', 'geojson', 'paradas_onibus_tarifa_zero.geojson');

let cachedRotas: any = null;
let cachedParadas: any = null;
let paradasPorLinha: Map<string, any[]> = new Map();

function ensureDataLoaded() {
  if (!cachedRotas && fs.existsSync(rotasPath)) {
    try {
      cachedRotas = JSON.parse(fs.readFileSync(rotasPath, 'utf-8'));
    } catch (err: any) {
      console.error('❌ [onibusRouter] Erro ao ler rotas_onibus_tarifa_zero.geojson:', err.message);
    }
  }

  if (!cachedParadas && fs.existsSync(paradasPath)) {
    try {
      cachedParadas = JSON.parse(fs.readFileSync(paradasPath, 'utf-8'));
      paradasPorLinha.clear();

      if (cachedParadas?.features) {
        for (const feat of cachedParadas.features) {
          const lId = (feat.properties?.linha_id || '').toUpperCase();
          if (!paradasPorLinha.has(lId)) {
            paradasPorLinha.set(lId, []);
          }
          paradasPorLinha.get(lId)!.push({
            sequencia: feat.properties?.sequencia,
            nome: feat.properties?.nome,
            direcao: feat.properties?.direcao,
            longitude: feat.geometry?.coordinates?.[0],
            latitude: feat.geometry?.coordinates?.[1],
            coordinates: feat.geometry?.coordinates,
          });
        }
      }
    } catch (err: any) {
      console.error('❌ [onibusRouter] Erro ao ler paradas_onibus_tarifa_zero.geojson:', err.message);
    }
  }
}

/**
 * GET /api/onibus/resumo
 * Resumo global do transporte Tarifa Zero
 */
onibusRouter.get('/resumo', (_req: Request, res: Response) => {
  ensureDataLoaded();

  const totalLinhas = cachedRotas?.features?.length || 0;
  const totalParadas = cachedParadas?.features?.length || 0;
  let kmTotal = 0;

  if (cachedRotas?.features) {
    for (const f of cachedRotas.features) {
      kmTotal += Number(f.properties?.extensao_km || 0);
    }
  }

  res.setHeader('Cache-Control', 'public, max-age=300');
  res.json({
    success: true,
    municipio: 'Duque de Caxias - RJ',
    programa: 'Tarifa Zero Municipal',
    total_linhas: totalLinhas,
    total_paradas: totalParadas,
    extensao_total_km: Number(kmTotal.toFixed(2)),
    gratuito: true,
    data_atualizacao: new Date().toISOString(),
  });
});

/**
 * GET /api/onibus/linhas
 * Lista todas as 20 linhas de ônibus com informações de itinerário
 */
onibusRouter.get('/linhas', (req: Request, res: Response) => {
  ensureDataLoaded();

  if (!cachedRotas?.features) {
    return res.status(503).json({ success: false, error: 'Dados das linhas de ônibus indisponíveis.' });
  }

  const { q } = req.query;
  const busca = q ? String(q).toLowerCase().trim() : '';

  let linhas = cachedRotas.features.map((feat: any) => {
    const p = feat.properties || {};
    const lId = (p.linha_id || '').toUpperCase();
    const paradasDaLinha = paradasPorLinha.get(lId) || [];

    return {
      linha_id: p.linha_id,
      nome: p.nome,
      cor: p.cor || '#2563eb',
      extensao_km: p.extensao_km || 0,
      total_pontos_geograficos: p.pontos || 0,
      total_paradas: paradasDaLinha.length,
      primeira_parada: paradasDaLinha[0]?.nome || null,
      ultima_parada: paradasDaLinha[paradasDaLinha.length - 1]?.nome || null,
    };
  });

  if (busca) {
    linhas = linhas.filter(
      (l: any) =>
        l.linha_id.toLowerCase().includes(busca) ||
        l.nome.toLowerCase().includes(busca)
    );
  }

  linhas.sort((a: any, b: any) => a.linha_id.localeCompare(b.linha_id));

  res.setHeader('Cache-Control', 'public, max-age=180');
  res.json({
    success: true,
    total: linhas.length,
    data: linhas,
  });
});

/**
 * GET /api/onibus/linhas/:id
 * Detalhes de uma linha específica com traçado e lista de paradas
 */
onibusRouter.get('/linhas/:id', (req: Request, res: Response) => {
  ensureDataLoaded();

  const idParam = String(req.params.id || '').toUpperCase().trim();
  const feat = cachedRotas?.features?.find((f: any) => {
    const lid = (f.properties?.linha_id || '').toUpperCase().trim();
    return lid === idParam || lid.replace('DC-', '') === idParam.replace('DC-', '');
  });

  if (!feat) {
    return res.status(404).json({ success: false, error: `Linha '${req.params.id}' não encontrada.` });
  }

  const p = feat.properties || {};
  const lId = (p.linha_id || '').toUpperCase();
  const paradas = (paradasPorLinha.get(lId) || []).sort((a, b) => (a.sequencia || 0) - (b.sequencia || 0));

  res.setHeader('Cache-Control', 'public, max-age=180');
  res.json({
    success: true,
    data: {
      linha_id: p.linha_id,
      nome: p.nome,
      cor: p.cor || '#2563eb',
      extensao_km: p.extensao_km || 0,
      total_pontos_geograficos: p.pontos || 0,
      total_paradas: paradas.length,
      geometria: feat.geometry,
      paradas,
    },
  });
});

/**
 * GET /api/onibus/paradas
 * Lista paginada e filtrada de todas as 1.795 paradas
 */
onibusRouter.get('/paradas', (req: Request, res: Response) => {
  ensureDataLoaded();

  if (!cachedParadas?.features) {
    return res.status(503).json({ success: false, error: 'Dados das paradas indisponíveis.' });
  }

  const { linha_id, direcao, q, page, limit } = req.query;
  const pNum = Math.max(1, parseInt(String(page || '1'), 10));
  const lNum = Math.min(200, Math.max(1, parseInt(String(limit || '50'), 10)));
  const offset = (pNum - 1) * lNum;

  let filtrados = cachedParadas.features;

  if (linha_id) {
    const target = String(linha_id).toUpperCase().trim();
    filtrados = filtrados.filter((f: any) => {
      const lid = (f.properties?.linha_id || '').toUpperCase().trim();
      return lid === target || lid.replace('DC-', '') === target.replace('DC-', '');
    });
  }

  if (direcao) {
    const dir = String(direcao).toLowerCase().trim();
    filtrados = filtrados.filter((f: any) => (f.properties?.direcao || '').toLowerCase() === dir);
  }

  if (q) {
    const termo = String(q).toLowerCase().trim();
    filtrados = filtrados.filter((f: any) => (f.properties?.nome || '').toLowerCase().includes(termo));
  }

  const total = filtrados.length;
  const slice = filtrados.slice(offset, offset + lNum).map((f: any) => ({
    linha_id: f.properties?.linha_id,
    sequencia: f.properties?.sequencia,
    nome: f.properties?.nome,
    direcao: f.properties?.direcao,
    latitude: f.geometry?.coordinates?.[1],
    longitude: f.geometry?.coordinates?.[0],
  }));

  res.setHeader('Cache-Control', 'public, max-age=180');
  res.json({
    success: true,
    total,
    page: pNum,
    limit: lNum,
    totalPages: Math.ceil(total / lNum),
    data: slice,
  });
});

/**
 * GET /api/onibus/geojson/rotas
 * Exportação em GeoJSON padrão para SIG, ArcGIS, QGIS e Leaflet
 */
onibusRouter.get('/geojson/rotas', (_req: Request, res: Response) => {
  ensureDataLoaded();
  if (!cachedRotas) {
    return res.status(503).json({ success: false, error: 'GeoJSON de rotas indisponível.' });
  }
  res.setHeader('Content-Type', 'application/geo+json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=600');
  res.send(cachedRotas);
});

/**
 * GET /api/onibus/geojson/paradas
 * Exportação em GeoJSON padrão para SIG, ArcGIS, QGIS e Leaflet
 */
onibusRouter.get('/geojson/paradas', (_req: Request, res: Response) => {
  ensureDataLoaded();
  if (!cachedParadas) {
    return res.status(503).json({ success: false, error: 'GeoJSON de paradas indisponível.' });
  }
  res.setHeader('Content-Type', 'application/geo+json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=600');
  res.send(cachedParadas);
});
