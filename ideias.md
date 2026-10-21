# 💡 Caderno Estratégico de Ideias, Melhorias & Evolução
## Portal Unificado PMDC — SIGEM, Carta de Serviços & Inteligência Territorial
**Prefeitura Municipal de Duque de Caxias — RJ**  
*Documento vivo de planejamento estratégico, arquitetura de sistemas e inovação tecnológica municipal.*

---

## 📌 Sumário Executivo
Este documento consolida a visão de futuro, o roadmap de engenharia de software e as oportunidades de inovação para o **Portal Unificado PMDC**. Ele transforma dados cadastrais e espaciais estáticos em uma **plataforma ativa de suporte a decisões estratégicas** para o Gabinete do Prefeito, secretários e cidadãos caxienses.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   ECOSSISTEMA INTEGRADO PMDC 2026                      │
├──────────────────┬───────────────────┬─────────────────────────────────┤
│ 🗺️ SIGEM         │ 📋 Carta Serviços │ 🧠 Análise Territorial         │
│ 466 Equipamentos │ 368 Serviços      │ 102 Comunidades & 118 Bairros   │
│ 2.225 Logradouros│ 18 Secretarias    │ Simulação & Diagnóstico Ativo   │
└──────────────────┴───────────────────┴─────────────────────────────────┘
```

---

## 🚀 1. Melhorias Imediatas (Curto Prazo — Quick Wins)

### 1.1 Análise Territorial & Geoprocessamento
- [ ] **Isócronas de Caminhabilidade Real (em vez de raio euclidiano simples):**
  - *Contexto:* O raio euclidiano (círculo de 300m ou 500m) ignora barreiras físicas como a Rodovia Washington Luís (BR-040), a Linha Férrea da SuperVia e rios como o Sarapuí e Iguaçu.
  - *Evolução:* Integrar a malha viária oficial das 2.225 ruas cadastradas para traçar **polígonos de caminhabilidade de 5, 10 e 15 minutos a pé** (*isochrones*).
- [ ] **Filtro de Sobreposição Dinâmico por Tipo:**
  - Permitir filtrar no painel inteligente quais equipamentos devem gerar alertas de sobreposição (ex: mostrar apenas quando duas creches estão a menos de 400m de distância).
- [ ] **Exportação de Relatórios de Diagnóstico Socioterritorial em PDF/Executivo:**
  - Botão no painel para gerar um relatório resumido pronto para impressão com mapa, KPIs de cobertura por distrito e comunidades desassistidas para subsidiar ofícios e reuniões de secretariado.

### 1.2 Mobilidade Urbana & Programa Tarifa Zero
- [ ] **Cálculo de Cobertura das 16 Linhas Tarifa Zero:**
  - Cruzar as 16 rotas e dezenas de paradas de ônibus gratuitas com as escolas municipais e postos de saúde, identificando quais equipamentos públicos já contam com transporte gratuito na porta.
- [ ] **Filtro de Linha e Sentido:**
  - Permitir ao usuário isolar uma rota específica (ex: Linha Circular Central, Linha Xerém) com itinerário destacado e pontos de embarque.

### 1.3 Experiência do Usuário (UX/UI)
- [ ] **Modo Satélite HD com Alternância Rápida:**
  - Facilitar a inspeção de telhados e acessos viários com fotos aéreas integradas do ArcGIS World Imagery / Google Hybrid.
- [ ] **Geolocalização do Cidadão ("O que há perto de mim?"):**
  - Botão no mapa para capturar a localização GPS do usuário (celular/navegador) e listar os 5 equipamentos mais próximos com rotas traçadas.

---

## 🧠 2. Inovações Estratégicas (Médio Prazo — 3 a 6 meses)

### 2.1 Integração de Dados com Ouvidoria & Serviços Urbanos (Fala.BR / SMGOV)
- **Cruzamento Espacial de Demandas da População:**
  - Plotar chamados de ouvidoria (tapa-buraco, iluminação pública apagada, limpeza de bueiros, falta d'água) no mesmo mapa dos equipamentos e comunidades.
  - **Impacto:** O secretário de Obras ou Serviços Públicos pode ver se uma escola ou UBS está isolada por problemas de infraestrutura viária no entorno.

### 2.2 PWA & Modo Offline para Agentes Comunitários (ACS / Educação)
- **App de Campo 100% Funcional sem Internet:**
  - Transformar o SIGEM em uma *Progressive Web App* (PWA) instalável no celular e tablet.
  - Sincronização em segundo plano via Service Workers e IndexedDB para permitir que os Agentes Comunitários de Saúde (ACS) consultem e validem endereços nas 102 comunidades, mesmo nas áreas do 3º e 4º distritos onde não há sinal estável de 4G.

### 2.3 Busca Semântica por Inteligência Artificial na Carta de Serviços
- **"Caxias Responde" (Atendimento Conversacional ao Cidadão):**
  - Em vez de pesquisar pelo nome formal do serviço (ex: *"DEX-04 - Declaração de Vacinação"*), o cidadão pode digitar dúvidas cotidianas:
    - *"Como matriculo meu filho na creche perto do Pilar?"*
    - *"Perdi meus documentos no temporal, onde tiro 2ª via gratuita?"*
  - O sistema compreende a intenção, busca a secretaria responsável no MySQL, localiza o ponto de atendimento no SQLite e responde de forma humanizada com endereço, horário e telefone.

---

## 🏛️ 3. Grandes Evoluções Institucionais (Longo Prazo — 6 a 12 meses)

### 3.1 Painel da Sala de Situação e Decisão Governamental (Gabinete do Prefeito)
- **Painel Executivo de Indicadores de Gestão (Cockpit):**
  - Visão gerencial em tempo real para o Gabinete do Prefeito:
    - Índice de Cobertura de Creches por Distrito (Meta do PME).
    - Tempo médio de resposta da Ouvidoria por Bairro.
    - Mapa de calor de investimentos e reformas em andamento por Secretaria.
- **Simulador de Orçamento Territorial:**
  - Na ferramenta de *Simular Novo Equipamento*, calcular a estimativa de população atendida, impacto social e cruzamento com o Plano Plurianual (PPA).

### 3.2 Integração com Base Cadastral do IPTU e Georreferenciamento de Imóveis
- Cruzar a malha de 2.225 logradouros oficiais com a base imobiliária da Secretaria Municipal de Fazenda (SMF) para detecção de inconsistências de numeração e valorização imobiliária por proximidade a equipamentos públicos.

### 3.3 Barramento de APIs Abertas (Dados Abertos de Duque de Caxias)
- Disponibilizar um portal público de dados abertos para universidades (UNIGRANRIO, UFRJ, FEUDUC), pesquisadores e desenvolvedores locais consumirem as APIs públicas com documentação OpenAPI/Swagger interativa já existente em `/api`.

---

## 📋 4. Checklist de Arquitetura & Governança de TI

| Eixo | Situação Atual | Meta de Evolução | Prioridade |
| :--- | :--- | :--- | :--- |
| **Banco de Dados** | SQLite V2 (466 equips) + MySQL 8 (368 serviços) | Read-Replica com sincronização automática | Média |
| **Qualidade de Dados** | 466 registros calibrados (0 duplicatas) | Rotina quinzenal automatizada de integridade via GitHub Actions | Alta |
| **Segurança** | JWT + Rate Limiting + Hash bcrypt | 2FA (Autenticação em Duas Etapas) para painel administrativo | Alta |
| **Geometrias** | Polígonos GeoJSON (102 comunidades, 118 bairros) | Servidor PostGIS / GeoServer para camadas vetoriais pesadas | Longo Prazo |
| **Backups** | Snapshots atômicos em `dados/backups` | Armazenamento automatizado em bucket na nuvem (S3 / Azure) | Alta |

---

## ✍️ Registro de Decisões e Contribuições
*Use este espaço para registrar novas demandas levantadas pelas Secretarias ou sugestões da equipe técnica:*

- **Data:** 20/10/2026 — *Equipe de TI & Geoprocessamento PMDC*
  - Implementada a versão 1.0 do **Módulo de Análise Territorial Inteligente**, com cálculo automático de raio de atendimento (300m a 2.000m), diagnóstico de cobertura nas 102 comunidades e ferramenta interativa de simulação de novas unidades.
