import express from 'express';
import path from 'path';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { config } from './config';
import { testMysqlConnection, mysqlPool } from './database/mysql';

// Rotas
import { authRouter } from './routes/auth';
import { hubRouter } from './routes/hub';
import { cdsServicesRouter } from './routes/cdsServices';
import { cdsAdminRouter } from './routes/cdsAdmin';
import { cdsProfileRouter } from './routes/cdsProfile';
import { cdsEmailRouter } from './routes/cdsEmail';
import { sigemRouter } from './routes/sigem';
import { externalApiRouter } from './routes/externalApi';
import { adminApiKeysRouter } from './routes/adminApiKeys';
import { onibusRouter } from './routes/onibus';
import { comunidadesRouter } from './routes/comunidades';

const app = express();
const PORT = config.port;

// ==========================================
// 🛡️ SEGURANÇA E CSP (Content Security Policy)
// ==========================================
app.set('trust proxy', 1);
app.use(
  helmet({
    crossOriginOpenerPolicy: false,
    originAgentCluster: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          'https://cdnjs.cloudflare.com',
          'https://unpkg.com',
          'https://cdn.jsdelivr.net',
        ],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
          'http://fonts.googleapis.com',
          'https://use.typekit.net',
          'https://cdnjs.cloudflare.com',
          'https://unpkg.com',
          'https://cdn.jsdelivr.net',
        ],
        fontSrc: [
          "'self'",
          'data:',
          'https://fonts.gstatic.com',
          'http://fonts.gstatic.com',
          'https://use.typekit.net',
          'https://cdnjs.cloudflare.com',
          'https://cdn.jsdelivr.net',
        ],
        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'https:',
          'http:',
          'https://*.tile.openstreetmap.org',
          'https://unpkg.com',
        ],
        connectSrc: [
          "'self'",
          'https://viacep.com.br',
          'https://server.arcgisonline.com',
          'https://cdnjs.cloudflare.com',
          'https://fonts.googleapis.com',
          'https://fonts.gstatic.com',
          'https://unpkg.com',
          'https://*.tile.openstreetmap.org',
        ],
        frameAncestors: ["'self'"],
        upgradeInsecureRequests: null,
      },
    },
  })
);

// ==========================================
// ⚡ PERFORMANCE E PARSERS
// ==========================================
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiters
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Muitas requisições deste IP, tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Muitas tentativas de login, tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Favicon handler
app.get(['/favicon.ico', '/gse/favicon.ico', '/cds/favicon.ico', '/sigem/favicon.ico'], (_req, res) => {
  res.status(204).end();
});

// ==========================================
// 🚀 ROTAS DE API UNIFICADA (/api e /gse/api)
// ==========================================
const apiPrefixes = ['/api', '/gse/api'];

apiPrefixes.forEach((prefix) => {
  app.use(prefix, apiLimiter);

  // 1. Auth Unificado
  app.use(`${prefix}/auth/login`, loginLimiter);
  app.use(`${prefix}/auth`, authRouter);

  // 2. Hub Geral
  app.use(`${prefix}/hub`, hubRouter);

  // 3. Módulo Carta de Serviços
  app.use(`${prefix}/cds/services`, cdsServicesRouter);
  app.use(`${prefix}/cds/admin`, cdsAdminRouter);
  app.use(`${prefix}/cds/profile`, cdsProfileRouter);
  app.use(`${prefix}/cds/email`, cdsEmailRouter);

  // 4. Módulo SIGEM
  app.use(`${prefix}/sigem`, sigemRouter);

  // 5. Módulo de Mobilidade e Ônibus Tarifa Zero
  app.use(`${prefix}/onibus`, onibusRouter);
  app.use(`${prefix}/v1/onibus`, onibusRouter);
  app.use(`${prefix}/sigem/onibus`, onibusRouter);

  // 6. Módulo de Comunidades, Favelas e Complexos Territoriais (SIMAC)
  app.use(`${prefix}/comunidades`, comunidadesRouter);
  app.use(`${prefix}/sigem/comunidades`, comunidadesRouter);
  app.use(`${prefix}/v1/comunidades`, comunidadesRouter);

  // 7. API Externa para Terceiros e Desenvolvedores (Exclusiva por API Key)
  app.use(`${prefix}/v1`, externalApiRouter);
  app.use(`${prefix}/public`, externalApiRouter);

  // 8. Gestão Administrativa de Chaves de API (Admin com JWT)
  app.use(`${prefix}/admin/api-keys`, adminApiKeysRouter);

  // Compatibilidade com endpoints diretos do SIGEM no prefixo da API
  app.use(prefix, sigemRouter);
});

