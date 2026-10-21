import { mysqlPool } from '../database/mysql';

export interface AuditMeta {
  ip?: string;
  dispositivo?: string;
  localizacao?: string;
}

export function extrairIp(req: any): string {
  if (!req) return '127.0.0.1 (Localhost)';
  const forwarded = req.headers?.['x-forwarded-for'];
  let rawIp = '';
  if (forwarded) {
    rawIp = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : forwarded[0];
  } else {
    rawIp = req.ip || req.socket?.remoteAddress || '127.0.0.1';
  }
  if (rawIp.startsWith('::ffff:')) {
    rawIp = rawIp.replace('::ffff:', '');
  }
  if (rawIp === '::1' || rawIp === '127.0.0.1') {
    return '127.0.0.1 (Localhost)';
  }
  return rawIp;
}

export function extrairDispositivo(req: any): string {
  if (!req) return 'Terminal / API Governamental';
  const clientDeviceHeader = req.headers?.['x-client-device'];
  const userAgent = req.headers?.['user-agent'] || '';

  let os = 'Dispositivo Indefinido';
  if (/windows nt 10\.0/i.test(userAgent)) os = 'Windows 10/11';
  else if (/windows nt 6\.3/i.test(userAgent)) os = 'Windows 8.1';
  else if (/windows nt 6\.1/i.test(userAgent)) os = 'Windows 7';
  else if (/macintosh|mac os x/i.test(userAgent)) os = 'macOS';
  else if (/android/i.test(userAgent)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(userAgent)) os = 'iOS (Apple)';
  else if (/linux/i.test(userAgent)) os = 'Linux';

  let browser = 'Navegador Web';
  if (/edg\//i.test(userAgent)) browser = 'Microsoft Edge';
  else if (/opr\/|opera\//i.test(userAgent)) browser = 'Opera';
  else if (/chrome\//i.test(userAgent)) browser = 'Google Chrome';
  else if (/firefox\//i.test(userAgent)) browser = 'Mozilla Firefox';
  else if (/safari\//i.test(userAgent) && !/chrome\//i.test(userAgent)) browser = 'Apple Safari';
  else if (/curl/i.test(userAgent)) browser = 'cURL CLI';
  else if (/postman/i.test(userAgent)) browser = 'Postman';

  let result = `${os} · ${browser}`;
  if (clientDeviceHeader) {
    result = `${clientDeviceHeader} (${result})`;
  }
  return result;
}

export function extrairLocalizacao(req: any, fallback?: string): string {
  const clientGeo = req?.headers?.['x-client-geo'] || req?.headers?.['x-sigem-location'];
  if (clientGeo) return String(clientGeo);

  if (req?.user?.secretariaNome) {
    return `${req.user.secretariaNome} (Duque de Caxias - RJ)`;
  }
  if (req?.user?.role === 'admin') {
    return 'Gabinete / ADM Central (Duque de Caxias - RJ)';
  }
  if (fallback) {
    return fallback;
  }
  return 'Sede Municipal (Duque de Caxias - RJ)';
}

export async function registrarAuditoria(
  tabela: string,
  registroId: string | number,
  operacao: 'INSERT' | 'UPDATE' | 'DELETE' | string,
  dadosAnteriores: any = null,
  dadosNovos: any = null,
  usuario: string = 'SISTEMA_UNIFICADO',
  fonteId: number = 1,
  metaOrReq?: any
) {
  let ip = '127.0.0.1 (Localhost)';
  let dispositivo = 'Estação Governamental (Windows 10/11 · Chrome)';
  let localizacao = 'Sede Municipal (Duque de Caxias - RJ)';

  if (metaOrReq) {
    if (metaOrReq.headers || metaOrReq.ip || metaOrReq.socket) {
      // É uma requisição Express
      ip = extrairIp(metaOrReq);
      dispositivo = extrairDispositivo(metaOrReq);
      localizacao = extrairLocalizacao(metaOrReq);
      if ((!usuario || usuario === 'SISTEMA_UNIFICADO') && metaOrReq.user?.username) {
        usuario = metaOrReq.user.username;
      }
    } else {
      // Objeto direto de metadados
      if (metaOrReq.ip) ip = metaOrReq.ip;
      if (metaOrReq.dispositivo) dispositivo = metaOrReq.dispositivo;
      if (metaOrReq.localizacao) localizacao = metaOrReq.localizacao;
    }
  }

  try {
    const sql = `
      INSERT INTO auditoria (
        tabela_afetada, registro_id, operacao, dados_anteriores, dados_novos,
        usuario, fonte_id, criado_em, ip, dispositivo, localizacao
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?)
    `;

    await mysqlPool.query(sql, [
      tabela,
      String(registroId),
      operacao,
      dadosAnteriores ? JSON.stringify(dadosAnteriores) : null,
      dadosNovos ? JSON.stringify(dadosNovos) : null,
      usuario || 'SISTEMA_UNIFICADO',
      fonteId,
      ip,
      dispositivo,
      localizacao
    ]);
  } catch (err: any) {
    console.error('⚠️ [Erro ao registrar auditoria SIGEM no MySQL]:', err.message);
  }
}


