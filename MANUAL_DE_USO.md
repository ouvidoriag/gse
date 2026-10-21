# PREFEITURA MUNICIPAL DE DUQUE DE CAXIAS
## MANUAL DE USO DO PORTAL INTEGRADO DE GESTÃO MUNICIPAL
### Sistema Unificado: Hub Central · Carta de Serviços ao Cidadão · SIGEM Cartográfico
**Versão Oficial:** 2026.1 | **Homologação:** Secretaria de Governo / Ouvidoria Geral / Modernização Administrativa

---

## SUMÁRIO EXECUTIVO

1. [Visão Geral e Finalidade](#1-visão-geral-e-finalidade)
2. [Acesso ao Sistema e Autenticação (SSO)](#2-acesso-ao-sistema-e-autenticação-sso)
3. [Navegação Global e Barra Superior](#3-navegação-global-e-barra-superior)
4. [Módulo Hub Central (Busca Transversal e BI)](#4-módulo-hub-central-busca-transversal-e-bi)
5. [Módulo Carta de Serviços ao Cidadão](#5-módulo-carta-de-serviços-ao-cidadão)
   - 5.1. Consulta ao Catálogo Oficial
   - 5.2. Cadastro de Novo Serviço
   - 5.3. Edição, Atualização e Auditoria
   - 5.4. Exportação Oficial para Planilha Excel (.xlsx)
6. [Módulo SIGEM — Cartografia e Equipamentos](#6-módulo-sigem--cartografia-e-equipamentos)
   - 6.1. Navegação no Mapa Interativo
   - 6.2. Filtros Territoriais e Categoriais
   - 6.3. Cadastro e Georreferenciamento de Equipamento
   - 6.4. Edição e Atualização de Coordenadas
   - 6.5. Relatórios Setoriais de Endereços
7. [Matriz de Perfis e Permissões de Acesso](#7-matriz-de-perfis-e-permissões-de-acesso)
8. [Perguntas Frequentes e Boas Práticas Operacionais](#8-perguntas-frequentes-e-boas-práticas-operacionais)

---

## 1. VISÃO GERAL E FINALIDADE

O **Portal Integrado da Prefeitura Municipal de Duque de Caxias (PMDC)** é a plataforma corporativa oficial de governo digital que consolida duas frentes fundamentais da administração pública municipal:

1. **Carta de Serviços ao Cidadão (Lei Federal nº 13.460/2017):**  
   Catálogo digital oficial com **372 serviços públicos** mapeados nas **18 Secretarias e Órgãos Centrais**, detalhando requisitos, documentação exigida, prazos de resposta, etapas de atendimento, taxas/gratuidade e canais de acesso.
2. **SIGEM (Sistema de Informações Geográficas e Equipamentos Municipais):**  
   Mapeamento territorial e georreferenciado de **449 equipamentos públicos** distribuídos nos **4 Distritos** e **117 Bairros** da cidade (unidades de Saúde, Educação, FUNDEC, Assistência Social, Segurança e órgãos centrais).

O Portal opera em arquitetura unificada com **Single Sign-On (SSO)**, permitindo que servidores e gestores utilizem uma única credencial institucional para gerenciar os dois módulos com rastreabilidade e segurança.

---

## 2. ACESSO AO SISTEMA E AUTENTICAÇÃO (SSO)

### 2.1. Como Acessar
1. Abra um navegador web homologado (*Google Chrome*, *Microsoft Edge* ou *Mozilla Firefox* em versão atualizada).
2. Acesse o endereço oficial do Portal Integrado (no ambiente corporativo ou `http://localhost:3032/login`).
3. A tela inicial apresentará o painel split institucional com as informações da base oficial municipal.

### 2.2. Login de Servidores e Gestores
1. No painel de acesso à direita, informe seu **Usuário / Matrícula** e a **Senha cadastrada**.
2. Clique no botão **Acessar Sistema**.
3. Em caso de sucesso, o sistema emitirá seu token de autenticação segura (**JWT**) e redirecionará automaticamente para o **Hub Central** ou para o módulo correspondente ao seu perfil de permissão.

---

## 3. NAVEGAÇÃO GLOBAL E BARRA SUPERIOR

Todas as telas do Portal contam com a **Barra de Navegação Unificada PMDC**, permitindo alternar instantaneamente entre os módulos sem necessidade de novo login:

* **Brasão Oficial da PMDC:** Localizado à esquerda; ao clicar, retorna diretamente à página inicial do Hub.
* **Menu de Módulos:**
  * **Hub Central:** Painel geral de indicadores e busca unificada.
  * **Carta de Serviços:** Gestão e catálogo de serviços públicos ao cidadão.
  * **SIGEM (Cartografia):** Mapa interativo e gerenciador de equipamentos públicos.
* **Crachá de Usuário e Perfil:** Mostra seu nome e cargo (*ex: Administrador Master*, *Gestor da Saúde*, *Gestor da Educação*).
* **Botão Sair (Logout):** Encerra sua sessão com segurança e remove o token do navegador.

---

## 4. MÓDULO HUB CENTRAL (BUSCA TRANSVERSAL E BI)

O Hub Central é o ponto de entrada da gestão integrada e oferece duas ferramentas de alta produtividade:

### 4.1. Busca Transversal Federada
A barra de pesquisa central permite consultar termos gerais com resposta em tempo real.
* **Como pesquisar:** Digite termos como `"vacinação"`, `"pediatria"`, `"iluminação"`, `"IPTU"` ou `"creche"`.
* **Resultado duplo:**
  * **Serviços Encontrados:** Lista os procedimentos formais catalogados na Carta de Serviços, com link direto para os detalhes.
  * **Equipamentos Próximos:** Lista os postos físicos, hospitais ou escolas que prestam atendimento relacionado, indicando o bairro e o link para visualização no mapa SIGEM.

### 4.2. Painel de Indicadores e Métricas
O painel de BI municipal apresenta em tempo real:
* **Total de Serviços Públicos Catalogados:** 372 serviços.
* **Total de Equipamentos Mapeados:** 449 unidades.
* **Secretarias Integradas:** 18 pastas.
* **Distribuição por Distrito:** Divisão da infraestrutura entre o 1º Distrito (Sede / Centro), 2º Distrito (Campos Elíseos), 3º Distrito (Imbariê) e 4º Distrito (Xerém).

---

## 5. MÓDULO CARTA DE SERVIÇOS AO CIDADÃO

Acessível pelo menu **Carta de Serviços** (`/cds/dashboard.html` ou `/cds/index.html`).

### 5.1. Consulta ao Catálogo
* Utilize os filtros superiores por **Secretaria**, **Público-Alvo** (*Cidadão*, *Empresa*, *Servidor*) ou **Forma de Atendimento** (*Digital*, *Presencial*, *Telefone*).
* Digite palavras-chave no campo de busca para filtrar a grade de cartões ou a tabela de serviços.
* Clique no cartão do serviço para visualizar a ficha técnica completa.

### 5.2. Cadastro de um Novo Serviço
*(Disponível para usuários com perfil de Administrador Geral ou Gestor Setorial)*

1. Clique no botão **Novo Serviço** (canto superior direito).
2. Preencha as seções obrigatórias do formulário:
   * **Identificação:** Nome oficial do serviço, Secretaria responsável e Subsecretaria/Departamento.
   * **Descrição e Finalidade:** Explicação clara e acessível sobre o objetivo do serviço.
   * **Requisitos e Documentos:** Lista de documentos obrigatórios (ex: RG, CPF, Comprovante de Residência, CNPJ).
   * **Prazos e Custos:** Prazo máximo de resposta (em dias úteis/corridos) e indicação de gratuidade ou valor de taxa pública.
   * **Etapas do Processo:** Passo a passo detalhado do que o requerente deve fazer (1º Solicitar protocolo; 2º Apresentar laudos; 3º Retirar documento).
   * **Canais de Atendimento e Locais:** Link do formulário eletrônico ou indicação dos postos de atendimento presenciais vinculados no SIGEM.
3. Clique em **Salvar Serviço**. O sistema grava os dados na base oficial MySQL e gera automaticamente o registro na trilha de auditoria.

### 5.3. Edição, Atualização e Auditoria
1. Localize o serviço desejado na listagem e clique no botão **Editar** (ícone de lápis).
2. Atualize as informações necessárias.
3. Ao salvar, o sistema registra quem realizou a alteração, a data/hora e o diferencial de dados atualizado.

### 5.4. Exportação Oficial para Planilha Excel (.xlsx)
Para prestar contas, encaminhar minutas para despachos administrativos ou reuniões de secretariado:
1. No topo da página de serviços, clique no botão verde **Exportar para Excel (.xlsx)**.
2. O sistema gerará instantaneamente um arquivo formatado com cabeçalho oficial da Prefeitura, contendo todas as 18 secretarias e os 372 serviços catalogados com seus respectivos atributos.

---

## 6. MÓDULO SIGEM — CARTOGRAFIA E EQUIPAMENTOS

Acessível pelo menu **SIGEM** (`/sigem/index.html`).

### 6.1. Navegação no Mapa Interativo
* O mapa exibe todo o território de Duque de Caxias com visualização satélite e vetorial.
* **Zoom e Navegação:** Use o scroll do mouse ou os botões `+` e `-` no canto esquerdo.
* **Clusterização:** Equipamentos próximos são agrupados em círculos numéricos que se expandem conforme o operador aproxima o zoom.
* **Popup de Informações:** Clique em qualquer marcador no mapa para abrir a ficha com nome da unidade, categoria, endereço completo, bairro e telefone.

### 6.2. Filtros Territoriais, Categoriais e por Secretaria
* **Visualização Transversal Completa:** Todo servidor autenticado de qualquer secretaria (ex: Secretaria Municipal de Saúde, Educação, etc.) **pode visualizar todos os 449 equipamentos** da cidade na tabela e no mapa SIGEM, assegurando planejamento integrado e consulta ampla.
* **Filtro por Secretaria e Botão "Meus Equipamentos":** 
  * O seletor suspenso permite filtrar a listagem por qualquer secretaria gestora oficial.
  * Servidores setoriais contam com o botão de atalho **"Meus Equipamentos (SMS / SMEDC)"**, que filtra instantaneamente as unidades sob gestão da sua pasta (ex: 95 unidades da Saúde).
* **Filtro por Setor/Categoria:**
  * Saúde (95 unidades)
  * Educação — SMEDC (209 unidades)
  * FUNDEC (35 polos)
  * Assistência Social (47 unidades)
  * Secretarias e Órgãos Centrais (33 unidades)
  * Segurança e Defesa Civil (30 unidades)
* **Filtro por Distrito:** Selecione 1º, 2º, 3º ou 4º Distrito para restringir a visualização geográfica.
* **Filtro por Bairro:** Selecione qualquer um dos 117 bairros oficiais cadastrados.

### 6.3. Cadastro de Novo Equipamento
1. Na barra lateral do SIGEM, clique em **Novo Equipamento**.
2. Preencha os campos da unidade:
   * **Nome Oficial:** Ex: *Hospital Municipal Dr. Moacyr Rodrigues do Carmo*.
   * **Categoria / Setor:** Selecione no menu suspenso.
   * **Endereço Completo:** Logradouro, Número, Complemento, Bairro e CEP.
   * **Distrito Municipal:** Selecionar o distrito correspondente (1º a 4º).
   * **Coordenadas Geográficas (Latitude e Longitude):** Podem ser inseridas manualmente ou capturadas clicando diretamente no mapa com a ferramenta de alfinete.
3. Clique em **Confirmar Cadastro**. O equipamento é salvo instantaneamente na base SQLite oficial, associado automaticamente à secretaria do servidor criador, e passa a refletir no Hub e no mapa em tempo real.

### 6.4. Edição, Atualização e Regras de Propriedade
* **Isolamento de Edição por Secretaria:** O servidor setorial só tem permissão para **editar, atualizar dados/endereço ou excluir equipamentos pertencentes à sua própria secretaria**.
* Equipamentos de outras secretarias permanecem 100% visíveis para inspeção e mapa, exibindo o botão de ação bloqueado (**<i class="ri-lock-line"></i> Bloqueado**) e uma tag com a sigla da pasta gestora (`SMS`, `SMEDC`, `SEASDIH`, etc.).
* O Administrador Geral (Master) possui privilégio irrestrito de edição sobre todos os 449 equipamentos municipais.

---

## 7. MATRIZ DE PERFIS E PERMISSÕES DE ACESSO

| Recurso / Funcionalidade | Consulta Pública / Cidadão | Gestor Setorial (Secretaria) | Administrador Geral (Master) |
| :--- | :---: | :---: | :---: |
| Consulta de Serviços da Carta | Sim | Sim (Filtrado na própria pasta) | Sim (Todas as 18 pastas) |
| Visualização de Equipamentos SIGEM | Sim (Todos os 449) | Sim (Visualiza todos os 449 da cidade) | Sim (Visualiza todos os 449 da cidade) |
| Cadastro de Serviços Públicos | Não | Sim (Vinculado à própria secretaria) | Sim (Qualquer secretaria) |
| Edição / Exclusão de Serviços | Não | Somente da própria secretaria | Todas as secretarias |
| Cadastro de Equipamentos Municipais | Não | Sim (Vinculado à própria secretaria) | Sim (Qualquer secretaria) |
| Edição / Exclusão de Equipamentos | Não | Somente equipamentos da própria pasta | Todos os 449 equipamentos |
| Exportação Oficial para Excel (.xlsx) | Não | Sim | Sim |
| Gestão de Usuários e Permissões | Não | Não | Sim |
| Visualização de Trilhas de Auditoria | Não | Não | Logs globais completos |

---

## 8. PERGUNTAS FREQUENTES E BOAS PRÁTICAS OPERACIONAIS

### 1. O que fazer se uma coordenada estiver caindo fora do município?
O sistema possui trava de validação geográfica. Caso o operador insira coordenadas fora de Duque de Caxias (limites com Rio de Janeiro, Belford Roxo, São João de Meriti, Nova Iguaçu, Magé e Petrópolis), o sistema emitirá um alerta solicitando a conferência do ponto cartográfico.

### 2. Um serviço público alterou de endereço físico. Como proceder?
1. Acesse o **SIGEM** e verifique se o prédio da unidade física já está cadastrado ou atualizado com o novo endereço.
2. Acesse a **Carta de Serviços**, abra a ficha do serviço público correspondente e atualize o vínculo com a unidade física.

### 3. As alterações feitas entram em vigor imediatamente?
Sim. O banco de dados do sistema opera em sincronia contínua. Toda atualização salva por um gestor autorizado é refletida imediatamente na consulta web, no mapa e nos relatórios de exportação.

### 4. Como solicitar suporte técnico ou liberação de novos usuários?
Entre em contato com a equipe de Governança de TI e Modernização da PMDC informando nome completo, matrícula, e-mail institucional e Secretaria de lotação do servidor a ser cadastrado.

---
**Prefeitura Municipal de Duque de Caxias**  
*Secretaria Municipal de Governo · Ouvidoria Geral · Tecnologia e Modernização Administrativa*  
Base Oficial Consolidada 2026.