// Endpoints retrocompatíveis diretos com /cds/api/* e /gse/cds/api/*
['/cds/api', '/gse/cds/api'].forEach((cdsPrefix) => {
  app.use(`${cdsPrefix}/auth/login`, loginLimiter);
  app.use(`${cdsPrefix}/auth`, authRouter);
  app.use(`${cdsPrefix}/auth`, cdsProfileRouter);
  app.use(`${cdsPrefix}/services`, cdsServicesRouter);
  app.use(`${cdsPrefix}/admin`, cdsAdminRouter);
  app.use(`${cdsPrefix}/admin/api-keys`, adminApiKeysRouter);
  app.use(cdsPrefix, cdsEmailRouter);
});

// Endpoints retrocompatíveis diretos com /sigem/api/* e /enderecos/api/*
['/sigem/api', '/gse/sigem/api', '/enderecos/api', '/gse/enderecos/api'].forEach((sigPrefix) => {
  app.use(sigPrefix, sigemRouter);
  app.use(`${sigPrefix}/comunidades`, comunidadesRouter);
});

// ==========================================
// 🖥️ ARQUIVOS ESTÁTICOS E FRONTENDS (GSE / CDS / SIGEM / HUB)
// ==========================================
const baseDir = path.join(__dirname, '..');
const publicDir = path.join(baseDir, 'public');

// 0. Portal do Desenvolvedor & Gestão da API (atende /api, /docs e /gse/docs diretamente sem redirecionamento)
app.get([
  '/api', '/api/', '/api/index.html', '/api/docs',
  '/docs', '/docs/', '/docs/index.html', '/api/v1/docs',
  '/gse/api', '/gse/api/', '/gse/api/index.html',
  '/gse/docs', '/gse/docs/', '/gse/docs/index.html',
  '/cds/docs', '/cds/api-docs',
  '/sigem/docs', '/sigem/api-docs'
], (_req, res) => {
  res.sendFile(path.join(publicDir, 'api', 'index.html'));
});

// Logo institucional garantido (evita 404 independentemente da URL base)
app.get(['/logo.png', '/gse/logo.png', '/shared/logo.png', '/gse/shared/logo.png'], (_req, res) => {
  res.sendFile(path.join(publicDir, 'shared', 'logo.png'));
});

// 1. Arquivos estáticos servidos na raiz e sob /gse
app.use(express.static(publicDir, { index: false }));
app.use('/gse', express.static(publicDir, { index: false }));

// 2. Recursos compartilhados (Barra de navegação PMDC, logos, tokens de design)
app.use(['/shared', '/gse/shared'], express.static(path.join(publicDir, 'shared')));

// 3. Módulo Hub Integrado
app.use(['/hub', '/gse/hub'], express.static(path.join(publicDir, 'hub')));

// 4. Módulo Carta de Serviços
app.use(['/cds', '/gse/cds'], express.static(path.join(publicDir, 'cds')));

// 5. Módulo SIGEM & Endereços
app.use(['/sigem', '/gse/sigem', '/enderecos', '/gse/enderecos'], express.static(path.join(publicDir, 'sigem')));
app.use(['/sigem/css', '/gse/sigem/css', '/css', '/gse/css'], express.static(path.join(publicDir, 'sigem', 'css')));
app.use(['/sigem/js', '/gse/sigem/js', '/js', '/gse/js'], express.static(path.join(publicDir, 'sigem', 'js')));

// 6. Dados estáticos (JSONs/CSVs do SIGEM e equipamentos)
app.use(['/dados', '/gse/dados', '/sigem/dados', '/gse/sigem/dados', '/enderecos/dados'], express.static(path.join(baseDir, 'dados')));

// 7. Página Única de Autenticação / Login (Autocontida para todas as rotas e subpastas de Nginx)
// Serve login.html diretamente SEM 302 redirect, evitando quebrar proxies reversos
app.get([
  '/login', '/login.html',
  '/gse/login', '/gse/login.html',
  '/cds/login', '/cds/login.html',
  '/sigem/login', '/sigem/login.html',
  '/enderecos/login', '/enderecos/login.html'
], (_req, res) => {
  res.sendFile(path.join(publicDir, 'login.html'));
});

// 8. Rotas de Telas do Módulo Carta de Serviços
app.get([
  '/cds', '/cds/', '/cds/index.html',
  '/gse/cds', '/gse/cds/', '/gse/cds/index.html'
], (_req, res) => {
  res.sendFile(path.join(publicDir, 'cds', 'index.html'));
});

app.get([
  '/cds/dashboard', '/cds/dashboard.html',
  '/gse/cds/dashboard', '/gse/cds/dashboard.html'
], (_req, res) => {
  res.sendFile(path.join(publicDir, 'cds', 'dashboard.html'));
});

