import fs from 'fs';
import path from 'path';
import mysqlPool from '../database/mysql';

export interface GeocodeResult {
  success: boolean;
  lat: number;
  lon: number;
  precisao_geo: 'NUMERO_EXATO' | 'APROXIMADO_LOGRADOURO' | 'CENTROIDE_BAIRRO' | 'ESTIMADO';
  location_type: string;
  source: 'google' | 'nominatim' | 'centroid';
  formatted_address: string;
  insideCaxias: boolean;
  districtId: number | null;
  districtName: string | null;
  warning?: string;
  error?: string;
}

// Bounding box expandida de Duque de Caxias cobrindo todo o 4º Distrito (Xerém)
// Sul: -22.860 (Prainha/Baía) | Norte: -22.450 (Serra dos Órgãos / Tinguá)
// Oeste: -43.420 (fronteira Nova Iguaçu/Belford Roxo) | Leste: -43.100 (Baía/Magé)
export const CAXIAS_BBOX = {
  minLat: -22.860,
  maxLat: -22.450,
  minLon: -43.420,
  maxLon: -43.100,
};

// Carregar GeoJSON dos 4 Distritos Administrativos de Duque de Caxias
let distritosGeoJson: any = null;

function getDistritosGeoJson(): any {
  if (distritosGeoJson) return distritosGeoJson;
  try {
    const geoPath = path.join(__dirname, '..', '..', 'public', 'sigem', 'dados', 'geojson', 'distritos.geojson');
    if (fs.existsSync(geoPath)) {
      distritosGeoJson = JSON.parse(fs.readFileSync(geoPath, 'utf8'));
    }
  } catch (err) {
    console.error('[GeocodingService] Erro ao carregar distritos.geojson:', err);
  }
  return distritosGeoJson;
}

// Algoritmo Ray-Casting (Point in Polygon)
function pointInRing(point: [number, number], ring: number[][]): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInGeometry(point: [number, number], geometry: any): boolean {
  if (!geometry) return false;
  if (geometry.type === 'Polygon') {
    if (!pointInRing(point, geometry.coordinates[0])) return false;
    for (let k = 1; k < geometry.coordinates.length; k++) {
      if (pointInRing(point, geometry.coordinates[k])) return false; // Buraco
    }
    return true;
  } else if (geometry.type === 'MultiPolygon') {
    for (const poly of geometry.coordinates) {
      if (pointInRing(point, poly[0])) {
        let inHole = false;
        for (let k = 1; k < poly.length; k++) {
          if (pointInRing(point, poly[k])) {
            inHole = true;
            break;
          }
        }
        if (!inHole) return true;
      }
    }
  }
  return false;
}

/**
 * Validação rigorosa do ponto em relação aos polígonos oficiais dos 4 Distritos de Duque de Caxias
 */
export function validatePointInDistricts(lat: number, lon: number): { insideCaxias: boolean; districtId: number | null; districtName: string | null } {
  const geo = getDistritosGeoJson();
  if (!geo || !geo.features) {
    // Fallback por Bounding Box se GeoJSON indisponível
    const inside = lat >= CAXIAS_BBOX.minLat && lat <= CAXIAS_BBOX.maxLat && lon >= CAXIAS_BBOX.minLon && lon <= CAXIAS_BBOX.maxLon;
    return { insideCaxias: inside, districtId: null, districtName: null };
  }

  const pt: [number, number] = [lon, lat];
  for (const feature of geo.features) {
    if (pointInGeometry(pt, feature.geometry)) {
      const distId = Number(feature.id || feature.properties?.NUM_DIST || 0);
      const distName = feature.properties?.NM_DIST || feature.properties?.nome || `${distId}º Distrito`;
      return {
        insideCaxias: true,
        districtId: distId,
        districtName: distName,
      };
    }
  }

  return {
    insideCaxias: false,
    districtId: null,
    districtName: null,
  };
}

/**
 * Consulta Google Geocoding REST API (servidor -> servidor, livre de restrições CORS)
 */
