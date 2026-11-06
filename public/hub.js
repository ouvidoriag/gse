/**
 * PREFEITURA DE DUQUE DE CAXIAS — HUB CENTRAL
 * Carregamento dinâmico de estatísticas e busca global unificada
 */

document.addEventListener('DOMContentLoaded', () => {
  initHubPermissions();
  loadHubStats();
  initGlobalSearch();
});

function initHubPermissions() {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    const govCard = document.getElementById('hubCardGovernancaAdmin');
    if (govCard && u.role !== 'admin') {
      govCard.style.display = 'none';
    }
  } catch (_) {}
}

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
      const r = data.resumo;
      const totSrv = r.totalServicos || 368;
      const totEqp = r.totalEquipamentos || 466;
      animateValue('numServicos', totSrv);
      animateValue('numEquipamentos', totEqp);
      animateValue('numDistritos', r.totalDistritos || 4);
      animateValue('numHubs', r.totalHubs || 12);

      const setTxt = (id, val) => {
        const el = document.getElementById(id);
        if (el && val !== undefined && val !== null) el.textContent = val;
      };
      setTxt('heroNumServicos', `${totSrv.toLocaleString('pt-BR')} serviços oficiais`);
      setTxt('heroNumEquipamentos', `${totEqp.toLocaleString('pt-BR')} equipamentos públicos`);
      setTxt('hintSecretarias', `${r.totalSecretarias || 18} Secretarias Ativas`);
      setTxt('hintBairros', `${r.totalBairros || 111} Bairros Mapeados`);
      setTxt('instTotalCategorias', (r.totalCategorias || 19).toLocaleString('pt-BR'));
      setTxt('instTotalLinhas', (r.totalLinhasOnibus || 20).toLocaleString('pt-BR'));
      setTxt('instTotalParadas', (r.totalParadasOnibus || 1795).toLocaleString('pt-BR'));
      setTxt('instTotalComunidades', (r.totalComunidades || 105).toLocaleString('pt-BR'));
    }

    if (data.graficos) {
      if (data.graficos.equipamentosPorDistrito) {
        renderDistrictBars(data.graficos.equipamentosPorDistrito);
      }
      if (data.graficos.servicosPorSecretaria) {
        renderSecretariaBars(data.graficos.servicosPorSecretaria);
      }
      if (data.graficos.equipamentosPorMacrosetor) {
        renderMacrosetorList(data.graficos.equipamentosPorMacrosetor, data.resumo?.totalEquipamentos || 466);
      }
      if (data.graficos.comunidadesPorComplexo) {
        renderComplexosList(data.graficos.comunidadesPorComplexo);
      }
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
          <span>${escapeHtml(d.distrito)} — ${escapeHtml(d.regiao || 'Região')}</span>
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

function renderSecretariaBars(secretarias) {
  const container = document.getElementById('secretariasBarsContainer');
  if (!container) return;

  if (!secretarias || !secretarias.length) {
    container.innerHTML = '<div style="font-size:13px;color:#64748b;">Sem dados disponíveis no momento.</div>';
    return;
  }

  const maxSrv = Math.max(...secretarias.map(s => Number(s.total_servicos) || 0), 1);

  container.innerHTML = secretarias
    .map((s) => {
      const count = Number(s.total_servicos) || 0;
      const pct = Math.round((count / maxSrv) * 100);
      const rawName = String(s.secretaria || '');
      const cleanLabel = rawName.toUpperCase().startsWith('FUNDEC')
        ? 'FUNDEC — Fundação de Apoio à Escola Técnica'
        : rawName;
      return `
      <div class="district-row">
        <div class="district-info">
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:74%;" title="${escapeHtml(rawName)}">${escapeHtml(cleanLabel)}</span>
          <span><strong>${count}</strong> serviços</span>
        </div>
        <div class="district-track">
          <div class="district-fill fill-blue" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
    })
    .join('');
}

function renderComplexosList(complexos) {
  const container = document.getElementById('complexosListContainer');
  if (!container) return;

  if (!complexos || !complexos.length) {
    container.innerHTML = '<div style="font-size:13px;color:#64748b;">Sem dados territoriais disponíveis no momento.</div>';
    return;
  }

  container.innerHTML = complexos
    .slice(0, 7)
    .map((c) => {
      const totCom = Number(c.total_comunidades) || 0;
      const totRuas = Number(c.total_ruas) || 0;
      const dotColor = c.cor_hex || '#0284c7';
      return `
      <div class="macro-pill-row" style="border-left-color: ${escapeHtml(dotColor)};">
        <div class="macro-pill-name" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:60%;" title="${escapeHtml(c.nome)}">${escapeHtml(c.nome)}</div>
        <div class="macro-pill-metrics">
          <strong>${totCom} com.</strong>
          <span>(${totRuas} ruas)</span>
        </div>
      </div>
    `;
    })
    .join('');
}

function renderMacrosetorList(macrosetores, totalEquipamentos) {
  const container = document.getElementById('macrosetorListContainer');
  if (!container) return;

  if (!macrosetores || !macrosetores.length) {
    container.innerHTML = '<div style="font-size:13px;color:#64748b;">Sem dados disponíveis no momento.</div>';
    return;
  }

  const baseTotal = Math.max(Number(totalEquipamentos) || 0, 1);

  container.innerHTML = macrosetores
    .map((m) => {
      const count = Number(m.total) || 0;
      const pct = ((count / baseTotal) * 100).toFixed(1);
      return `
      <div class="macro-pill-row">
        <div class="macro-pill-name">${escapeHtml(m.macrosetor || 'Geral')}</div>
        <div class="macro-pill-metrics">
          <strong>${count}</strong>
          <span>(${pct}%)</span>
        </div>
      </div>
    `;
    })
    .join('');
}

let currentHubFicha = null;
let lastHubSearchHtml = '';
let fichaBackdropMouseDown = false;

function initGlobalSearch() {
  const input = document.getElementById('globalSearchInput');
  const dropdown = document.getElementById('searchResultsDropdown');
  const clearBtn = document.getElementById('clearSearchBtn');
  const modal = document.getElementById('hubFichaModal');

  if (!input || !dropdown) return;

  let debounceTimer = null;

  input.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    if (clearBtn) clearBtn.style.display = val ? 'block' : 'none';

    clearTimeout(debounceTimer);
    if (val.length < 2) {
      lastHubSearchHtml = '';
      dropdown.style.display = 'none';
      return;
    }

    debounceTimer = setTimeout(() => {
      fetchSearchResults(val);
    }, 220);
  });

  input.addEventListener('focus', () => {
    if (input.value.trim().length >= 2 && lastHubSearchHtml) {
      dropdown.style.display = 'block';
    }
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      input.value = '';
      lastHubSearchHtml = '';
      clearBtn.style.display = 'none';
      dropdown.style.display = 'none';
      input.focus();
    });
  }

  dropdown.addEventListener('click', (e) => {
    const itemBtn = e.target.closest('.search-item[data-ficha-type]');
    if (!itemBtn) return;
    e.preventDefault();
    const type = itemBtn.getAttribute('data-ficha-type');
    const id = itemBtn.getAttribute('data-ficha-id');
    dropdown.style.display = 'none';
    openHubFichaModal(type, id);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (modal && modal.style.display !== 'none') {
        closeHubFichaModal();
      } else {
        dropdown.style.display = 'none';
      }
    }
  });

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });

  if (modal) {
    modal.addEventListener('mousedown', (e) => {
      fichaBackdropMouseDown = e.target === modal;
    });
    modal.addEventListener('click', (e) => {
      if (fichaBackdropMouseDown && e.target === modal) {
        closeHubFichaModal();
      }
      fichaBackdropMouseDown = false;
    });
  }
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
      lastHubSearchHtml = '';
      dropdown.innerHTML = '<div style="padding:14px;color:#64748b;font-size:13px;">Nenhum serviço ou equipamento encontrado para esta busca.</div>';
      return;
    }

    let html = '';

    if (servicos.length > 0) {
      html += `
        <div class="search-group-title" style="display:flex;align-items:center;gap:6px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
          Serviços Municipais (${servicos.length}) — Clique para abrir ficha e imprimir
        </div>`;
      servicos.forEach((s) => {
        const sName = s.name || s.title || '';
        const metaParts = [s.secretaria, s.categoria].filter(Boolean);
        html += `
          <button type="button" class="search-item" data-ficha-type="servico" data-ficha-id="${escapeHtml(s.id)}">
            <div style="min-width:0;flex:1;">
              <div class="search-item-title">${escapeHtml(sName)}</div>
              <small style="color:#64748b;font-size:11.5px;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(metaParts.join(' • '))}</small>
            </div>
            <span class="search-item-badge"><i class="ri-printer-line"></i> Ver Ficha</span>
          </button>
        `;
      });
    }

    if (equipamentos.length > 0) {
      html += `
        <div class="search-group-title" style="display:flex;align-items:center;gap:6px;margin-top:${servicos.length ? '8px' : '0'};">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" x2="9" y1="3" y2="18"/><line x1="15" x2="15" y1="6" y2="21"/></svg>
          Equipamentos Públicos (${equipamentos.length}) — Clique para abrir ficha e imprimir
        </div>`;
      equipamentos.forEach((eq) => {
        const bairroTxt = eq.bairro_oficial || eq.bairro || '';
        const metaParts = [bairroTxt, eq.categoria, eq.secretaria_sigla].filter(Boolean);
        html += `
          <button type="button" class="search-item" data-ficha-type="equipamento" data-ficha-id="${escapeHtml(eq.id)}">
            <div style="min-width:0;flex:1;">
              <div class="search-item-title">${escapeHtml(eq.nome)}</div>
              <small style="color:#64748b;font-size:11.5px;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(metaParts.join(' • '))}</small>
            </div>
            <span class="search-item-badge badge-eqp"><i class="ri-printer-line"></i> Ver Ficha</span>
          </button>
        `;
      });
    }

    lastHubSearchHtml = html;
    dropdown.innerHTML = html;
  } catch (err) {
    dropdown.innerHTML = '<div style="padding:12px;color:#ef4444;font-size:13px;">Erro ao consultar resultados.</div>';
  }
}

async function openHubFichaModal(type, id) {
  const modal = document.getElementById('hubFichaModal');
  const titleEl = document.getElementById('fichaModalTitle');
  const kickerEl = document.getElementById('fichaModalKicker');
  const badgesEl = document.getElementById('fichaModalBadges');
  const bodyEl = document.getElementById('fichaModalBody');
  const extLink = document.getElementById('fichaModalExternalLink');
  const extText = document.getElementById('fichaModalExternalText');
  const btnPrint = document.getElementById('btnPrintFicha');
  const btnCopy = document.getElementById('btnCopyFicha');

  if (!modal || !bodyEl) return;

  currentHubFicha = null;
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  if (kickerEl) {
    kickerEl.textContent = type === 'servico'
      ? 'PREFEITURA MUNICIPAL DE DUQUE DE CAXIAS · CARTA DE SERVIÇOS AO CIDADÃO'
      : 'PREFEITURA MUNICIPAL DE DUQUE DE CAXIAS · CADASTRO DE EQUIPAMENTO PÚBLICO (SIGEM)';
  }
  if (titleEl) titleEl.textContent = 'Carregando ficha informativa...';
  if (badgesEl) badgesEl.innerHTML = '';
  bodyEl.innerHTML = '<div class="ficha-loading"><i class="ri-loader-4-line"></i> Consultando informações oficiais...</div>';
  bodyEl.scrollTop = 0;

  if (btnPrint) btnPrint.disabled = true;
  if (btnCopy) btnCopy.disabled = true;

  const base = getHubBasePrefix();

  try {
    const endpoint = type === 'servico'
      ? `${base}/api/cds/services/public/${encodeURIComponent(id)}`
      : `${base}/api/sigem/equipamentos/${encodeURIComponent(id)}`;

    const res = await fetch(endpoint);
    if (!res.ok) throw new Error('Registro não encontrado ou temporariamente indisponível.');
    const detail = await res.json();

    currentHubFicha = { type, data: detail };
    if (btnPrint) btnPrint.disabled = false;
    if (btnCopy) btnCopy.disabled = false;

    if (type === 'servico') {
      renderServiceFichaModal(detail, base, { titleEl, badgesEl, bodyEl, extLink, extText });
    } else {
      renderEquipamentoFichaModal(detail, base, { titleEl, badgesEl, bodyEl, extLink, extText });
    }
  } catch (err) {
    if (titleEl) titleEl.textContent = 'Não foi possível abrir a ficha';
    bodyEl.innerHTML = `<div class="ficha-loading" style="color:#dc2626;">${escapeHtml(err.message || 'Erro ao carregar dados.')}</div>`;
  }
}

function closeHubFichaModal() {
  const modal = document.getElementById('hubFichaModal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
}

function renderServiceFichaModal(srv, base, els) {
  const name = srv.name || 'Serviço Municipal';
  if (els.titleEl) els.titleEl.textContent = name;

  const pills = [];
  pills.push('<span class="ficha-pill pill-green"><i class="ri-checkbox-circle-line"></i> Serviço Oficial</span>');
  if (srv.categoria_nome) {
    pills.push(`<span class="ficha-pill pill-gold"><i class="ri-folder-2-line"></i> ${escapeHtml(srv.categoria_nome)}</span>`);
  }
  if (srv.secretaria_nome) {
    pills.push(`<span class="ficha-pill"><i class="ri-government-line"></i> ${escapeHtml(srv.secretaria_nome)}</span>`);
  }
  if (els.badgesEl) els.badgesEl.innerHTML = pills.join('');

  if (els.extLink && els.extText) {
    els.extLink.href = `${base}/cds/dashboard.html?q=${encodeURIComponent(name)}`;
    els.extText.textContent = 'Abrir na Carta de Serviços';
  }

  const docs = Array.isArray(srv.documentos) ? srv.documentos.filter(Boolean) : [];
  const passos = Array.isArray(srv.passos) ? srv.passos.filter(Boolean) : [];
  const telefones = Array.isArray(srv.telefones) ? srv.telefones.filter(Boolean) : [];
  const emails = Array.isArray(srv.emails) ? srv.emails.filter(Boolean) : [];
  const links = Array.isArray(srv.links) ? srv.links.filter(Boolean) : [];
  const prioridades = Array.isArray(srv.prioridades) ? srv.prioridades.filter(Boolean) : [];

  const docsHtml = docs.length
    ? `<div class="ficha-doc-list">${docs.map((d) => `
        <div class="ficha-doc-item">
          <span class="ficha-doc-check" aria-hidden="true"></span>
          <span>${escapeHtml(d)}</span>
        </div>`).join('')}</div>`
    : '<div class="ficha-section-text" style="color:#64748b;">Nenhum documento específico exigido além de identificação pessoal, quando aplicável.</div>';

  const passosHtml = passos.length
    ? `<div class="ficha-step-list">${passos.map((p, idx) => `
        <div class="ficha-step-row">
          <span class="ficha-step-num">${idx + 1}</span>
          <div class="ficha-step-text">${escapeHtml(p)}</div>
        </div>`).join('')}</div>`
    : '<div class="ficha-section-text" style="color:#64748b;">Atendimento direto pelos canais informados abaixo.</div>';

  const contactChips = [];
  telefones.forEach((t) => {
    contactChips.push(`<a class="ficha-contact-chip" href="tel:${escapeHtml(String(t).replace(/[^0-9+]/g, ''))}"><i class="ri-phone-line"></i> ${escapeHtml(t)}</a>`);
  });
  emails.forEach((em) => {
    contactChips.push(`<a class="ficha-contact-chip" href="mailto:${escapeHtml(em)}"><i class="ri-mail-line"></i> ${escapeHtml(em)}</a>`);
  });
  links.forEach((lk) => {
    const href = /^https?:\/\//i.test(lk) ? lk : `https://${lk}`;
    contactChips.push(`<a class="ficha-contact-chip" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer"><i class="ri-global-line"></i> ${escapeHtml(lk)}</a>`);
  });

  const prazoTxt = [
    srv.waiting_time ? `Espera: ${srv.waiting_time}` : '',
    srv.max_deadline ? `Prazo máx.: ${srv.max_deadline}` : '',
  ].filter(Boolean).join(' · ') || 'Conforme demanda do órgão';

  els.bodyEl.innerHTML = `
    <div class="ficha-section">
      <div class="ficha-section-title"><i class="ri-information-line"></i> O que é este serviço</div>
      <div class="ficha-section-text">${escapeHtml(srv.description || 'Sem descrição complementar cadastrada.')}</div>
    </div>

    <div class="ficha-meta-grid">
      <div class="ficha-meta-box">
        <span class="ficha-meta-label">Quem pode solicitar</span>
        <div class="ficha-meta-val">${escapeHtml(srv.who_can_request || 'Cidadãos em geral')}</div>
      </div>
      <div class="ficha-meta-box">
        <span class="ficha-meta-label">Como ter acesso</span>
        <div class="ficha-meta-val">${escapeHtml(srv.how_to_access || 'Atendimento presencial ou canais oficiais')}</div>
      </div>
      <div class="ficha-meta-box box-gold">
        <span class="ficha-meta-label">Tempo / Prazo estimado</span>
        <div class="ficha-meta-val">${escapeHtml(prazoTxt)}</div>
      </div>
      <div class="ficha-meta-box box-green">
        <span class="ficha-meta-label">Custo / Taxa</span>
        <div class="ficha-meta-val">${escapeHtml(srv.cost || 'Gratuito / Consultar legislação')}</div>
      </div>
    </div>

    <div class="ficha-section">
      <div class="ficha-section-title"><i class="ri-file-check-line"></i> Documentos Necessários (Checklist)</div>
      ${docsHtml}
    </div>

    <div class="ficha-section">
      <div class="ficha-section-title"><i class="ri-list-ordered"></i> Passo a Passo do Atendimento</div>
      ${passosHtml}
    </div>

    <div class="ficha-section">
      <div class="ficha-section-title"><i class="ri-map-pin-2-line"></i> Local de Atendimento &amp; Canais Oficiais</div>
      <div class="ficha-section-text">${escapeHtml(srv.address || 'Consulte a sede da secretaria responsável ou canais digitais abaixo.')}</div>
      ${contactChips.length ? `<div class="ficha-contact-pills">${contactChips.join('')}</div>` : ''}
    </div>

    ${(prioridades.length || srv.regulation_norm) ? `
      <div class="ficha-meta-grid">
        ${prioridades.length ? `
          <div class="ficha-meta-box">
            <span class="ficha-meta-label">Atendimento Prioritário</span>
            <div class="ficha-meta-val">${escapeHtml(prioridades.join(', '))}</div>
          </div>` : ''}
        ${srv.regulation_norm ? `
          <div class="ficha-meta-box">
            <span class="ficha-meta-label">Norma / Base Legal</span>
            <div class="ficha-meta-val">${escapeHtml(srv.regulation_norm)}</div>
          </div>` : ''}
      </div>
    ` : ''}
  `;
}

function renderEquipamentoFichaModal(eq, base, els) {
  const nome = eq.nome || 'Equipamento Público';
  if (els.titleEl) els.titleEl.textContent = nome;

  const pills = [];
  pills.push('<span class="ficha-pill pill-gold"><i class="ri-building-4-line"></i> Equipamento Público</span>');
  if (eq.categoria) {
    pills.push(`<span class="ficha-pill"><i class="ri-price-tag-3-line"></i> ${escapeHtml(eq.categoria)}</span>`);
  }
  const secLabel = eq.secretaria_sigla || eq.secretaria_nome || (Array.isArray(eq.secretarias) && eq.secretarias[0]?.sigla) || '';
  if (secLabel) {
    pills.push(`<span class="ficha-pill pill-green"><i class="ri-government-line"></i> ${escapeHtml(secLabel)}</span>`);
  }
  if (eq.distrito) {
    pills.push(`<span class="ficha-pill"><i class="ri-road-map-line"></i> ${escapeHtml(eq.distrito)}º Distrito</span>`);
  }
  if (els.badgesEl) els.badgesEl.innerHTML = pills.join('');

  if (els.extLink && els.extText) {
    els.extLink.href = `${base}/sigem/?q=${encodeURIComponent(nome)}`;
    els.extText.textContent = 'Abrir no SIGEM / Mapa';
  }

  const logradouro = eq.logradouro || eq.endereco || '';
  const numero = eq.numero ? `, nº ${eq.numero}` : '';
  const compl = (eq.predio_sala || eq.complemento) ? ` (${eq.predio_sala || eq.complemento})` : '';
  const bairro = eq.bairro_oficial || eq.bairro || 'Não informado';
  const cep = eq.cep || 'Não informado';
  const secCompleta = eq.secretaria_nome || (Array.isArray(eq.secretarias) && eq.secretarias.map(s => s.nome).join('; ')) || 'Prefeitura Municipal de Duque de Caxias';

  const tels = [];
  if (eq.telefone) tels.push(eq.telefone);
  if (Array.isArray(eq.contatos?.telefones)) {
    eq.contatos.telefones.forEach((t) => {
      const formatted = t.ddd ? `(${t.ddd}) ${t.numero}` : t.numero;
      if (formatted && !tels.includes(formatted)) tels.push(formatted);
    });
  }

  const emails = [];
  if (eq.email) emails.push(eq.email);
  if (Array.isArray(eq.contatos?.emails)) {
    eq.contatos.emails.forEach((e) => {
      if (e.email && !emails.includes(e.email)) emails.push(e.email);
    });
  }

  const lat = eq.lat ?? eq.latitude;
  const lon = eq.lon ?? eq.longitude;

  const chips = [];
  tels.forEach((t) => {
    chips.push(`<a class="ficha-contact-chip" href="tel:${escapeHtml(String(t).replace(/[^0-9+]/g, ''))}"><i class="ri-phone-line"></i> ${escapeHtml(t)}</a>`);
  });
  emails.forEach((em) => {
    chips.push(`<a class="ficha-contact-chip" href="mailto:${escapeHtml(em)}"><i class="ri-mail-line"></i> ${escapeHtml(em)}</a>`);
  });
  if (lat && lon) {
    chips.push(`<a class="ficha-contact-chip" href="https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lon}`)}" target="_blank" rel="noopener noreferrer"><i class="ri-compass-3-line"></i> Abrir rota no Google Maps</a>`);
  }

  const servicosUnidade = Array.isArray(eq.servicos_ofertados) ? eq.servicos_ofertados : [];

  els.bodyEl.innerHTML = `
    <div class="ficha-section">
      <div class="ficha-section-title"><i class="ri-map-pin-2-line"></i> Endereço Oficial Completo</div>
      <div class="ficha-section-text"><strong>${escapeHtml(logradouro ? `${logradouro}${numero}${compl}` : (eq.endereco || 'Endereço em atualização'))}</strong>
Bairro: ${escapeHtml(bairro)} · ${eq.distrito ? `${escapeHtml(eq.distrito)}º Distrito · ` : ''}Duque de Caxias / RJ · CEP: ${escapeHtml(cep)}</div>
      ${chips.length ? `<div class="ficha-contact-pills">${chips.join('')}</div>` : ''}
    </div>

    <div class="ficha-meta-grid">
      <div class="ficha-meta-box">
        <span class="ficha-meta-label">Secretaria / Órgão Gestor</span>
        <div class="ficha-meta-val">${escapeHtml(secCompleta)}</div>
      </div>
      <div class="ficha-meta-box box-gold">
        <span class="ficha-meta-label">Categoria Oficial</span>
        <div class="ficha-meta-val">${escapeHtml(eq.categoria || 'Equipamento Municipal')}</div>
      </div>
      <div class="ficha-meta-box box-green">
        <span class="ficha-meta-label">Horário de Funcionamento</span>
        <div class="ficha-meta-val">${escapeHtml(eq.horario_funcionamento || 'Segunda a Sexta, horário comercial (consultar unidade)')}</div>
      </div>
      <div class="ficha-meta-box">
        <span class="ficha-meta-label">${eq.hub_nome ? 'Prédio Compartilhado / Polo' : 'Coordenadas GPS'}</span>
        <div class="ficha-meta-val">${escapeHtml(eq.hub_nome || (lat && lon ? `${Number(lat).toFixed(6)}, ${Number(lon).toFixed(6)}` : 'Georreferenciado'))}</div>
      </div>
    </div>

    ${servicosUnidade.length ? `
      <div class="ficha-section">
        <div class="ficha-section-title"><i class="ri-service-line"></i> Atendimentos Vinculados na Unidade</div>
        <div class="ficha-doc-list">
          ${servicosUnidade.map((s) => `
            <div class="ficha-doc-item">
              <span class="ficha-doc-check" aria-hidden="true"></span>
              <span>${escapeHtml(s.nome)}</span>
            </div>`).join('')}
        </div>
      </div>
    ` : ''}
  `;
}