// 9. Rotas de Telas do Módulo SIGEM & Endereços
app.get([
  '/sigem', '/sigem/', '/sigem/index.html',
  '/gse/sigem', '/gse/sigem/', '/gse/sigem/index.html',
  '/enderecos', '/enderecos/', '/enderecos/index.html',
  '/gse/enderecos', '/gse/enderecos/'
], (_req, res) => {
  res.sendFile(path.join(publicDir, 'sigem', 'index.html'));
});

app.get([
  '/sigem/gerenciador', '/sigem/gerenciador.html',
  '/sigem/gerenciador_enderecos.html',
  '/gse/sigem/gerenciador', '/gse/sigem/gerenciador.html',
  '/gse/sigem/gerenciador_enderecos.html',
  '/enderecos/gerenciador', '/gerenciador', '/gerenciador.html'
], (_req, res) => {
  res.sendFile(path.join(publicDir, 'sigem', 'gerenciador_enderecos.html'));
});

// 10. Suporte a modo SIGEM dedicado (quando executado com APP_MODE=sigem ou porta 3015)
const isDedicatedSigem = process.env.APP_MODE === 'sigem' || String(config.port) === '3015';

// 11. Portal Geral / Início (Hub GSE)
app.get([
  '/', '/index.html',
  '/hub', '/hub/', '/hub/index.html',
  '/gse', '/gse/', '/gse/index.html',
  '/gse/hub', '/gse/hub/', '/gse/hub/index.html'
], (_req, res) => {
  if (isDedicatedSigem) {
    return res.sendFile(path.join(publicDir, 'sigem', 'index.html'));
  }
  res.sendFile(path.join(publicDir, 'hub', 'index.html'));
});

// 12. Fallbacks amigáveis
app.get(['/servicos', '/gse/servicos'], (_req, res) => res.redirect('/cds'));

// 13. 404 Handler Inteligente
app.use((req, res) => {
  if (req.path.startsWith('/api') || req.path.includes('/api/')) {
    return res.status(404).json({ error: 'Endpoint da API não encontrado', path: req.path });
  }
  // Se for requisição para um arquivo estático (.css, .js, .png, etc.), retorna 404 real evitando erro de MIME type no browser
  if (/\.[a-zA-Z0-9]{2,5}$/.test(req.path)) {
    return res.status(404).type('text/plain').send('Arquivo não encontrado');
  }
  if (isDedicatedSigem) {
    return res.sendFile(path.join(publicDir, 'sigem', 'index.html'));
  }
  res.sendFile(path.join(publicDir, 'hub', 'index.html'));
});

// ==========================================
// 🛡️ ERROR HANDLER GLOBAL CENTRALIZADO
// ==========================================
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('🚨 [Unhandled Error]:', err);
  const status = typeof err.status === 'number' ? err.status : (typeof err.statusCode === 'number' ? err.statusCode : 500);
  res.status(status).json({
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'production' ? 'Ocorreu um erro inesperado ao processar a requisição.' : (err.message || 'Erro não especificado'),
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// ==========================================
// 🏁 INICIALIZAÇÃO DO SERVIDOR
// ==========================================
const server = app.listen(PORT, async () => {
  console.log('================================================================');
  console.log('🏛️  PREFEITURA MUNICIPAL DE DUQUE DE CAXIAS — SISTEMA GSE');
  console.log('================================================================');
  console.log(`🌐 Servidor ativo em:             http://localhost:${PORT}`);
  console.log(`🌟 Portal GSE (Oficial):          http://localhost:${PORT}/gse/`);
  console.log(`📋 Carta de Serviços:            http://localhost:${PORT}/gse/cds`);
  console.log(`🔐 Painel Administrativo:        http://localhost:${PORT}/gse/cds/dashboard.html`);
  console.log(`🗺️  SIGEM — Endereços & GIS:      http://localhost:${PORT}/gse/sigem`);
  console.log(`📖 API & Desenvolvedores:        http://localhost:${PORT}/gse/docs`);
  console.log(`🔑 Login & Autenticação:         http://localhost:${PORT}/gse/login`);
  console.log(`📊 API de Indicadores:           http://localhost:${PORT}/gse/api/hub/stats`);
  console.log('----------------------------------------------------------------');
  console.log('✨ Rotas raiz retrocompatíveis (/) mantidas ativas.');
  console.log('================================================================');

  // Testa conexões de banco de dados
  await testMysqlConnection();
});

// Graceful Shutdown
function shutdown() {
  console.log('\n🛑 Encerrando servidor graciosamente...');
  server.close(async () => {
    try {
      await mysqlPool.end();
      console.log('🐬 [MySQL] Pool encerrado.');
    } catch (_) {}
    console.log('✅ Portal Unificado finalizado com segurança.');
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

process.on('unhandledRejection', (reason) => {
  console.error('⚠️ [Unhandled Rejection]:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('🚨 [Uncaught Exception]:', err);
});

export default app;
