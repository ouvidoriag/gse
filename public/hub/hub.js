/**
 * PREFEITURA DE DUQUE DE CAXIAS — HUB CENTRAL
 * Carregamento dinâmico de estatísticas e busca global unificada
 */

document.addEventListener('DOMContentLoaded', () => {
  loadHubStats();
  initGlobalSearch();
});

function getHubBasePrefix() {
  const p = window.location.pathname.toLowerCase();
  if (p.startsWith('/gse')) return '/gse';
  return '';
}

async function loadHubStats() {
  try {
    const base = getHubBasePrefix();
    const res = await fetch(`${base}/api/hub/stats`);
    if (!res.ok) throw new Error('Falha ao obter métricas da API');
    const data = await res.json();

    if (data.success && data.resumo) {
      animateValue('numServicos', data.resumo.totalServicos || 372);
      animateValue('numEquipamentos', data.resumo.totalEquipamentos || 449);
      animateValue('numDistritos', data.resumo.totalDistritos || 4);
      animateValue('numHubs', data.resumo.totalHubs || 12);
    }

    if (data.graficos && data.graficos.equipamentosPorDistrito) {
      renderDistrictBars(data.graficos.equipamentosPorDistrito);
    }
  } catch (err) {
    console.warn('Usando valores padrão de contingência:', err);
  }
}

function animateValue(id, endValue) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = 0;
  const duration = 800;
  let startTimestamp = null;

  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    el.textContent = Math.floor(progress * (endValue - start) + start).toLocaleString('pt-BR');
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };
  window.requestAnimationFrame(step);
}

function renderDistrictBars(distritos) {
  const container = document.getElementById('districtBarsContainer');
  if (!container) return;

  const maxTotal = Math.max(...distritos.map(d => d.total || 0), 1);

  container.innerHTML = distritos
    .map((d) => {
      const pct = Math.round(((d.total || 0) / maxTotal) * 100);
      return `
      <div class="district-row">
        <div class="district-info">
          <span>${d.distrito} — ${d.regiao || 'Região'}</span>
          <span><strong>${d.total}</strong> equipamentos</span>
        </div>
        <div class="district-track">
          <div class="district-fill" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
    })
    .join('');
}

function initGlobalSearch() {
  const input = document.getElementById('globalSearchInput');
  const dropdown = document.getElementById('searchResultsDropdown');
  const clearBtn = document.getElementById('clearSearchBtn');

  if (!input || !dropdown) return;

  let debounceTimer = null;

  input.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    if (clearBtn) clearBtn.style.display = val ? 'block' : 'none';

    clearTimeout(debounceTimer);
    if (val.length < 2) {
      dropdown.style.display = 'none';
      return;
    }

    debounceTimer = setTimeout(() => {
      fetchSearchResults(val);
    }, 250);
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      input.value = '';
      clearBtn.style.display = 'none';
      dropdown.style.display = 'none';
      input.focus();
    });
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      dropdown.style.display = 'none';
    }
  });

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });
}

async function fetchSearchResults(query) {
  const dropdown = document.getElementById('searchResultsDropdown');
  if (!dropdown) return;

  try {
    dropdown.innerHTML = '<div style="padding:12px;color:#64748b;font-size:13px;">Buscando em serviços e equipamentos...</div>';
    dropdown.style.display = 'block';

    const base = getHubBasePrefix();
    const res = await fetch(`${base}/api/hub/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();

    const servicos = data.results?.servicos || [];
    const equipamentos = data.results?.equipamentos || [];

    if (servicos.length === 0 && equipamentos.length === 0) {
      dropdown.innerHTML = '<div style="padding:14px;color:#64748b;font-size:13px;">Nenhum serviço ou equipamento encontrado para esta busca.</div>';
      return;
    }

    let html = '';

    if (servicos.length > 0) {
      html += `
        <div class="search-group-title" style="display:flex;align-items:center;gap:6px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
          Serviços Municipais
        </div>`;
      servicos.forEach((s) => {
        const sName = s.name || s.title || '';
        html += `
          <a href="${base}/cds/index.html?q=${encodeURIComponent(sName)}" class="search-item">
            <div>
              <div class="search-item-title">${escapeHtml(sName)}</div>
              <small style="color:#64748b;font-size:11px;">${escapeHtml(s.secretaria || '')}</small>
            </div>
            <span class="search-item-badge">Carta de Serviços</span>
          </a>
        `;
      });
    }

    if (equipamentos.length > 0) {
      html += `
        <div class="search-group-title" style="display:flex;align-items:center;gap:6px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" x2="9" y1="3" y2="18"/><line x1="15" x2="15" y1="6" y2="21"/></svg>
          Equipamentos Públicos (SIGEM)
        </div>`;
      equipamentos.forEach((eq) => {
        html += `
          <a href="${base}/sigem/index.html?q=${encodeURIComponent(eq.nome)}" class="search-item">
            <div>
              <div class="search-item-title">${escapeHtml(eq.nome)}</div>
              <small style="color:#64748b;font-size:11px;">${escapeHtml(eq.bairro || '')} • ${escapeHtml(eq.categoria || '')}</small>
            </div>
            <span class="search-item-badge" style="background:#fef3c7;color:#92400e;">Equipamento</span>
          </a>
        `;
      });
    }

    dropdown.innerHTML = html;
  } catch (err) {
    dropdown.innerHTML = '<div style="padding:12px;color:#ef4444;font-size:13px;">Erro ao consultar resultados.</div>';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
