/* ==========================================================================
   SIGEM — Módulo 4: Apresentação, Tabelas, Filtros, Hubs & Bootstrap
   Prefeitura Municipal de Duque de Caxias
   ========================================================================== */

// --- FUNÇÕES DE APRESENTAÇÃO, FILTROS & HUBS ---
    function initDatabase() {
      const stored = localStorage.getItem('pmdc_equipamentos_db');
      const storedVer = localStorage.getItem('pmdc_db_version');

      if (stored && storedVer === PMDC_DB_VERSION) {
        try {
          equipData = JSON.parse(stored);
        } catch (e) {
          equipData = JSON.parse(JSON.stringify(DEFAULT_EQUIP));
        }
      } else {
        equipData = JSON.parse(JSON.stringify(DEFAULT_EQUIP));
        localStorage.setItem('pmdc_equipamentos_db', JSON.stringify(equipData));
        localStorage.setItem('pmdc_db_version', PMDC_DB_VERSION);
      }

      const storedHubs = localStorage.getItem('pmdc_hubs_db');
      if (storedHubs && storedVer === PMDC_DB_VERSION) {
        try {
          hubsData = JSON.parse(storedHubs);
        } catch (e) {
          hubsData = JSON.parse(JSON.stringify(DEFAULT_HUBS));
        }
      } else {
        hubsData = JSON.parse(JSON.stringify(DEFAULT_HUBS));
        localStorage.setItem('pmdc_hubs_db', JSON.stringify(hubsData));
      }

      filteredEquipList = equipData;
      updateKPIs();
    }

    function hasActiveEquipFilters() {
      const q = (document.getElementById('searchEquip')?.value || '').trim();
      const dist = document.getElementById('filterDistrito')?.value || '';
      const cat = document.getElementById('filterCategoria')?.value || '';
      const status = document.getElementById('filterStatus')?.value || '';
      const sec = document.getElementById('filterSecretaria')?.value || '';
      return Boolean(q || dist || cat || status || sec);
    }

    function detectExternalEntity(item) {
      if (!item) return null;
      const nome = String(item.nome || '').toUpperCase();
      const sigla = String(item.sigla || '').toUpperCase();
      const desc = String(item.descricao || '').toUpperCase();

      if (nome.includes('ESTAÇÃO FERROVIÁRIA') || nome.includes('ESTACAO FERROVIARIA') || nome.includes('SUPERVIA') || sigla.includes('SUPERVIA')) {
        return { type: 'CONCESSIONARIA', tag: 'SUPERVIA', label: 'Concessionária SuperVia (Trem)', icon: 'ri-train-line' };
      }
      if (nome.includes('ÁGUAS DO RIO') || nome.includes('AGUAS DO RIO')) {
        return { type: 'CONCESSIONARIA', tag: 'ÁGUAS DO RIO', label: 'Concessionária Águas do Rio', icon: 'ri-drop-line' };
      }
      if (nome.includes('ENEL ') || sigla === 'ENEL') {
        return { type: 'CONCESSIONARIA', tag: 'ENEL', label: 'Concessionária Enel Distribuição', icon: 'ri-flashlight-line' };
      }
      if (nome.includes('NATURGY') || nome.includes('CEG ')) {
        return { type: 'CONCESSIONARIA', tag: 'NATURGY', label: 'Concessionária Naturgy Gás', icon: 'ri-fire-line' };
      }
      if (nome.includes('DETRAN') || sigla.includes('DETRAN')) {
        return { type: 'ORGAO_EXTERNO', tag: 'DETRAN-RJ', label: 'Órgão Estadual — DETRAN/RJ', icon: 'ri-car-line' };
      }
      if (nome.includes('DELEGACIA') || nome.includes('DEAM') || /\b\d+ª\s*DP\b/.test(nome)) {
        return { type: 'ORGAO_EXTERNO', tag: 'PCERJ', label: 'Órgão Estadual — Polícia Civil RJ', icon: 'ri-shield-star-line' };
      }
      if (nome.includes('BATALHÃO') || nome.includes('BPM') || nome.includes('POLÍCIA MILITAR') || nome.includes('CBMERJ') || nome.includes('CORPO DE BOMBEIROS')) {
        return { type: 'ORGAO_EXTERNO', tag: 'GOVERNO RJ', label: 'Órgão Estadual de Segurança / Defesa', icon: 'ri-shield-flash-line' };
      }
      if (nome.includes('INSS') || nome.includes('RECEITA FEDERAL') || nome.includes('JUSTIÇA FEDERAL') || nome.includes('UFRJ') || nome.includes('IFRJ') || nome.includes('CEFET')) {
        return { type: 'ORGAO_EXTERNO', tag: 'FEDERAL', label: 'Órgão / Autarquia Federal', icon: 'ri-bank-line' };
      }
      if (nome.includes('FÓRUM') || nome.includes('FORUM') || nome.includes('DEFENSORIA PÚBLICA') || nome.includes('MINISTÉRIO PÚBLICO') || desc.includes('ESTADUAL')) {
        return { type: 'ORGAO_EXTERNO', tag: 'JUDICIÁRIO / RJ', label: 'Sistema de Justiça / Estadual', icon: 'ri-scales-3-line' };
      }
      return null;
    }
    window.detectExternalEntity = detectExternalEntity;

    function normalizeEverydaySigla(rawSigla) {
      const s = String(rawSigla || '').trim().toUpperCase();
      if (!s) return 'PMDC';
      const aliasMap = {
        'SMSDC': 'SMS',
        'SME': 'SMEDC',
        'SMASDH': 'SEASDIH',
        'SASDH': 'SEASDIH',
        'SMSP': 'SMSEG',
        'SMAPO': 'SMA',
        'SMTER': 'SMDET'
      };
      return aliasMap[s] || s;
    }
    window.normalizeEverydaySigla = normalizeEverydaySigla;

    function renderEquipEntityBadges(item) {
      const secSigla = normalizeEverydaySigla(item?.secretaria_sigla || 'PMDC');
      const secNome = item?.secretaria_nome || 'Prefeitura Municipal de Duque de Caxias';
      const ext = detectExternalEntity(item);
      let html = `
        <span class="badge-sec badge-sec-${secSigla.toLowerCase()}" title="Secretaria / Órgão Gestor: ${escapeStr(secNome)}">
          <i class="ri-government-line"></i> ${escapeHtml(secSigla)}
        </span>
      `;
      if (ext) {
        const cls = ext.type === 'CONCESSIONARIA' ? 'badge-ext-concessionaria' : 'badge-ext-orgao';
        html += `
          <span class="${cls}" title="${escapeStr(ext.label)}">
            <i class="${ext.icon}"></i> ${escapeHtml(ext.tag)}
          </span>
        `;
      }
      return html;
    }
    window.renderEquipEntityBadges = renderEquipEntityBadges;

    function updateKPIs(customList) {
      const isFiltered = hasActiveEquipFilters();
      const targetList = Array.isArray(customList) ? customList : (isFiltered ? filteredEquipList : equipData);

      let ativos = 0;
      let pendentes = 0;
      let georref = 0;

      targetList.forEach(e => {
        const s = String(e.status || 'Pendente de revisão').trim().toLowerCase();
        if (s === 'ativo') ativos++;
        else pendentes++;

        const lat = Number(e.lat);
        const lon = Number(e.lon);
        if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) georref++;
      });

      const elTotal = document.getElementById('kpiTotal');
      if (elTotal) elTotal.innerText = targetList.length;
      const elAtivos = document.getElementById('kpiAtivos');
      if (elAtivos) elAtivos.innerText = ativos;
      const elPendentes = document.getElementById('kpiPendentes');
      if (elPendentes) elPendentes.innerText = pendentes;
      const elGeo = document.getElementById('kpiGeorreferenciados') || document.getElementById('kpiDesatualizados');
      if (elGeo) elGeo.innerText = georref;
      const elBadge = document.getElementById('badgeTotalEquip');
      if (elBadge) {
        elBadge.innerText = isFiltered
          ? `${targetList.length} de ${equipData.length}`
          : `${equipData.length} cadastrados`;
      }
      const cfgTotEq = document.getElementById('configTotalEquipCount');
      if (cfgTotEq && equipData.length > 0) cfgTotEq.innerText = equipData.length;
      const cfgTotHubs = document.getElementById('configTotalHubsCount');
      if (cfgTotHubs && hubsData.length > 0) cfgTotHubs.innerText = hubsData.length;
      const badgeHubsSide = document.getElementById('badgeTotalHubsSidebar');
      if (badgeHubsSide && hubsData.length > 0) badgeHubsSide.innerText = `${hubsData.length} polos municipais`;
    }

    function changeItemsPerPage(val) {
      const num = parseInt(val, 10);
      if (!isNaN(num) && num > 0) {
        itemsPerPage = num;
        window.itemsPerPage = num;
        localStorage.setItem('sigem_items_per_page', String(num));
        currentPage = 1;
        renderEquipTable();
      }
    }
    window.changeItemsPerPage = changeItemsPerPage;

    function saveToStorage() {
      localStorage.setItem('pmdc_equipamentos_db', JSON.stringify(equipData));
      localStorage.setItem('pmdc_hubs_db', JSON.stringify(hubsData));
      updateKPIs();
    }

    function navigateTab(tabKey, navElem) {
      document.querySelectorAll('.sidebar-nav-item, .nav-item').forEach(el => el.classList.remove('active'));
      if (navElem) navElem.classList.add('active');

      document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
      
      if (tabKey === 'equipamentos') {
        document.getElementById('viewEquipamentos').classList.add('active');
      } else if (tabKey === 'hubs') {
        document.getElementById('viewHubs').classList.add('active');
        renderHubsCards();
      } else if (tabKey === 'mapa') {
        document.getElementById('viewMapa').classList.add('active');
        initMap();
        setTimeout(() => { if (map) map.invalidateSize(); }, 200);
      } else if (tabKey === 'relatorios') {
        document.getElementById('viewRelatorios').classList.add('active');
      } else if (tabKey === 'config') {
        document.getElementById('viewConfig').classList.add('active');
      }
    }

    function toggleSidebar() {
      const sidebar = document.getElementById('sidebarNav');
      if (sidebar) sidebar.classList.toggle('collapsed');
    }

    function renderEquipTable() {
      const tbody = document.getElementById('equipTableBody');
      tbody.innerHTML = '';

      const totalFiltered = filteredEquipList.length;
      const totalPages = Math.ceil(totalFiltered / itemsPerPage) || 1;
      if (currentPage > totalPages) currentPage = totalPages;
      if (currentPage < 1) currentPage = 1;

      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = Math.min(startIndex + itemsPerPage, totalFiltered);
      const pageItems = filteredEquipList.slice(startIndex, endIndex);

      if (pageItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 32px; color: var(--text-muted);">Nenhum equipamento encontrado para os filtros selecionados.</td></tr>`;
        renderPaginationControls(0, 1, 0, 0);
        return;
      }

      pageItems.forEach((item, index) => {
        const row = document.createElement('tr');
        const absIndex = startIndex + index + 1;
        const itemStatus = item.status || 'Pendente de revisão';

        let statusClass = 'badge-status-pendente';
        let statusIcon = '<i class="ri-time-fill" style="color: #f59e0b; font-size: 13px;"></i>';
        const normStatus = String(itemStatus).trim();
        const displayStatus = normStatus.toLowerCase() === 'ativo' ? 'Ativo' : normStatus;
        if (displayStatus === 'Ativo') {
          statusClass = 'badge-status-ativo';
          statusIcon = '<i class="ri-checkbox-circle-fill" style="color: #10b981; font-size: 13px;"></i>';
        } else if (displayStatus === 'Desatualizado' || displayStatus.toUpperCase() === 'INATIVO') {
          statusClass = 'badge-status-desatualizado';
          statusIcon = '<i class="ri-alert-fill" style="color: #ef4444; font-size: 13px;"></i>';
        }

        const podeEditar = canUserEditEquip(item);
        const secSigla = normalizeEverydaySigla(item.secretaria_sigla || 'PMDC');
        const secNome = item.secretaria_nome || 'Prefeitura Municipal';

        if (!isSpreadsheetMode) {
          row.className = 'equip-row-clickable';
          row.onclick = () => openViewModal(item.id);
          row.title = "Clique para ver a ficha completa deste equipamento";
          row.innerHTML = `
            <td style="color: var(--text-light); font-weight: 600; font-size: 11px;">${absIndex}</td>
            <td>
              <div>
                <strong style="color: var(--navy-900); font-weight: 700;">${item.nome}</strong>
                ${item.sigla ? `<span style="font-size: 11px; color: var(--text-muted); margin-left: 4px;">(${item.sigla})</span>` : ''}
                <div style="margin-top: 4px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                  ${renderEquipEntityBadges(item)}
                  ${item.hub_nome ? `<span class="badge-hub" onclick="event.stopPropagation(); filterByHub('${escapeStr(item.hub_nome)}')"><i class="ri-building-line"></i> ${escapeHtml(item.hub_nome)}</span>` : ''}
                </div>
              </div>
            </td>
            <td>
              <div style="font-weight: 600; color: var(--navy-900);">${item.bairro || '-'}</div>
              ${item.bairro_oficial && item.bairro_oficial.toLowerCase().trim() !== (item.bairro || '').toLowerCase().trim() ? `
                <div style="margin-top: 3px;">
                  <span style="display: inline-flex; align-items: center; gap: 3px; font-size: 10px; font-weight: 600; padding: 1px 5px; border-radius: 4px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1;" title="Bairro Oficial Cartográfico (Lei Municipal nº 1.488)">
                    <i class="ri-shape-line" style="font-size: 9px; color: #6366f1;"></i> ${escapeHtml(item.bairro_oficial)}
                  </span>
                </div>
              ` : ''}
            </td>
            <td>
              <div>
                ${item.logradouro || item.endereco || '-'}
                ${item.numero && item.numero !== 's/nº' && !(item.logradouro || '').includes(item.numero) ? `, ${item.numero}` : ''}
                ${item.predio_sala ? `<span style="color: var(--text-muted); font-size: 11px;"> (${item.predio_sala})</span>` : ''}
              </div>
            </td>
            <td><div style="font-family: monospace; font-size: 12px;">${item.cep || '-'}</div></td>
            <td><div>${item.telefone || '-'}</div></td>
            <td>
              <span class="badge-status ${statusClass}" style="display: inline-flex; align-items: center; gap: 4px;">
                ${statusIcon} <span>${displayStatus}</span>
              </span>
            </td>
            <td style="text-align: right;" onclick="event.stopPropagation()">
              <div class="action-cell" style="justify-content: flex-end;">
                <button class="btn btn-secondary btn-xs" onclick="event.stopPropagation(); openViewModal('${item.id}')" title="Ver Ficha Cadastral"><i class="ri-eye-line"></i> Ver</button>
                ${podeEditar ? `
                  <button class="btn btn-primary btn-xs" onclick="event.stopPropagation(); openEditEquipModal('${item.id}')" title="Editar Equipamento da sua Secretaria"><i class="ri-edit-line"></i> Editar</button>
                  <div class="action-dropdown" id="dropdown_${item.id}">
                    <button class="btn btn-secondary btn-xs" onclick="event.stopPropagation(); toggleActionDropdown('${item.id}')">⋮</button>
                    <div class="action-dropdown-menu">
                      <div class="action-dropdown-item" onclick="event.stopPropagation(); focusEquipOnMap(${item.lat || -22.785}, ${item.lon || -43.305}, '${escapeStr(item.nome)}')"><i class="ri-map-pin-2-line"></i> Ver no Mapa</div>
                      <div class="action-dropdown-item" onclick="event.stopPropagation(); openEditEquipModal('${item.id}')"><i class="ri-edit-2-line"></i> Alterar Endereço</div>
                      <div class="action-dropdown-item" onclick="event.stopPropagation(); quickToggleStatus('${item.id}')"><i class="ri-refresh-line"></i> Alternar Status</div>
                      <div class="action-dropdown-item" style="color: var(--red-600);" onclick="event.stopPropagation(); deleteEquip('${item.id}')"><i class="ri-delete-bin-line"></i> Excluir</div>
                    </div>
                  </div>
                ` : `
                  <button class="btn btn-secondary btn-xs" disabled style="opacity: 0.55; cursor: not-allowed; border-style: dashed;" title="Apenas a secretaria gestora (${secSigla}) ou o Administrador Geral podem editar este equipamento"><i class="ri-lock-line"></i> Bloqueado</button>
                  <div class="action-dropdown" id="dropdown_${item.id}">
                    <button class="btn btn-secondary btn-xs" onclick="event.stopPropagation(); toggleActionDropdown('${item.id}')">⋮</button>
                    <div class="action-dropdown-menu">
                      <div class="action-dropdown-item" onclick="event.stopPropagation(); focusEquipOnMap(${item.lat || -22.785}, ${item.lon || -43.305}, '${escapeStr(item.nome)}')"><i class="ri-map-pin-2-line"></i> Ver no Mapa</div>
                      <div class="action-dropdown-item" onclick="event.stopPropagation(); openViewModal('${item.id}')"><i class="ri-file-list-3-line"></i> Ficha Cadastral (${secSigla})</div>
                    </div>
                  </div>
                `}
              </div>
            </td>
          `;
        } else {
          // Modo Planilha
          row.innerHTML = `
            <td style="color: var(--text-light); font-size: 11px;">${absIndex}</td>
            <td><input class="spreadsheet-input" style="font-weight: 700; ${!podeEditar ? 'background: #f8fafc; opacity: 0.65; cursor: not-allowed;' : ''}" ${!podeEditar ? 'disabled title="Apenas ' + secSigla + ' pode alterar"' : ''} value="${escapeStr(item.nome)}" onchange="onSpreadsheetChange('${item.id}', 'nome', this.value)"></td>
            <td><input class="spreadsheet-input" style="${!podeEditar ? 'background: #f8fafc; opacity: 0.65; cursor: not-allowed;' : ''}" ${!podeEditar ? 'disabled title="Apenas ' + secSigla + ' pode alterar"' : ''} value="${escapeStr(item.bairro)}" onchange="onSpreadsheetChange('${item.id}', 'bairro', this.value)"></td>
            <td><input class="spreadsheet-input" style="${!podeEditar ? 'background: #f8fafc; opacity: 0.65; cursor: not-allowed;' : ''}" ${!podeEditar ? 'disabled title="Apenas ' + secSigla + ' pode alterar"' : ''} value="${escapeStr(item.endereco)}" onchange="onSpreadsheetChange('${item.id}', 'endereco', this.value)"></td>
            <td><input class="spreadsheet-input" style="${!podeEditar ? 'background: #f8fafc; opacity: 0.65; cursor: not-allowed;' : ''}" ${!podeEditar ? 'disabled title="Apenas ' + secSigla + ' pode alterar"' : ''} value="${escapeStr(item.cep)}" onchange="onSpreadsheetChange('${item.id}', 'cep', this.value)"></td>
            <td><input class="spreadsheet-input" style="${!podeEditar ? 'background: #f8fafc; opacity: 0.65; cursor: not-allowed;' : ''}" ${!podeEditar ? 'disabled title="Apenas ' + secSigla + ' pode alterar"' : ''} value="${escapeStr(item.telefone)}" onchange="onSpreadsheetChange('${item.id}', 'telefone', this.value)"></td>
            <td>
              <select class="spreadsheet-input" style="${!podeEditar ? 'background: #f8fafc; opacity: 0.65; cursor: not-allowed;' : ''}" ${!podeEditar ? 'disabled title="Apenas ' + secSigla + ' pode alterar"' : ''} onchange="onSpreadsheetChange('${item.id}', 'status', this.value)">
                <option value="Ativo" ${itemStatus === 'Ativo' ? 'selected' : ''}>Ativo</option>
                <option value="Pendente de revisão" ${itemStatus === 'Pendente de revisão' ? 'selected' : ''}>Pendente</option>
                <option value="Desatualizado" ${itemStatus === 'Desatualizado' ? 'selected' : ''}>Desatualizado</option>
              </select>
            </td>
            <td style="text-align: right;">
              ${podeEditar ? `
                <button class="btn btn-primary btn-xs" onclick="openEditEquipModal('${item.id}')"><i class="ri-edit-line"></i> Tudo</button>
              ` : `
                <button class="btn btn-secondary btn-xs" onclick="openViewModal('${item.id}')" title="Ver Ficha"><i class="ri-eye-line"></i> Ver</button>
              `}
            </td>
          `;
        }

        tbody.appendChild(row);
      });

      renderPaginationControls(totalFiltered, totalPages, startIndex, endIndex);
    }

    function renderPaginationControls(totalFiltered, totalPages, startIndex, endIndex) {
      const info = document.getElementById('paginationInfo');
      if (totalFiltered === 0) {
        info.innerHTML = 'Nenhum registro encontrado';
      } else {
        info.innerHTML = `Mostrando <strong>${startIndex + 1}–${endIndex}</strong> de <strong>${totalFiltered}</strong> endereços cadastrados`;
      }

      const container = document.getElementById('paginationButtons');
      container.innerHTML = '';
      if (totalPages <= 1) return;

      const prevBtn = document.createElement('button');
      prevBtn.className = 'page-btn';
      prevBtn.innerHTML = '‹';
      prevBtn.disabled = currentPage === 1;
      prevBtn.onclick = () => { if (currentPage > 1) { currentPage--; renderEquipTable(); } };
      container.appendChild(prevBtn);

      let maxVisible = 5;
      let startP = Math.max(1, currentPage - 2);
      let endP = Math.min(totalPages, startP + maxVisible - 1);
      if (endP - startP < maxVisible - 1) {
        startP = Math.max(1, endP - maxVisible + 1);
      }

      if (startP > 1) {
        const btn1 = document.createElement('button');
        btn1.className = 'page-btn';
        btn1.innerText = '1';
        btn1.onclick = () => { currentPage = 1; renderEquipTable(); };
        container.appendChild(btn1);
        if (startP > 2) {
          const dots = document.createElement('span');
          dots.innerText = '...';
          dots.style.padding = '4px';
          container.appendChild(dots);
        }
      }

      for (let p = startP; p <= endP; p++) {
        const btn = document.createElement('button');
        btn.className = 'page-btn' + (p === currentPage ? ' active' : '');
        btn.innerText = p;
        btn.onclick = () => { currentPage = p; renderEquipTable(); };
        container.appendChild(btn);
      }

      if (endP < totalPages) {
        if (endP < totalPages - 1) {
          const dots = document.createElement('span');
          dots.innerText = '...';
          dots.style.padding = '4px';
          container.appendChild(dots);
        }
        const btnLast = document.createElement('button');
        btnLast.className = 'page-btn';
        btnLast.innerText = totalPages;
        btnLast.onclick = () => { currentPage = totalPages; renderEquipTable(); };
        container.appendChild(btnLast);
      }

      const nextBtn = document.createElement('button');
      nextBtn.className = 'page-btn';
      nextBtn.innerHTML = '›';
      nextBtn.disabled = currentPage === totalPages;
      nextBtn.onclick = () => { if (currentPage < totalPages) { currentPage++; renderEquipTable(); } };
      container.appendChild(nextBtn);
    }

    function toggleActionDropdown(id) {
      document.querySelectorAll('.action-dropdown.open').forEach(d => {
        if (d.id !== 'dropdown_' + id) d.classList.remove('open');
      });
      const el = document.getElementById('dropdown_' + id);
      if (el) el.classList.toggle('open');
    }

    function toggleSpreadsheetMode() {
      isSpreadsheetMode = !isSpreadsheetMode;
      const btn = document.getElementById('btnSpreadsheetMode');
      const tableWrap = document.getElementById('tableContainer');
      if (isSpreadsheetMode) {
        btn.classList.add('btn-primary');
        btn.classList.remove('btn-secondary');
        tableWrap.classList.add('spreadsheet-active');
        showToast('Modo Planilha Ativado: edite diretamente nas células!');
      } else {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
        tableWrap.classList.remove('spreadsheet-active');
        showToast('Modo Tabela Visual Ativado.');
      }
      renderEquipTable();
    }

    async function onSpreadsheetChange(id, field, val) {
      const item = equipData.find(x => x.id === id);
      if (!item) return;
      item[field] = val;
      saveToStorage();
      showToast(`Campo "${field}" atualizado.`);

      const payload = { [field]: val };
      if (field === 'endereco') payload.logradouro = val;
      const res = await apiRequest(`./api/equipamentos/${encodeURIComponent(id)}`, 'PUT', payload);
      if (res.ok) {
        showToast(`Alteração gravada no SQLite.`);
      }
    }

    async function quickToggleStatus(id, event) {
      if (event) event.stopPropagation();
      const item = equipData.find(x => x.id === id);
      if (!item) return;
      if (item.status === 'Ativo') item.status = 'Pendente de revisão';
      else item.status = 'Ativo';
      saveToStorage();
      renderEquipTable();
      showToast(`Status alterado para ${item.status}.`);

      await apiRequest(`./api/equipamentos/${encodeURIComponent(id)}`, 'PUT', { status: item.status });
    }

    async function quickToggleDistrito(id, event) {
      if (event) event.stopPropagation();
      const item = equipData.find(x => x.id === id);
      if (!item) return;
      let d = parseInt(item.distrito || '1', 10);
      d = (d % 4) + 1;
      item.distrito = String(d);
      saveToStorage();
      renderEquipTable();
      showToast(`Distrito alterado para ${item.distrito}º Distrito.`);

      await apiRequest(`./api/equipamentos/${encodeURIComponent(id)}`, 'PUT', { distrito: item.distrito });
    }

    async function quickEditField(id, field, event) {
      if (event) event.stopPropagation();
      const item = equipData.find(x => x.id === id);
      if (!item) return;
      const current = item[field] || '';
      const promptLabel = field === 'endereco' ? 'Logradouro Oficial' : (field === 'bairro' ? 'Bairro' : (field === 'cep' ? 'CEP' : 'Telefone'));
      const val = prompt(`Editar ${promptLabel}:`, current);
      if (val !== null && val.trim() !== current) {
        item[field] = val.trim();
        saveToStorage();
        renderEquipTable();
        showToast(`${promptLabel} atualizado com sucesso!`);

        const payload = { [field]: val.trim() };
        if (field === 'endereco') payload.logradouro = val.trim();
        await apiRequest(`./api/equipamentos/${encodeURIComponent(id)}`, 'PUT', payload);
      }
    }

    function onSearchInput() {
      applyFilters();
    }

    function onFilterChange() {
      applyFilters();
    }

    function applyFilters() {
      const query = document.getElementById('searchEquip').value.toLowerCase().trim();
      const dist = document.getElementById('filterDistrito').value;
      const cat = document.getElementById('filterCategoria').value;
      const status = document.getElementById('filterStatus').value;
      const sec = document.getElementById('filterSecretaria')?.value;

      filteredEquipList = equipData.filter(item => {
        if (dist && String(item.distrito) !== String(dist)) return false;
        if (cat && !(item.categoria || '').toLowerCase().includes(cat.toLowerCase())) return false;
        if (status && String(item.status || 'Pendente de revisão').trim().toLowerCase() !== status.toLowerCase()) return false;
        if (sec) {
          const ext = detectExternalEntity(item);
          if (sec === 'EXT:CONCESSIONARIA') {
            if (!ext || ext.type !== 'CONCESSIONARIA') return false;
          } else if (sec === 'EXT:ORGAO_EXTERNO') {
            if (!ext || ext.type !== 'ORGAO_EXTERNO') return false;
          } else {
            const normItemSigla = normalizeEverydaySigla(item.secretaria_sigla);
            if (normItemSigla !== sec && item.secretaria_sigla !== sec) return false;
          }
        }

        if (query) {
          const ext = detectExternalEntity(item);
          const searchCorpus = [
            item.nome, item.sigla, item.categoria, item.secretaria_responsavel,
            item.secretaria_sigla, item.secretaria_nome,
            ext ? ext.tag : '', ext ? ext.label : '',
            item.bairro, item.bairro_oficial, item.distrito_oficial, item.endereco, item.logradouro, item.cep, item.telefone, item.hub_nome,
            item.predio_sala, item.numero, item.ponto_referencia
          ].filter(Boolean).join(' ').toLowerCase();

          if (!searchCorpus.includes(query)) return false;
        }
        return true;
      });

      currentPage = 1;
      updateKPIs(filteredEquipList);
      renderEquipTable();
    }

    function clearFilters() {
      document.getElementById('searchEquip').value = '';
      document.getElementById('filterDistrito').value = '';
      document.getElementById('filterCategoria').value = '';
      document.getElementById('filterStatus').value = '';
      const filterSec = document.getElementById('filterSecretaria');
      if (filterSec) filterSec.value = '';
      const btn = document.getElementById('btnMinhaSecretaria');
      if (btn) {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
      }
      filteredEquipList = equipData;
      currentPage = 1;
      updateKPIs(equipData);
      renderEquipTable();
    }

    function filtrarMinhaSecretaria() {
      const session = JSON.parse(localStorage.getItem('simac_auth_session') || '{}');
      const secNome = (session.secretariaNome || '').toLowerCase();
      let sigla = '';
      if (secNome.includes('saúde') || secNome.includes('saude')) sigla = 'SMS';
      else if (secNome.includes('educação') || secNome.includes('educacao')) sigla = 'SMEDC';
      else if (secNome.includes('assistência')) sigla = 'SEASDIH';
      else if (secNome.includes('fundec')) sigla = 'FUNDEC';
      else if (secNome.includes('governo')) sigla = 'SMG';
      else if (secNome.includes('obras')) sigla = 'SMO';
      else if (secNome.includes('defesa civil')) sigla = 'SMDC';

      const selectSec = document.getElementById('filterSecretaria');
      if (!selectSec) return;
      const btn = document.getElementById('btnMinhaSecretaria');

      if (selectSec.value === sigla) {
        selectSec.value = '';
        if (btn) {
          btn.classList.remove('btn-primary');
          btn.classList.add('btn-secondary');
        }
        showToast('Exibindo todos os 449 equipamentos da cidade.');
      } else {
        selectSec.value = sigla;
        if (btn) {
          btn.classList.add('btn-primary');
          btn.classList.remove('btn-secondary');
        }
        showToast('Filtrando apenas equipamentos da sua secretaria (' + sigla + ').');
      }
      applyFilters();
    }

    function renderHubsCards() {
      const container = document.getElementById('hubsContainer');
      if (!container) return;
      container.innerHTML = '';

      hubsData.forEach(hub => {
        const card = document.createElement('div');
        card.className = 'hub-card';

        const orgaos = getEquipsForHub(hub);
        let orgaosListHtml = '';
        if (orgaos.length === 0) {
          orgaosListHtml = '<li style="color: var(--text-light); font-style: italic; font-size: 11px; padding: 12px; text-align: center;">Nenhuma unidade vinculada a este complexo no momento.</li>';
        } else {
          orgaos.forEach(org => {
            orgaosListHtml += `
              <li style="display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; border-bottom: 1px solid var(--border); background: #ffffff;">
                <div style="flex: 1; min-width: 0; padding-right: 8px;">
                  <div style="font-weight: 700; color: var(--navy-900); font-size: 12px; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(org.nome)}">
                    ${escapeHtml(org.nome)}
                  </div>
                  <div style="color: var(--text-muted); font-size: 11px; margin-top: 2px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <span><i class="ri-map-pin-line"></i> ${escapeHtml(org.predio_sala || 'Pavimento Geral')}</span>
                    ${org.telefone ? `<span>| <i class="ri-phone-line"></i> ${escapeHtml(org.telefone)}</span>` : ''}
                    <span class="badge-cat" style="font-size: 9px; padding: 1px 5px;">${escapeHtml(org.categoria || 'Geral')}</span>
                  </div>
                </div>
                <div style="display: flex; gap: 4px; flex-shrink: 0;">
                  <button class="btn btn-secondary btn-xs" style="padding: 2px 6px;" onclick="openViewModal('${org.id}')" title="Ver Ficha Completa"><i class="ri-eye-line"></i></button>
                  <button class="btn btn-primary btn-xs" style="padding: 2px 7px;" onclick="openEditEquipModal('${org.id}')" title="Editar Unidade"><i class="ri-edit-line"></i></button>
                  <button class="btn btn-danger-outline btn-xs" style="padding: 2px 7px; color: #dc2626; border-color: #fca5a5;" onclick="removeEquipFromHub('${org.id}')" title="Desvincular deste Complexo"><i class="ri-close-line"></i></button>
                </div>
              </li>
            `;
          });
        }

        card.innerHTML = `
          <div class="hub-card-head">
            <div>
              <h3>${escapeHtml(hub.nome)}</h3>
              <div class="hub-addr"><i class="ri-map-pin-line" style="color: var(--primary);"></i> ${escapeHtml(hub.endereco)} — <strong>${escapeHtml(hub.bairro)}</strong> (${escapeHtml(hub.distrito)}º Distrito${hub.cep ? ' • CEP ' + escapeHtml(hub.cep) : ''})</div>
            </div>
            <span class="badge-cat" style="background: ${orgaos.length > 0 ? '#eff6ff' : '#f8fafc'}; color: ${orgaos.length > 0 ? '#0284c7' : '#94a3b8'}; border-color: ${orgaos.length > 0 ? '#bfdbfe' : '#e2e8f0'}; font-weight: 700; white-space: nowrap;">
              ${orgaos.length} ${orgaos.length === 1 ? 'Unidade' : 'Unidades'}
            </span>
          </div>
          <p class="hub-desc">${escapeHtml(hub.descricao || 'Complexo administrativo governamental de Duque de Caxias.')}</p>
          <div class="hub-orgaos-box">
            <div class="hub-orgaos-head" style="display: flex; justify-content: space-between; align-items: center;">
              <span><i class="ri-government-line"></i> Unidades Instaladas (${orgaos.length})</span>
              <button class="btn btn-secondary btn-xs" style="padding: 1px 6px; font-size: 10px; background: white;" onclick="openNewEquipInHub('${hub.id}')"><i class="ri-add-line"></i> Adicionar</button>
            </div>
            <ul class="hub-orgaos-list" style="max-height: 200px;">${orgaosListHtml}</ul>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 4px; flex-wrap: wrap;">
            <div style="display: flex; gap: 6px;">
              <button class="btn btn-secondary btn-xs" onclick="openNewEquipInHub('${hub.id}')" style="background: #f0fdf4; color: #15803d; border-color: #bbf7d0;"><i class="ri-add-circle-line"></i> + Nova Unidade</button>
              ${checkIsAdmin() ? `<button class="btn btn-secondary btn-xs" onclick="deleteHubCompleto('${hub.id}', '${escapeStr(hub.nome)}')" style="color: var(--red-600); border-color: #fecaca; background: #fff5f5;"><i class="ri-delete-bin-line"></i> Excluir Polo</button>` : ''}
            </div>
            <div style="display: flex; gap: 6px;">
              <button class="btn btn-secondary btn-xs" onclick="filterByHub('${escapeStr(hub.nome)}')"><i class="ri-search-line"></i> Filtrar Tabela</button>
              <button class="btn btn-primary btn-xs" onclick="focusHubOnMap(${hub.lat || -22.785}, ${hub.lon || -43.305}, '${escapeStr(hub.nome)}')"><i class="ri-map-pin-2-line"></i> Mapa</button>
            </div>
          </div>
        `;
        container.appendChild(card);
      });
    }

    function filterByHub(hubNome) {
      const navItem = document.querySelector('.sidebar-nav-item[data-tab="equipamentos"]') || document.querySelectorAll('.sidebar-nav-item')[0];
      navigateTab('equipamentos', navItem);
      document.getElementById('searchEquip').value = hubNome;
      onSearchInput();
    }

    function getEquipsForHub(hub) {
      if (!hub) return [];
      const hubId = typeof hub === 'string' ? hub : hub.id;
      const hubNome = typeof hub === 'object' && hub.nome ? hub.nome.toLowerCase().trim() : '';

      return equipData.filter(e => {
        if (!e.hub_id && !e.hub_nome) return false;
        if (e.hub_id && String(e.hub_id).toLowerCase().trim() === String(hubId).toLowerCase().trim()) return true;
        if (hubNome && e.hub_nome && e.hub_nome.toLowerCase().trim() === hubNome) return true;
        return false;
      });
    }

    async function deleteHubCompleto(hubId, hubNome) {
      if (!checkIsAdmin()) {
        showToast('Apenas administradores podem excluir complexos/polos.', 'error');
        return;
      }

      const orgaos = getEquipsForHub(hubId);
      const aviso = orgaos.length > 0 
        ? `ATENÇÃO: Este polo abriga ${orgaos.length} unidade(s) instalada(s).\n\nAo excluir, todas as unidades serão automaticamente desvinculadas e mantidas como imóveis isolados no sistema.\n\nDeseja realmente excluir o polo "${hubNome}"?`
        : `Deseja realmente excluir o polo "${hubNome}"?`;

      if (!confirm(aviso)) return;

      try {
        const token = getAuthToken();
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`./api/hubs/${encodeURIComponent(hubId)}`, {
          method: 'DELETE',
          headers
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao excluir polo.');

        // Desvincula localmente os equipamentos que apontavam para o Hub
        equipData.forEach(e => {
          if (String(e.hub_id) === String(hubId) || (e.hub_nome && e.hub_nome.toLowerCase().trim() === hubNome.toLowerCase().trim())) {
            e.hub_id = '';
            e.hub_nome = '';
          }
        });

        // Remove do array local
        hubsData = hubsData.filter(h => String(h.id) !== String(hubId));
        saveToStorage();

        renderHubsCards();
        renderEquipTable();
        if (map) updateMapLayers();
        populateHubSelect('');

        showToast(data.message || `Polo "${hubNome}" excluído com sucesso!`);
      } catch (err) {
        console.error(err);
        showToast(err.message || 'Erro ao excluir polo.', 'error');
      }
    }
    window.deleteHubCompleto = deleteHubCompleto;

    function removeEquipFromHub(equipId) {
      const item = equipData.find(x => x.id === equipId);
      if (!item) return;
      if (confirm(`Deseja realmente desvincular a unidade "${item.nome}" deste Complexo/Polo?\n\nEla passará a constar como unidade de imóvel isolado.`)) {
        item.hub_id = '';
        item.hub_nome = '';
        saveToStorage();
        renderHubsCards();
        renderEquipTable();
        if (map) updateMapLayers();
        showToast(`Unidade "${item.nome}" desvinculada do Complexo com sucesso!`);
      }
    }

    function openNewEquipInHub(hubId) {
      const hub = hubsData.find(h => h.id === hubId);
      openNewEquipModal();
      if (hub) {
        document.getElementById('editEquipHubSelect').value = hub.id;
        document.getElementById('editEquipLogradouro').value = hub.endereco || '';
        document.getElementById('editEquipBairro').value = hub.bairro || '';
        document.getElementById('editEquipDist').value = hub.distrito || '1';
        if (hub.cep) document.getElementById('editEquipCep').value = hub.cep;
        if (hub.lat && hub.lon) {
          const hLat = Number(hub.lat);
          const hLon = Number(hub.lon);
          const safeLat = (!isNaN(hLat) && hLat !== 0) ? hLat : -22.785000;
          const safeLon = (!isNaN(hLon) && hLon !== 0) ? safeLon : -43.305000;
          document.getElementById('editEquipLat').value = safeLat.toFixed(6);
          document.getElementById('editEquipLon').value = safeLon.toFixed(6);
          setTimeout(() => initOrUpdateModalMiniMap(safeLat, safeLon), 300);
        }
      }
    }

    async function exportData(type, format) {
      const isFiltered = hasActiveEquipFilters();
      const data = isFiltered ? filteredEquipList : equipData;

      if (!data || data.length === 0) {
        showToast('Nenhum equipamento encontrado nos filtros atuais para exportar.');
        return;
      }

      const dateStr = new Date().toISOString().slice(0, 10);
      const suffix = isFiltered ? 'filtrado' : 'completo';

      if (format === 'xlsx') {
        try {
          showToast(`Gerando planilha Excel (.xlsx) com ${data.length} endereços...`);
          const token = getAuthToken();
          const headers = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;
          const res = await fetch('./api/equipamentos/export-xlsx', {
            method: 'POST',
            headers,
            body: JSON.stringify({ ids: data.map(x => x.id) })
          });
          if (!res.ok) throw new Error('Falha ao gerar XLSX no servidor');
          const blob = await res.blob();
          downloadBlob(blob, `enderecos_duque_de_caxias_${suffix}_${dateStr}.xlsx`);
          showToast(`Planilha Excel exportada (${data.length} registros)!`);
          return;
        } catch (err) {
          console.warn('[SIGEM] Fallback CSV ativado na exportação XLSX:', err);
          showToast('Servidor indisponível para XLSX; exportando em formato CSV compatível com Excel.');
          format = 'csv';
        }
      }

      if (format === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        downloadBlob(blob, `enderecos_duque_de_caxias_${suffix}_${dateStr}.json`);
        showToast(`JSON exportado (${data.length} registros)!`);
      } else if (format === 'csv') {
        const escCsv = (v) => String(v ?? '').replace(/"/g, '""');
        let csv = "ID;Nome;Sigla;Categoria;Secretaria_Sigla;Secretaria_Nome;Concessionaria_Orgao_Externo;Status;Distrito;Bairro;Bairro_Oficial_Cartografico;Logradouro;Numero;Complemento;CEP;Cidade;UF;Telefone;Email;Horario;Latitude;Longitude;Complexo_Hub" + String.fromCharCode(10);
        data.forEach(x => {
          const ext = detectExternalEntity(x);
          const secSigla = normalizeEverydaySigla(x.secretaria_sigla || 'PMDC');
          const secNome = x.secretaria_nome || x.secretaria_responsavel || 'Prefeitura Municipal de Duque de Caxias';
          const extLabel = ext ? `${ext.tag} (${ext.label})` : '';
          csv += [
            x.id,
            x.nome || '',
            x.sigla || '',
            x.categoria || '',
            secSigla,
            secNome,
            extLabel,
            x.status || 'Ativo',
            x.distrito ? `${x.distrito}º Distrito` : '',
            x.bairro || '',
            x.bairro_oficial || x.bairro || '',
            x.logradouro || x.endereco || '',
            x.numero || 's/nº',
            x.predio_sala || x.complemento || '',
            x.cep || '',
            'Duque de Caxias',
            'RJ',
            x.telefone || '',
            x.email || '',
            x.horario_funcionamento || '',
            x.lat ?? '',
            x.lon ?? '',
            x.hub_nome || ''
          ].map(v => `"${escCsv(v)}"`).join(';') + String.fromCharCode(10);
        });
        const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
        downloadBlob(blob, `enderecos_duque_de_caxias_${suffix}_${dateStr}.csv`);
        showToast(`Planilha CSV exportada (${data.length} registros)!`);
      }
    }

    async function exportHubsData(format = 'csv') {
      const dateStr = new Date().toISOString().slice(0, 10);

      if (format === 'xlsx') {
        try {
          showToast('Gerando planilha completa de Hubs (.xlsx)...');
          const token = getAuthToken();
          const headers = {};
          if (token) headers['Authorization'] = `Bearer ${token}`;
          const res = await fetch('./api/hubs/export-xlsx', { headers });
          if (!res.ok) throw new Error('Falha ao exportar XLSX de Hubs');
          const blob = await res.blob();
          downloadBlob(blob, `hubs_complexos_duque_de_caxias_${dateStr}.xlsx`);
          showToast('Planilha de Hubs (.xlsx) com endereços completos exportada!');
          return;
        } catch (err) {
          console.warn('[SIGEM] Fallback CSV para Hubs:', err);
          format = 'csv';
        }
      }

      const escCsv = (v) => String(v ?? '').replace(/"/g, '""');
      let csv = "ID;Nome;Logradouro_e_Numero;Bairro;Distrito;Cidade;UF;CEP;Endereco_Completo;Latitude;Longitude;Total_Orgaos" + String.fromCharCode(10);
      hubsData.forEach(h => {
        const orgaos = getEquipsForHub(h);
        const endBase = h.endereco || h.logradouro || '';
        const bairroStr = h.bairro || '';
        const distStr = h.distrito ? `${h.distrito}º Distrito` : '';
        const cidadeStr = h.cidade || 'Duque de Caxias';
        const ufStr = h.uf || 'RJ';
        const cepStr = h.cep || '';
        const enderecoCompleto = `${endBase}${bairroStr ? ' - ' + bairroStr : ''} (${distStr}), ${cidadeStr} - ${ufStr}${cepStr ? ', CEP ' + cepStr : ''}`;
        csv += [
          h.id,
          h.nome || '',
          endBase,
          bairroStr,
          distStr,
          cidadeStr,
          ufStr,
          cepStr,
          enderecoCompleto,
          h.lat ?? '',
          h.lon ?? '',
          orgaos.length
        ].map(v => `"${escCsv(v)}"`).join(';') + String.fromCharCode(10);
      });
      const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
      downloadBlob(blob, `hubs_complexos_duque_de_caxias_${dateStr}.csv`);
      showToast('Planilha CSV de Hubs com endereço completo exportada!');
    }

    function downloadBlob(blob, filename) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }


// Fechar dropdowns de ação ao clicar fora
document.addEventListener('click', (e) => {
  if (!e.target.closest('.action-dropdown')) {
    document.querySelectorAll('.action-dropdown.open').forEach(el => el.classList.remove('open'));
  }
});


document.addEventListener('DOMContentLoaded', () => {
      initUserSession();
      initDatabase();

      // Inicia sincronização com o banco central (Equipamentos, Hubs, Categorias e Secretarias)
      loadEquipamentosFromApi();
      if (typeof loadHubsFromApi === 'function') loadHubsFromApi();
      if (typeof carregarCategorias === 'function') carregarCategorias();
      if (typeof carregarSecretariasSigem === 'function') carregarSecretariasSigem();

      // Garante que os campos de filtro comecem desmarcados e limpos no carregamento inicial
      const searchEl = document.getElementById('searchEquip');
      if (searchEl) searchEl.value = '';
      const distEl = document.getElementById('filterDistrito');
      if (distEl) distEl.value = '';
      const catEl = document.getElementById('filterCategoria');
      if (catEl) catEl.value = '';
      const statusEl = document.getElementById('filterStatus');
      if (statusEl) statusEl.value = '';
      const secEl = document.getElementById('filterSecretaria');
      if (secEl) secEl.value = '';

      renderEquipTable();
      renderHubsCards();
      updateGoogleKeyStatusBadge();

      // Suporte a navegação direta via hash (#mapa, #hubs, #relatorios, #config) vinda dos KPIs do Hub
      const applyHashTab = () => {
        const h = (window.location.hash || '').replace('#', '').trim().toLowerCase();
        if (['equipamentos', 'hubs', 'mapa', 'relatorios', 'config'].includes(h)) {
          const navEl = document.querySelector(`.sidebar-nav-item[data-tab="${h}"]`);
          navigateTab(h, navEl);
        }
      };
      applyHashTab();
      window.addEventListener('hashchange', applyHashTab);
    });
