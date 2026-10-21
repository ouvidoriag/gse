# 🧪 Plano de Testes, Critérios de Aceite & Homologação
## Portal Unificado PMDC — Carta de Serviços ao Cidadão + SIGEM
**Prefeitura Municipal de Duque de Caxias — RJ**  
**Versão:** 2.1 (Atualizada com Testes de Mobilidade, API Keys e Geocodificação)  
**Data:** 20/10/2026  

---

## 1. Escopo de Testes e Abordagem

O plano de testes estabelece o roteiro para homologação e validação contínua da integridade, segurança e desempenho do Portal Unificado da PMDC. A metodologia divide-se em 4 suítes principais:

1. **Testes Funcionais:** Verificação de regras de negócio, fluxos do cidadão, mapas, mobilidade e do operador.
2. **Testes de Segurança e Autorização:** Garantia de isolamento setorial, controle de acesso RBAC e validação de Chaves de API.
3. **Testes de Integridade de Dados:** Validação de constraints, integridade de coordenadas e atomicidade de transações.
4. **Testes Operacionais e de Resiliência:** Validação de compilação TypeScript, inicialização, graceful shutdown e quotas de API.

---

## 2. Roteiro de Testes e Critérios de Aceite

### Suíte 1: Funcionalidade e Experiência do Cidadão

| ID | Cenário de Teste | Procedimento de Execução | Resultado Esperado | Status |
| :---: | :--- | :--- | :--- | :---: |
| **TF-01** | Acesso à Raiz (`/`) | Requisitar `GET http://localhost:3032/` | Deve abrir o Hub Integrado com título `"Portal Unificado — Prefeitura Municipal de Duque de Caxias"`, exibindo métricas consolidadas (372 serviços e 466 equipamentos). | **Aprovado** |
| **TF-02** | Busca Global no Hub | Digitar termo `"vacina"` na barra de busca | A API `/api/hub/search?q=vacina` deve retornar serviços relacionados no MySQL e postos de saúde correspondentes no SQLite. | **Aprovado** |
| **TF-03** | Mapa do SIGEM | Acessar `/sigem` no navegador | O mapa Leaflet deve inicializar sem erros de CSP no console, plotando os equipamentos com ícones temáticos e dados de endereço. | **Aprovado** |
| **TF-04** | Exportação de Planilha Excel | Clicar em "Exportar Planilha" no painel da Carta | O backend deve gerar dinamicamente o arquivo `.xlsx` via `exceljs` com formatação oficial. | **Aprovado** |
| **TF-05** | Filtro de Categorias no CDS | Selecionar uma categoria no menu lateral da Carta | A lista de serviços deve ser filtrada instantaneamente sem necessidade de recarregar a página. | **Aprovado** |
| **TF-06** | Linhas Ônibus Tarifa Zero | Requisitar `GET /api/onibus/linhas` | Deve retornar a lista das 20 linhas municipais com quilometragem, cores e total de paradas. | **Aprovado** |
| **TF-07** | Geocodificação Nominatim | Requisitar `GET /api/sigem/geocode?q=Centro` | Deve retornar coordenadas válidas WGS84 dentro dos limites de Duque de Caxias. | **Aprovado** |

---

### Suíte 2: Segurança, RBAC e Controle de Chaves de API

