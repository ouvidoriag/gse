# 🧹 Plano e Registro de Limpeza Segura do Repositório
## Portal Unificado PMDC — Carta de Serviços ao Cidadão + SIGEM
**Prefeitura Municipal de Duque de Caxias — RJ**  
**Versão:** 2.1 (Atualizada com Inventário de Módulos v1, Mobilidade e Serviços)  
**Data:** 20/10/2026  

---

## 1. Princípio de Segurança: "Preservar Primeiro, Modificar Depois"

Nenhuma exclusão ou alteração estrutural é realizada de forma automática ou cega. Todo item é auditado quanto a:
1. Imports diretos e indiretos;
2. Menções em scripts operacionais (`scripts/*`);
3. Requisições em controladores de frontend (`public/*/*.js`);
4. Regras de roteamento no servidor Express ([src/index.ts](file:///c:/Users/501379.PMDC/Desktop/unificados/src/index.ts)).

---

## 2. Inventário e Classificação de Arquivos

### 2.1 Itens Mantidos como Núcleo Ativo (`MANTER`)

| Arquivo / Pasta | Domínio | Justificativa Técnica de Manutenção |
| :--- | :--- | :--- |
| `src/index.ts` | Servidor | Entrypoint principal do Express unificado. |
| `src/config/index.ts` | Configuração | Gestão centralizada de variáveis de ambiente e portas. |
| `src/database/mysql.ts` | Banco | Pool de conexões do MySQL da Carta de Serviços. |
| `src/database/sqlite.ts` | Banco | Conector nativo de alto desempenho com `node:sqlite` para o SIGEM e Chaves de API. |
| `src/middlewares/auth.ts` | Segurança | Autenticação JWT e autorização RBAC (`authenticateToken`, `requireAdmin`). |
| `src/middlewares/apiKeyAuth.ts` | Segurança | Autenticação e rate-limiting por chave permanente para a API v1. |
| `src/middlewares/audit.ts` | Segurança | Trilha transacional de auditoria territorial no SQLite. |
| `src/routes/cds*.ts` | Negócio CDS | Rotas refatoradas da Carta de Serviços (`cdsServices`, `cdsAdmin`, `cdsProfile`, `cdsEmail`). |
| `src/routes/sigem.ts` | Negócio SIGEM| Rotas georreferenciadas de equipamentos, distritos, bairros, auditoria e exportação. |
| `src/routes/onibus.ts` | Negócio Mobilidade| Rotas e itinerários das 20 linhas e 1.795 paradas do Ônibus Tarifa Zero. |
| `src/routes/externalApi.ts` | Integração | API pública v1 e endpoints de dados abertos para desenvolvedores externos. |
| `src/routes/adminApiKeys.ts`| Gestão | Gestão administrativa de Chaves de API pelo operador central. |
| `src/routes/hub.ts` | Integrador | Agregador de KPIs e busca federada cruzada. |
| `src/services/geocodingService.ts`| Geoespacial | Geocodificação Nominatim com validação distrital. |
| `src/services/sigemExporter.ts` | Geoespacial | Geração assíncrona de arquivos GeoJSON, CSV e KML. |
| `src/services/xlsxGenerator.ts` | Relatórios | Gerador de planilhas Excel formatadas via ExcelJS. |
| `src/services/mailer.ts` | Notificações | Transporter de e-mails para envio de relatórios e exportações. |
| `public/cds/*` | Frontend CDS | Portal do Cidadão e Dashboard de Gestão de Serviços. |
| `public/sigem/*` | Frontend SIGEM| Mapa GIS interativo Leaflet e Gerenciador de Endereços. |
| `public/sigem/dados/geojson/*` | Geodados | Camadas vetoriais de rotas e paradas de ônibus Tarifa Zero. |
| `public/api/*` | Frontend Dev | Portal do Desenvolvedor com console interativo de chamadas. |
| `public/hub/*` | Frontend Hub | Portal integrador raiz com busca global unificada. |
| `public/shared/*` | Frontend Shared| Barra institucional unificada PMDC e SSO. |
| `dados/enderecos_duque_de_caxias_v2.db` | Dados | Banco oficial do SIGEM com 466 equipamentos, 118 bairros e chaves de API. |

---

### 2.2 Itens Removidos com Evidência de Não-Uso (`JÁ REMOVIDO`)

| Arquivo Removido | Localização Anterior | Evidência Técnica da Remoção |
| :--- | :--- | :--- |
| `src/routes/admin.ts` | `src/routes/` | Código legado pré-unificação com import quebrado (`TS2459`). Substituído por `src/routes/cdsAdmin.ts`. |
| `src/routes/services.ts` | `src/routes/` | Código legado com conflito de tipos. Substituído por `src/routes/cdsServices.ts`. |
| `src/routes/profile.ts` | `src/routes/` | Código legado. Substituído por `src/routes/cdsProfile.ts`. |
| `src/routes/email.ts` | `src/routes/` | Código legado. Substituído por `src/routes/cdsEmail.ts`. |
| `public/index.html` | Raiz de `public/` | Cópia estática duplicada do dashboard antigo. Interceptava a raiz `/`. |
| `public/sigem/index.html.original` | `public/sigem/` | Backup não utilizado de 259 KB. |
| `public/docs/` | Raiz de `public/` | Redundância com `public/api/` (atendido diretamente por rota unificada). |
| `enderecos_duque_de_caxias_v2_backup_pre_google_sync_1791985688204.db` | `dados/backups/` | Duplicata exata em bytes (mesmo SHA256) gerada em segundos de intervalo. |
| `enderecos_duque_de_caxias_v2_backup_pre_google_sync_1791985713822.db` | `dados/backups/` | Duplicata exata em bytes (mesmo SHA256) gerada em segundos de intervalo. |
| `public/logo.png` | `public/` | Cópia binária redundante (932 KB). Canônico unificado em `public/shared/logo.png`. |
| `public/sigem/logo.png` | `public/sigem/` | Cópia binária redundante (932 KB). Canônico unificado em `public/shared/logo.png`. |
| `public/shared/hub.css` | `public/shared/` | Cópia duplicada desnecessária. Mantido canônico no módulo `public/hub/hub.css`. |
| `public/shared/hub.js` | `public/shared/` | Cópia duplicada desnecessária. Mantido canônico no módulo `public/hub/hub.js`. |
| `public/cds/formulario.html` | `public/cds/` | Formulário estático legado e abandonado, sem rotas ou imports no sistema ativo. |
| `public/cds/login.js` | `public/cds/` | Script de formulário legado abandonado, substituído pelo SSO centralizado. |
| `scripts/atualizar_comunidades_acoes.js` | `scripts/` | Script quebrado com erro `ENOENT` fatal, dependia de caminhos inexistentes no Desktop de dev. |
| `scripts/gerar_json_mapa_completo.js` | `scripts/` | Script quebrado e de risco que dependia de diretório externo inexistente e corrompia GeoJSONs. |
| `scripts/check_db_summary.js` | `scripts/` | Script simplificado e redundante com o validador oficial `check_full_integrity.js`. |
| `scripts/dump_sqlite_schema.js` | `scripts/` | Script descartável de 14 linhas utilizado uma única vez na fase de migração preliminar. |
| `scripts/migrar_sqlite_para_mysql.js` | `scripts/` | Rotina de migração preliminar concluída; removida para prevenir acionamento destrutivo acidental de DDL. |
