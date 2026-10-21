# 🔐 Matriz de Permissões e Controle de Acesso (RBAC)
## Portal Unificado PMDC — Carta de Serviços ao Cidadão + SIGEM
**Prefeitura Municipal de Duque de Caxias — RJ**  
**Versão:** 2.1 (Atualizada com API Keys, Mobilidade Tarifa Zero e Rotas Públicas)  
**Data:** 20/10/2026  

---

## 1. Perfis e Credenciais Homologadas

| Perfil / Credencial | Descrição e Abrangência de Acesso | Mecanismo de Autenticação |
| :--- | :--- | :--- |
| **`anonimo` / Cidadão** | Consulta pública de serviços, busca no Hub, visualização do mapa e consulta de rotas/paradas de ônibus. | Sem autenticação |
| **`viewer`** | Acesso somente-leitura aos relatórios internos e catálogo da secretaria sem permissão de escrita. | Token JWT |
| **`editor`** | Gestão completa (criação, edição e exclusão/arquivamento) **estritamente restrita aos serviços da sua própria secretaria**. | Token JWT |
| **`admin`** | Gestão irrestrita de todas as secretarias, criação de operadores, administração do SIGEM e emissão de Chaves de API. | Token JWT (`role = 'admin'`) |
| **`api_client` (Desenvolvedor / Parceiro)** | Acesso programático de alta velocidade a serviços, equipamentos, distritos e bairros via API v1 com rate-limiting. | Chave de API (`x-api-key: pmdc_live_...`) |

---

## 2. Matriz de Controle de Acesso por Recurso (CRUD)

