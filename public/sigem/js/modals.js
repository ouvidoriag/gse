/* ==========================================================================
   SIGEM — Módulo 3: Formulários, Modais, Mini-Mapa & Auditoria
   Prefeitura Municipal de Duque de Caxias
   ========================================================================== */

// --- ESTADO DO MINI-MAPA NO MODAL ---
let modalMapStreetLayer = null;
let modalMapSatLayer = null;
let modalMapLabelsLayer = null;
let modalMapCurrentMode = 'street';

// --- ESTADO DA AUDITORIA & CATEGORIAS ---
let auditLogsCache = [];
let currentAuditFilter = '';
let categoriasCache = [];
let currentModalPrecisaoGeo = 'APROXIMADO_LOGRADOURO';

window.setModalPrecisaoGeo = function(val) {
  if (val) currentModalPrecisaoGeo = val;
};

// --- STUB DE SEGURANÇA PARA BOTÕES DO HTML ---
function openNewHubModal() {
  if (typeof showToast === 'function') {
    showToast('Módulo de cadastro de novos polos compartilhados em homologação.');
  }
}

// --- FUNÇÕES DE MODAIS & AUDITORIA ---
    function openNewEquipModal() {
      document.getElementById('modalEquipTitle').innerHTML = '<i class="ri-add-circle-line" style="color: var(--primary); margin-right: 6px;"></i>Cadastrar Novo Equipamento';
      document.getElementById('modalEquipSubtitle').innerText = 'Insira as informações oficiais do novo endereço público.';
      document.getElementById('btnModalDeleteEquip').style.display = 'none';

      document.getElementById('editEquipId').value = '';
      currentModalPrecisaoGeo = 'APROXIMADO_LOGRADOURO';
      document.getElementById('editEquipNome').value = '';
      document.getElementById('editEquipSigla').value = '';
      document.getElementById('editEquipCat').value = 'Educação (SMEDC)';
      document.getElementById('editEquipSecResp').value = '';
      document.getElementById('editEquipStatus').value = 'Ativo';

      document.getElementById('editEquipCep').value = '';
      document.getElementById('editEquipDist').value = '1';
      document.getElementById('editEquipBairro').value = '';
      document.getElementById('editEquipLogradouro').value = '';
      document.getElementById('editEquipNumero').value = '';
      document.getElementById('editEquipPredioSala').value = '';
      document.getElementById('editEquipRef').value = '';

      document.getElementById('editEquipTel').value = '';
      document.getElementById('editEquipTelSec').value = '';
      document.getElementById('editEquipWhats').value = '';
      document.getElementById('editEquipEmail').value = '';
      document.getElementById('editEquipHorario').value = 'Segunda a sexta, das 09h às 17h';
      document.getElementById('editEquipDesc').value = '';

      document.getElementById('editEquipLat').value = '-22.785000';
      document.getElementById('editEquipLon').value = '-43.305000';

      populateHubSelect('');
      document.getElementById('modalEquip').classList.add('active');

      setTimeout(() => {
        initOrUpdateModalMiniMap(-22.785000, -43.305000);
      }, 250);
    }

    function openEditEquipModal(id) {
      const item = equipData.find(x => x.id === id);
      if (!item) return;

      if (!canUserEditEquip(item)) {
        showToast('Acesso restrito: Este equipamento é gerido pela ' + (item.secretaria_sigla || item.secretaria_nome || 'outra secretaria') + '. Abrindo em modo leitura.');
        openViewModal(id);
        return;
      }

      document.getElementById('modalEquipTitle').innerHTML = '<i class="ri-edit-line" style="color: var(--primary); margin-right: 6px;"></i>Editar Tudo — Equipamento & Endereço';
      document.getElementById('modalEquipSubtitle').innerText = `ID: ${item.id} • Última revisão registrada`;
      document.getElementById('btnModalDeleteEquip').style.display = 'inline-block';

      document.getElementById('editEquipId').value = item.id;
      currentModalPrecisaoGeo = item.precisao_geo || 'APROXIMADO_LOGRADOURO';
      document.getElementById('editEquipNome').value = item.nome || '';
      document.getElementById('editEquipSigla').value = item.sigla || '';
      document.getElementById('editEquipCat').value = item.categoria || 'Educação (SMEDC)';
      document.getElementById('editEquipSecResp').value = item.secretaria_responsavel || '';
      document.getElementById('editEquipStatus').value = item.status || 'Ativo';

      document.getElementById('editEquipCep').value = item.cep || '';
      document.getElementById('editEquipDist').value = item.distrito || '1';
      document.getElementById('editEquipBairro').value = item.bairro || '';
      document.getElementById('editEquipLogradouro').value = item.endereco || '';
      document.getElementById('editEquipNumero').value = item.numero || '';
      document.getElementById('editEquipPredioSala').value = item.predio_sala || '';
      document.getElementById('editEquipRef').value = item.ponto_referencia || '';

      document.getElementById('editEquipTel').value = item.telefone || '';
      document.getElementById('editEquipTelSec').value = item.telefone_secundario || '';
      document.getElementById('editEquipWhats').value = item.whatsapp || '';
      document.getElementById('editEquipEmail').value = item.email || '';
      document.getElementById('editEquipHorario').value = item.horario_funcionamento || '';
      document.getElementById('editEquipDesc').value = item.descricao || '';

      const rawLat = Number(item.lat);
      const rawLon = Number(item.lon);
      const lat = (!isNaN(rawLat) && rawLat !== 0) ? rawLat : -22.785000;
      const lon = (!isNaN(rawLon) && rawLon !== 0) ? rawLon : -43.305000;
      document.getElementById('editEquipLat').value = lat.toFixed(6);
      document.getElementById('editEquipLon').value = lon.toFixed(6);

      let currentHubId = item.hub_id || '';
      if (!currentHubId && item.hub_nome) {
        const foundHub = hubsData.find(h => h.nome && h.nome.toLowerCase().trim() === item.hub_nome.toLowerCase().trim());
        if (foundHub) currentHubId = foundHub.id;
      }
      populateHubSelect(currentHubId);
      document.getElementById('modalEquip').classList.add('active');

      setTimeout(() => {
        initOrUpdateModalMiniMap(lat, lon);
      }, 250);
    }

    function closeEquipModal() {
      document.getElementById('modalEquip').classList.remove('active');
      document.getElementById('manualAdjustmentBanner').style.display = 'none';
      document.getElementById('geocodeStatusBadge').style.display = 'none';
    }

    async function saveEquipModal() {
      const id = document.getElementById('editEquipId').value;
      const nome = document.getElementById('editEquipNome').value.trim();
      const endereco = document.getElementById('editEquipLogradouro').value.trim();
      const bairro = document.getElementById('editEquipBairro').value.trim();

      if (!nome || !endereco || !bairro) {
        alert('Por favor preencha os campos obrigatórios: Nome Oficial, Logradouro e Bairro.');
        return;
      }

      const selectedHubId = document.getElementById('editEquipHubSelect').value;
      let hubNome = '';
      if (selectedHubId) {
        const h = hubsData.find(x => x.id === selectedHubId);
        if (h) hubNome = h.nome;
      }

      const lat = parseFloat(document.getElementById('editEquipLat').value) || -22.785000;
      const lon = parseFloat(document.getElementById('editEquipLon').value) || -43.305000;

      const payload = {
        nome: nome,
        sigla: document.getElementById('editEquipSigla').value.trim(),
        categoria: document.getElementById('editEquipCat').value,
        secretaria_responsavel: document.getElementById('editEquipSecResp').value.trim(),
        status: document.getElementById('editEquipStatus').value,
        cep: document.getElementById('editEquipCep').value.trim(),
        distrito: document.getElementById('editEquipDist').value,
        bairro: bairro,
        endereco: endereco,
        logradouro: endereco,
        numero: document.getElementById('editEquipNumero').value.trim(),
        predio_sala: document.getElementById('editEquipPredioSala').value.trim(),
        ponto_referencia: document.getElementById('editEquipRef').value.trim(),
        hub_id: selectedHubId || null,
        hub_nome: hubNome || '',
        telefone: document.getElementById('editEquipTel').value.trim(),
        telefone_secundario: document.getElementById('editEquipTelSec').value.trim(),
        whatsapp: document.getElementById('editEquipWhats').value.trim(),
        email: document.getElementById('editEquipEmail').value.trim(),
        horario_funcionamento: document.getElementById('editEquipHorario').value.trim(),
        descricao: document.getElementById('editEquipDesc').value.trim(),
        latitude: lat,
        longitude: lon,
        lat: lat,
        lon: lon,
        precisao_geo: currentModalPrecisaoGeo || 'APROXIMADO_LOGRADOURO'
      };

      if (id) {
        payload.id = id;
        const item = equipData.find(x => x.id === id);
        if (item) {
          Object.assign(item, payload);
        }
        saveToStorage();
        closeEquipModal();
        applyFilters();
        renderHubsCards();
        if (map) updateMapLayers();
        showToast(`Gravando alterações de "${nome}" no SQLite...`);

        const res = await apiRequest(`./api/equipamentos/${encodeURIComponent(id)}`, 'PUT', payload);
        if (res.ok && res.data && res.data.data) {
          if (item) Object.assign(item, res.data.data);
          saveToStorage();
          applyFilters();
          showToast(`"${nome}" salvo com sucesso no SQLite e auditado!`);
        } else if (res.status === 401) {
          showToast(`Salvo localmente. Sessão expirou para gravar no SQLite.`);
        } else {
          showToast(`Salvo no navegador (Aviso SQLite: ${res.data?.error || 'servidor offline'}).`);
        }
      } else {
        const tempId = 'rec_novo_' + Date.now();
        payload.id = tempId;
        equipData.unshift(payload);
        saveToStorage();
        closeEquipModal();
        applyFilters();
        renderHubsCards();
        if (map) updateMapLayers();
        showToast(`Cadastrando "${nome}" no banco SQLite...`);

        const res = await apiRequest('./api/equipamentos', 'POST', payload);
        if (res.ok && res.data && res.data.data) {
          const idx = equipData.findIndex(x => x.id === tempId);
          if (idx !== -1) {
            equipData[idx] = res.data.data;
          }
          saveToStorage();
          applyFilters();
          showToast(`"${nome}" cadastrado com sucesso no SQLite e registrado na auditoria!`);
        } else if (res.status === 401) {
          showToast(`Cadastrado localmente. Sessão expirou para gravar no SQLite.`);
        } else {
          showToast(`Cadastrado localmente (Aviso SQLite: ${res.data?.error || 'servidor offline'}).`);
        }
      }
    }

    function deleteCurrentModalEquip() {
      const id = document.getElementById('editEquipId').value;
      if (!id) return;
      deleteEquip(id);
      closeEquipModal();
    }

    async function deleteEquip(id) {
      const idx = equipData.findIndex(x => x.id === id);
      if (idx === -1) return;
      const item = equipData[idx];
      if (!canUserEditEquip(item)) {
        showToast('Acesso negado: você só pode excluir equipamentos da sua própria secretaria.');
        return;
      }
      const nome = item.nome;
      if (confirm(`Tem certeza que deseja excluir o cadastro de "${nome}" do banco central SQLite?\n\nEsta operação será registrada na trilha de auditoria oficial.`)) {
        equipData.splice(idx, 1);
        saveToStorage();
        applyFilters();
        renderHubsCards();
        if (map) updateMapLayers();
        showToast(`Excluindo "${nome}" do SQLite...`);

        const res = await apiRequest(`./api/equipamentos/${encodeURIComponent(id)}`, 'DELETE');
        if (res.ok) {
          showToast(`Equipamento "${nome}" inativado/excluído com sucesso no SQLite.`);
        } else if (res.status === 401) {
          showToast(`Excluído localmente. Sessão expirou para gravar exclusão no SQLite.`);
        } else {
          showToast(`Excluído localmente (Aviso SQLite: ${res.data?.error || 'servidor offline'}).`);
        }
      }
    }

    function populateHubSelect(selectedId) {
      const sel = document.getElementById('editEquipHubSelect');
      if (!sel) return;
      sel.innerHTML = '<option value="">-- Prédio Próprio / Isolado (Não pertence a Hub) --</option>';
      hubsData.forEach(h => {
        const opt = document.createElement('option');
        opt.value = h.id;
        opt.innerText = `${h.nome} (${h.bairro})`;
        if (h.id === selectedId) opt.selected = true;
        sel.appendChild(opt);
      });
    }

    function setModalMapMode(mode) {
      if (!modalMap) return;
      modalMapCurrentMode = mode;
      const btnStreet = document.getElementById('btnMiniMapStreet');
      const btnSat = document.getElementById('btnMiniMapSat');

      if (mode === 'satellite') {
        if (modalMapStreetLayer && modalMap.hasLayer(modalMapStreetLayer)) {
          modalMap.removeLayer(modalMapStreetLayer);
        }
        if (!modalMapSatLayer) {
          modalMapSatLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Esri World Imagery &copy; Satélite',
            maxZoom: 19
          });
          modalMapLabelsLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19
          });
        }
        modalMapSatLayer.addTo(modalMap);
        modalMapLabelsLayer.addTo(modalMap);
        if (btnStreet) btnStreet.classList.remove('active');
        if (btnSat) btnSat.classList.add('active');
        showToast('Satélite ativado: Aproxime no telhado e posicione o pino na portaria.');
      } else {
        if (modalMapSatLayer && modalMap.hasLayer(modalMapSatLayer)) {
          modalMap.removeLayer(modalMapSatLayer);
        }
        if (modalMapLabelsLayer && modalMap.hasLayer(modalMapLabelsLayer)) {
          modalMap.removeLayer(modalMapLabelsLayer);
        }
        if (modalMapStreetLayer && !modalMap.hasLayer(modalMapStreetLayer)) {
          modalMapStreetLayer.addTo(modalMap);
        }
        if (btnStreet) btnStreet.classList.add('active');
        if (btnSat) btnSat.classList.remove('active');
      }
    }

    function initOrUpdateModalMiniMap(lat, lon, targetZoom = 16) {
      const container = document.getElementById('modalMiniMap');
      if (!container) return;

      const numLat = Number(lat);
      const numLon = Number(lon);
      const safeLat = (!isNaN(numLat) && numLat !== 0) ? numLat : -22.785000;
      const safeLon = (!isNaN(numLon) && numLon !== 0) ? numLon : -43.305000;

      if (!modalMap) {
        modalMap = L.map('modalMiniMap', { maxZoom: 19 }).setView([safeLat, safeLon], targetZoom);

        modalMapStreetLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
          attribution: 'Esri &copy; Prefeitura de Duque de Caxias',
          maxZoom: 19
        }).addTo(modalMap);

        const customMarkerIcon = L.divIcon({
          className: 'custom-pin-draggable',
          html: `<div style="background: #ef4444; border: 3px solid #ffffff; width: 28px; height: 28px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.4);"><div style="width: 8px; height: 8px; background: #ffffff; border-radius: 50%;"></div></div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 28]
        });

        modalMarker = L.marker([safeLat, safeLon], { draggable: true, icon: customMarkerIcon }).addTo(modalMap);

        modalMarker.on('dragend', function (e) {
          const pos = modalMarker.getLatLng();
          const pLat = Number(pos.lat);
          const pLng = Number(pos.lng);
          document.getElementById('editEquipLat').value = pLat.toFixed(6);
          document.getElementById('editEquipLon').value = pLng.toFixed(6);
          currentModalPrecisaoGeo = 'NUMERO_EXATO';

          const badge = document.getElementById('geocodeStatusBadge');
          badge.style.display = 'inline-block';
          badge.style.background = '#dcfce7';
          badge.style.color = '#15803d';
          badge.innerHTML = '<i class="ri-checkbox-circle-fill"></i> Posição calibrada manualmente na portaria/fachada (ROOFTOP Exato)!';
          showToast(`Coordenada exata cravada: ${pLat.toFixed(6)}, ${pLng.toFixed(6)}`);
        });

        modalMap.on('click', function (e) {
          modalMarker.setLatLng(e.latlng);
          const pLat = Number(e.latlng.lat);
          const pLng = Number(e.latlng.lng);
          document.getElementById('editEquipLat').value = pLat.toFixed(6);
          document.getElementById('editEquipLon').value = pLng.toFixed(6);
          currentModalPrecisaoGeo = 'NUMERO_EXATO';

          const badge = document.getElementById('geocodeStatusBadge');
          badge.style.display = 'inline-block';
          badge.style.background = '#dcfce7';
          badge.style.color = '#15803d';
          badge.innerHTML = '<i class="ri-checkbox-circle-fill"></i> Pino posicionado no ponto clicado (ROOFTOP Exato)!';
          showToast(`Pino posicionado: ${pLat.toFixed(6)}, ${pLng.toFixed(6)}`);
        });
      } else {
        modalMap.invalidateSize();
        modalMap.setView([safeLat, safeLon], targetZoom);
        modalMarker.setLatLng([safeLat, safeLon]);
      }
    }

    function ativarAjusteManualModal() {
      const banner = document.getElementById('manualAdjustmentBanner');
      banner.style.display = 'block';
      if (modalMap && modalMarker) {
        modalMap.setZoom(17);
        modalMarker.dragging.enable();
        if (modalMapCurrentMode === 'street') {
          setModalMapMode('satellite');
        }
      }
      showToast('Ajuste fino ativo: arraste o marcador ou clique diretamente na fachada do imóvel.');
    }

    function openViewModal(id) {
      const item = equipData.find(x => x.id === id);
      if (!item) return;
      currentViewingEquipId = item.id;

      document.getElementById('viewModalNome').innerText = item.nome;
      document.getElementById('viewModalCat').innerText = `${item.categoria} • ${item.distrito}º Distrito (${item.bairro})`;

      const itemStatus = item.status || 'Ativo';
      let statusColor = '#10b981';
      if (itemStatus === 'Pendente de revisão') statusColor = '#f59e0b';
      else if (itemStatus === 'Desatualizado') statusColor = '#ef4444';

      let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 10px 14px; border-radius: 4px; border: 1px solid var(--border); margin-bottom: 14px;">
          <div>
            <strong style="color: var(--navy-900);">Status Cadastral:</strong>
            <span style="color: ${statusColor}; font-weight: 700; margin-left: 6px;">${itemStatus}</span>
          </div>
          <div>
            <strong style="color: var(--navy-900);">Distrito:</strong>
            <span style="margin-left: 6px;">${item.distrito}º Distrito</span>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
          <div style="background: var(--surface-subtle); padding: 10px 12px; border-radius: 6px; border: 1px solid var(--border);">
            <div style="font-size: 11px; color: var(--text-muted); font-weight: 700;">LOGRADOURO & NÚMERO</div>
            <div style="font-weight: 600; color: var(--navy-900); margin-top: 2px;"><i class="ri-map-pin-line" style="color: var(--primary); margin-right: 4px;"></i>${item.logradouro || item.endereco}${item.numero && item.numero !== 's/nº' && !(item.logradouro || '').includes(item.numero) ? ', ' + item.numero : ''}${item.complemento ? ' – ' + item.complemento : ''}</div>
          </div>
          <div style="background: var(--surface-subtle); padding: 10px 12px; border-radius: 6px; border: 1px solid var(--border);">
            <div style="font-size: 11px; color: var(--text-muted); font-weight: 700;">BAIRRO & CEP</div>
            <div style="font-weight: 600; color: var(--navy-900); margin-top: 2px;"><i class="ri-mail-line" style="color: var(--primary); margin-right: 4px;"></i>${item.bairro}${item.bairro_oficial && item.bairro_oficial.toLowerCase().trim() !== (item.bairro || '').toLowerCase().trim() ? ` <span style="font-size: 11px; color: #6366f1; font-weight: 600;">(Oficial: ${item.bairro_oficial})</span>` : ''} | CEP ${item.cep || '-'}</div>
            ${item.distrito_oficial ? `<div style="font-size: 11px; color: #64748b; margin-top: 3px;"><i class="ri-pie-chart-line" style="color: #0284c7;"></i> Região: <strong>${item.distrito_oficial}</strong> (${item.distrito}º Distrito)</div>` : ''}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
          <div style="background: var(--surface-subtle); padding: 10px 12px; border-radius: 6px; border: 1px solid var(--border);">
            <div style="font-size: 11px; color: var(--text-muted); font-weight: 700;">TELEFONE OFICIAL</div>
            <div style="font-weight: 600; color: var(--navy-900); margin-top: 2px;"><i class="ri-phone-line" style="color: var(--primary); margin-right: 4px;"></i>${item.telefone || 'Não informado'}</div>
          </div>
          <div style="background: var(--surface-subtle); padding: 10px 12px; border-radius: 6px; border: 1px solid var(--border);">
            <div style="font-size: 11px; color: var(--text-muted); font-weight: 700;">E-MAIL INSTITUCIONAL</div>
            <div style="font-weight: 600; color: var(--navy-900); margin-top: 2px;"><i class="ri-mail-send-line" style="color: var(--primary); margin-right: 4px;"></i>${item.email || 'Não informado'}</div>
          </div>
        </div>

        <div style="background: #f8fafc; padding: 10px 12px; border-radius: 6px; border: 1px solid var(--border); margin-bottom: 12px;">
          <div style="font-size: 11px; color: var(--text-muted); font-weight: 700;">COORDENADAS GEOGRÁFICAS (SIG)</div>
          <div style="font-family: monospace; font-size: 12px; color: var(--navy-900); margin-top: 2px;">
            Latitude: <strong>${(item.lat != null && item.lat !== '' && !isNaN(Number(item.lat))) ? Number(item.lat).toFixed(6) : (item.lat || '-')}</strong> | Longitude: <strong>${(item.lon != null && item.lon !== '' && !isNaN(Number(item.lon))) ? Number(item.lon).toFixed(6) : (item.lon || '-')}</strong>
          </div>
        </div>

        ${item.predio_sala ? `
          <div style="background: #fffbeb; border: 1px solid #fef3c7; padding: 10px 12px; border-radius: 6px; margin-bottom: 12px;">
            <div style="font-size: 11px; color: #b45309; font-weight: 700;">COMPLEMENTO / INEP / CNES</div>
            <div style="font-size: 12px; color: #78350f; margin-top: 2px;">${item.predio_sala}</div>
          </div>
        ` : ''}

        ${item.descricao ? `
          <div style="margin-top: 10px;">
            <div style="font-size: 11px; color: var(--text-muted); font-weight: 700;">DESCRIÇÃO DOS SERVIÇOS</div>
            <div style="font-size: 12px; color: var(--gray-700); margin-top: 4px; line-height: 1.4;">${item.descricao}</div>
          </div>
        ` : ''}
      `;

      document.getElementById('viewModalBody').innerHTML = html;
      document.getElementById('modalViewEquip').classList.add('active');
    }

    function closeViewModal() {
      document.getElementById('modalViewEquip').classList.remove('active');
    }

    function abrirEdicaoDeVisualizacao() {
      if (!currentViewingEquipId) return;
      const id = currentViewingEquipId;
      closeViewModal();
      openEditEquipModal(id);
    }

    function openGoogleKeyModal() {
      const input = document.getElementById('inputGoogleApiKey');
      if (input) input.value = getGoogleApiKey();
      const statusEl = document.getElementById('googleKeyStatusMessage');
      if (statusEl) statusEl.style.display = 'none';
      document.getElementById('modalGoogleKey').classList.add('active');
    }

    function closeGoogleKeyModal() {
      document.getElementById('modalGoogleKey').classList.remove('active');
    }

    function openAuditoriaModal() {
      if (!checkIsAdmin()) {
        showToast('Acesso restrito a administradores do sistema.');
        return;
      }
      document.getElementById('modalAuditoria').classList.add('active');
      carregarAuditoriaLogs(true);
    }

    function closeAuditoriaModal() {
      document.getElementById('modalAuditoria').classList.remove('active');
    }

    async function carregarAuditoriaResumo() {
      if (!checkIsAdmin()) return;
      try {
        const res = await apiRequest('./api/auditoria?limit=150');
        if (res.ok && res.data && Array.isArray(res.data.logs)) {
          const logs = res.data.logs;
          let logins = 0, inserts = 0, updates = 0, deletes = 0;
          logs.forEach(l => {
            if (l.tabela_afetada === 'auth') logins++;
            else if (l.operacao === 'INSERT') inserts++;
            else if (l.operacao === 'UPDATE') updates++;
            else if (l.operacao === 'DELETE') deletes++;
          });
          const elL = document.getElementById('kpiLogins'); if (elL) elL.textContent = logins;
          const elI = document.getElementById('kpiInserts'); if (elI) elI.textContent = inserts;
          const elU = document.getElementById('kpiUpdates'); if (elU) elU.textContent = updates;
          const elD = document.getElementById('kpiDeletes'); if (elD) elD.textContent = deletes;
          const elB = document.getElementById('badgeTotalLogs'); if (elB) elB.textContent = `${res.data.total || logs.length} Eventos`;
        }
      } catch (e) {
        console.warn('Erro ao carregar resumo de auditoria:', e);
      }
    }

    async function carregarAuditoriaLogs(force = false) {
      const loading = document.getElementById('auditLoading');
      const emptyState = document.getElementById('auditEmptyState');
      const tableBody = document.getElementById('auditTableBody');
      const paginationInfo = document.getElementById('auditPaginationInfo');

      if (loading) loading.style.display = 'block';
      if (emptyState) emptyState.style.display = 'none';

      try {
        const res = await apiRequest('./api/auditoria?limit=200');
        if (loading) loading.style.display = 'none';

        if (res.ok && res.data && Array.isArray(res.data.logs)) {
          auditLogsCache = res.data.logs;
          renderAuditoriaTable();
          if (paginationInfo) {
            paginationInfo.textContent = `Exibindo os ${auditLogsCache.length} eventos mais recentes de um total de ${res.data.total || auditLogsCache.length} registros no SQLite.`;
          }
          carregarAuditoriaResumo();
        } else {
          if (tableBody) tableBody.innerHTML = '';
          if (emptyState) {
            emptyState.style.display = 'block';
            emptyState.innerHTML = `<i class="ri-error-warning-line" style="font-size: 32px; color: var(--red-600);"></i><p style="margin-top: 8px;">${(res.data && res.data.error) || 'Não foi possível carregar os logs de auditoria.'}</p>`;
          }
        }
      } catch (err) {
        if (loading) loading.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
      }
    }

    function filtrarAuditoriaPorOperacao(operacao, btn) {
      currentAuditFilter = operacao;
      document.querySelectorAll('.audit-filter-btn').forEach(b => {
        b.classList.remove('btn-primary', 'active');
        b.classList.add('btn-secondary');
      });
      if (btn) {
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn-primary', 'active');
      }
      renderAuditoriaTable();
    }

    function onAuditSearchInput() {
      renderAuditoriaTable();
    }

    function renderAuditoriaTable() {
      const tableBody = document.getElementById('auditTableBody');
      const emptyState = document.getElementById('auditEmptyState');
      const searchVal = (document.getElementById('auditSearchInput')?.value || '').toLowerCase().trim();

      if (!tableBody) return;

      let filtered = auditLogsCache;

      // Filtro de Operação
      if (currentAuditFilter === 'auth') {
        filtered = filtered.filter(l => l.tabela_afetada === 'auth');
      } else if (currentAuditFilter) {
        filtered = filtered.filter(l => l.operacao === currentAuditFilter && l.tabela_afetada !== 'auth');
      }

      // Filtro de Busca Textual
      if (searchVal) {
        filtered = filtered.filter(l => {
          const u = (l.usuario || '').toLowerCase();
          const t = (l.tabela_afetada || '').toLowerCase();
          const r = String(l.registro_id || '').toLowerCase();
          const dN = (l.dados_novos || '').toLowerCase();
          const dA = (l.dados_anteriores || '').toLowerCase();
          const ip = (l.ip || '').toLowerCase();
          const disp = (l.dispositivo || '').toLowerCase();
          const loc = (l.localizacao || '').toLowerCase();
          return u.includes(searchVal) || t.includes(searchVal) || r.includes(searchVal) ||
                 dN.includes(searchVal) || dA.includes(searchVal) ||
                 ip.includes(searchVal) || disp.includes(searchVal) || loc.includes(searchVal);
        });
      }

      if (!filtered.length) {
        tableBody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
      }

      if (emptyState) emptyState.style.display = 'none';

      tableBody.innerHTML = filtered.map(log => {
        // Formatar Data e Hora
        let dataFmt = log.criado_em || '';
        let horaFmt = '';
        try {
          const d = new Date(log.criado_em.replace(' ', 'T'));
          if (!isNaN(d.getTime())) {
            dataFmt = d.toLocaleDateString('pt-BR');
            horaFmt = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          }
        } catch (e) {}

        const dataHoraCell = `<div style="font-family: monospace; font-size: 11px; color: var(--navy-900); font-weight: 600;">${dataFmt}</div>
          <div style="font-family: monospace; font-size: 10px; color: var(--text-muted);">${horaFmt}</div>`;

        // Badge de Operação
        let opBadge = '';
        if (log.tabela_afetada === 'auth') {
          opBadge = '<span style="background: #ede9fe; color: #6d28d9; border: 1px solid #ddd6fe; padding: 2px 7px; border-radius: 4px; font-size: 11px; font-weight: 700;"><i class="ri-login-box-line"></i> LOGIN</span>';
        } else if (log.operacao === 'INSERT') {
          opBadge = '<span style="background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; padding: 2px 7px; border-radius: 4px; font-size: 11px; font-weight: 700;"><i class="ri-add-line"></i> ADICIONOU</span>';
        } else if (log.operacao === 'UPDATE') {
          opBadge = '<span style="background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; padding: 2px 7px; border-radius: 4px; font-size: 11px; font-weight: 700;"><i class="ri-edit-line"></i> ALTEROU</span>';
        } else if (log.operacao === 'DELETE') {
          opBadge = '<span style="background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; padding: 2px 7px; border-radius: 4px; font-size: 11px; font-weight: 700;"><i class="ri-delete-bin-line"></i> EXCLUIU</span>';
        } else {
          opBadge = `<span style="background: #f1f5f9; color: #475569; padding: 2px 7px; border-radius: 4px; font-size: 11px; font-weight: 600;">${log.operacao}</span>`;
        }

        // Operador / Usuário
        const usuarioBadge = `<div style="display: flex; align-items: center; gap: 6px;">
          <span style="width: 22px; height: 22px; border-radius: 50%; background: #0f1b2d; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; flex-shrink: 0;">${(log.usuario || 'U').charAt(0).toUpperCase()}</span>
          <span style="font-weight: 600; color: var(--navy-900); font-size: 12px; word-break: break-all;">${escapeHtml(log.usuario || 'Desconhecido')}</span>
        </div>`;

        // Origem: IP & Máquina
        const ipVal = log.ip || '127.0.0.1 (Localhost)';
        const dispVal = log.dispositivo || 'Computador Desktop';
        const origemBadge = `<div style="display: flex; flex-direction: column; gap: 2px;">
          <div style="display: flex; align-items: center; gap: 4px;">
            <i class="ri-global-line" style="color: #0284c7; font-size: 12px;"></i>
            <code style="font-size: 11px; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 1px 5px; border-radius: 3px; font-weight: 600; color: #15803d;">${escapeHtml(ipVal)}</code>
          </div>
          <div style="display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--text-muted);" title="${escapeHtml(dispVal)}">
            <i class="ri-computer-line" style="font-size: 11px; color: #64748b;"></i>
            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;">${escapeHtml(dispVal)}</span>
          </div>
        </div>`;

        // Localização / Lotação
        const locVal = log.localizacao || 'Sede Municipal (Duque de Caxias - RJ)';
        const localizacaoBadge = `<div style="display: flex; align-items: flex-start; gap: 4px; font-size: 11px; color: var(--navy-900);">
          <i class="ri-map-pin-2-line" style="color: #059669; font-size: 13px; margin-top: 1px; flex-shrink: 0;"></i>
          <span style="line-height: 1.3;" title="${escapeHtml(locVal)}">${escapeHtml(locVal)}</span>
        </div>`;

        // Alvo / Tabela
        let alvoInfo = `<div style="font-size: 12px; font-weight: 600; color: var(--navy-900);">${escapeHtml(log.tabela_afetada)}</div>`;
        if (log.registro_id && log.registro_id !== 'null' && log.registro_id !== '0') {
          alvoInfo += `<div style="font-size: 11px; color: var(--text-muted); font-family: monospace;">ID: ${escapeHtml(log.registro_id)}</div>`;
        }

        // Detalhes / Modificações
        let detalhesHtml = '';
        if (log.tabela_afetada === 'auth') {
          try {
            const dataNovos = JSON.parse(log.dados_novos || '{}');
            const evento = dataNovos.event || 'Acesso';
            const isSuccess = evento === 'LOGIN_SUCCESS';
            detalhesHtml = `<div style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
              <span style="color: ${isSuccess ? '#059669' : '#dc2626'}; font-size: 12px;">
                <i class="${isSuccess ? 'ri-shield-check-line' : 'ri-shield-cross-line'}"></i>
                ${isSuccess ? 'Acesso ao sistema autorizado' : 'Tentativa de login rejeitada'}
              </span>
              <button class="btn btn-secondary btn-xs" onclick="openDiffModal(${log.id})" style="padding: 2px 8px; font-size: 11px;">
                <i class="ri-file-info-line"></i> Detalhes
              </button>
            </div>`;
          } catch (e) {
            detalhesHtml = '<span style="color: #475569; font-size: 12px;">Acesso ao sistema</span>';
          }
        } else if (log.operacao === 'UPDATE') {
          detalhesHtml = `<div style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
            <span style="color: var(--text-muted); font-size: 12px;">Campos cadastrais atualizados</span>
            <button class="btn btn-secondary btn-xs" onclick="openDiffModal(${log.id})" style="padding: 2px 8px; font-size: 11px;">
              <i class="ri-git-commit-line" style="color: #0284c7;"></i> Ver Comparativo
            </button>
          </div>`;
        } else if (log.operacao === 'INSERT') {
          let resumo = 'Novo cadastro gravado no banco';
          try {
            const dn = JSON.parse(log.dados_novos || '{}');
            if (dn.nome) resumo = `<strong>"${escapeHtml(dn.nome)}"</strong>`;
            if (dn.categoria) resumo += ` · ${escapeHtml(dn.categoria)}`;
          } catch (e) {}
          detalhesHtml = `<div style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
            <span style="font-size: 12px; color: #065f46;">${resumo}</span>
            <button class="btn btn-secondary btn-xs" onclick="openDiffModal(${log.id})" style="padding: 2px 8px; font-size: 11px;">
              <i class="ri-eye-line"></i> Ver Dados
            </button>
          </div>`;
        } else if (log.operacao === 'DELETE') {
          let resumo = 'Registro removido do banco';
          try {
            const da = JSON.parse(log.dados_anteriores || '{}');
            if (da.nome) resumo = `Excluído: <strong>"${escapeHtml(da.nome)}"</strong>`;
          } catch (e) {}
          detalhesHtml = `<div style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
            <span style="font-size: 12px; color: #991b1b;">${resumo}</span>
            <button class="btn btn-secondary btn-xs" onclick="openDiffModal(${log.id})" style="padding: 2px 8px; font-size: 11px;">
              <i class="ri-eye-line"></i> Ver Dados
            </button>
          </div>`;
        }

        return `<tr>
          <td style="vertical-align: middle;">${dataHoraCell}</td>
          <td style="vertical-align: middle;">${usuarioBadge}</td>
          <td style="vertical-align: middle;">${origemBadge}</td>
          <td style="vertical-align: middle;">${localizacaoBadge}</td>
          <td style="vertical-align: middle;">${opBadge}</td>
          <td style="vertical-align: middle;">${alvoInfo}</td>
          <td style="vertical-align: middle;">${detalhesHtml}</td>
        </tr>`;
      }).join('');
    }

    function openDiffModal(logId) {
      const log = auditLogsCache.find(l => l.id === logId);
      if (!log) return;

      const titleEl = document.getElementById('diffModalTitle');
      const subtitleEl = document.getElementById('diffModalSubtitle');
      const bodyEl = document.getElementById('diffModalBody');

      let parsedAnt = null;
      let parsedNov = null;
      try { if (log.dados_anteriores) parsedAnt = JSON.parse(log.dados_anteriores); } catch (e) {}
      try { if (log.dados_novos) parsedNov = JSON.parse(log.dados_novos); } catch (e) {}

      // Formatar Data e Hora
      let dataFmt = log.criado_em || '';
      try {
        const d = new Date(log.criado_em.replace(' ', 'T'));
        if (!isNaN(d.getTime())) {
          dataFmt = d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }
      } catch (e) {}

      titleEl.innerHTML = `<i class="ri-file-search-line" style="color: #0284c7;"></i> Detalhes da Operação #${log.id} — ${escapeHtml(log.operacao)}`;
      subtitleEl.textContent = `Operador: ${log.usuario || 'admin'} • Tabela: ${log.tabela_afetada} (ID: ${log.registro_id || '--'}) • Data: ${dataFmt}`;

      // Banner Executivo de Rastreabilidade Forense
      const ipVal = log.ip || '127.0.0.1 (Localhost)';
      const dispVal = log.dispositivo || 'Computador Governamental (Desktop)';
      const locVal = log.localizacao || 'Sede Municipal (Duque de Caxias - RJ)';

      let execHeaderHtml = `<div style="background: linear-gradient(135deg, #0f1b2d 0%, #1e293b 100%); color: #ffffff; border-radius: 6px; padding: 14px 18px; margin-bottom: 18px; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; font-size: 12px; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        <div>
          <div style="color: #94a3b8; font-size: 10px; text-transform: uppercase; font-weight: 700; margin-bottom: 3px; display: flex; align-items: center; gap: 4px;">
            <i class="ri-time-line" style="color: #38bdf8;"></i> Data &amp; Hora
          </div>
          <div style="font-weight: 600; color: #f8fafc; font-family: monospace;">${escapeHtml(dataFmt)}</div>
        </div>
        <div>
          <div style="color: #94a3b8; font-size: 10px; text-transform: uppercase; font-weight: 700; margin-bottom: 3px; display: flex; align-items: center; gap: 4px;">
            <i class="ri-user-line" style="color: #38bdf8;"></i> Operador (Login)
          </div>
          <div style="font-weight: 700; color: #38bdf8;">${escapeHtml(log.usuario || 'admin')}</div>
        </div>
        <div>
          <div style="color: #94a3b8; font-size: 10px; text-transform: uppercase; font-weight: 700; margin-bottom: 3px; display: flex; align-items: center; gap: 4px;">
            <i class="ri-global-line" style="color: #34d399;"></i> Endereço IP
          </div>
          <div style="font-weight: 600; color: #34d399; font-family: monospace;">${escapeHtml(ipVal)}</div>
        </div>
        <div>
          <div style="color: #94a3b8; font-size: 10px; text-transform: uppercase; font-weight: 700; margin-bottom: 3px; display: flex; align-items: center; gap: 4px;">
            <i class="ri-computer-line" style="color: #c084fc;"></i> Computador / SO
          </div>
          <div style="font-weight: 600; color: #f8fafc;" title="${escapeHtml(dispVal)}">${escapeHtml(dispVal)}</div>
        </div>
        <div style="grid-column: 1 / -1; border-top: 1px solid rgba(255,255,255,0.12); padding-top: 10px; margin-top: 2px;">
          <div style="color: #94a3b8; font-size: 10px; text-transform: uppercase; font-weight: 700; margin-bottom: 3px; display: flex; align-items: center; gap: 4px;">
            <i class="ri-map-pin-range-line" style="color: #fbbf24;"></i> Lotação &amp; Localização Detectada
          </div>
          <div style="font-weight: 600; color: #fbbf24;">${escapeHtml(locVal)}</div>
        </div>
      </div>`;

      let html = '';

      if (log.operacao === 'UPDATE' && parsedNov) {
        html += '<h4 style="font-size: 13px; font-weight: 700; color: var(--navy-900); margin-bottom: 12px;">Comparativo de Campos Alterados:</h4>';
        html += '<div style="display: flex; flex-direction: column; gap: 10px;">';

        const keys = Object.keys(parsedNov);
        let mudancasEncontradas = 0;

        keys.forEach(k => {
          const valNovo = parsedNov[k];
          const valAnt = parsedAnt ? parsedAnt[k] : undefined;
          
          const strAnt = (valAnt !== undefined && valAnt !== null) ? String(valAnt) : '<em>(vazio)</em>';
          const strNovo = (valNovo !== undefined && valNovo !== null) ? String(valNovo) : '<em>(vazio)</em>';

          mudancasEncontradas++;
          html += `<div style="background: var(--surface-subtle); border: 1px solid var(--border); border-radius: 4px; padding: 10px 14px;">
            <div style="font-weight: 700; color: var(--navy-900); text-transform: capitalize; margin-bottom: 6px; font-size: 11px;">
              • Campo: <code>${escapeHtml(k)}</code>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px;">
              <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 6px 10px;">
                <span style="font-size: 10px; font-weight: 700; color: #991b1b; text-transform: uppercase; display: block; margin-bottom: 2px;">Antes:</span>
                <span style="color: #7f1d1d; word-break: break-word;">${escapeHtml(strAnt)}</span>
              </div>
              <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 6px 10px;">
                <span style="font-size: 10px; font-weight: 700; color: #065f46; text-transform: uppercase; display: block; margin-bottom: 2px;">Depois:</span>
                <span style="color: #064e3b; font-weight: 600; word-break: break-word;">${escapeHtml(strNovo)}</span>
              </div>
            </div>
          </div>`;
        });

        if (mudancasEncontradas === 0) {
          html += '<p style="color: var(--text-muted);">Nenhum dado específico detectado no log.</p>';
        }

        html += '</div>';
      } else if (log.operacao === 'INSERT' && parsedNov) {
        html += '<h4 style="font-size: 13px; font-weight: 700; color: #047857; margin-bottom: 12px;">Dados Cadastrados (INSERT):</h4>';
        html += '<div style="background: var(--surface-subtle); border: 1px solid var(--border); border-radius: 4px; padding: 12px;">';
        html += '<table style="width: 100%; border-collapse: collapse; font-size: 12px;">';
        Object.entries(parsedNov).forEach(([k, v]) => {
          html += `<tr style="border-bottom: 1px solid var(--border);">
            <td style="padding: 6px 8px; font-weight: 600; color: var(--navy-900); width: 35%;">${escapeHtml(k)}</td>
            <td style="padding: 6px 8px; color: var(--text-main); font-family: monospace;">${escapeHtml(String(v))}</td>
          </tr>`;
        });
        html += '</table></div>';
      } else if (log.operacao === 'DELETE' && parsedAnt) {
        html += '<h4 style="font-size: 13px; font-weight: 700; color: #b91c1c; margin-bottom: 12px;">Registro Excluído (Estado Anterior):</h4>';
        html += '<div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 4px; padding: 12px;">';
        html += '<table style="width: 100%; border-collapse: collapse; font-size: 12px;">';
        Object.entries(parsedAnt).forEach(([k, v]) => {
          html += `<tr style="border-bottom: 1px solid rgba(220,38,38,0.15);">
            <td style="padding: 6px 8px; font-weight: 600; color: #7f1d1d; width: 35%;">${escapeHtml(k)}</td>
            <td style="padding: 6px 8px; color: #991b1b; font-family: monospace;">${escapeHtml(String(v))}</td>
          </tr>`;
        });
        html += '</table></div>';
      } else {
        html += '<pre style="background: #0f1b2d; color: #f8fafc; padding: 14px; border-radius: 4px; overflow-x: auto; font-size: 11px;">' + escapeHtml(JSON.stringify(log, null, 2)) + '</pre>';
      }

      bodyEl.innerHTML = execHeaderHtml + html;
      document.getElementById('modalDiffAuditoria').classList.add('active');
    }

    function closeDiffModal() {
      document.getElementById('modalDiffAuditoria').classList.remove('active');
    }

    function abrirAuditoriaRawJson() {
      const token = getAuthToken();
      if (!token) {
        showToast('Sessão expirada ou não autenticado.');
        return;
      }
      window.open(`./api/auditoria?token=${encodeURIComponent(token)}&limit=150`, '_blank');
    }

    async function carregarCategorias() {
      try {
        const res = await apiRequest('./api/categorias');
        if (res.ok && Array.isArray(res.data)) {
          categoriasCache = res.data;
          renderCategoriasUI();
          atualizarSelectsDeCategorias();
        }
      } catch (e) {
        console.warn('Erro ao carregar categorias:', e);
      }
    }

    function renderCategoriasUI() {
      const container = document.getElementById('adminCategoriasChips');
      const badgeCount = document.getElementById('badgeTotalCategorias');
      if (badgeCount) badgeCount.textContent = `${categoriasCache.length} Ativas`;
      if (!container) return;

      if (!categoriasCache.length) {
        container.innerHTML = '<span style="color: var(--text-muted); font-size: 12px;">Nenhuma categoria carregada.</span>';
        return;
      }

      container.innerHTML = categoriasCache.map(cat => {
        const cor = cat.cor_hex || '#3b82f6';
        const icone = cat.icone ? (cat.icone.startsWith('ri-') ? `<i class="${cat.icone}"></i>` : '') : '<i class="ri-folder-line"></i>';
        return `<span style="display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; font-size: 11px; font-weight: 600; border-radius: 3px; background: ${cor}15; color: ${cor}; border: 1px solid ${cor}35;" title="Macrosetor: ${cat.macrosetor || 'Geral'}">
          <span>${icone}</span>
          <span>${cat.nome}</span>
        </span>`;
      }).join('');
    }

    function atualizarSelectsDeCategorias() {
      // 1. Dropdown de Filtro da Tabela Principal
      const filterSelect = document.getElementById('filterCategoria');
      if (filterSelect) {
        const curVal = filterSelect.value;
        let html = '<option value="">Todas as Categorias</option>';
        categoriasCache.forEach(c => {
          html += `<option value="${escapeHtml(c.nome)}">${escapeHtml(c.nome)}</option>`;
        });
        filterSelect.innerHTML = html;
        filterSelect.value = curVal;
      }

      // 2. Dropdown de Edição de Equipamento
      const editSelect = document.getElementById('editEquipCat');
      if (editSelect) {
        const curEditVal = editSelect.value;
        let html = '';
        categoriasCache.forEach(c => {
          html += `<option value="${escapeHtml(c.nome)}">${escapeHtml(c.nome)}</option>`;
        });
        editSelect.innerHTML = html;
        if (curEditVal) editSelect.value = curEditVal;
      }

      // 3. Dropdown de Filtro no Mapa SIG
      const mapFilterCat = document.getElementById('mapFilterCategoria');
      if (mapFilterCat) {
        const curMapVal = mapFilterCat.value;
        let html = '<option value="">Todas as Categorias</option>';
        categoriasCache.forEach(c => {
          html += `<option value="${escapeHtml(c.nome)}">${escapeHtml(c.nome)}</option>`;
        });
        mapFilterCat.innerHTML = html;
        mapFilterCat.value = curMapVal;
      }
    }

    function openNovaCategoriaModal() {
      if (!checkIsAdmin()) {
        showToast('Apenas administradores podem criar novas categorias.');
        return;
      }
      document.getElementById('inputNovaCatNome').value = '';
      document.getElementById('inputNovaCatMacro').value = 'Administração e Serviços';
      document.getElementById('inputNovaCatIcone').value = 'ri-folder-line';
      document.getElementById('inputNovaCatCor').value = '#059669';
      document.getElementById('novaCatAlert').style.display = 'none';
      document.getElementById('modalNovaCategoria').classList.add('active');
      setTimeout(() => document.getElementById('inputNovaCatNome').focus(), 150);
    }

    function closeNovaCategoriaModal() {
      document.getElementById('modalNovaCategoria').classList.remove('active');
    }

    async function salvarNovaCategoria() {
      const nomeInput = document.getElementById('inputNovaCatNome');
      const macroInput = document.getElementById('inputNovaCatMacro');
      const iconeInput = document.getElementById('inputNovaCatIcone');
      const corInput = document.getElementById('inputNovaCatCor');
      const alertEl = document.getElementById('novaCatAlert');
      const btn = document.getElementById('btnSalvarNovaCat');

      const nome = (nomeInput.value || '').trim();
      const macrosetor = (macroInput.value || '').trim() || 'Administração e Serviços';
      const icone = (iconeInput.value || '').trim() || 'ri-folder-line';
      const cor_hex = (corInput.value || '').trim() || '#3b82f6';

      if (!nome) {
        alertEl.style.display = 'block';
        alertEl.style.background = '#fef2f2';
        alertEl.style.color = '#dc2626';
        alertEl.textContent = 'O nome da categoria é obrigatório.';
        nomeInput.focus();
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Gravando...';

      try {
        const res = await apiRequest('./api/categorias', 'POST', {
          nome,
          macrosetor,
          icone,
          cor_hex
        });

        if (res.ok && res.data && res.data.success) {
          showToast(`Categoria "${nome}" cadastrada com sucesso no SQLite!`);
          closeNovaCategoriaModal();
          await carregarCategorias();
          if (checkIsAdmin()) carregarAuditoriaResumo();
        } else {
          alertEl.style.display = 'block';
          alertEl.style.background = '#fef2f2';
          alertEl.style.color = '#dc2626';
          alertEl.textContent = (res.data && res.data.error) || 'Erro ao salvar categoria no banco.';
        }
      } catch (err) {
        alertEl.style.display = 'block';
        alertEl.style.background = '#fef2f2';
        alertEl.style.color = '#dc2626';
        alertEl.textContent = err.message || 'Erro de conexão com o servidor.';
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="ri-check-line"></i> Salvar no SQLite';
      }
    }
