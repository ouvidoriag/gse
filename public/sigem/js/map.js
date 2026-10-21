/* ==========================================================================
   SIGEM — Módulo 2: Geoprocessamento, Leaflet & Camadas Vetoriais
   Prefeitura Municipal de Duque de Caxias
   ========================================================================== */

// --- ESTADO DO MAPA PRINCIPAL ---
let mainMapCurrentMode = 'street';
let mainMapStreetLayer = null;
let mainMapSatLayer = null;
let mainMapLabelsLayer = null;

// --- FUNÇÕES DO MAPA LEAFLET & CAMADAS ---
    function initMap() {
      if (map) {
        map.invalidateSize();
        return;
      }

      // Bounding box e Centroide de Duque de Caxias
      map = L.map('mapContainer', { maxZoom: 19 }).setView([-22.7150, -43.2750], 11);
      window.map = map;

      mainMapStreetLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Prefeitura de Duque de Caxias',
        maxZoom: 19
      }).addTo(map);

      hubsMapLayer = L.layerGroup().addTo(map);
      equipsMapLayer = L.layerGroup().addTo(map);

      updateMapLayers();
    }

    function updateMapLayers() {
      if (!map) return;

      const showHubs = document.getElementById('layerToggleHubs').checked;
      const showEquips = document.getElementById('layerToggleEquips').checked;
      const filterDist = document.getElementById('mapFilterDistrito').value;
      const filterCat = document.getElementById('mapFilterCategoria').value;
      const searchVal = (document.getElementById('mapSearchInput')?.value || '').toLowerCase().trim();

      const btnClear = document.getElementById('btnClearMapSearch');
      if (btnClear) {
        btnClear.style.display = searchVal ? 'block' : 'none';
      }

      hubsMapLayer.clearLayers();
      equipsMapLayer.clearLayers();

      const matchedMarkers = [];
      let totalVisible = 0;

      // Camada 1: Hubs (Ícones Vermelhos Institucionais)
      if (showHubs) {
        hubsData.forEach(hub => {
          if (hub.lat && hub.lon) {
            if (filterDist && String(hub.distrito) !== String(filterDist)) return;

            // Filtro por texto de pesquisa
            if (searchVal) {
              const hNome = (hub.nome || '').toLowerCase();
              const hEnd = (hub.endereco || '').toLowerCase();
              const hBairro = (hub.bairro || '').toLowerCase();
              const orgaos = getEquipsForHub(hub);
              const hasOrgaoMatch = orgaos.some(o => (o.nome || '').toLowerCase().includes(searchVal));
              if (!hNome.includes(searchVal) && !hEnd.includes(searchVal) && !hBairro.includes(searchVal) && !hasOrgaoMatch) {
                return;
              }
            }

            totalVisible++;

            const hubIcon = L.divIcon({
              className: 'custom-hub-icon',
              html: `<div style="background: #dc2626; color: white; border: 2px solid white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-size: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.35);"><i class="ri-government-line"></i></div>`,
              iconSize: [30, 30],
              iconAnchor: [15, 15]
            });

            const orgaos = getEquipsForHub(hub);
            const marker = L.marker([hub.lat, hub.lon], { icon: hubIcon });
            let orgaosList = orgaos.map(o => `• <strong>${escapeHtml(o.nome)}</strong> (${escapeHtml(o.predio_sala || 'Pavimento Geral')})`).join('<br>');
            let popupHtml = `
              <div style="font-family: 'Inter', sans-serif; font-size: 12px; max-width: 280px; line-height: 1.4;">
                <strong style="font-size: 13px; color: #b91c1c;"><i class="ri-building-line"></i> ${escapeHtml(hub.nome)}</strong><br>
                <i class="ri-map-pin-line" style="color: #64748b;"></i> ${escapeHtml(hub.endereco)} — ${escapeHtml(hub.bairro)}<br>
                <hr style="margin: 6px 0; border: none; border-top: 1px solid #e2e8f0;">
                <strong style="font-size: 11px; color: #1e293b;">Unidades Instaladas (${orgaos.length}):</strong><br>
                <div style="max-height: 120px; overflow-y: auto; margin-top: 4px;">
                  ${orgaosList || '<span style="color: #94a3b8; font-style: italic;">Nenhuma unidade vinculada.</span>'}
                </div>
              </div>
            `;
            marker.bindPopup(popupHtml);
            hubsMapLayer.addLayer(marker);
            matchedMarkers.push({ marker, lat: hub.lat, lon: hub.lon, nome: hub.nome });
          }
        });
      }

      // Camada 2: Equipamentos Públicos (Pontos Coloridos)
      if (showEquips) {
        equipData.forEach(item => {
          if (item.lat && item.lon) {
            if (filterDist && String(item.distrito) !== String(filterDist)) return;
            if (filterCat && !item.categoria.toLowerCase().includes(filterCat.toLowerCase())) return;

            // Filtro por texto de pesquisa
            if (searchVal) {
              const iNome = (item.nome || '').toLowerCase();
              const iSigla = (item.sigla || '').toLowerCase();
              const iEnd = (item.endereco || '').toLowerCase();
              const iBairro = (item.bairro || '').toLowerCase();
              const iCep = (item.cep || '').toLowerCase();
              if (!iNome.includes(searchVal) && !iSigla.includes(searchVal) && !iEnd.includes(searchVal) && !iBairro.includes(searchVal) && !iCep.includes(searchVal)) {
                return;
              }
            }

            totalVisible++;

            let color = '#0284c7';
            if (item.categoria.includes('Saúde')) color = '#10b981';
            else if (item.categoria.includes('Educação')) color = '#f59e0b';
            else if (item.categoria.includes('Assistência')) color = '#ec4899';
            else if (item.categoria.includes('Segurança')) color = '#8b5cf6';
            else if (item.categoria.includes('FUNDEC')) color = '#6366f1';
            else if (item.categoria.includes('Cemit') || item.categoria.includes('Funer')) color = '#64748b';
            else if (item.categoria.includes('Mobilidade') || item.categoria.includes('Transporte') || item.categoria.includes('Trem')) color = '#ea580c';

            // Ponto destacado se houver termo de busca
            const radius = searchVal ? 8 : 6;
            const weight = searchVal ? 2.5 : 1.5;

            const marker = L.circleMarker([item.lat, item.lon], {
              radius: radius,
              fillColor: color,
              color: '#ffffff',
              weight: weight,
              opacity: 1,
              fillOpacity: 0.9
            });

            let popupHtml = `
              <div style="font-family: 'Inter', sans-serif; font-size: 12px; line-height: 1.4; max-width: 260px;">
                <strong style="font-size: 13px; color: #0f1b2d;">${escapeHtml(item.nome)}</strong><br>
                <span style="color: #64748b; font-weight: 700;">${escapeHtml(item.categoria)} (${escapeHtml(item.distrito)}º Dist.)</span><br>
                <i class="ri-map-pin-line" style="color: #64748b;"></i> ${escapeHtml(item.endereco)}<br>
                <div style="font-size: 11px; color: #475569; margin: 2px 0;">
                  Bairro: <strong>${escapeHtml(item.bairro)}</strong>
                  ${item.bairro_oficial && item.bairro_oficial.toLowerCase().trim() !== (item.bairro || '').toLowerCase().trim() ? `<span style="color: #6366f1; font-weight: 600;"> (Oficial: ${escapeHtml(item.bairro_oficial)})</span>` : ''}
                </div>
                <i class="ri-phone-line" style="color: #64748b;"></i> ${escapeHtml(item.telefone || '-')}<br>
                <div style="margin-top: 8px; display: flex; gap: 6px;">
                  <button style="padding: 3px 8px; font-size: 11px; background: #0284c7; color: white; border: none; border-radius: 4px; cursor: pointer;" onclick="openEditEquipModal('${item.id}')"><i class="ri-edit-line"></i> Editar</button>
                  <button style="padding: 3px 8px; font-size: 11px; background: #64748b; color: white; border: none; border-radius: 4px; cursor: pointer;" onclick="openViewModal('${item.id}')"><i class="ri-eye-line"></i> Ver Ficha</button>
                </div>
              </div>
            `;
            marker.bindPopup(popupHtml);
            equipsMapLayer.addLayer(marker);
            matchedMarkers.push({ marker, lat: item.lat, lon: item.lon, nome: item.nome });
          }
        });
      }

      // Atualiza contador dinâmico de equipamentos
      const countEl = document.getElementById('mapEquipCount');
      if (countEl) {
        countEl.textContent = `${totalVisible} ponto${totalVisible === 1 ? '' : 's'}`;
      }

      // Auto-enquadramento e abertura de popup se houver pesquisa ativa
      if (searchVal && matchedMarkers.length === 1) {
        const single = matchedMarkers[0];
        map.setView([single.lat, single.lon], 17);
        setTimeout(() => single.marker.openPopup(), 180);
      } else if (searchVal && matchedMarkers.length > 1 && matchedMarkers.length <= 25) {
        const group = L.featureGroup(matchedMarkers.map(m => m.marker));
        map.fitBounds(group.getBounds().pad(0.15));
      }

      // Notifica o módulo de Análise Territorial para sincronizar com filtros ativos
      if (window.SmartAnalysis && window.SmartAnalysis.isActive && typeof window.SmartAnalysis.onMapFilterChanged === 'function') {
        window.SmartAnalysis.onMapFilterChanged();
      }
    }

    function setMainMapMode(mode) {
      if (!map) return;
      mainMapCurrentMode = mode;
      const btnStreet = document.getElementById('btnMainMapStreet');
      const btnSat = document.getElementById('btnMainMapSat');

      if (mode === 'satellite') {
        if (mainMapStreetLayer && map.hasLayer(mainMapStreetLayer)) {
          map.removeLayer(mainMapStreetLayer);
        }
        if (!mainMapSatLayer) {
          mainMapSatLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Esri World Imagery &copy; Satélite',
            maxZoom: 19
          });
          mainMapLabelsLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19
          });
        }
        mainMapSatLayer.addTo(map);
        mainMapLabelsLayer.addTo(map);
        if (btnStreet) btnStreet.classList.remove('active');
        if (btnSat) btnSat.classList.add('active');
        showToast('Camada de Satélite ativada no mapa geral.');
      } else {
        if (mainMapSatLayer && map.hasLayer(mainMapSatLayer)) {
          map.removeLayer(mainMapSatLayer);
        }
        if (mainMapLabelsLayer && map.hasLayer(mainMapLabelsLayer)) {
          map.removeLayer(mainMapLabelsLayer);
        }
        if (mainMapStreetLayer && !map.hasLayer(mainMapStreetLayer)) {
          mainMapStreetLayer.addTo(map);
        }
        if (btnStreet) btnStreet.classList.add('active');
        if (btnSat) btnSat.classList.remove('active');
      }
    }

    async function loadGeoJsonFile(url) {
      if (vectorDataCache[url]) return vectorDataCache[url];
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        vectorDataCache[url] = data;
        return data;
      } catch (err) {
        console.error('Erro ao carregar GeoJSON:', url, err);
        return null;
      }
    }

    async function toggleVectorLayer(type) {
      if (!map) return;

      if (type === 'bairros') {
        const checkbox = document.getElementById('layerToggleBairros');
        if (!checkbox) return;
        if (checkbox.checked) {
          if (!bairrosGeoLayer) {
            showToast('Carregando limites oficiais dos 42 Bairros...');
            const geoData = await loadGeoJsonFile('./dados/geojson/bairros_oficiais.geojson');
            if (!geoData) {
              showToast('Não foi possível carregar a camada de Bairros.');
              checkbox.checked = false;
              return;
            }
            bairrosGeoLayer = L.geoJSON(geoData, {
              style: () => ({
                color: '#6366f1',
                weight: 1.5,
                opacity: 0.85,
                dashArray: '4, 4',
                fillColor: '#818cf8',
                fillOpacity: 0.08
              }),
              onEachFeature: (feature, layer) => {
                const bNome = feature.properties?.NOME_BAIR || feature.properties?.nome || 'Bairro Oficial';
                const distNum = feature.properties?.NUM_DIST || feature.properties?.distrito || '';
                layer.bindTooltip(`<strong>${escapeHtml(bNome)}</strong>${distNum ? '<br><small>' + distNum + 'º Distrito Oficial</small>' : ''}`, { sticky: true });
                layer.on('mouseover', function () {
                  this.setStyle({ fillOpacity: 0.22, weight: 2.5, color: '#4338ca' });
                });
                layer.on('mouseout', function () {
                  bairrosGeoLayer.resetStyle(this);
                });
                layer.on('click', function (e) {
                  L.DomEvent.stopPropagation(e);
                  const popupHtml = `
                    <div style="font-family: 'Inter', sans-serif; font-size: 12px; line-height: 1.4;">
                      <strong style="font-size: 13px; color: #4338ca;"><i class="ri-shape-line"></i> ${escapeHtml(bNome)}</strong><br>
                      <span style="color: #64748b;">Bairro Oficial (Lei Municipal nº 1.488)</span><br>
                      ${distNum ? '<span style="color: #1e293b; font-weight: 600;">' + distNum + 'º Distrito Administrativo</span><br>' : ''}
                      <button style="margin-top: 6px; padding: 3px 8px; font-size: 11px; background: #6366f1; color: white; border: none; border-radius: 4px; cursor: pointer;" onclick="document.getElementById('searchEquip').value='${escapeStr(bNome)}'; onSearchInput(); navigateTab('equipamentos', document.querySelector('.sidebar-nav-item[data-tab=equipamentos]'))">
                        Filtrar Unidades neste Bairro
                      </button>
                    </div>
                  `;
                  layer.bindPopup(popupHtml).openPopup(e.latlng);
                });
              }
            });
          }
          bairrosGeoLayer.addTo(map);
          bairrosGeoLayer.bringToBack();
          showToast('42 Bairros Oficiais exibidos no mapa.');
        } else {
          if (bairrosGeoLayer && map.hasLayer(bairrosGeoLayer)) {
            map.removeLayer(bairrosGeoLayer);
          }
        }
      } else if (type === 'distritos') {
        const checkbox = document.getElementById('layerToggleDistritos');
        if (!checkbox) return;
        if (checkbox.checked) {
          if (!distritosGeoLayer) {
            showToast('Carregando os 4 Distritos Administrativos...');
            const geoData = await loadGeoJsonFile('./dados/geojson/distritos.geojson');
            if (!geoData) {
              showToast('Não foi possível carregar a camada de Distritos.');
              checkbox.checked = false;
              return;
            }
            const distColors = { '1': '#3b82f6', '2': '#10b981', '3': '#f59e0b', '4': '#8b5cf6' };
            distritosGeoLayer = L.geoJSON(geoData, {
              style: (feature) => {
                const distId = String(feature.properties?.NUM_DIST || feature.properties?.distrito || '1');
                const col = distColors[distId] || '#3b82f6';
                return {
                  color: col,
                  weight: 3,
                  opacity: 0.9,
                  fillColor: col,
                  fillOpacity: 0.06
                };
              },
              onEachFeature: (feature, layer) => {
                const distNome = feature.properties?.NOME_DIST || feature.properties?.nome || 'Distrito';
                const distNum = feature.properties?.NUM_DIST || feature.properties?.distrito || '';
                layer.bindTooltip(`<strong>${distNum}º Distrito (${escapeHtml(distNome)})</strong>`, { sticky: true });
                layer.on('mouseover', function () {
                  this.setStyle({ fillOpacity: 0.18, weight: 4 });
                });
                layer.on('mouseout', function () {
                  distritosGeoLayer.resetStyle(this);
                });
              }
            });
          }
          distritosGeoLayer.addTo(map);
          distritosGeoLayer.bringToBack();
          showToast('4 Distritos Municipais exibidos.');
        } else {
          if (distritosGeoLayer && map.hasLayer(distritosGeoLayer)) {
            map.removeLayer(distritosGeoLayer);
          }
        }
      } else if (type === 'trem') {
        const checkbox = document.getElementById('layerToggleTrem');
        if (!checkbox) return;
        if (checkbox.checked) {
          if (!tremGeoLayer) {
            showToast('Carregando malha ferroviária e estações...');
            const [ferroviaData, estacoesData] = await Promise.all([
              loadGeoJsonFile('./dados/geojson/trecho_ferroviario.geojson'),
              loadGeoJsonFile('./dados/geojson/estacoes_trem.geojson')
            ]);
            tremGeoLayer = L.layerGroup();
            if (ferroviaData) {
              const linhaLayer = L.geoJSON(ferroviaData, {
                style: {
                  color: '#1e293b',
                  weight: 3,
                  opacity: 0.85,
                  dashArray: '6, 4'
                }
              });
              tremGeoLayer.addLayer(linhaLayer);
            }
            if (estacoesData) {
              const estacoesLayer = L.geoJSON(estacoesData, {
                pointToLayer: (feature, latlng) => {
                  const estIcon = L.divIcon({
                    className: 'custom-train-icon',
                    html: `<div style="background: #ea580c; color: white; border: 2px solid white; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-size: 11px; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"><i class="ri-train-line"></i></div>`,
                    iconSize: [22, 22],
                    iconAnchor: [11, 11]
                  });
                  return L.marker(latlng, { icon: estIcon });
                },
                onEachFeature: (feature, layer) => {
                  const eNome = feature.properties?.NOME || feature.properties?.nome || 'Estação de Trem';
                  const linha = feature.properties?.LINHA || feature.properties?.linha || 'SuperVia / Ramal Saracuruna / Vila Inhomirim';
                  layer.bindTooltip(`<strong>${escapeHtml(eNome)}</strong><br><small>${escapeHtml(linha)}</small>`, { sticky: true });
                  layer.bindPopup(`
                    <div style="font-family: 'Inter', sans-serif; font-size: 12px; line-height: 1.4;">
                      <strong style="font-size: 13px; color: #ea580c;"><i class="ri-train-line"></i> ${escapeHtml(eNome)}</strong><br>
                      <span style="color: #64748b;">${escapeHtml(linha)}</span><br>
                      <span style="display: inline-block; margin-top: 4px; font-size: 11px; padding: 1px 6px; background: #ffedd5; color: #c2410c; border-radius: 4px; font-weight: 600;">Estação Ferroviária</span>
                    </div>
                  `);
                }
              });
              tremGeoLayer.addLayer(estacoesLayer);
            }
          }
          tremGeoLayer.addTo(map);
          showToast('Malha ferroviária e 12 estações ativadas.');
        } else {
          if (tremGeoLayer && map.hasLayer(tremGeoLayer)) {
            map.removeLayer(tremGeoLayer);
          }
        }
      } else if (type === 'ucs') {
        const checkbox = document.getElementById('layerToggleUcs');
        if (!checkbox) return;
        if (checkbox.checked) {
          if (!ucsGeoLayer) {
            showToast('Carregando Unidades de Conservação Ambiental...');
            const [ucMun, ucEst, ucFed] = await Promise.all([
              loadGeoJsonFile('./dados/geojson/Ucs_Municipal.geojson'),
              loadGeoJsonFile('./dados/geojson/Ucs_Estadual.geojson'),
              loadGeoJsonFile('./dados/geojson/Ucs_Federal.geojson')
            ]);
            ucsGeoLayer = L.layerGroup();
            const addUc = (data, cor, tipo) => {
              if (!data) return;
              const layer = L.geoJSON(data, {
                style: {
                  color: cor,
                  weight: 2,
                  opacity: 0.9,
                  fillColor: cor,
                  fillOpacity: 0.15
                },
                onEachFeature: (feature, l) => {
                  const nome = feature.properties?.NOME || feature.properties?.nome || feature.properties?.Nome || 'Unidade de Conservação';
                  const cat = feature.properties?.CATEGORIA || feature.properties?.categoria || tipo;
                  l.bindTooltip(`<strong>${escapeHtml(nome)}</strong><br><small>${escapeHtml(cat)} (${tipo})</small>`, { sticky: true });
                }
              });
              ucsGeoLayer.addLayer(layer);
            };
            addUc(ucMun, '#15803d', 'Municipal');
            addUc(ucEst, '#047857', 'Estadual');
            addUc(ucFed, '#065f46', 'Federal');
          }
          ucsGeoLayer.addTo(map);
          ucsGeoLayer.bringToBack();
          showToast('Unidades de Conservação Ambiental exibidas.');
        } else {
          if (ucsGeoLayer && map.hasLayer(ucsGeoLayer)) {
            map.removeLayer(ucsGeoLayer);
          }
        }
      } else if (type === 'hidro') {
        const checkbox = document.getElementById('layerToggleHidro');
        if (!checkbox) return;
        if (checkbox.checked) {
          if (!hidroGeoLayer) {
            showToast('Carregando bacias hidrográficas e rios...');
            const hidroData = await loadGeoJsonFile('./dados/geojson/hidrografia.geojson');
            if (!hidroData) {
              showToast('Não foi possível carregar a camada de hidrografia.');
              checkbox.checked = false;
              return;
            }
            hidroGeoLayer = L.geoJSON(hidroData, {
              style: {
                color: '#0284c7',
                weight: 1.8,
                opacity: 0.8
              },
              onEachFeature: (feature, layer) => {
                const nome = feature.properties?.NOME || feature.properties?.nome || 'Curso d\'água / Rio';
                layer.bindTooltip(`<strong>${escapeHtml(nome)}</strong>`, { sticky: true });
              }
            });
          }
          hidroGeoLayer.addTo(map);
          hidroGeoLayer.bringToBack();
          showToast('Rios e canais hidrográficos ativados.');
        } else {
          if (hidroGeoLayer && map.hasLayer(hidroGeoLayer)) {
            map.removeLayer(hidroGeoLayer);
          }
        }
      } else if (type === 'comunidades') {
        const checkbox = document.getElementById('layerToggleComunidades');
        if (!checkbox) return;
        if (checkbox.checked) {
          if (!comunidadesGeoLayer) {
            showToast('Carregando 102 Comunidades e Complexos...');
            const comData = await loadGeoJsonFile('./dados/geojson/comunidades.geojson');
            if (!comData || !comData.features) {
              showToast('Não foi possível carregar os polígonos das comunidades.');
              checkbox.checked = false;
              return;
            }

            comunidadesGeoLayer = L.geoJSON(comData, {
              style: (feature) => {
                const cor = feature.properties?.cor_hex || '#ea580c';
                return {
                  fillColor: cor,
                  fillOpacity: 0.52,
                  color: cor,
                  weight: 2,
                  opacity: 0.95
                };
              },
              onEachFeature: (feature, layer) => {
                const p = feature.properties || {};
                const nome = p.nome || 'Comunidade';
                const complexo = p.complexo || 'Complexo';
                const distrito = p.distrito || '';
                const ruas = p.total_ruas || 0;
                const prioridade = p.classe_prioridade || 'Não informada';
                const ids = p.ids_social ? `<div>📊 <strong>IDS Social:</strong> ${p.ids_social}</div>` : '';

                layer.bindTooltip(`<strong>${nome}</strong><br><span style="font-size:11px;color:${p.cor_hex || '#ea580c'}; font-weight:700;">${complexo}</span>`, {
                  sticky: true
                });

                const popupHtml = `
                  <div style="font-family: inherit; font-size: 13px; min-width: 260px; max-width: 300px; line-height: 1.5;">
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 6px;">
                      <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; background: ${p.cor_hex || '#ea580c'}22; color: ${p.cor_hex || '#ea580c'}; padding: 2px 6px; border-radius: 4px; border: 1px solid ${p.cor_hex || '#ea580c'}66;">
                        ${complexo}
                      </span>
                      <span style="font-size: 11px; color: #64748b; font-weight: 600;">${distrito}</span>
                    </div>
                    <h4 style="margin: 0 0 6px 0; font-size: 15px; font-weight: 700; color: #0f172a;">${nome}</h4>
                    <div style="background: #f8fafc; border-radius: 6px; padding: 8px; border: 1px solid #e2e8f0; font-size: 12px; margin-bottom: 10px;">
                      <div>🛣️ <strong>${ruas} ruas mapeadas</strong></div>
                      ${ids}
                      <div>⚠️ <strong>Prioridade:</strong> ${prioridade}</div>
                      <div>🏛️ <strong>Origem:</strong> ${p.origem_cartografica || 'SIMAC / IBGE'}</div>
                    </div>
                    <button type="button" onclick="visualizarDetalhesComunidade(${p.id})" style="width: 100%; background: #0f172a; color: #fff; border: none; padding: 8px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
                      <i class="ri-road-map-line"></i> Ver ${ruas} Ruas e Detalhes
                    </button>
                  </div>
                `;

                layer.bindPopup(popupHtml);

                layer.on({
                  mouseover: (e) => {
                    const l = e.target;
                    l.setStyle({ fillOpacity: 0.8, weight: 3 });
                  },
                  mouseout: (e) => {
                    if (comunidadesGeoLayer) comunidadesGeoLayer.resetStyle(e.target);
                  }
                });
              }
            });
          }

          comunidadesGeoLayer.addTo(map);
          comunidadesGeoLayer.bringToBack();
          showToast('Camada de 105 Comunidades e Complexos ativada.');
        } else {
          if (comunidadesGeoLayer && map.hasLayer(comunidadesGeoLayer)) {
            map.removeLayer(comunidadesGeoLayer);
          }
        }
      } else if (type === 'limite_caxias') {
        const checkbox = document.getElementById('layerToggleLimiteCaxias');
        if (!checkbox) return;
        if (checkbox.checked) {
          if (!limiteCaxiasGeoLayer) {
            showToast('Carregando contorno municipal de Duque de Caxias...');
            const caxiasData = await loadGeoJsonFile('./dados/geojson/Duque_de_Caxias.geojson');
            if (!caxiasData) {
              showToast('Não foi possível carregar o contorno municipal.');
              checkbox.checked = false;
              return;
            }
            limiteCaxiasGeoLayer = L.geoJSON(caxiasData, {
              style: {
                color: '#7e22ce',
                weight: 3.5,
                opacity: 0.95,
                dashArray: '6, 6',
                fillColor: '#a855f7',
                fillOpacity: 0.04
              },
              onEachFeature: (feature, layer) => {
                layer.bindTooltip('<strong>Município de Duque de Caxias — RJ</strong><br><small>Contorno Territorial Oficial</small>', { sticky: true });
              }
            });
          }
          limiteCaxiasGeoLayer.addTo(map);
          limiteCaxiasGeoLayer.bringToBack();
          showToast('Contorno oficial de Duque de Caxias exibido.');
        } else {
          if (limiteCaxiasGeoLayer && map.hasLayer(limiteCaxiasGeoLayer)) {
            map.removeLayer(limiteCaxiasGeoLayer);
          }
        }
      } else if (type === 'onibus') {
        const checkbox = document.getElementById('layerToggleOnibus');
        const paradasBox = document.getElementById('containerToggleParadas');
        const selectLinha = document.getElementById('selectLinhaOnibus');
        if (!checkbox) return;
        if (checkbox.checked) {
          if (paradasBox) paradasBox.style.display = 'inline-flex';
          if (selectLinha) selectLinha.style.display = 'inline-block';
          if (!onibusGeoLayer) {
            showToast('Carregando rotas de ônibus Tarifa Zero...');
            const onibusData = await loadGeoJsonFile('./dados/geojson/rotas_onibus_tarifa_zero.geojson');
            if (!onibusData || !onibusData.features) {
              showToast('Não foi possível carregar as rotas de ônibus.');
              checkbox.checked = false;
              if (paradasBox) paradasBox.style.display = 'none';
              if (selectLinha) selectLinha.style.display = 'none';
              return;
            }

            // Popula o seletor de linhas dinamicamente
            if (selectLinha && selectLinha.options.length <= 1) {
              const sortedFeats = [...onibusData.features].sort((a, b) => {
                const la = a.properties?.linha_id || '';
                const lb = b.properties?.linha_id || '';
                return la.localeCompare(lb);
              });
              sortedFeats.forEach(f => {
                const opt = document.createElement('option');
                opt.value = f.properties.linha_id;
                opt.textContent = `${f.properties.linha_id} - ${f.properties.nome}`;
                selectLinha.appendChild(opt);
              });
            }

            onibusGeoLayer = L.geoJSON(onibusData, {
              style: (feature) => {
                const cor = feature.properties?.cor || '#2563eb';
                return {
                  color: cor,
                  weight: 4,
                  opacity: 0.85,
                  lineCap: 'round',
                  lineJoin: 'round'
                };
              },
              onEachFeature: (feature, layer) => {
                const p = feature.properties || {};
                const linhaId = p.linha_id || 'Linha';
                const nome = p.nome || 'Rota Tarifa Zero';
                const ext = p.extensao_km ? `${p.extensao_km.toFixed(1)} km` : '';
                const pontos = p.pontos || 0;
                const cor = p.cor || '#2563eb';

                layer.bindTooltip(`
                  <div style="font-family: inherit; font-size: 12px; line-height: 1.4;">
                    <strong style="color: ${cor};"><i class="ri-bus-line"></i> ${escapeHtml(linhaId)}</strong>: ${escapeHtml(nome)}
                    ${ext ? `<br><span style="color: #64748b; font-size: 11px;">Extensão: ${ext}</span>` : ''}
                  </div>
                `, { sticky: true });

                layer.bindPopup(`
                  <div style="font-family: inherit; min-width: 250px; padding: 4px;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                      <span style="background: ${cor}; color: #fff; padding: 3px 8px; border-radius: 6px; font-weight: 800; font-size: 12px; letter-spacing: 0.5px;">
                        ${escapeHtml(linhaId)}
                      </span>
                      <strong style="color: #0f172a; font-size: 13px;">${escapeHtml(nome)}</strong>
                    </div>
                    <div style="font-size: 12px; color: #475569; line-height: 1.6; background: #f8fafc; padding: 8px; border-radius: 6px; border: 1px solid #e2e8f0; margin-bottom: 8px;">
                      <div><strong>Programa:</strong> Tarifa Zero Duque de Caxias</div>
                      ${ext ? `<div><strong>Extensão do Trajeto:</strong> ${ext}</div>` : ''}
                      ${pontos ? `<div><strong>Pontos do Traçado:</strong> ${pontos.toLocaleString('pt-BR')} coordenadas</div>` : ''}
                    </div>
                    <button type="button" class="btn btn-primary btn-sm" onclick="focusOnibusRoute('${escapeHtml(linhaId)}')" style="width: 100%; font-size: 11px; padding: 6px; justify-content: center;">
                      <i class="ri-focus-2-line"></i> Enquadrar Linha ${escapeHtml(linhaId)}
                    </button>
                  </div>
                `);

                layer.on('mouseover', function () {
                  this.setStyle({ weight: 6, opacity: 1 });
                });
                layer.on('mouseout', function () {
                  const sel = document.getElementById('selectLinhaOnibus')?.value;
                  if (sel && sel !== '') {
                    if (this.feature.properties.linha_id === sel) {
                      this.setStyle({ weight: 6, opacity: 1 });
                    } else {
                      this.setStyle({ weight: 2, opacity: 0.15 });
                    }
                  } else {
                    this.setStyle({ weight: 4, opacity: 0.85 });
                  }
                });
              }
            });
          }
          onibusGeoLayer.addTo(map);
          showToast('Rotas dos Ônibus Tarifa Zero exibidas (20 linhas).');
        } else {
          if (paradasBox) {
            paradasBox.style.display = 'none';
            const paradasCheck = document.getElementById('layerToggleParadas');
            if (paradasCheck && paradasCheck.checked) {
              paradasCheck.checked = false;
              toggleParadasLayer();
            }
          }
          if (selectLinha) {
            selectLinha.style.display = 'none';
            selectLinha.value = '';
          }
          if (onibusGeoLayer && map.hasLayer(onibusGeoLayer)) {
            map.removeLayer(onibusGeoLayer);
          }
        }
      }
    }

    function focusOnibusRoute(linhaId) {
      if (!onibusGeoLayer || !map) return;
      const selectLinha = document.getElementById('selectLinhaOnibus');
      if (selectLinha) selectLinha.value = linhaId;
      filterOnibusLine(linhaId);
    }

    function filterOnibusLine(linhaId) {
      if (!onibusGeoLayer || !map) return;
      let targetBounds = null;
      onibusGeoLayer.eachLayer(layer => {
        const featLinha = layer.feature?.properties?.linha_id;
        const cor = layer.feature?.properties?.cor || '#2563eb';
        if (!linhaId || linhaId === '') {
          layer.setStyle({ color: cor, weight: 4, opacity: 0.85 });
        } else if (featLinha === linhaId) {
          layer.setStyle({ color: cor, weight: 6, opacity: 1 });
          layer.bringToFront();
          targetBounds = layer.getBounds();
        } else {
          layer.setStyle({ color: '#94a3b8', weight: 2, opacity: 0.15 });
        }
      });
      if (targetBounds) {
        map.fitBounds(targetBounds, { padding: [40, 40] });
      }
      if (onibusParadasLayer && map.hasLayer(onibusParadasLayer)) {
        onibusParadasLayer.eachLayer(layer => {
          const paradaLinha = layer.feature?.properties?.linha_id;
          if (!linhaId || linhaId === '' || paradaLinha === linhaId) {
            layer.setStyle({ opacity: 1, fillOpacity: 0.85 });
          } else {
            layer.setStyle({ opacity: 0.1, fillOpacity: 0.05 });
          }
        });
      }
    }

    async function toggleParadasLayer() {
      const checkbox = document.getElementById('layerToggleParadas');
      if (!checkbox || !map) return;
      if (checkbox.checked) {
        if (!onibusParadasLayer) {
          showToast('Carregando 1.795 paradas dos ônibus...');
          const paradasData = await loadGeoJsonFile('./dados/geojson/paradas_onibus_tarifa_zero.geojson');
          if (!paradasData) {
            showToast('Não foi possível carregar as paradas de ônibus.');
            checkbox.checked = false;
            return;
          }
          onibusParadasLayer = L.geoJSON(paradasData, {
            pointToLayer: (feature, latlng) => {
              const cor = feature.properties?.cor || '#2563eb';
              return L.circleMarker(latlng, {
                radius: 4,
                fillColor: cor,
                color: '#ffffff',
                weight: 1.5,
                opacity: 1,
                fillOpacity: 0.85
              });
            },
            onEachFeature: (feature, layer) => {
              const p = feature.properties || {};
              const cor = p.cor || '#2563eb';
              layer.bindTooltip(`
                <div style="font-family: inherit; font-size: 11px;">
                  <strong style="color: ${cor};"><i class="ri-bus-line"></i> ${escapeHtml(p.linha_id || 'Ônibus')}</strong> · Parada #${p.sequencia || ''}<br>
                  <span style="color: #475569;">${escapeHtml(p.nome || 'Ponto de Parada')}</span>
                  ${p.direcao ? `<br><small style="color: #64748b;">Direção: ${escapeHtml(p.direcao)}</small>` : ''}
                </div>
              `, { sticky: true });
            }
          });
        }
        onibusParadasLayer.addTo(map);
        const sel = document.getElementById('selectLinhaOnibus')?.value;
        if (sel) filterOnibusLine(sel);
        showToast('Paradas dos ônibus Tarifa Zero exibidas (1.795 pontos).');
      } else {
        if (onibusParadasLayer && map.hasLayer(onibusParadasLayer)) {
          map.removeLayer(onibusParadasLayer);
        }
      }
    }

    function fitAllMap() {
      if (map) {
        // Limites oficiais de Duque de Caxias
        map.fitBounds([
          [-22.820, -43.325],
          [-22.540, -43.165]
        ]);
      }
    }

    function focusHubOnMap(lat, lon, nome) {
      const navItem = document.querySelector('.sidebar-nav-item[data-tab="mapa"]');
      navigateTab('mapa', navItem);
      setTimeout(() => {
        if (map) map.setView([lat, lon], 16);
      }, 300);
    }

    function focusEquipOnMap(lat, lon, nome) {
      const navItem = document.querySelector('.sidebar-nav-item[data-tab="mapa"]');
      navigateTab('mapa', navItem);
      setTimeout(() => {
        if (map) map.setView([lat, lon], 16);
      }, 300);
    }

    function clearMapSearch() {
      const input = document.getElementById('mapSearchInput');
      if (input) {
        input.value = '';
        input.focus();
      }
      updateMapLayers();
    }

    function zoomToFirstMapMatch() {
      const searchVal = (document.getElementById('mapSearchInput')?.value || '').toLowerCase().trim();
      if (!searchVal) return;
      const first = equipData.find(i => i.lat && i.lon && (i.nome || '').toLowerCase().includes(searchVal));
      if (first && map) {
        map.setView([first.lat, first.lon], 17);
      }
    }

    function abrirRotaGmaps() {
      if (!currentViewingEquipId) return;
      const item = equipData.find(x => x.id === currentViewingEquipId);
      if (!item) return;
      const q = encodeURIComponent(`${item.nome}, ${item.endereco}, Duque de Caxias - RJ`);
      window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank');
    }

    function abrirGmapsLocalizacaoAtual() {
      const lat = document.getElementById('editEquipLat').value;
      const lon = document.getElementById('editEquipLon').value;
      if (!lat || !lon) {
        alert('Informe ou obtenha as coordenadas primeiro.');
        return;
      }
      window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`, '_blank');
    }

    // --- CONTROLE DE MODAL DE COMUNIDADES (SIMAC) ---
    let modalRuasCache = [];

    async function visualizarDetalhesComunidade(id) {
      if (!id) return;
      try {
        showToast('Carregando dados da comunidade...');
        const res = await apiRequest(`./api/comunidades/${id}`);
        if (!res.ok) throw new Error('Falha ao obter comunidade');
        const json = res.data;
        if (!json || !json.success || !json.data) return;

        const c = json.data;
        modalRuasCache = c.ruas || [];

        // Preenche campos do modal
        const badge = document.getElementById('modalComComplexoBadge');
        if (badge) {
          badge.textContent = c.complexo || 'Complexo Territorial';
          badge.style.background = `${c.cor_hex || '#ea580c'}22`;
          badge.style.color = c.cor_hex || '#ea580c';
          badge.style.border = `1px solid ${c.cor_hex || '#ea580c'}66`;
        }

        const distEl = document.getElementById('modalComDistrito');
        if (distEl) distEl.textContent = c.distrito || '';

        const nomeEl = document.getElementById('modalComNome');
        if (nomeEl) nomeEl.textContent = c.nome || '';

        const totalRuasEl = document.getElementById('modalComTotalRuas');
        if (totalRuasEl) totalRuasEl.textContent = c.total_ruas || modalRuasCache.length;

        const idsEl = document.getElementById('modalComIds');
        if (idsEl) idsEl.textContent = c.ids_social !== null && c.ids_social !== undefined ? c.ids_social : 'N/D';

        const prioEl = document.getElementById('modalComPrioridade');
        if (prioEl) prioEl.textContent = c.classe_prioridade || 'Não informada';

        // Renderiza Ruas
        const filtroInput = document.getElementById('modalComFiltroRuas');
        if (filtroInput) filtroInput.value = '';
        renderizarRuasModal(modalRuasCache);

        // Renderiza CEPs
        const cepsDiv = document.getElementById('modalComListaCeps');
        if (cepsDiv) {
          if (c.ceps && c.ceps.length > 0) {
            cepsDiv.innerHTML = c.ceps.map(cep => `
              <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px 10px; margin-bottom: 4px;">
                <strong>📮 ${cep.cep}</strong> &mdash; ${cep.logradouro || 'Geral da Comunidade'} (${cep.bairro || c.distrito})
              </div>
            `).join('');
          } else {
            cepsDiv.innerHTML = '<span style="color: #94a3b8; font-style: italic;">Nenhum CEP específico associado. Moradores utilizam o CEP comunitário regional.</span>';
          }
        }

        // Renderiza Equipamentos Públicos no Raio
        const equipsDiv = document.getElementById('modalComListaEquips');
        if (equipsDiv) {
          if (c.equipamentos_proximos && c.equipamentos_proximos.length > 0) {
            equipsDiv.innerHTML = c.equipamentos_proximos.map(eq => `
              <div style="display:flex; justify-content:space-between; align-items:center; background:#fff; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px 10px; margin-bottom: 4px;">
                <div>
                  <strong>${eq.nome}</strong> &mdash; <span style="font-size:11px; color:#64748b;">${eq.categoria}</span>
                </div>
                <button type="button" class="btn btn-xs btn-secondary" onclick="closeComunidadeModal(); focarEquipamentoNoMapa('${eq.id}')" style="font-size:11px; padding: 2px 6px; cursor: pointer;">
                  <i class="ri-focus-3-line"></i> Localizar
                </button>
              </div>
            `).join('');
          } else {
            equipsDiv.innerHTML = '<span style="color: #94a3b8; font-style: italic;">Nenhum equipamento cadastrado no raio imediato de 1.5 km.</span>';
          }
        }

        const modal = document.getElementById('modalComunidade');
        if (modal) modal.classList.add('active');
      } catch (err) {
        console.error('Erro ao abrir comunidade:', err);
        showToast('Erro ao carregar dados da comunidade.');
      }
    }

    function renderizarRuasModal(ruas) {
      const container = document.getElementById('modalComListaRuas');
      const contador = document.getElementById('modalComRuasContador');
      if (!container) return;

      if (contador) contador.textContent = `${ruas.length} exibida(s)`;

      if (!ruas || ruas.length === 0) {
        container.innerHTML = '<div style="color:#94a3b8; padding: 8px; font-style:italic;">Nenhuma rua encontrada para este filtro.</div>';
        return;
      }

      container.innerHTML = ruas.map((r, idx) => `
        <div style="padding: 3px 0; border-bottom: 1px dashed #e2e8f0; display:flex; align-items:center; gap: 6px;">
          <span style="font-size: 11px; color: #94a3b8; font-family: monospace; width: 26px;">${idx + 1}.</span>
          <span style="color: #1e293b; font-weight: 500;">${r}</span>
        </div>
      `).join('');
    }

    function filtrarRuasModalComunidade() {
      const termo = (document.getElementById('modalComFiltroRuas')?.value || '').toLowerCase().trim();
      if (!termo) {
        renderizarRuasModal(modalRuasCache);
        return;
      }
      const filtradas = modalRuasCache.filter(r => r.toLowerCase().includes(termo));
      renderizarRuasModal(filtradas);
    }

    function closeComunidadeModal() {
      const modal = document.getElementById('modalComunidade');
      if (modal) modal.classList.remove('active');
    }

    function focarEquipamentoNoMapa(id) {
      const eq = equipData.find(x => String(x.id) === String(id));
      if (eq && eq.lat && eq.lon && map) {
        map.setView([eq.lat, eq.lon], 18);
        setTimeout(() => {
          openViewModal(eq.id);
        }, 400);
      }
    }

    // Expor globalmente
    window.visualizarDetalhesComunidade = visualizarDetalhesComunidade;
    window.closeComunidadeModal = closeComunidadeModal;
    window.filtrarRuasModalComunidade = filtrarRuasModalComunidade;
    window.focarEquipamentoNoMapa = focarEquipamentoNoMapa;
