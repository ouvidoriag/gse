# 📡 Catálogo e Contrato de APIs
## Portal Unificado PMDC — Carta de Serviços ao Cidadão + SIGEM
**Prefeitura Municipal de Duque de Caxias — RJ**  
**Versão:** 2.1 (Atualizada com Ônibus Tarifa Zero, API Externa v1 e Gestão de Chaves)  
**Data:** 20/10/2026  

---

## 1. Convenções e Autenticação

- **Base URL:** `http://localhost:3032`
- **Formato:** JSON (`application/json; charset=utf-8`)
- **Mecanismos de Autenticação:**
  1. **JWT (Operadores e Administradores):** Header HTTP `Authorization: Bearer <TOKEN_JWT>` ou `x-auth-token`.
  2. **API Key (Desenvolvedores e Aplicações Externas):** Header HTTP `x-api-key: pmdc_live_<hex>`, `Authorization: Bearer pmdc_live_<hex>` ou query string `?apiKey=<chave>`.
- **Códigos de Resposta Padrão:**
  - `200 OK`: Consulta ou atualização bem-sucedida.
  - `201 Created`: Recurso criado com sucesso.
  - `204 No Content`: Operação concluída sem corpo de resposta.
  - `400 Bad Request`: Parâmetros ausentes ou dados inválidos.
  - `401 Unauthorized`: Token ou chave de API não fornecido, inválido ou expirado.
  - `403 Forbidden`: Usuário autenticado não tem permissão para a ação/secretaria solicitada.
  - `404 Not Found`: Recurso não localizado.
  - `429 Too Many Requests`: Limite de taxa de requisições excedido (Rate Limit por IP ou Quota por Chave).
  - `500 Internal Server Error`: Falha inesperada no servidor.
  - `503 Service Unavailable`: Recurso ou arquivo geográfico temporariamente indisponível.

---

## 2. Módulo de Autenticação Unificada (`/api/auth`)

### `POST /api/auth/login`
Autentica operadores setoriais ou administradores e gera token JWT unificado.
- **Rate Limit:** 30 tentativas por IP a cada 15 minutos.
- **Corpo da Requisição (Body):**
  ```json
  {
    "username": "admin",
    "password": "sua_senha_aqui"
  }
  ```
