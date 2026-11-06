# Regras do Projeto GSE — Portal Unificado (PMDC)

## 1. Leitura e Sincronização Obrigatória do Checklist (`checklist.html`)

1. **SEMPRE ler o `checklist.html` antes de iniciar qualquer tarefa:**
   - Antes de analisar, planejar ou modificar código neste repositório, leia `checklist.html` na raiz do projeto para verificar o estado atual auditado dos 41 itens (`data-id`, `data-audit`: `done` / `partial` / `todo` e `audit-note`).
   - Evite retrabalho verificando o que já consta como concluído ou parcial no checklist.

2. **SEMPRE manter `checklist.html` e `public/checklist.html` sincronizados:**
   - Sempre que concluir ou atualizar qualquer item listado no checklist, atualize **ambos os arquivos** (`checklist.html` na raiz e `public/checklist.html`):
     - Atualize `data-audit="done"` e adicione a classe `done` no `.item-card` correspondente.
     - Atualize a tag de status (`✅ JÁ FEITO`) e a `.audit-note` descrevendo onde a solução foi implementada.
     - Atualize os contadores numéricos do cabeçalho (`.audit-summary` e filtros `#statusFilters`).

## 2. Regras Técnicas e Arquitetura do Repositório

- **Sincronia de Telas CDS:** O módulo Carta de Serviços serve tanto `public/cds/index.html` (`/cds`) quanto `public/cds/dashboard.html` (`/cds/dashboard.html`). Qualquer mudança estrutural de layout, sidebar ou modais no CDS deve ser aplicada em ambos os arquivos.
- **Navegação Compartilhada (`/gse` e `/`):** O projeto roda tanto na raiz (`/`) quanto sob proxy reverso em `/gse/`. Em `public/shared/nav.js` e demais scripts frontend, sempre detecte o prefixo `base` (`window.location.pathname.startsWith('/gse') ? '/gse' : ''`) antes de montar links absolutos ou chamadas de API.
- **Consistência de Bancos de Dados (SIGEM):** O backend ativo utiliza **MySQL (`carta_de_servico`)** como banco primário em tempo de execução, mantendo **SQLite (`dados/enderecos_duque_de_caxias_v2.db`)** e arquivos estáticos como espelho/fallback. Correções estruturais de dados geográficos (distritos, bairros oficiais, hubs, secretarias) devem ser aplicadas no MySQL e sincronizadas no SQLite.
- **Segurança:** Rotas administrativas (`/admin/*`, chaves de API como Google Geocoding, SMTP e parâmetros globais) devem exigir autenticação JWT válida com `role === 'admin'` no backend e ocultar controles para não-admins no frontend.
- **TypeScript Build:** Sempre valide alterações em `src/` com `npm run typecheck` (`tsc --noEmit`).

