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

    function updateKPIs() {
      let ativos = 0;
      let pendentes = 0;
      let desat = 0;

      equipData.forEach(e => {
        const s = e.status || 'Pendente de revisão';
        if (s === 'Ativo') ativos++;
        else if (s === 'Pendente de revisão') pendentes++;
        else if (s === 'Desatualizado') desat++;
        else pendentes++;
      });

      const elTotal = document.getElementById('kpiTotal');
      if (elTotal) elTotal.innerText = equipData.length;
      const elAtivos = document.getElementById('kpiAtivos');
      if (elAtivos) elAtivos.innerText = ativos;
      const elPendentes = document.getElementById('kpiPendentes');
      if (elPendentes) elPendentes.innerText = pendentes;
      const elDesat = document.getElementById('kpiDesatualizados');
      if (elDesat) elDesat.innerText = desat;
      const elBadge = document.getElementById('badgeTotalEquip');
      if (elBadge) elBadge.innerText = `${equipData.length} cadastrados`;
    }

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
        if (itemStatus === 'Ativo') {
          statusClass = 'badge-status-ativo';
          statusIcon = '<i class="ri-checkbox-circle-fill" style="color: #10b981; font-size: 13px;"></i>';
        } else if (itemStatus === 'Desatualizado') {
          statusClass = 'badge-status-desatualizado';
          statusIcon = '<i class="ri-alert-fill" style="color: #ef4444; font-size: 13px;"></i>';
        }

        const podeEditar = canUserEditEquip(item);
        const secSigla = item.secretaria_sigla || 'PMDC';
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
                <div style="margin-top: 3px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                  <span class="badge-sec ${item.secretaria_sigla ? 'badge-sec-' + item.secretaria_sigla.toLowerCase() : ''}" title="Gestão Oficial: ${escapeStr(secNome)}">
                    <i class="ri-government-line"></i> ${secSigla}
                  </span>
                  ${item.hub_nome ? `<span class="badge-hub" onclick="event.stopPropagation(); filterByHub('${item.hub_nome}')"><i class="ri-building-line"></i> ${item.hub_nome}</span>` : ''}
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
                ${statusIcon} <span>${itemStatus}</span>
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
      else if (item.status === 'Pendente de revisão') item.status = 'Desatualizado';
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
        if (cat && !item.categoria.includes(cat)) return false;
        if (status && (item.status || 'Pendente de revisão') !== status) return false;
        if (sec && item.secretaria_sigla !== sec) return false;

        if (query) {
          const searchCorpus = [
            item.nome, item.sigla, item.categoria, item.secretaria_responsavel,
            item.secretaria_sigla, item.secretaria_nome,
            item.bairro, item.bairro_oficial, item.distrito_oficial, item.endereco, item.cep, item.telefone, item.hub_nome,
            item.predio_sala, item.numero, item.ponto_referencia
          ].filter(Boolean).join(' ').toLowerCase();

          if (!searchCorpus.includes(query)) return false;
        }
        return true;
      });

      currentPage = 1;
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
              <div class="hub-addr"><i class="ri-map-pin-line" style="color: var(--primary);"></i> ${escapeHtml(hub.endereco)} — <strong>${escapeHtml(hub.bairro)}</strong> (${escapeHtml(hub.distrito)}º Distrito)</div>
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
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 4px;">
            <button class="btn btn-secondary btn-xs" onclick="openNewEquipInHub('${hub.id}')" style="background: #f0fdf4; color: #15803d; border-color: #bbf7d0;"><i class="ri-add-circle-line"></i> + Nova Unidade</button>
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
          document.getElementById('editEquipLat').value = hub.lat.toFixed(6);
          document.getElementById('editEquipLon').value = hub.lon.toFixed(6);
          setTimeout(() => initOrUpdateModalMiniMap(hub.lat, hub.lon), 300);
        }
      }
    }

    function exportData(type, format) {
      const data = filteredEquipList.length > 0 ? filteredEquipList : equipData;
      if (format === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        downloadBlob(blob, `enderecos_duque_de_caxias_${new Date().toISOString().slice(0,10)}.json`);
      } else if (format === 'csv') {
        let csv = "ID;Nome;Sigla;Categoria;Secretaria;Status;Distrito;Bairro;Endereco;Numero;CEP;Telefone;Email;Horario;Latitude;Longitude;Complexo" + String.fromCharCode(10);
        data.forEach(x => {
          csv += '"' + x.id + '";"' + (x.nome || '') + '";"' + (x.sigla || '') + '";"' + (x.categoria || '') + '";"' + (x.secretaria_responsavel || '') + '";"' + (x.status || 'Ativo') + '";"' + (x.distrito || '') + '";"' + (x.bairro || '') + '";"' + (x.endereco || '') + '";"' + (x.numero || '') + '";"' + (x.cep || '') + '";"' + (x.telefone || '') + '";"' + (x.email || '') + '";"' + (x.horario_funcionamento || '') + '";"' + (x.lat || '') + '";"' + (x.lon || '') + '";"' + (x.hub_nome || '') + '"' + String.fromCharCode(10);
        });
        const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
        downloadBlob(blob, `enderecos_duque_de_caxias_${new Date().toISOString().slice(0,10)}.csv`);
      }
    }

    function exportHubsData(format) {
      let csv = "ID;Nome;Bairro;Distrito;Endereco;Latitude;Longitude;Total_Orgaos" + String.fromCharCode(10);
      hubsData.forEach(h => {
        const orgaos = getEquipsForHub(h);
        csv += '"' + h.id + '";"' + (h.nome || '') + '";"' + (h.bairro || '') + '";"' + (h.distrito || '') + '";"' + (h.endereco || '') + '";"' + (h.lat || '') + '";"' + (h.lon || '') + '";"' + (orgaos.length) + '"' + String.fromCharCode(10);
      });
      const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
      downloadBlob(blob, `hubs_complexos_duque_de_caxias_${new Date().toISOString().slice(0,10)}.csv`);
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

      // Inicia sincronização com o banco de dados central SQLite
      loadEquipamentosFromApi();

      // Garante que os campos de filtro comecem desmarcados e limpos no carregamento inicial
      const searchEl = document.getElementById('searchEquip');
      if (searchEl) searchEl.value = '';
      const distEl = document.getElementById('filterDistrito');
      if (distEl) distEl.value = '';
      const catEl = document.getElementById('filterCategoria');
      if (catEl) catEl.value = '';
      const statusEl = document.getElementById('filterStatus');
      if (statusEl) statusEl.value = '';

      renderEquipTable();
      renderHubsCards();
      updateGoogleKeyStatusBadge();
    });