async function copyCurrentHubFicha() {
  if (!currentHubFicha) return;
  const { type, data } = currentHubFicha;
  let lines = [];

  if (type === 'servico') {
    lines = [
      `PREFEITURA DE DUQUE DE CAXIAS — FICHA DE SERVIÇO`,
      `Serviço: ${data.name || ''}`,
      `Secretaria: ${data.secretaria_nome || 'PMDC'}`,
      data.categoria_nome ? `Categoria: ${data.categoria_nome}` : '',
      ``,
      `O que é: ${data.description || '-'}`,
      `Quem pode solicitar: ${data.who_can_request || 'Cidadãos em geral'}`,
      `Como acessar: ${data.how_to_access || '-'}`,
      `Custo: ${data.cost || 'Gratuito'}`,
      data.max_deadline ? `Prazo máximo: ${data.max_deadline}` : '',
      data.address ? `Local de atendimento: ${data.address}` : '',
      Array.isArray(data.documentos) && data.documentos.length ? `\nDocumentos necessários:\n- ${data.documentos.join('\n- ')}` : '',
      Array.isArray(data.passos) && data.passos.length ? `\nPasso a passo:\n${data.passos.map((p, i) => `${i + 1}. ${p}`).join('\n')}` : '',
      Array.isArray(data.telefones) && data.telefones.length ? `\nTelefones: ${data.telefones.join(' | ')}` : '',
      Array.isArray(data.emails) && data.emails.length ? `E-mail: ${data.emails.join(' | ')}` : '',
    ].filter(Boolean);
  } else {
    const bairro = data.bairro_oficial || data.bairro || '';
    lines = [
      `PREFEITURA DE DUQUE DE CAXIAS — FICHA DE EQUIPAMENTO PÚBLICO`,
      `Unidade: ${data.nome || ''}`,
      `Secretaria: ${data.secretaria_nome || data.secretaria_sigla || 'PMDC'}`,
      `Categoria: ${data.categoria || ''}`,
      `Endereço: ${data.logradouro || data.endereco || ''}${data.numero ? `, nº ${data.numero}` : ''}`,
      `Bairro: ${bairro}${data.distrito ? ` (${data.distrito}º Distrito)` : ''} — Duque de Caxias/RJ`,
      data.cep ? `CEP: ${data.cep}` : '',
      data.horario_funcionamento ? `Horário: ${data.horario_funcionamento}` : '',
      data.telefone ? `Telefone: ${data.telefone}` : '',
      data.email ? `E-mail: ${data.email}` : '',
    ].filter(Boolean);
  }

  try {
    await navigator.clipboard.writeText(lines.join('\n'));
    const btn = document.getElementById('btnCopyFicha');
    if (btn) {
      const prev = btn.innerHTML;
      btn.innerHTML = '<i class="ri-check-line"></i><span>Copiado!</span>';
      setTimeout(() => { btn.innerHTML = prev; }, 1800);
    }
  } catch (_) {}
}

