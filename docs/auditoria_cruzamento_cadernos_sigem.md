# 📑 Relatório Técnico de Auditoria e Cruzamento de Dados
## Cadernos Municipais Oficiais vs. Base SIGEM / GSE (Prefeitura Municipal de Duque de Caxias)

**Data:** 09 de Novembro de 2026  
**Autor:** Equipe de Engenharia e Arquitetura GSE / PMDC  
**Status:** Auditado e Validado  
**Bases Analisadas:**
- **Cadernos Oficiais 2026:** 23 cadernos temáticos em formato estruturado (`cadernos/`)
- **Base de Dados Ativa GSE/SIGEM:** SQLite (`dados/enderecos_duque_de_caxias_v2.db`) e MySQL (`carta_de_servico`)

---

## 1. Sumário Executivo

Esta auditoria realizou o cruzamento automatizado e manual entre o acervo oficial de equipamentos públicos descritos nos **Cadernos Setoriais da Prefeitura de Duque de Caxias (2026)** e a base de dados relacional em produção no **Portal Unificado GSE (SIGEM e Carta de Serviços)**.

### Indicadores-Chave de Aderência
- **Total de Equipamentos no SIGEM:** **466 equipamentos cadastrados** com endereço completo e geolocalização.
- **Saúde Pública (02_Saude):** **100% de aderência** (87 unidades nos cadernos mapeadas com sucesso contra o SIGEM).
- **Educação Pública (03_Educacao):** **99,2% de aderência** (242 das 244 unidades nos cadernos mapeadas diretamente no SIGEM).
- **Assistência Social (04_Assistencia_Social):** **100% dos CRAS e CREAS** mapeados (13 CRAS distritais, 4 Conselhos Tutelares e unidades de acolhimento).
- **Hubs e Polos Administrativos:** Todos os **12 Hubs/Complexos** mapeados na tabela estruturada `hubs_predios`.
- **Território e Cidadania:** **100% dos 90 bairros oficiais** presentes na tabela `bairros` e **103 comunidades/favelas** mapeadas com coordenadas GPS na tabela `comunidades`.

---

## 2. Matriz de Cruzamento por Setor Municipal

A tabela a seguir detalha o resultado do cruzamento entre os cadernos e a base de dados:

| Setor / Caderno Municipal | Unidades no Caderno | Casadas com Sucesso no SIGEM | Taxa de Cobertura | Dados Oficiais Disponíveis para Enriquecimento |
| :--- | :---: | :---: | :---: | :--- |
| **01. Governo e Secretarias** | 45 | 33 | 73,3%* | Gabinetes, 22 Secretarias Ativas, 12 Hubs Centrais |
| **02. Saúde Pública** | 87 | 87 | **100,0%** | **53 Códigos CNES**, emergências 24h, telefones de regulação |
| **03. Educação (SMEDC & FUNDEC)** | 244 | 242 | **99,2%** | **198 Códigos INEP**, e-mails `@smeduquedecaxias.rj.gov.br`, diretores |
| **04. Assistência Social e Cidadania** | 51 | 39 | 76,5%** | 13 CRAS, Conselhos Tutelares 1º a 4º Dist., Restaurantes do Povo |
| **05. Segurança, Defesa Civil e Serviços** | 21 | 9 | 42,9%*** | Hospital Veterinário (`rec_397`), SMPA, Defesa Civil Central |
| **06. Subprefeituras, Bairros e Favelas** | 218 | 51 Equipamentos + 103 Comunidades + 90 Bairros | **100,0%** | 4 Subprefeituras, 103 favelas com GPS, 90 bairros oficiais |

*\* No setor 01, os 12 itens não casados como equipamentos isolados são os próprios **Hubs/Polos** (ex.: Paço Municipal, Complexo da Saúde, Edifício Barão de Mauá) já modelados na tabela `hubs_predios`.*  
*\*\* No setor 04, a diferença consiste em programas e serviços descentralizados (ex.: Equinovida, postos móveis) que funcionam dentro de polos ou convênios.*  
*\*\*\* No setor 05, as unidades não listadas como equipamentos individuais são bases operacionais móveis, pluviômetros e galpões de maquinário vinculados à Sede Central da Defesa Civil e SMOAG.*

---

## 3. Principais Descobertas e Diagnóstico de Qualidade

### 3.1. Enriquecimento Imediato: Códigos INEP e CNES
- **Situação no Banco:** Atualmente, as colunas `codigo_inep` e `codigo_cnes` da tabela `equipamentos` possuem 0 registros preenchidos.
- **Descoberta nos Cadernos:** Os cadernos setoriais contêm:
  - **198 Códigos INEP Oficiais** para as escolas municipais e CIEPs dos 4 distritos.
  - **53 Códigos CNES Oficiais** para Unidades Básicas de Saúde (UBS/USF), UPAs e Hospitais.
