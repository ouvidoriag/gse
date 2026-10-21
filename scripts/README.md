# 🛠️ Scripts Oficiais e Operacionais — SIGEM V2

Este diretório contém exclusivamente as **ferramentas oficiais e ativas** para operação, teste e exportação da arquitetura unificada da Carta de Serviços e SIGEM.

---

## 📋 Ferramentas Oficiais em Produção

| Script | Linguagem | Finalidade | Como Usar |
| :--- | :--- | :--- | :--- |
| **`test_all.js`** | Node.js | **Executor Unificado (Test Runner):** Executa bateria consolidada de todas as suítes e emite relatório executivo de homologação. | `npm run test:all`<br>*(ou `node scripts/test_all.js`)* |
| **`exportador_central.js`** | Node.js | **Motor Oficial de Exportação:** Gera atomicamente a base mestre (JSON/CSV) e os 6 CSVs setoriais diretamente da view `vw_equipamentos_consolidada` do SQLite com validação estrita (circuit-breaker). | `npm run export:sigem`<br>*(ou `node scripts/exportador_central.js`)* |
| **`check_full_integrity.js`** | Node.js | **Checagem de Integridade Completa:** Valida a integridade referencial dos bancos MySQL (CDS) e SQLite (SIGEM). | `npm run check:db`<br>*(ou `node scripts/check_full_integrity.js`)* |
| **`test_cds_and_hub.js`** | Node.js | **Bateria de Testes CDS & Hub:** Valida endpoints do Hub Geral, rotas da Carta de Serviços e busca unificada. | `npm test`<br>*(ou `npm run test:cds`)* |
| **`test_crud_and_auth.js`** | Node.js | **Bateria de Testes SIGEM:** Valida health check da API, login administrativo, autenticação JWT, CRUD completo e logs de auditoria. | `npm run test:sigem`<br>*(ou `node scripts/test_crud_and_auth.js`)* |
| **`test_independent_audit.js`** | Node.js | **Auditoria Técnica Independente:** Prova matemática de partição dos 6 setores (zero omissão/sobreposição), segurança de rotas, circuit-breaker e backup a quente do SQLite. | `npm run audit:sigem`<br>*(ou `node scripts/test_independent_audit.js`)* |
| **`test_external_api.js`** | Node.js | **Testes de Integração de API Externa:** Valida autenticação por API Key, rate-limit por tiers e endpoints públicos de dados abertos. | `npm run test:external`<br>*(ou `node scripts/test_external_api.js`)* |
| **`test_secretaria_perm.js`** | Node.js | **Testes de Permissões e Isolamento Setorial:** Valida permissões e restrições por perfil/secretaria. | `npm run test:perm`<br>*(ou `node scripts/test_secretaria_perm.js`)* |
| **`test_geocoding_service.js`** | Node.js | **Validação de Geocodificação:** Testa a precisão e segurança dos serviços de coordenadas geográficas. | `npm run test:geo`<br>*(ou `node scripts/test_geocoding_service.js`)* |
| **`gerar_api_key.js`** | Node.js | **Gerador CLI de API Keys:** Gera e registra chaves de acesso para integração externa de órgãos parceiros. | `node scripts/gerar_api_key.js "Nome" "email@dominio.com"` |

---

> ℹ️ **Nota de Governança:** Scripts temporários de migração preliminar, scrapers antigos e rotinas de teste descartáveis foram expurgados em definitivo do repositório para manter a base enxuta, segura e estritamente operacional. Qualquer novo script de teste ou operação deve ser adicionado ao `package.json` e documentado nesta tabela.