async function queryGoogleGeocoding(query: string, apiKey: string): Promise<{ lat: number; lon: number; locationType: string; address: string } | null> {
  const cleanQ = encodeURIComponent(query);
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${cleanQ}&components=locality:Duque+de+Caxias|administrative_area:RJ|country:BR&key=${apiKey}`;

  const res = await fetch(url, {
    signal: AbortSignal.timeout(6000),
  });

  if (!res.ok) {
    throw new Error(`Google API HTTP ${res.status}`);
  }

  const data = await res.json() as any;
  if (data.status === 'OK' && Array.isArray(data.results) && data.results.length > 0) {
    const top = data.results[0];
    const loc = top.geometry?.location;
    if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
      return {
        lat: loc.lat,
        lon: loc.lng,
        locationType: top.geometry?.location_type || 'APPROXIMATE',
        address: top.formatted_address || query,
      };
    }
  }

  return null;
}

/**
 * Consulta OpenStreetMap Nominatim com timeout e User-Agent oficial
 */
async function queryNominatim(query: string): Promise<{ lat: number; lon: number; address: string } | null> {
  const cleanQ = encodeURIComponent(query);
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${cleanQ}&viewbox=${CAXIAS_BBOX.minLon},${CAXIAS_BBOX.maxLat},${CAXIAS_BBOX.maxLon},${CAXIAS_BBOX.minLat}&bounded=0&countrycodes=br&limit=3`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'SIGEM-DuqueDeCaxias/2.0 (ouvidoria.gestao@duquedecaxias.rj.gov.br)',
      'Accept-Language': 'pt-BR,pt;q=0.9',
    },
    signal: AbortSignal.timeout(6000),
  });

  if (!res.ok) {
    throw new Error(`Nominatim HTTP ${res.status}`);
  }

  const data = await res.json() as any[];
  if (Array.isArray(data) && data.length > 0) {
    for (const item of data) {
      const lat = parseFloat(item.lat);
      const lon = parseFloat(item.lon);
      if (!isNaN(lat) && !isNaN(lon)) {
        // Valida se cai na bounding box expandida
        if (lat >= CAXIAS_BBOX.minLat && lat <= CAXIAS_BBOX.maxLat && lon >= CAXIAS_BBOX.minLon && lon <= CAXIAS_BBOX.maxLon) {
          return {
            lat,
            lon,
            address: item.display_name || query,
          };
        }
      }
    }
  }

  return null;
}

/**
 * Fallback por centróide do bairro no banco MySQL
 */
async function getCentroidForBairro(bairroName: string, distritoHint?: number): Promise<{ lat: number; lon: number; districtId: number; districtName: string }> {
  if (bairroName) {
    const clean = bairroName.trim();
    let row: any = null;
    try {
      if (distritoHint) {
        const [rows]: any = await mysqlPool.query(
          'SELECT b.*, d.numero as dist_num, d.nome as dist_nome FROM bairros b JOIN distritos d ON b.distrito_id = d.id WHERE b.nome LIKE ? AND b.distrito_id = ? LIMIT 1',
          [`%${clean}%`, distritoHint]
        );
        if (rows && rows.length > 0) row = rows[0];
      }
      if (!row) {
        const [rows]: any = await mysqlPool.query(
          'SELECT b.*, d.numero as dist_num, d.nome as dist_nome FROM bairros b JOIN distritos d ON b.distrito_id = d.id WHERE b.nome LIKE ? LIMIT 1',
          [`%${clean}%`]
        );
        if (rows && rows.length > 0) row = rows[0];
      }
    } catch (err: any) {
      console.warn('[GeocodingService] Erro ao consultar bairro no MySQL:', err.message);
    }

    if (row) {
      // Coordenadas padrão por distrito se não houver coordenadas próprias na tabela bairros
      const distDefaults: Record<number, [number, number]> = {
        1: [-22.7850, -43.3050],
        2: [-22.7000, -43.2700],
        3: [-22.6350, -43.2350],
        4: [-22.5850, -43.3000],
      };
      const dNum = Number(row.dist_num || row.distrito_id || 1);
      const coord = distDefaults[dNum] || [-22.7850, -43.3050];
      return {
        lat: coord[0],
        lon: coord[1],
        districtId: dNum,
        districtName: row.dist_nome || `${dNum}º Distrito`,
      };
    }
  }

  // Fallback geral do município (Centro Cívico / Prefeitura)
  return {
    lat: -22.685150,
    lon: -43.283990,
    districtId: 2,
    districtName: '2º Distrito (Sede Administrativa)',
  };
}

/**
 * Orquestrador principal de Geocodificação Unificada
 */