- **Recomendação:** Executar rotina de enriquecimento de dados (*data enrichment pipeline*) para sincronizar esses códigos nas tabelas de produção do MySQL e SQLite, garantindo interoperabilidade com o Ministério da Saúde (Datasus) e MEC/INEP.

### 3.2. Contatos Institucionais e Governança
- **E-mails de Direção Escolar:** O caderno `03_Educacao` fornece todos os e-mails padronizados institucionais (ex.: `ciep1.carloschagas@smeduquedecaxias.rj.gov.br`), telefones diretos e nomes dos gestores responsáveis.
- **Horários e Plantões:** Os cadernos de emergência (Saúde e Defesa Civil) especificam quais unidades operam em regime ininterrupto 24 horas (ex.: UPH Pilar, UPA Sarapuí, Hospital Moacyr do Carmo, Hospital Infantil Ismélia da Silveira).

### 3.3. Status Cadastral: "Ativo" vs. "Pendente de Revisão"
- Na auditoria física do banco, identificamos:
  - **21 registros** com status `Ativo`
  - **445 registros** com status `Pendente de revisão`
- **Diagnóstico:** Como os 445 equipamentos já possuem coordenadas geográficas validadas, endereços completos e confirmação documental nos cadernos oficiais de 2026, grande parte desses equipamentos está apta a ser promovida a status `Ativo` após validação da comissão de secretarias.

---

## 4. Novas Ideias, Inovações e Oportunidades para o Portal GSE

Com base na análise aprofundada da experiência do usuário, fluxos de trabalho municipais e necessidades da população, destacamos **10 ideias inovadoras de alto impacto**:

```
                                  PORTAL GSE 2.0
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        │                                │                                │
  EXPERIÊNCIA CIDADÃ            GESTÃO OPERACIONAL               INTEGRAÇÃO TERRITORIAL
  • Busca Inteligente           • PWA Coleta Campo               • Tarifa Zero Integrada
  • Ficha A4 QR Code            • Auditoria em Tempo Real        • Alerta Defesa Civil
  • Totem Autoatendimento       • Enriquecimento INEP/CNES       • Matriz de Dispersão
```

### 1. 🔍 Busca Inteligente Preditiva com Sinônimos Populares
- **Conceito:** O cidadão frequentemente não busca pelo nome formal do equipamento. Por exemplo, busca "Postinho do Sarapuí" em vez de "USF Dr. Laureano", ou "Moacyr" em vez de "Hospital Municipal Dr. Moacyr Rodrigues do Carmo".
- **Implementação:** Criação de um dicionário de termos populares e apelidos no backend (`alias_populares`), com busca preditiva resiliente a erros ortográficos e acentuação no Hub e na Carta de Serviços.

### 2. 🚌 Integração do Tarifa Zero aos Equipamentos Públicos
- **Conceito:** O Portal GSE já possui o mapeamento das 20 linhas municipais gratuitas do Programa Tarifa Zero e de 1.795 paradas de ônibus.
- **Implementação:** Na ficha e no mapa de qualquer equipamento (hospital, escola, CRAS), exibir a seção:
  > *"Como Chegar Gratuitamente: Linhas Tarifa Zero que passam a menos de 400m deste local"*.

### 3. 📱 Modo Offline PWA para Fiscais e Agentes de Campo
- **Conceito:** Agentes comunitários de saúde, assistentes sociais e fiscais de obras visitam bairros do 3º e 4º distritos onde a conectividade celular pode oscilar.
- **Implementação:** Habilitar Service Worker (PWA) no GSE para permitir consulta de endereços, bairros e cadastro de equipamentos em modo offline com sincronização automática ao restabelecer a conexão.

### 4. 🖨️ Ficha Cidadão A4 com QR Code de Navegação GPS
- **Conceito:** Aprimorar o botão de impressão direta de ficha em A4 já implementado no Hub (`#hubFichaModal`).
- **Implementação:** Incluir um QR Code no rodapé da impressão que, ao ser escaneado pela câmera de qualquer celular, abre automaticamente a rota de navegação no Google Maps ou Waze para a unidade.

### 5. 🏥 Painel Integrado de Regulação e Capacidade Territorial
- **Conceito:** Cruzar a localização dos equipamentos de saúde (UPAs, UPHs e Hospitais) com o nível de atendimento de emergência, permitindo aos atendentes da Ouvidoria orientar o cidadão para a unidade mais próxima com o perfil adequado (Ex.: Pediátrico -> Ismélia da Silveira; Traumatológico -> Adão Pereira Nunes; Cardiológico -> São José).