| Módulo / Recurso | Operação | Endpoint | Cidadão | API Client | Editor | Admin | Regra de Isolamento / Validação |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Hub Central** | Ver Indicadores | `GET /api/hub/stats` | ✅ | ✅ | ✅ | ✅ | Estatísticas públicas consolidadas |
| **Hub Central** | Busca Global | `GET /api/hub/search` | ✅ | ✅ | ✅ | ✅ | Retorna serviços e equipamentos públicos |
| **Ônibus Tarifa Zero**| Resumo e Linhas | `GET /api/onibus/linhas` | ✅ | ✅ | ✅ | ✅ | Consulta aberta de rotas e itinerários |
| **Ônibus Tarifa Zero**| Paradas e GeoJSON | `GET /api/onibus/geojson/*` | ✅ | ✅ | ✅ | ✅ | Dados abertos para SIG e mobilidade |
| **Carta de Serviços** | Catálogo Público | `GET /api/cds/services/public` | ✅ | ✅ | ✅ | ✅ | Apenas serviços com `status='published'` |
| **Carta de Serviços** | Detalhe Público | `GET /api/cds/services/public/:id`| ✅ | ✅ | ✅ | ✅ | Acesso irrestrito a serviços publicados |
| **Carta de Serviços** | Listar (Painel) | `GET /api/cds/services` | ❌ | ❌ | ✅ | ✅ | `editor` vê somente sua secretaria; `admin` vê todas |
| **Carta de Serviços** | Detalhar (Painel) | `GET /api/cds/services/:id` | ❌ | ❌ | ✅ | ✅ | Valida `secretaria_id` no servidor; bloqueia outros com 404 |
| **Carta de Serviços** | Criar Serviço | `POST /api/cds/services` | ❌ | ❌ | ✅ | ✅ | `secretaria_id` forçado a partir do token para `editor` |
| **Carta de Serviços** | Editar Serviço | `PUT /api/cds/services/:id` | ❌ | ❌ | ✅ | ✅ | Bloqueia edição de serviços de outras secretarias |
| **Carta de Serviços** | Excluir / Arquivar| `DELETE /api/cds/services/:id` | ❌ | ❌ | ✅ | ✅ | Restrito à secretaria do operador |
| **Carta de Serviços** | Exportar Excel | `GET /api/cds/services/export` | ❌ | ❌ | ✅ | ✅ | `editor` exporta seu órgão; `admin` exporta consolidado |
| **Categorias CDS** | Listar Categorias | `GET /api/cds/services/categories`| ✅ | ✅ | ✅ | ✅ | Categorias públicas |
| **Gestão Secretarias**| Criar Secretaria | `POST /api/cds/admin/secretarias`| ❌ | ❌ | ❌ | ✅ | Apenas `admin` (`requireAdmin`) |
| **Gestão Operadores** | Listar / Criar | `/api/cds/admin/users` | ❌ | ❌ | ❌ | ✅ | Apenas `admin` |
| **SIGEM / Mapa** | Consultar Mapa | `GET /api/sigem/equipamentos` | ✅ | ✅ | ✅ | ✅ | Consulta pública dos 466 equipamentos |
| **SIGEM / Mapa** | Detalhar Ponto | `GET /api/sigem/equipamentos/:id`| ✅ | ✅ | ✅ | ✅ | Ficha cadastral pública |
| **SIGEM / Geocode** | Geocodificar Endereço| `GET /api/sigem/geocode` | ✅ | ✅ | ✅ | ✅ | Resolução espacial de logradouros |
| **SIGEM / Gestão** | Criar Ponto | `POST /api/sigem/equipamentos` | ❌ | ❌ | ❌ | ✅ | Requer JWT de `admin` (`requireAdmin`) |
| **SIGEM / Gestão** | Editar Ponto | `PUT /api/sigem/equipamentos/:id`| ❌ | ❌ | ❌ | ✅ | Requer JWT de `admin` (`requireAdmin`) |
| **SIGEM / Auditoria**| Trilha de Auditoria | `GET /api/sigem/auditoria` | ❌ | ❌ | ❌ | ✅ | Requer JWT de `admin` |
| **API Externa v1** | Consumo por Quota | `GET /api/v1/*` | ❌ | ✅ | ❌ | ✅ | Requer Chave de API ativa (`requireApiKey`) |
| **API Externa v1** | Gestão no Portal | `GET/POST /api/v1/chaves` | ✅ | ✅ | ✅ | ✅ | Geração de credencial pelo Portal do Desenvolvedor |
| **Gestão de Chaves** | Administração Total| `/api/admin/api-keys/*` | ❌ | ❌ | ❌ | ✅ | Apenas Administrador Geral PMDC |

---

## 3. Regras de Blindagem no Backend

1. **Princípio do Menor Privilégio (Least Privilege):** Acesso negado por padrão (`Deny by default`). Rotas operacionais e administrativas exigem o middleware `authenticateToken` explicitamente.
2. **Impossibilidade de Spoofing de Secretaria:** O payload da requisição HTTP (`req.body.secretaria_id`) é **completamente ignorado** para usuários com perfil `editor`. O sistema força:
   ```typescript
   const finalSecretariaId = (isAdmin && req.body.secretaria_id) 
     ? req.body.secretaria_id 
     : req.user.secretariaId;
   ```
3. **Validação de Propriedade Antes de Atualizar ou Excluir:** Todas as operações `PUT` e `DELETE` no MySQL executam uma checagem de propriedade:
   ```sql
   SELECT id FROM services WHERE id = ? AND secretaria_id = ?
   ```
   Se a consulta não retornar registros, a operação é sumariamente interrompida com status `404 Not Found` (evitando confirmar a existência de registros de outros órgãos).
4. **Blindagem de Rate-Limit por Chave de API (`apiKeyAuth`):**
   - Chaves no formato `pmdc_live_<hex>` verificadas no SQLite com verificação de status (`'ATIVO'`).
   - Verificação em tempo real de requisições por minuto (`limite_req_minuto`) e limite diário com virada automática (`ultimo_reset_dia`).
   - Respostas excedentes recebem código HTTP `429 Too Many Requests`.