function printCurrentHubFicha() {
  if (!currentHubFicha) return;

  const base = getHubBasePrefix();
  const logoUrl = `${window.location.origin}${base}/shared/logo.png`;
  const emittedAt = new Date().toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const html = buildPrintableFichaHtml(currentHubFicha, logoUrl, emittedAt);

  let iframe = document.getElementById('hubFichaPrintFrame');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'hubFichaPrintFrame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  let printed = false;
  const triggerPrint = () => {
    if (printed) return;
    printed = true;
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  };

  const img = doc.querySelector('img');
  if (img && !img.complete) {
    img.onload = triggerPrint;
    img.onerror = triggerPrint;
    setTimeout(triggerPrint, 350);
  } else {
    setTimeout(triggerPrint, 120);
  }
}

function buildPrintableFichaHtml(ficha, logoUrl, emittedAt) {
  const { type, data } = ficha;
  const isSrv = type === 'servico';
  const title = isSrv ? (data.name || 'Serviço Municipal') : (data.nome || 'Equipamento Público');
  const docTypeLabel = isSrv
    ? 'FICHA DE ORIENTAÇÃO AO CIDADÃO — CARTA DE SERVIÇOS'
    : 'FICHA DE LOCALIZAÇÃO DE EQUIPAMENTO PÚBLICO — SIGEM';

  let contentHtml = '';

  if (isSrv) {
    const docs = Array.isArray(data.documentos) ? data.documentos.filter(Boolean) : [];
    const passos = Array.isArray(data.passos) ? data.passos.filter(Boolean) : [];
    const telefones = Array.isArray(data.telefones) ? data.telefones.filter(Boolean) : [];
    const emails = Array.isArray(data.emails) ? data.emails.filter(Boolean) : [];
    const links = Array.isArray(data.links) ? data.links.filter(Boolean) : [];
    const prioridades = Array.isArray(data.prioridades) ? data.prioridades.filter(Boolean) : [];

    const prazoTxt = [
      data.waiting_time ? `Espera: ${data.waiting_time}` : '',
      data.max_deadline ? `Prazo máx.: ${data.max_deadline}` : '',
    ].filter(Boolean).join(' | ') || 'Conforme atendimento da unidade';

    const contactsLine = [
      telefones.length ? `<strong>Telefone(s):</strong> ${escapeHtml(telefones.join(' / '))}` : '',
      emails.length ? `<strong>E-mail:</strong> ${escapeHtml(emails.join(' / '))}` : '',
      links.length ? `<strong>Site / Canal Digital:</strong> ${escapeHtml(links.join(' / '))}` : '',
    ].filter(Boolean).join('<br>');

    contentHtml = `
      <div class="meta-strip">
        <div><strong>Órgão Responsável:</strong> ${escapeHtml(data.secretaria_nome || 'Prefeitura Municipal de Duque de Caxias')}</div>
        ${data.categoria_nome ? `<div><strong>Categoria:</strong> ${escapeHtml(data.categoria_nome)}</div>` : ''}
      </div>

      <div class="box">
        <div class="box-title">1. O QUE É ESTE SERVIÇO</div>
        <div class="box-body">${escapeHtml(data.description || 'Sem descrição complementar.')}</div>
      </div>

      <div class="grid-2">
        <div class="box">
          <div class="box-title">QUEM PODE SOLICITAR</div>
          <div class="box-body">${escapeHtml(data.who_can_request || 'Cidadãos em geral')}</div>
        </div>
        <div class="box">
          <div class="box-title">COMO ACESSAR</div>
          <div class="box-body">${escapeHtml(data.how_to_access || 'Atendimento presencial ou canais oficiais')}</div>
        </div>
        <div class="box">
          <div class="box-title">PRAZO ESTIMADO</div>
          <div class="box-body">${escapeHtml(prazoTxt)}</div>
        </div>
        <div class="box">
          <div class="box-title">CUSTO / TAXA</div>
          <div class="box-body">${escapeHtml(data.cost || 'Gratuito')}</div>
        </div>
      </div>

      <div class="box">
        <div class="box-title">2. DOCUMENTOS NECESSÁRIOS (CONFERÊNCIA DO CIDADÃO)</div>
        ${docs.length
          ? `<ul class="checklist">${docs.map(d => `<li><span class="chk"></span><span>${escapeHtml(d)}</span></li>`).join('')}</ul>`
          : `<div class="box-body">Documento oficial de identificação com foto (consultar exigências específicas no atendimento).</div>`}
      </div>

      <div class="box">
        <div class="box-title">3. PASSO A PASSO DO ATENDIMENTO</div>
        ${passos.length
          ? `<ol class="steps">${passos.map(p => `<li>${escapeHtml(p)}</li>`).join('')}</ol>`
          : `<div class="box-body">Comparecer ou entrar em contato diretamente pelos canais oficiais indicados abaixo.</div>`}
      </div>

      <div class="box">
        <div class="box-title">4. LOCAL DE ATENDIMENTO E CONTATOS</div>
        <div class="box-body">
          <strong>Endereço / Unidade:</strong> ${escapeHtml(data.address || 'Sede da secretaria responsável em Duque de Caxias/RJ')}<br>
          ${contactsLine || ''}
        </div>
      </div>

      ${(prioridades.length || data.regulation_norm) ? `
        <div class="box">
          <div class="box-title">5. ATENDIMENTO PRIORITÁRIO E BASE LEGAL</div>
          <div class="box-body">
            ${prioridades.length ? `<strong>Prioridades por Lei:</strong> ${escapeHtml(prioridades.join(', '))}<br>` : ''}
            ${data.regulation_norm ? `<strong>Norma Regulamentadora:</strong> ${escapeHtml(data.regulation_norm)}` : ''}
          </div>
        </div>
      ` : ''}
    `;
  } else {
    const logradouro = data.logradouro || data.endereco || '';
    const numero = data.numero ? `, nº ${data.numero}` : '';
    const compl = (data.predio_sala || data.complemento) ? ` (${data.predio_sala || data.complemento})` : '';
    const bairro = data.bairro_oficial || data.bairro || 'Não informado';
    const secCompleta = data.secretaria_nome || data.secretaria_sigla || 'Prefeitura Municipal de Duque de Caxias';
    const servicosUnidade = Array.isArray(data.servicos_ofertados) ? data.servicos_ofertados : [];

    contentHtml = `
      <div class="meta-strip">
        <div><strong>Secretaria / Órgão Gestor:</strong> ${escapeHtml(secCompleta)}</div>
        <div><strong>Categoria:</strong> ${escapeHtml(data.categoria || 'Equipamento Público')}</div>
      </div>

      <div class="box">
        <div class="box-title">1. ENDEREÇO OFICIAL COMPLETO</div>
        <div class="box-body" style="font-size:13px;">
          <strong>Logradouro:</strong> ${escapeHtml(logradouro ? `${logradouro}${numero}${compl}` : (data.endereco || 'Não informado'))}<br>
          <strong>Bairro:</strong> ${escapeHtml(bairro)} &nbsp;|&nbsp;
          <strong>Distrito:</strong> ${data.distrito ? `${escapeHtml(data.distrito)}º Distrito` : 'Duque de Caxias'} &nbsp;|&nbsp;
          <strong>Município:</strong> Duque de Caxias - RJ<br>
          <strong>CEP:</strong> ${escapeHtml(data.cep || 'Não informado')}
          ${data.hub_nome ? `<br><strong>Prédio Compartilhado / Polo:</strong> ${escapeHtml(data.hub_nome)}` : ''}
        </div>
      </div>

      <div class="grid-2">
        <div class="box">
          <div class="box-title">HORÁRIO DE FUNCIONAMENTO</div>
          <div class="box-body">${escapeHtml(data.horario_funcionamento || 'Segunda a Sexta, horário comercial')}</div>
        </div>
        <div class="box">
          <div class="box-title">CANAIS DE CONTATO</div>
          <div class="box-body">
            <strong>Telefone:</strong> ${escapeHtml(data.telefone || 'Atendimento presencial na unidade')}<br>
            ${data.email ? `<strong>E-mail:</strong> ${escapeHtml(data.email)}` : ''}
          </div>
        </div>
      </div>

      ${servicosUnidade.length ? `
        <div class="box">
          <div class="box-title">2. ATENDIMENTOS VINCULADOS NA UNIDADE</div>
          <ul class="checklist">${servicosUnidade.map(s => `<li><span class="chk"></span><span>${escapeHtml(s.nome)}</span></li>`).join('')}</ul>
        </div>
      ` : ''}
    `;
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Ficha Oficial — ${escapeHtml(title)}</title>
  <style>
    @page { size: A4 portrait; margin: 11mm 13mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: 'Segoe UI', Arial, Helvetica, sans-serif; color: #0f172a; font-size: 11.5px; line-height: 1.45; background: #fff; }
    .sheet-header {
      display: flex; align-items: center; gap: 14px;
      border-bottom: 3px solid #002244; padding-bottom: 10px; margin-bottom: 12px;
    }
    .sheet-header img { width: 52px; height: 52px; object-fit: contain; }
    .sheet-gov { flex: 1; }
    .sheet-gov .org { font-size: 13px; font-weight: 800; color: #002244; text-transform: uppercase; letter-spacing: 0.03em; }
    .sheet-gov .sub { font-size: 10.5px; font-weight: 700; color: #475569; text-transform: uppercase; margin-top: 1px; }
    .sheet-gov .doctype {
      display: inline-block; margin-top: 4px; background: #002244; color: #ffcc00;
      font-size: 9.5px; font-weight: 800; padding: 2px 8px; border-radius: 3px; letter-spacing: 0.05em;
    }
    .sheet-date { text-align: right; font-size: 9.5px; color: #475569; }
    .ficha-main-title {
      font-size: 16px; font-weight: 800; color: #002244; text-transform: uppercase;
      background: #f1f5f9; border-left: 5px solid #ffcc00; padding: 8px 12px; margin-bottom: 10px;
    }
    .meta-strip {
      display: flex; flex-wrap: wrap; gap: 16px;
      background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 5px;
      padding: 7px 11px; margin-bottom: 10px; font-size: 11px;
    }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 9px; }
    .box {
      border: 1px solid #cbd5e1; border-radius: 5px; padding: 8px 11px;
      margin-bottom: 9px; page-break-inside: avoid;
    }
    .grid-2 .box { margin-bottom: 0; }
    .box-title {
      font-size: 10px; font-weight: 800; color: #002244; text-transform: uppercase;
      letter-spacing: 0.04em; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px;
    }
    .box-body { font-size: 11.5px; color: #1e293b; white-space: pre-line; }
    .checklist { list-style: none; display: grid; grid-template-columns: 1fr 1fr; gap: 5px 12px; }
    .checklist li { display: flex; align-items: flex-start; gap: 6px; font-size: 11px; }
    .chk {
      width: 11px; height: 11px; border: 1.5px solid #002244; border-radius: 2px;
      display: inline-block; flex-shrink: 0; margin-top: 2px;
    }
    .steps { padding-left: 18px; }
    .steps li { margin-bottom: 4px; font-size: 11px; }
    .notes-area {
      border: 1px dashed #94a3b8; border-radius: 5px; padding: 7px 11px;
      margin-top: 8px; min-height: 46px; color: #64748b; font-size: 9.5px; page-break-inside: avoid;
    }
    .sheet-footer {
      margin-top: 12px; padding-top: 7px; border-top: 1px solid #cbd5e1;
      display: flex; justify-content: space-between; font-size: 9.5px; color: #64748b;
    }
  </style>
</head>
<body>
  <div class="sheet-header">
    <img src="${escapeHtml(logoUrl)}" alt="Brasão PMDC">
    <div class="sheet-gov">
      <div class="org">Prefeitura Municipal de Duque de Caxias</div>
      <div class="sub">Ouvidoria Geral do Município · Portal Integrado GSE</div>
      <span class="doctype">${escapeHtml(docTypeLabel)}</span>
    </div>
    <div class="sheet-date">
      <strong>Emitido em:</strong><br>${escapeHtml(emittedAt)}
    </div>
  </div>

  <div class="ficha-main-title">${escapeHtml(title)}</div>

  ${contentHtml}

  <div class="notes-area">
    <strong>Anotações do Atendimento / Protocolo:</strong>
  </div>

  <div class="sheet-footer">
    <span>Prefeitura Municipal de Duque de Caxias — Lei Federal nº 13.460/2017 (Código de Defesa do Usuário do Serviço Público)</span>
    <span>Portal GSE Oficial</span>
  </div>
</body>
</html>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