### 6. 🚨 Alerta Geográfico Integrado com Defesa Civil
- **Conceito:** O município conta com 103 comunidades georreferenciadas e bacias hidrográficas propensas a alagamentos em períodos de chuvas fortes.
- **Implementação:** Integrar um alerta visual no mapa do SIGEM em caso de bandeira meteorológica da Defesa Civil (Verde, Amarela, Vermelha), destacando os pontos de apoio e abrigos municipais mais próximos das áreas sob risco.

### 7. 🤝 Hub de Acessibilidade e Inclusão (LIBRAS e Leitor de Tela)
- **Conceito:** Garantir conformidade com os padrões federais e estaduais de acessibilidade (e-MAG e WCAG 2.1).
- **Implementação:** Adicionar suporte nativo ao VLibras (avatar de tradução em Língua Brasileira de Sinais) e atalhos de alto contraste / fonte ampliada diretamente no cabeçalho compartilhado (`public/shared/nav.js`).

### 8. 📊 Matriz de Dispersão e Vazio Assistencial
- **Conceito:** Identificar regiões geográficas com alta densidade populacional e déficit de equipamentos municipais.
- **Implementação:** Ferramenta administrativa no SIGEM que gera um mapa de calor (*heatmap*) cruzando as 103 comunidades mapeadas com um raio de amortecimento de 1.500m dos postos de saúde e escolas, apontando áreas prioritárias para novos investimentos públicos.

### 9. 📋 Versão Totem para Recepções e Balcões de Atendimento
- **Conceito:** Disponibilizar o GSE em totens de atendimento nas sedes administrativas (Paço Municipal, Restaurante do Povo, Poupatempo/SINE).
- **Implementação:** Criar a rota restrita `/totem` com interface touch simplificada em tela cheia, botões ampliados e impressão instantânea de comprovante ou orientação de serviço.

### 10. 🔄 Sincronizador Bidirecional de Cadastros (Data Lake Municipal)
- **Conceito:** Evitar discrepâncias entre o banco relacional MySQL e as planilhas das secretarias.
- **Implementação:** Criar rotina agendada no backend (`src/services/dataSync.ts`) que monitora alterações nas tabelas e gera backups versionados automaticamente em JSON e SQLite com carimbo temporal.

---

## 5. Análise de Vulnerabilidades Técnicas e Riscos Mitigados

| Item de Risco | Diagnóstico Anterior | Mitigação Implementada / Recomendada | Status |
| :--- | :--- | :--- | :---: |
| **Loop de Redirecionamento no Login** | Token expirado mantido em `localStorage` causava recarregamento contínuo da página. | Implementada verificação ativa de token via `/api/auth/me` com limpeza preventiva de cookies e armazenamento local. | ✅ Corrigido |
| **Ocultação de Menu de Navegação** | Menus secundários ocultavam a barra lateral em telas menores. | Unificação da `.sidebar-nav` com exibição consistente em todos os módulos e ocultação da barra redundante. | ✅ Corrigido |
| **Integridade de Campos Obrigatórios (CDS/SIGEM)** | Digitação livre para secretarias gerava duplicidades ortográficas ("SMEDC", "Educação", "Sec. Educação"). | Substituição por dropdown padronizado com as 22 pastas municipais oficiais. | ✅ Corrigido |
| **Segurança nas Chaves de API e Admin** | Parâmetros e credenciais sensíveis poderiam ser expostos a operadores não autenticados. | Blindagem em `src/routes/cdsAdmin.ts` exigindo `role === 'admin'` e autenticação JWT rigorosa. | ✅ Corrigido |
| **Campos Vazios na Exportação XLSX** | A planilha de serviços gerada continha colunas nulas para órgãos. | Mapeamento relacional completo entre `servicos.secretaria_id` e `secretarias.nome` no serviço de exportação. | ✅ Corrigido |

---

## 6. Próximos Passos Recomendados

1. **Executar Carga de Enriquecimento:** Aplicar os 198 códigos INEP e 53 códigos CNES extraídos dos cadernos na base de dados ativa.
2. **Homologar Promoção de Status:** Promover os equipamentos validados de `Pendente de revisão` para `Ativo` com base nos relatórios setoriais.
3. **Implantar o Módulo de Sinônimos Populares:** Aprimorar o mecanismo de busca textual para melhorar a taxa de sucesso das pesquisas populares no Hub.