| ID | Cenário de Teste | Procedimento de Execução | Resultado Esperado | Status |
| :---: | :--- | :--- | :--- | :---: |
| **TS-01** | Acesso não autenticado no CDS | Requisitar `GET /api/cds/services` sem header de autorização | O servidor deve responder imediatamente com código HTTP `401 Unauthorized`. | **Aprovado** |
| **TS-02** | Tentativa de invasão entre Secretarias (Leitura) | Logar como operador da **Secretaria A** e tentar acessar `GET /api/cds/services/:id` pertencente à **Secretaria B** | O servidor deve responder com código HTTP `404 Not Found` (bloqueando acesso e não confirmando existência do ID). | **Aprovado** |
| **TS-03** | Tentativa de falsificação de secretaria (`Spoofing`) | Operador envia `POST /api/cds/services` injetando `secretaria_id` de outro órgão no corpo da requisição | O backend deve ignorar o campo enviado e associar o serviço estritamente ao `secretaria_id` gravado no token JWT. | **Aprovado** |
| **TS-04** | Proteção contra Força Bruta | Executar 35 tentativas consecutivas de login inválido | O limiter de login deve entrar em ação após 30 requisições, respondendo com HTTP `429 Too Many Requests`. | **Aprovado** |
| **TS-05** | Acesso à API Externa sem Chave | Requisitar `GET /api/v1/servicos` sem cabeçalho `x-api-key` | Resposta imediata com HTTP `401 Unauthorized` informando necessidade de chave. | **Aprovado** |
| **TS-06** | Quota Excedida por Chave de API | Efetuar requisições acima do `limite_req_minuto` configurado | Servidor deve bloquear as requisições excedentes retornando HTTP `429 Too Many Requests`. | **Aprovado** |
| **TS-07** | Gestão de Chaves por Não-Admin | Operador comum tentar acessar `GET /api/admin/api-keys` | Resposta imediata com HTTP `403 Forbidden` (`requireAdmin`). | **Aprovado** |

---

### Suíte 3: Integridade de Dados e Transações

| ID | Cenário de Teste | Procedimento de Execução | Resultado Esperado | Status |
| :---: | :--- | :--- | :--- | :---: |
| **TI-01** | Atomicidade de Cadastro de Serviço | Cadastrar serviço com dados válidos | A transação MySQL deve gravar simultaneamente o serviço em `services`, contatos, etapas e o registro em `service_history` em um único `commit`. | **Aprovado** |
| **TI-02** | Reversão em caso de Erro (`Rollback`) | Simular falha de conexão durante inserção de tabelas filhas | A transação deve ser abortada com `connection.rollback()`, não deixando registros órfãos. | **Aprovado** |
| **TI-03** | Integridade de Coordenadas WGS84 | Verificar latitude e longitude dos 466 equipamentos | Todos os equipamentos vinculados devem possuir coordenadas válidas (lat entre -23.0 e -22.0; lon entre -43.5 e -43.1). | **Aprovado** |
| **TI-04** | Integridade dos Arquivos GeoJSON | Validar parsing dos arquivos de rotas e paradas de ônibus | Formato GeoJSON RFC 7946 válido com 20 rotas e 1.795 pontos de parada. | **Aprovado** |

---

### Suíte 4: Operação, Build e Resiliência

| ID | Cenário de Teste | Procedimento de Execução | Resultado Esperado | Status |
| :---: | :--- | :--- | :--- | :---: |
| **TO-01** | Compilação Oficial TypeScript | Executar `npm run build` | Compilador `tsc` deve finalizar com código de saída `0`, gerando bundle íntegro na pasta `dist/`. | **Aprovado** |
| **TO-02** | Inicialização via `npm start` | Executar `npm start` em terminal limpo | Script `"prestart": "tsc"` deve garantir compilação prévia e inicializar o servidor sem erro. | **Aprovado** |
| **TO-03** | Encerramento Gracioso (`Graceful Shutdown`)| Enviar sinal `SIGINT` (Ctrl+C) ao processo | O servidor deve desvincular a porta 3032, encerrar o pool MySQL, fechar o SQLite e exibir mensagem de saída limpa. | **Aprovado** |
| **TO-04** | Resiliência a Falha do SQLite | Interromper acesso ao arquivo `.db` temporariamente | O módulo CDS no MySQL e a visualização de serviços devem continuar operando sem travar o processo Express. | **Aprovado** |

---

## 3. Critérios Finais de Aceite para Implantação

Para autorização de publicação em ambiente de produção, devem ser atendidos os seguintes requisitos:
- [x] 100% dos testes da Suíte 1 (Funcionalidade) aprovados.
- [x] 100% dos testes da Suíte 2 (Segurança e Isolamento) aprovados.
- [x] Zero erros de compilação em `npm run build`.
- [x] Backup a frio do banco SQLite e dump do MySQL executados e validados.
- [x] Endpoints sanitizados sem exposição de caminhos locais do servidor.
- [x] Quotas e telemetria de chaves de API homologadas no Portal do Desenvolvedor.