- **Resposta de Sucesso (`200 OK`):**
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "admin",
      "name": "Administrador Geral PMDC",
      "role": "admin",
      "secretariaId": 1,
      "secretariaNome": "Secretaria Municipal de Governo"
    }
  }
  ```

### `GET /api/auth/me`
Retorna a sessão ativa a partir do token enviado.
- **Autenticação:** Obrigatória (JWT).
- **Resposta (`200 OK`):** Objeto com dados do usuário autenticado.

---

## 3. Módulo Hub Central Integrador (`/api/hub`)

### `GET /api/hub/stats`
Consolida métricas em tempo real dos dois bancos de dados (MySQL e SQLite).
- **Autenticação:** Pública.
- **Resposta (`200 OK`):**
  ```json
  {
    "success": true,
    "timestamp": "2026-10-20T12:00:00.000Z",
    "resumo": {
      "totalServicos": 372,
      "totalEquipamentos": 466,
      "totalSecretarias": 18,
      "totalCategorias": 19,
      "totalDistritos": 4,
      "totalBairros": 118,
      "totalHubs": 12
    },
    "graficos": {
      "servicosPorSecretaria": [ ... ],
      "equipamentosPorDistrito": [ ... ],
      "equipamentosPorMacrosetor": [ ... ]
    }
  }
  ```

### `GET /api/hub/search?q=:termo`
Busca transversal federada em serviços (MySQL) e prédios públicos (SQLite).
- **Autenticação:** Pública.
- **Parâmetros Query:** `q` (mínimo de 2 caracteres).
- **Resposta (`200 OK`):** Retorna lista agrupada em `results.servicos` e `results.equipamentos`.

---

## 4. Módulo Carta de Serviços (`/api/cds/*`)

### Endpoints Públicos (Cidadão)
- **`GET /api/cds/services/public`**: Lista serviços publicados com filtros opcionais (`q`, `secretaria_id`, `categoria_id`).
- **`GET /api/cds/services/public/:id`**: Detalhes completos do serviço para visualização do cidadão.
- **`GET /api/cds/services/categories`**: Lista todas as categorias de serviços públicas.

### Endpoints Administrativos e Operacionais (JWT Obrigatório)
- **`GET /api/cds/services`**: Lista serviços. Se `editor`, filtra automaticamente para a secretaria do operador; se `admin`, retorna todos.
- **`GET /api/cds/services/:id`**: Detalha um serviço com etapas, documentos, telefones, e-mails, links e prioridades.
- **`POST /api/cds/services`**: Cria novo serviço com persistência atômica em transação.
- **`PUT /api/cds/services/:id`**: Atualiza serviço e grava histórico granular em `service_history`.
- **`DELETE /api/cds/services/:id`**: Remove ou arquiva serviço (com validação estrita de secretaria).
- **`GET /api/cds/services/export`**: Exportação oficial para planilha Microsoft Excel (`.xlsx`).
- **`GET /api/cds/services/:id/history`**: Trilha de auditoria das alterações do serviço.

### Gestão Administrativa Setorial (`/api/cds/admin`) — Requer `admin`
- **`GET /api/cds/admin/users`**: Lista todos os operadores e administradores cadastrados.
- **`POST /api/cds/admin/users`**: Cadastra novo operador associado a uma secretaria.
- **`PUT /api/cds/admin/users/:id`**: Atualiza dados ou redefine senha do operador.
- **`DELETE /api/cds/admin/users/:id`**: Remove operador do sistema.
- **`GET /api/cds/admin/secretarias`**: Lista secretarias municipais.
- **`POST /api/cds/admin/secretarias`**: Cria nova secretaria municipal.

### Perfil e Notificações
- **`GET /api/cds/profile`**: Retorna dados cadastrais do operador autenticado.
- **`PUT /api/cds/profile`**: Atualiza perfil próprio e alteração de senha.
- **`POST /api/cds/email/send-export`**: Dispara planilha oficial por e-mail (SMTP) para destinatários indicados.

---

## 5. Módulo SIGEM — Geoprocessamento (`/api/sigem`)

### Endpoints Públicos de Consulta
- **`GET /api/sigem/equipamentos`**: Lista paginada dos 466 equipamentos da view `vw_equipamentos_consolidada`.
  - Filtros: `categoria`, `distrito`, `bairro`, `hub_id`, `secretaria_id`, `status`, `q`, `limit`, `offset`.
- **`GET /api/sigem/equipamentos/:id`**: Ficha cadastral com coordenadas WGS84, telefones e e-mails.
- **`GET /api/sigem/stats`**: Estatísticas do cadastro territorial por distrito e categoria.
- **`GET /api/sigem/distritos`**: Lista os 4 distritos municipais oficiais de Duque de Caxias.
- **`GET /api/sigem/bairros`**: Lista os 118 bairros oficiais vinculados a seus distritos.
- **`GET /api/sigem/categorias`**: Lista as categorias e macrosetores temáticos.
- **`GET /api/sigem/hubs`**: Lista os 12 polos prediais e hubs administrativos.
- **`GET /api/sigem/geocode?q=:endereco`**: Serviço de geocodificação direta via OpenStreetMap/Nominatim com validação territorial.
- **`GET /api/sigem/health`**: Verificação operacional sanitizada do banco SQLite.

### Endpoints de Gestão (Requer Autenticação JWT)
- **`POST /api/sigem/equipamentos`**: Cadastro de novo equipamento com auditoria transacional.
- **`PUT /api/sigem/equipamentos/:id`**: Atualização cadastral e geográfica com snapshot de dados anteriores e novos.
- **`DELETE /api/sigem/equipamentos/:id`**: Exclusão de equipamento com log em `auditoria`.
- **`POST /api/sigem/categorias`**: Criação de novas categorias espaciais.
- **`GET /api/sigem/auditoria`**: Relatório de trilha de auditoria do banco SQLite.
- **`POST /api/sigem/export`**: Dispara geração e sincronização de pacotes GeoJSON, CSV e KML.

---

## 6. Módulo de Mobilidade Urbana — Ônibus Tarifa Zero (`/api/onibus`)

Aliases: `/api/v1/onibus`, `/api/sigem/onibus`.

### `GET /api/onibus/resumo`
Resumo executivo do sistema de transporte público municipal Tarifa Zero.
- **Autenticação:** Pública.
- **Resposta (`200 OK`):**
  ```json
  {
    "success": true,
    "municipio": "Duque de Caxias - RJ",
    "programa": "Tarifa Zero Municipal",
    "total_linhas": 20,
    "total_paradas": 1795,
    "extensao_total_km": 482.35,
    "gratuito": true,
    "data_atualizacao": "2026-10-20T10:00:00.000Z"
  }
  ```

### `GET /api/onibus/linhas`
Lista as 20 linhas municipais com métricas de traçado e paradas.
- **Parâmetros Query:** `q` (filtro textual por número ou itinerário).

### `GET /api/onibus/linhas/:id`
Retorna detalhes completos de uma linha (`DC-01`, `02`, etc.), incluindo geometria GeoJSON e vetor ordenado de paradas.

### `GET /api/onibus/paradas`
Lista paginada das 1.795 paradas cadastradas.
- **Parâmetros Query:** `linha_id`, `direcao` (`ida` / `volta`), `q`, `page`, `limit`.

### `GET /api/onibus/geojson/rotas`
Exporta as linhas completas no formato padrão GeoJSON (`FeatureCollection` de `LineString`/`MultiLineString`).
- **Header:** `Content-Type: application/geo+json; charset=utf-8`.

### `GET /api/onibus/geojson/paradas`
Exporta todas as paradas no formato padrão GeoJSON (`FeatureCollection` de `Point`).

---

## 7. Módulo Territorial de Comunidades e Favelas (`/api/comunidades`)

Aliases: `/api/sigem/comunidades`, `/sigem/api/comunidades`, `/api/v1/comunidades`.

### `GET /api/comunidades/resumo`
Resumo executivo do diagnóstico socioterritorial de comunidades do município.
- **Autenticação:** Pública.
- **Resposta (`200 OK`):**
  ```json
  {
    "success": true,
    "total_comunidades": 102,
    "total_complexos": 11,
    "total_ruas_mapeadas": 2225,
    "total_ceps": 236,
    "por_distrito": { "1": 54, "2": 32, "3": 12, "4": 4 },
    "por_prioridade": { "ALTA": 34, "MEDIA": 42, "BAIXA": 26 }
  }
  ```

### `GET /api/comunidades/complexos`
Lista todos os 11 complexos/agrupamentos territoriais com suas respectivas cores de mapa e quantitativo de comunidades.

### `GET /api/comunidades/geojson`
Retorna a camada GeoJSON completa (`FeatureCollection` de `Polygon`/`MultiPolygon`) com propriedades estilizadas por cor de complexo, centroides, IDS e prioridade.
- **Header:** `Content-Type: application/geo+json; charset=utf-8`.

### `GET /api/comunidades/ponto?lat={latitude}&lon={longitude}`
Algoritmo Point-in-Polygon (Ray-Casting) para identificar se uma coordenada geográfica está contida nos limites de alguma comunidade.

### `GET /api/comunidades`
Lista paginada de comunidades com filtros avançados.
- **Parâmetros Query:**
  - `q`: Busca textual por nome da comunidade ou bairro.
  - `complexo`: Filtrar por código ou nome de complexo (Ex: `MANGUEIRINHA`, `LIXAO`).
  - `distrito`: Filtrar por número do distrito (`1`, `2`, `3`, `4`).
  - `prioridade`: Filtrar por prioridade social (`ALTA`, `MEDIA`, `BAIXA`).
  - `page`: Número da página (padrão: 1).
  - `limit`: Quantidade por página (padrão: 50, máx: 150).

### `GET /api/comunidades/limite-municipal`
Exporta a delimitação vetorial do contorno municipal oficial de Duque de Caxias (`Duque_de_Caxias.geojson`).
- **Header:** `Content-Type: application/geo+json; charset=utf-8`.

### `GET /api/comunidades/cep-lookup/:cep`
Consulta instantânea no dicionário local de 64+ faixas de CEP de referência com logradouro, bairro, cidade, UF e código IBGE.

### `GET /api/comunidades/:id`
Ficha técnica completa da comunidade por ID (1 a 105):
- Dados cadastrais, IDS oficial e classe de prioridade da apresentação executiva.
- Centroide geográfico e limites GeoJSON.
- Vetor completo de nomes de ruas e becos internos.
- Faixas de CEP vinculadas.
- Lista de equipamentos públicos em um raio de 1 km.

### `GET /api/comunidades/:id/ruas`
Lista paginada de vias e logradouros internos da comunidade.
- **Parâmetros Query:** `q` (busca textual na rua), `page`, `limit`.

---

## 8. API Externa para Terceiros e Desenvolvedores (`/api/v1` e `/api/public`)

Projetada para integração com sistemas parceiros, aplicativos de terceiros e órgãos estaduais/federais.

### Gestão Direta de Chaves no Portal (`/docs`)
- **`GET /api/v1/chaves`**: Lista todas as chaves cadastradas e suas métricas de uso.
- **`POST /api/v1/chaves`**: Gera e ativa instantaneamente uma nova chave permanente `pmdc_live_<hex>`.
- **`DELETE /api/v1/chaves/:id`**: Revoga e exclui permanentemente uma chave de API.

### Endpoints Protegidos por Chave de API (`requireApiKey`)
O cliente deve enviar o cabeçalho `x-api-key: <sua_chave>` ou query parameter `?apiKey=<sua_chave>`.

| Método | Endpoint | Descrição |
| :--- | :--- | :--- |
| `GET` | `/api/v1/me` | Retorna metadados da chave, limites e requisições consumidas hoje. |
| `GET` | `/api/v1/servicos` | Catálogo de serviços paginado com filtros avançados (`q`, `secretaria`, `canal`, etc.). |
| `GET` | `/api/v1/servicos/:id` | Ficha técnica e estruturada de um serviço público municipal. |
| `GET` | `/api/v1/equipamentos` | Lista paginada dos 466 equipamentos públicos com coordenadas WGS84. |
| `GET` | `/api/v1/equipamentos/:id` | Detalhes do equipamento, incluindo ramais e e-mails de contato. |
| `GET` | `/api/v1/comunidades` | Lista paginada das 102 comunidades e favelas com filtros por complexo/distrito. |
| `GET` | `/api/v1/comunidades/:id` | Detalhes completos da comunidade, ruas internas, CEPs e equipamentos próximos. |
| `GET` | `/api/v1/complexos` | Relação dos 11 complexos de comunidades com cores temáticas oficiais. |
| `GET` | `/api/v1/distritos` | Divisão oficial dos 4 distritos municipais. |
| `GET` | `/api/v1/bairros` | 118 bairros oficiais de Duque de Caxias. |
| `GET` | `/api/v1/secretarias` | Relação das 18 secretarias municipais. |
| `GET` | `/api/v1/hubs` | Relação dos 12 polos prediais administrativos. |
| `GET` | `/api/v1/estatisticas` | Indicadores municipais consolidados em tempo real. |

---

## 9. Gestão Administrativa de Chaves de API (`/api/admin/api-keys`)

Aliases: `/cds/api/admin/api-keys`.  
Exige autenticação JWT de Administrador (`authenticateToken` + `requireAdmin`).

- **`GET /api/admin/api-keys`**: Lista chaves de API com auditoria de volume consumido e último acesso.
- **`POST /api/admin/api-keys`**: Emite chave com quotas customizadas de requisições por minuto e por dia.
- **`PUT /api/admin/api-keys/:id/status`**: Altera status operacional da chave (`ATIVO`, `SUSPENSO`, `REVOGADO`).
- **`DELETE /api/admin/api-keys/:id`**: Exclui permanentemente a credencial.

---

## 10. Portal do Desenvolvedor e Documentação Interativa

O sistema disponibiliza documentação interativa com console de teste de requisições nos seguintes caminhos:
- `http://localhost:3032/docs`
- `http://localhost:3032/api`
- `http://localhost:3032/api/docs`
- `http://localhost:3032/api/v1/docs`

---

## 10. Endpoints de Compatibilidade Retroativa

| Rota Legada / Alias | Rota Canônica Unificada |
| :--- | :--- |
| `GET /cds/api/services` | `/api/cds/services` |
| `GET /cds/api/auth/me` | `/api/auth/me` |
| `GET /sigem/api/equipamentos` | `/api/sigem/equipamentos` |
| `GET /enderecos/api/equipamentos`| `/api/sigem/equipamentos` |
| `GET /api/v1/onibus` | `/api/onibus` |
| `GET /api/sigem/onibus` | `/api/onibus` |
| `GET /enderecos` | Redireciona via HTTP 302 para `/sigem` |
| `GET /servicos` | Redireciona via HTTP 302 para `/cds` |
