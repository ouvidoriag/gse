---
trigger: always_on
description: Exige leitura e atualização contínua do checklist.html em todas as tarefas do Portal Unificado GSE
---

# Regra Obrigatória — Checklist GSE (`checklist.html`)

1. **Leitura Obrigatória no Início:** Em toda tarefa neste projeto, leia primeiro `checklist.html` (na raiz do workspace) para consultar os 41 itens mapeados dos feedbacks da equipe, seus códigos (`g1`–`g8`, `h1`–`h7`, `i1`–`i2`, `c1`–`c7`, `s1`–`s13`, `hc1`–`hc4`) e o diagnóstico técnico atual (`audit-note`).
2. **Atualização Dupla Obrigatória:** Ao implementar ou corrigir qualquer item do checklist, atualize imediatamente `checklist.html` (raiz) **e** `public/checklist.html` (estático do Express), marcando o card como `done` (`data-audit="done"`), atualizando os contadores de resumo do topo e registrando os arquivos alterados na `.audit-note`.
3. **Atenção aos Pares de Arquivos e Rotas:**
   - Mantenha `public/cds/index.html` e `public/cds/dashboard.html` alinhados.
   - Respeite o prefixo dinâmico `/gse` nas rotas frontend e backend.
   - Mantenha consistência entre MySQL (`carta_de_servico`) e SQLite (`dados/enderecos_duque_de_caxias_v2.db`) ao corrigir cadastros do SIGEM.

