# 🔍 Relatório de Auditoria Técnica e Baseline
## Portal Unificado PMDC — Carta de Serviços ao Cidadão + SIGEM
**Prefeitura Municipal de Duque de Caxias — RJ**  
**Data da Auditoria:** 20/10/2026  
**Responsável:** Engenharia de Software / Auditoria de Sistemas  
**Status do Ambiente:** Produção Local / Homologação  
**Runtime:** Node.js v22.21.0 | TypeScript v5.7.3 | Express v4.21.2  

---

## 1. Identificação do Ambiente e Infraestrutura

| Parâmetro | Valor Verificado em Ambiente Real | Evidência / Arquivo |
| :--- | :--- | :--- |
| **Porta Efetiva** | `3032` (configurável via `PORT` no `.env`, suporte a modo SIGEM 3015) | [src/config/index.ts](file:///c:/Users/501379.PMDC/Desktop/unificados/src/config/index.ts) e [src/index.ts](file:///c:/Users/501379.PMDC/Desktop/unificados/src/index.ts) |
| **Servidor / Processo** | Express v4.21.2 sobre `tsx watch` (dev) ou `node dist/index.js` (prod) | [package.json](file:///c:/Users/501379.PMDC/Desktop/unificados/package.json) |
| **Bancos Ativos** | **MySQL 8** (Porta `3306`, DB: `carta_de_servico`) + **SQLite V2** (`dados/enderecos_duque_de_caxias_v2.db`) | [src/database/mysql.ts](file:///c:/Users/501379.PMDC/Desktop/unificados/src/database/mysql.ts) e [src/database/sqlite.ts](file:///c:/Users/501379.PMDC/Desktop/unificados/src/database/sqlite.ts) |
| **Driver SQLite** | Módulo nativo `node:sqlite` (`DatabaseSync`) disponível nativamente no Node 22 | [src/database/sqlite.ts](file:///c:/Users/501379.PMDC/Desktop/unificados/src/database/sqlite.ts) |
| **Bases Vetoriais** | GeoJSON (`rotas_onibus_tarifa_zero.geojson` e `paradas_onibus_tarifa_zero.geojson`) | `public/sigem/dados/geojson/` |

---

## 2. Contagens Reais vs Referência Declarada (Confronto Factual)

Valores verificados diretamente nos bancos de dados de produção:

| Entidade | Declarado na Especificação Inicial | Verificado no Banco Real Atual | Divergência | Evidência / Análise Técnica |
| :--- | :---: | :---: | :---: | :--- |
| **Serviços Públicos** | 372 | **372** | Nenhuma | 100% dos serviços cadastrados e com status `published`. |
| **Secretarias Municipais** | 18 | **18** | Nenhuma | 18 órgãos municipais normalizados com código único. |
| **Categorias de Serviços** | ~60 | **19** | -41 | 19 categorias cadastradas na tabela `categories`. O número 60 era estimativa agregada. |
| **Usuários de Secretarias** | ~25 | **19** | -6 | 1 administrador geral (`admin`) + 18 operadores setoriais (1 por secretaria). |
| **Equipamentos Públicos** | 449 | **466** | **+17** | 466 prédios e equipamentos públicos georreferenciados no SQLite com coordenadas válidas. |
| **Distritos Municipais** | 4 | **4** | Nenhuma | 1º Duque de Caxias, 2º Campos Elíseos, 3º Imbariê, 4º Xerém. |
| **Bairros Municipais** | 90 | **118** | **+28** | A tabela `bairros` do SQLite contém 118 registros oficiais cobrindo todas as subdivisões territoriais. |
| **Chaves de API Cadastradas** | 0 | **4** | **+4** | 4 chaves cadastradas na tabela `api_keys` com quotas ativas para desenvolvedores. |
| **Linhas de Ônibus Tarifa Zero** | 0 | **20** | **+20** | 20 linhas municipais gratuitas integradas no GeoJSON com traçados e extensões. |
| **Paradas de Ônibus** | 0 | **1.795** | **+1.795** | 1.795 pontos de parada cadastrados com coordenadas geográficas. |
| **Registros de Auditoria SIGEM**| 0 | **542** | +542 | 542 eventos registrados na tabela `auditoria`, com 520 vinculados a fontes oficiais. |

---

## 3. Matriz de Auditoria de Vulnerabilidades e Hardening

### Evidência 01 — Interceptação estática da rota `/` pelo frontend
- **Problema Anterior:** O arquivo estático `public/index.html` interceptava a raiz `/` exibindo diretamente a Carta de Serviços.
- **Status:** ✅ **RESOLVIDO / HOMOLOGADO** — `express.static(publicDir, { index: false })` ativado e rota explícita servindo [public/hub/index.html](file:///c:/Users/501379.PMDC/Desktop/unificados/public/hub/index.html).

### Evidência 02 — Exposição de caminho de sistema de arquivos em `/health`
- **Problema Anterior:** A rota `/sigem/health` expunha o caminho absoluto do arquivo `.db` no Windows.
- **Status:** ✅ **RESOLVIDO / HOMOLOGADO** — Sanitizado no [src/routes/sigem.ts](file:///c:/Users/501379.PMDC/Desktop/unificados/src/routes/sigem.ts), exibindo apenas nome do banco sem caminhos locais.

### Evidência 03 — Proteção contra abuso e esgotamento de recursos na API pública
- **Ação:** Implementação de middleware `apiKeyAuth.ts` nas rotas `/api/v1/*` com limites estritos por minuto e por dia, complementado pelo `express-rate-limit` global por IP.
- **Status:** ✅ **RESOLVIDO / HOMOLOGADO**.