export async function geocodeLocation(params: {
  address?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  distrito?: number;
  name?: string;
  userKey?: string;
}): Promise<GeocodeResult> {
  const { logradouro, numero, bairro, distrito, name, userKey } = params;
  let fullAddress = params.address || '';

  if (!fullAddress && logradouro) {
    const numPart = numero && !['s/n', 'sn', 's/nº'].includes(numero.toLowerCase().trim()) ? `${numero}, ` : '';
    const bPart = bairro ? `${bairro}, ` : '';
    fullAddress = `${logradouro}, ${numPart}${bPart}Duque de Caxias, RJ, Brasil`;
  }

  // 1. Chave da Google API: Prioridade absoluta para a chave configurada no servidor (.env)
  let googleApiKey = (process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_GEOCODING_API_KEY || '').trim();
  
  // Se o servidor não tiver chave configurada, aceita chave informada pelo operador com validação estrita de formato
  if (!googleApiKey && userKey) {
    const trimmed = String(userKey).trim();
    if (/^AIza[0-9A-Za-z\-_]{35}$/.test(trimmed)) {
      googleApiKey = trimmed;
    } else {
      console.warn('[GeocodingService] Chave enviada por parâmetro rejeitada por formato inválido (não compatível com Google Cloud API key).');
    }
  }

  // PRIORIDADE 1: Google Geocoding API
  if (googleApiKey) {
    try {
      const q = name ? `${name}, ${bairro ? bairro + ', ' : ''}Duque de Caxias, RJ` : fullAddress;
      const googleRes = await queryGoogleGeocoding(q, googleApiKey);

      if (googleRes) {
        const spatial = validatePointInDistricts(googleRes.lat, googleRes.lon);

        // Se o equipamento possui distrito esperado, verificar se o Google não caiu em homônimo em outro distrito
        let warning: string | undefined;
        if (distrito && spatial.districtId && Number(distrito) !== spatial.districtId) {
          warning = `Atenção: Endereço geocodificado caiu no ${spatial.districtId}º Distrito, mas o cadastro pertence ao ${distrito}º Distrito. Verifique se há rua homônima.`;
        }

        const isRooftop = googleRes.locationType === 'ROOFTOP';
        return {
          success: true,
          lat: Number(googleRes.lat.toFixed(6)),
          lon: Number(googleRes.lon.toFixed(6)),
          precisao_geo: isRooftop ? 'NUMERO_EXATO' : 'APROXIMADO_LOGRADOURO',
          location_type: googleRes.locationType,
          source: 'google',
          formatted_address: googleRes.address,
          insideCaxias: spatial.insideCaxias,
          districtId: spatial.districtId,
          districtName: spatial.districtName,
          warning,
        };
      }
    } catch (err: any) {
      console.warn('[GeocodingService] Google API indisponível ou falhou, acionando fallback:', err.message);
    }
  }

  // PRIORIDADE 2: OpenStreetMap Nominatim Fallback
  if (fullAddress) {
    try {
      const osmRes = await queryNominatim(fullAddress);
      if (osmRes) {
        const spatial = validatePointInDistricts(osmRes.lat, osmRes.lon);
        return {
          success: true,
          lat: Number(osmRes.lat.toFixed(6)),
          lon: Number(osmRes.lon.toFixed(6)),
          precisao_geo: 'APROXIMADO_LOGRADOURO',
          location_type: 'STREET_LEVEL',
          source: 'nominatim',
          formatted_address: osmRes.address,
          insideCaxias: spatial.insideCaxias,
          districtId: spatial.districtId,
          districtName: spatial.districtName,
        };
      }
    } catch (err: any) {
      console.warn('[GeocodingService] Nominatim indisponível ou falhou:', err.message);
    }
  }

  // PRIORIDADE 3: Centróide do Bairro / Distrito
  const centroid = await getCentroidForBairro(bairro || '', distrito);
  return {
    success: true,
    lat: Number(centroid.lat.toFixed(6)),
    lon: Number(centroid.lon.toFixed(6)),
    precisao_geo: 'CENTROIDE_BAIRRO',
    location_type: 'CENTROID',
    source: 'centroid',
    formatted_address: `${bairro || 'Duque de Caxias'} (Centróide Administrativo), Duque de Caxias, RJ`,
    insideCaxias: true,
    districtId: centroid.districtId,
    districtName: centroid.districtName,
    warning: 'Coordenadas aproximadas com base no bairro/distrito. Recomenda-se o ajuste fino visual no satélite.',
  };
}
