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
app.get(['/favicon.ico', '/cds/favicon.ico', '/sigem/favicon.ico'], (_req, res) => {
  res.status(204).end();
});

// ==========================================
// 🚀 ROTAS DE API UNIFICADA
// ==========================================
app.use('/api', apiLimiter);

// 1. Auth Unificado
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRouter);

// 2. Hub Geral
app.use('/api/hub', hubRouter);

// 3. Módulo Carta de Serviços (Rotas primárias e retrocompatíveis)
app.use('/api/cds/services', cdsServicesRouter);
app.use('/api/cds/admin', cdsAdminRouter);
app.use('/api/cds/profile', cdsProfileRouter);
app.use('/api/cds/email', cdsEmailRouter);

// Endpoints retrocompatíveis com /cds/api/*
app.use('/cds/api/auth/login', loginLimiter);
app.use('/cds/api/auth', authRouter);
app.use('/cds/api/auth', cdsProfileRouter);
app.use('/cds/api/services', cdsServicesRouter);
app.use('/cds/api/admin', cdsAdminRouter);
app.use('/cds/api', cdsEmailRouter);

// 4. Módulo SIGEM (Rotas primárias e retrocompatíveis)
app.use('/api/sigem', sigemRouter);
app.use('/sigem/api', sigemRouter);
app.use('/enderecos/api', sigemRouter);

// 5. Módulo de Mobilidade e Ônibus Tarifa Zero
app.use('/api/onibus', onibusRouter);
app.use('/api/v1/onibus', onibusRouter);
app.use('/api/sigem/onibus', onibusRouter);

// 6. Módulo de Comunidades, Favelas e Complexos Territoriais (SIMAC)
app.use('/api/comunidades', comunidadesRouter);
app.use('/api/sigem/comunidades', comunidadesRouter);
app.use('/sigem/api/comunidades', comunidadesRouter);
app.use('/api/v1/comunidades', comunidadesRouter);

// 7. API Externa para Terceiros e Desenvolvedores (Exclusiva por API Key)
app.use('/api/v1', externalApiRouter);
app.use('/api/public', externalApiRouter);

// 8. Gestão Administrativa de Chaves de API (Admin com JWT)
app.use('/api/admin/api-keys', adminApiKeysRouter);
app.use('/cds/api/admin/api-keys', adminApiKeysRouter);

app.use('/api', sigemRouter); // compatibilidade direta com rotas raiz /api/*

// ==========================================
// 🖥️ ARQUIVOS ESTÁTICOS E FRONTENDS
// ==========================================
const baseDir = path.join(__dirname, '..');
const publicDir = path.join(baseDir, 'public');

// Portal do Desenvolvedor & Gestão da API (atende /api e /docs diretamente sem redirecionamento)
app.get(['/api', '/api/', '/api/index.html', '/api/docs', '/docs', '/docs/', '/docs/index.html', '/api/v1/docs'], (_req, res) => {
  res.sendFile(path.join(publicDir, 'api', 'index.html'));
});

// 0. Arquivos públicos da raiz (logo.png, etc.) - desativa index automático para a raiz ser tratada pelas rotas
app.use(express.static(publicDir, { index: false }));

// Servir assets estáticos do SIGEM com e sem prefixo /sigem (garante suporte a Nginx com e sem trailing slash)
app.use('/sigem/css', express.static(path.join(publicDir, 'sigem', 'css')));
app.use('/sigem/js', express.static(path.join(publicDir, 'sigem', 'js')));
app.use('/css', express.static(path.join(publicDir, 'sigem', 'css')));
app.use('/js', express.static(path.join(publicDir, 'sigem', 'js')));

// Página Única de Login (compatível com todas as rotas e subpastas de Nginx)
app.get(['/login', '/login.html', '/sigem/login', '/sigem/login.html', '/enderecos/login', '/enderecos/login.html'], (_req, res) => {
  res.sendFile(path.join(publicDir, 'login.html'));
});

// Redirecionamento unificado de rotas antigas de login para /login
app.get(['/cds/login.html'], (req, res) => {
  const redirect = req.query.redirect ? `?redirect=${encodeURIComponent(String(req.query.redirect))}` : '';
  res.redirect(`/login${redirect}`);
});

// 1. Recursos compartilhados (Barra de navegação PMDC, logo, tokens)
app.use('/shared', express.static(path.join(publicDir, 'shared')));

// 2. Dados estáticos (JSONs/CSVs do SIGEM)
app.use('/dados', express.static(path.join(baseDir, 'dados')));
app.use('/sigem/dados', express.static(path.join(baseDir, 'dados')));
app.use('/enderecos/dados', express.static(path.join(baseDir, 'dados')));

// 3. Módulo SIGEM & Endereços (atende /sigem e /enderecos)
app.use('/sigem', express.static(path.join(publicDir, 'sigem')));
app.use('/enderecos', express.static(path.join(publicDir, 'sigem')));

app.get(['/sigem', '/sigem/', '/sigem/index.html', '/enderecos', '/enderecos/', '/enderecos/index.html'], (_req, res) => {
  res.sendFile(path.join(publicDir, 'sigem', 'index.html'));
});

app.get(['/sigem/gerenciador', '/enderecos/gerenciador', '/gerenciador', '/gerenciador.html'], (_req, res) => {
  res.sendFile(path.join(publicDir, 'sigem', 'gerenciador_enderecos.html'));
});

// 4. Módulo Carta de Serviços
app.use('/cds', express.static(path.join(publicDir, 'cds')));

// 5. Hub Integrado (Portal Raiz - Início)
app.use('/hub', express.static(path.join(publicDir, 'hub')));

// Suporte a modo SIGEM dedicado (quando executado na porta 3015 ou com APP_MODE=sigem)
const isDedicatedSigem = process.env.APP_MODE === 'sigem' || String(config.port) === '3015';

app.get(['/', '/index.html'], (_req, res) => {
  if (isDedicatedSigem) {
    return res.sendFile(path.join(publicDir, 'sigem', 'index.html'));
  }
  res.sendFile(path.join(publicDir, 'hub', 'index.html'));
});

// Fallbacks amigáveis
app.get('/servicos', (_req, res) => res.redirect('/cds'));

// 404 Handler
app.use((req, res) => {
  if (req.path.startsWith('/api') || req.path.includes('/api/')) {
    return res.status(404).json({ error: 'Endpoint da API não encontrado', path: req.path });
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
  console.log('🏛️  PREFEITURA MUNICIPAL DE DUQUE DE CAXIAS — PORTAL UNIFICADO');
  console.log('================================================================');
  console.log(`🌐 Servidor ativo em:             http://localhost:${PORT}`);
  console.log(`🌟 Portal Integrado (Hub):        http://localhost:${PORT}/`);
  console.log(`📋 Carta de Serviços ao Cidadão:  http://localhost:${PORT}/cds`);
  console.log(`🔐 Painel Carta de Serviços:      http://localhost:${PORT}/cds/dashboard.html`);
  console.log(`🗺️  SIGEM — Mapa & Equipamentos:   http://localhost:${PORT}/sigem`);
  console.log(`📊 API Unificada de Indicadores:  http://localhost:${PORT}/api/hub/stats`);
  console.log(`🔑 API Externa v1 (API Key):      http://localhost:${PORT}/api/v1`);
  console.log(`📖 Portal do Desenvolvedor:       http://localhost:${PORT}/docs`);
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
