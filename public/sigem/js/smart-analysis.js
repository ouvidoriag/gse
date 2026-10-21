/**
 * ============================================================================
 * SIGEM — Módulo Inteligente de Análise Territorial, Cobertura & Simulação
 * Prefeitura Municipal de Duque de Caxias — RJ
 * ============================================================================
 */

(function (window) {
  'use strict';

  // --- ESTADO DO MÓDULO ---
  const state = {
    isOpen: false,
    isActive: false,
    radiusMeters: 500,
    showBuffers: true,
    showOverlaps: true,
    showUncovered: true,
    isListeningClick: false,
    simulatedMarker: null,
    simulatedBufferLayer: null,
    simulatedPoint: null,
    communitiesData: null,
    lastMetrics: null
  };

  // Referência territorial oficial de Duque de Caxias
  const AREA_MUNICIPIO_KM2 = 467.6;
  const DISTRITOS_OFICIAIS = [
    { id: '1', nome: '1º Dist. Centro' },
    { id: '2', nome: '2º Dist. Campos Elíseos' },
    { id: '3', nome: '3º Dist. Imbariê' },
    { id: '4', nome: '4º Dist. Xerém' }
  ];

  // Camadas Leaflet dedicadas
  let analysisLayerGroup = null;
  let analysisSimulationGroup = null;

  function getMap() {
    if (window.map) return window.map;
    if (typeof map !== 'undefined' && map) return map;
    return null;
  }

  function getEquipmentsList() {
    let list = [];
    if (typeof equipData !== 'undefined' && Array.isArray(equipData) && equipData.length > 0) {
      list = equipData;
    } else if (window.equipData && Array.isArray(window.equipData) && window.equipData.length > 0) {
      list = window.equipData;
    } else {
      try {
        const stored = localStorage.getItem('pmdc_equipamentos_db');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            list = parsed;
          }
        }
      } catch (e) {}
    }

    if (typeof deduplicateEquipData === 'function') {
      return deduplicateEquipData(list);
    }

    // Deduplicação de segurança inline por ID e Nome
    const seenIds = new Set();
    const seenNames = new Set();
    const clean = [];
    for (const item of list) {
      if (!item || !item.id) continue;
      const nKey = (item.nome || '').trim().toLowerCase();
      const idKey = String(item.id);
      if (!seenIds.has(idKey) && !seenNames.has(nKey)) {
        seenIds.add(idKey);
        if (nKey) seenNames.add(nKey);
        clean.push(item);
      }
    }
    return clean;
  }

  function ensureLayers() {
    const m = getMap();
    if (!m) return false;
    if (!m.getPane('analysisBufferPane')) {
      const pane = m.createPane('analysisBufferPane');
      pane.style.zIndex = '350';
    }
    if (!analysisLayerGroup) {
      analysisLayerGroup = L.layerGroup().addTo(m);
    }
    if (!analysisSimulationGroup) {
      analysisSimulationGroup = L.layerGroup().addTo(m);
    }
    return true;
  }

  // --- TOGGLE DO PAINEL NA PÁGINA ---
  function toggleSmartAnalysisPagePanel() {
    const panel = document.getElementById('smartAnalysisPanel');
    const btn = document.getElementById('btnToggleSmartAnalysis');
    const txt = document.getElementById('txtBtnSmartAnalysis');
    const icon = document.getElementById('iconBtnSmartAnalysis');
    if (!panel) return;

    state.isOpen = !state.isOpen;
    if (state.isOpen) {
      panel.style.display = 'flex';
      if (btn) btn.classList.add('active');
      if (txt) txt.textContent = 'Ocultar Análise Territorial';
      if (icon) icon.className = 'ri-arrow-up-s-line';

      loadCommunitiesData().then(() => {
        runSpatialAnalysis();
      });
    } else {
      panel.style.display = 'none';
      if (btn) btn.classList.remove('active');
      if (txt) txt.textContent = 'Análise Territorial Inteligente';
      if (icon) icon.className = 'ri-arrow-down-s-line';

      cancelSimulationClick();
      clearAnalysisLayers();
    }

    const m = getMap();
    if (m) {
      setTimeout(() => m.invalidateSize(), 120);
    }
  }

  // --- CARREGAR BASE DE COMUNIDADES ---
  async function loadCommunitiesData() {
    if (state.communitiesData) return state.communitiesData;
    try {
      const res = await fetch('./dados/geojson/comunidades.geojson');
      if (res.ok) {
        state.communitiesData = await res.json();
      }
    } catch (e) {
      console.warn('[SmartAnalysis] Erro ao carregar comunidades:', e.message);
    }
    return state.communitiesData;
  }

  // --- SELEÇÃO DE RAIO (PILLS & SLIDER) ---
  function setAnalysisRadius(meters) {
    state.radiusMeters = parseInt(meters, 10) || 500;

    // Atualiza botões pills
    document.querySelectorAll('.analysis-pill-btn').forEach(btn => {
      const val = parseInt(btn.dataset.radius, 10);
      btn.classList.toggle('active', val === state.radiusMeters);
    });

    // Atualiza slider
    const slider = document.getElementById('analysisRadiusSlider');
    if (slider) slider.value = state.radiusMeters;

    // Atualiza label
    const label = document.getElementById('analysisRadiusDisplay');
    if (label) {
      label.textContent = state.radiusMeters >= 1000
        ? `${(state.radiusMeters / 1000).toFixed(1)} km (${state.radiusMeters}m)`
        : `${state.radiusMeters} metros`;
    }

    // Se houver simulação ativa, atualiza o círculo dela
    if (state.simulatedBufferLayer && state.simulatedPoint) {
      state.simulatedBufferLayer.setRadius(state.radiusMeters);
    }

    runSpatialAnalysis();
  }

  // --- ATUALIZAR OPÇÃO DE TOGGLE ---
  function updateAnalysisOption(key, checked) {
    state[key] = !!checked;
    runSpatialAnalysis();
  }

  // --- NOTIFICAÇÃO QUANDO FILTRO DO MAPA É ALTERADO ---
  function onMapFilterChanged() {
    if (!state.isOpen) return;
    runSpatialAnalysis();
  }

  // --- MOTOR PRINCIPAL DE PROCESSAMENTO ESPACIAL ---
  async function runSpatialAnalysis() {
    if (!ensureLayers()) return;

    state.isActive = true;
    analysisLayerGroup.clearLayers();

    const m = getMap();
    const hasTurf = typeof window.turf !== 'undefined';
    const radius = state.radiusMeters;

    // 1. Obter pontos baseando-se no que já está selecionado/filtrado na barra do mapa
    const allEquips = getEquipmentsList();
    const filterCat = (document.getElementById('mapFilterCategoria')?.value || '').trim().toLowerCase();
    const filterDist = (document.getElementById('mapFilterDistrito')?.value || '').trim();
    const searchVal = (document.getElementById('mapSearchInput')?.value || '').toLowerCase().trim();

    const points = allEquips
      .filter(item => {
        if (!item.lat || !item.lon || isNaN(item.lat) || isNaN(item.lon)) return false;
        if (filterCat && !(item.categoria || '').toLowerCase().includes(filterCat)) return false;
        if (filterDist && String(item.distrito) !== String(filterDist)) return false;
        if (searchVal) {
          const str = `${item.nome || ''} ${item.bairro || ''} ${item.sigla || ''} ${item.endereco || ''}`.toLowerCase();
          if (!str.includes(searchVal)) return false;
        }
        return true;
      })
      .map(item => ({
        id: item.id,
        nome: item.nome,
        bairro: item.bairro_oficial || item.bairro || 'Duque de Caxias',
        distrito: String(item.distrito || 1),
        lat: Number(item.lat),
        lon: Number(item.lon),
        categoria: item.categoria || 'Geral'
      }));

    const totalPoints = points.length;

    // 2. Análise de Sobreposição (Distâncias par a par)
    // Uma unidade tem sobreposição se existir outra unidade do mesmo conjunto a <= 2*raio
    let overlapCount = 0;
    const overlapThresholdMeters = radius * 2;
    const pointOverlaps = new Array(totalPoints).fill(false);

    for (let i = 0; i < totalPoints; i++) {
      for (let j = i + 1; j < totalPoints; j++) {
        const dist = calcDistanceMeters(points[i].lat, points[i].lon, points[j].lat, points[j].lon);
        if (dist <= overlapThresholdMeters) {
          pointOverlaps[i] = true;
          pointOverlaps[j] = true;
        }
      }
    }

    pointOverlaps.forEach(has => { if (has) overlapCount++; });

    // 3. Renderizar Buffers no Mapa para TODOS os equipamentos filtrados
    if (state.showBuffers && totalPoints > 0) {
      points.forEach((pt, idx) => {
        const hasOverlap = pointOverlaps[idx];
        const isHighlight = state.showOverlaps && hasOverlap;

        // Cor de acordo com categoria do equipamento
        let baseColor = '#0284c7';
        let darkColor = '#0369a1';
        if (pt.categoria.includes('Educação')) { baseColor = '#f59e0b'; darkColor = '#b45309'; }
        else if (pt.categoria.includes('Saúde')) { baseColor = '#10b981'; darkColor = '#047857'; }
        else if (pt.categoria.includes('Assistência')) { baseColor = '#ec4899'; darkColor = '#be185d'; }
        else if (pt.categoria.includes('Segurança')) { baseColor = '#8b5cf6'; darkColor = '#6d28d9'; }
        else if (pt.categoria.includes('FUNDEC')) { baseColor = '#6366f1'; darkColor = '#3730a3'; }

        const fillColor = isHighlight ? darkColor : baseColor;
        const fillOpacity = isHighlight ? 0.30 : 0.16;
        const strokeColor = isHighlight ? darkColor : baseColor;
        const strokeWeight = isHighlight ? 2.2 : 1.2;

        if (hasTurf) {
          try {
            const tPoint = turf.point([pt.lon, pt.lat]);
            const buf = turf.buffer(tPoint, radius, { units: 'meters', steps: 16 });
            buf.properties = { ...pt, hasOverlap };

            const poly = L.geoJSON(buf, {
              pane: 'analysisBufferPane',
              style: {
                fillColor: fillColor,
                fillOpacity: fillOpacity,
                color: strokeColor,
                weight: strokeWeight,
                opacity: 0.85
              },
              onEachFeature: (feature, layer) => {
                const popHtml = `
                  <div style="font-family:'Inter',sans-serif;font-size:12px;max-width:260px;line-height:1.4;">
                    <div style="font-size:10px;font-weight:700;color:${darkColor};text-transform:uppercase;margin-bottom:3px;">
                      Raio de Atendimento (${radius}m)
                    </div>
                    <strong style="color:#0f172a;font-size:13px;">${escapeHtml(pt.nome)}</strong><br>
                    <span style="color:#64748b;">${escapeHtml(pt.bairro)} · ${pt.distrito}º Distrito</span>
                    ${hasOverlap ? `<div style="margin-top:4px;color:#b45309;font-weight:700;font-size:11px;"><i class="ri-overlap-line"></i> Área com sobreposição concentrada</div>` : ''}
                  </div>
                `;
                layer.bindPopup(popHtml);
                layer.bindTooltip(`<strong>${escapeHtml(pt.nome)}</strong><br><small>Raio: ${radius}m ${hasOverlap ? '(Sobreposição)' : ''}</small>`, { sticky: true });
                layer.on('popupopen', () => {
                  try { layer.closeTooltip(); } catch(e) {}
                });
              }
            });
            analysisLayerGroup.addLayer(poly);
          } catch (e) {
            renderCircle(pt, radius, fillColor, fillOpacity, strokeColor, strokeWeight, hasOverlap, darkColor);
          }
        } else {
          renderCircle(pt, radius, fillColor, fillOpacity, strokeColor, strokeWeight, hasOverlap, darkColor);
        }
      });
    }

    // 4. Estimativa de Área Coberta (km² e % de Duque de Caxias)
    const areaIndividualKm2 = (Math.PI * Math.pow(radius, 2)) / 1000000;
    let overlapDiscount = 1;
    if (radius <= 500) overlapDiscount = 0.85;
    else if (radius <= 1000) overlapDiscount = 0.65;
    else if (radius <= 2000) overlapDiscount = 0.45;
    else overlapDiscount = 0.35;

    let totalCoveredAreaKm2 = Math.min(AREA_MUNICIPIO_KM2, Number((totalPoints * areaIndividualKm2 * overlapDiscount).toFixed(1)));
    let coveredPercent = Number(((totalCoveredAreaKm2 / AREA_MUNICIPIO_KM2) * 100).toFixed(1));

    // 5. Cruzamento Socioterritorial com as 105 Comunidades de Duque de Caxias
    const comsGeo = await loadCommunitiesData();
    let coveredComs = 0;
    let unservedComs = 0;
    const unservedList = [];
    const districtStats = {
      '1': { total: 0, covered: 0 },
      '2': { total: 0, covered: 0 },
      '3': { total: 0, covered: 0 },
      '4': { total: 0, covered: 0 }
    };

    let simulatedGainComs = [];

    if (comsGeo && Array.isArray(comsGeo.features)) {
      comsGeo.features.forEach(feat => {
        const p = feat.properties || {};
        const coords = feat.geometry?.coordinates;
        let cLon = 0, cLat = 0;

        if (coords && coords[0]) {
          const ring = feat.geometry.type === 'MultiPolygon' ? (coords[0] && coords[0][0]) : coords[0];
          if (ring && ring.length > 0) {
            let sLon = 0, sLat = 0;
            ring.forEach(pt => { sLon += pt[0]; sLat += pt[1]; });
            cLon = sLon / ring.length;
            cLat = sLat / ring.length;
          }
        }

        if (!cLon || !cLat) return;

        let dNum = '1';
        const dStr = String(p.distrito || p.distrito_id || '');
        if (dStr.includes('2')) dNum = '2';
        else if (dStr.includes('3')) dNum = '3';
        else if (dStr.includes('4')) dNum = '4';

        if (!districtStats[dNum]) districtStats[dNum] = { total: 0, covered: 0 };
        districtStats[dNum].total++;

        // Testa distância contra todos os pontos com buffer
        let isCovered = false;
        for (const pt of points) {
          const d = calcDistanceMeters(cLat, cLon, pt.lat, pt.lon);
          if (d <= radius) {
            isCovered = true;
            break;
          }
        }

        // Se houver simulação ativa, testa se ela cobre
        let isCoveredBySimulation = false;
        if (!isCovered && state.simulatedPoint) {
          const dSim = calcDistanceMeters(cLat, cLon, state.simulatedPoint.lat, state.simulatedPoint.lng);
          if (dSim <= radius) {
            isCoveredBySimulation = true;
            simulatedGainComs.push(p.nome || 'Comunidade');
          }
        }

        if (isCovered || isCoveredBySimulation) {
          coveredComs++;
          districtStats[dNum].covered++;
        } else {
          unservedComs++;
          unservedList.push({
            id: p.id,
            nome: p.nome || 'Comunidade',
            complexo: p.complexo || 'INDEPENDENTE',
            distrito: `${dNum}º Distrito`,
            lat: cLat,
            lon: cLon
          });
        }
      });
    }

    // 6. Atualizar Painel e KPIs
    state.lastMetrics = {
      total: totalPoints,
      overlapCount: overlapCount,
      isolatedCount: totalPoints - overlapCount,
      coveredAreaKm2: totalCoveredAreaKm2,
      coveredPercent: coveredPercent,
      coveredComs: coveredComs,
      unservedComs: unservedComs,
      unservedList: unservedList,
      districtStats: districtStats,
      simulatedGain: simulatedGainComs
    };

    updateDiagnosticsUi(state.lastMetrics);
  }

  function renderCircle(pt, radius, fillColor, fillOpacity, strokeColor, strokeWeight, hasOverlap, darkColor) {
    const circle = L.circle([pt.lat, pt.lon], {
      pane: 'analysisBufferPane',
      radius: radius,
      fillColor: fillColor,
      fillOpacity: fillOpacity,
      color: strokeColor,
      weight: strokeWeight,
      opacity: 0.85
    });
    const popHtml = `
      <div style="font-family:'Inter',sans-serif;font-size:12px;max-width:260px;line-height:1.4;">
        <div style="font-size:10px;font-weight:700;color:${darkColor};text-transform:uppercase;margin-bottom:3px;">
          Raio de Atendimento (${radius}m)
        </div>
        <strong style="color:#0f172a;font-size:13px;">${escapeHtml(pt.nome)}</strong><br>
        <span style="color:#64748b;">${escapeHtml(pt.bairro)} · ${pt.distrito}º Distrito</span>
        ${hasOverlap ? `<div style="margin-top:4px;color:#b45309;font-weight:700;font-size:11px;"><i class="ri-overlap-line"></i> Área com sobreposição concentrada</div>` : ''}
      </div>
    `;
    circle.bindPopup(popHtml);
    circle.bindTooltip(`<strong>${escapeHtml(pt.nome)}</strong><br><small>Raio: ${radius}m ${hasOverlap ? '(Sobreposição)' : ''}</small>`, { sticky: true });
    circle.on('popupopen', () => {
      try { circle.closeTooltip(); } catch(e) {}
    });
    analysisLayerGroup.addLayer(circle);
  }

  // --- ATUALIZAÇÃO VISUAL DOS KPIS E DIAGNÓSTICO ---
  function updateDiagnosticsUi(metrics) {
    const elTotal = document.getElementById('kpiAnalysisTotal');
    const elEquipSub = document.getElementById('kpiAnalysisEquipSub');
    const elArea = document.getElementById('kpiAnalysisArea');
    const elAreaPct = document.getElementById('kpiAnalysisAreaPct');
    const elCovered = document.getElementById('kpiAnalysisComsCovered');
    const elComsPct = document.getElementById('kpiAnalysisComsPct');
    const elUnserved = document.getElementById('kpiAnalysisComsUnserved');
    const badgeUnserved = document.getElementById('analysisUnservedBadge');
    const listEl = document.getElementById('analysisUnservedList');
    const distGrid = document.getElementById('analysisDistrictsGrid');
    const simNotice = document.getElementById('analysisSimImpactNotice');
    const simText = document.getElementById('analysisSimImpactText');

    if (elTotal) elTotal.textContent = metrics.total;
    if (elEquipSub) {
      elEquipSub.textContent = metrics.overlapCount > 0 
        ? `${metrics.overlapCount} em sobreposição` 
        : 'Sem sobreposições';
    }

    if (elArea) elArea.textContent = `${metrics.coveredAreaKm2} km²`;
    if (elAreaPct) elAreaPct.textContent = `~${metrics.coveredPercent}% de Caxias`;

    if (elCovered) elCovered.textContent = `${metrics.coveredComs} / 105`;
    if (elComsPct) {
      const pct = ((metrics.coveredComs / 105) * 100).toFixed(1);
      elComsPct.textContent = `${pct}% atendidas`;
    }

    if (elUnserved) elUnserved.textContent = metrics.unservedComs;
    if (badgeUnserved) badgeUnserved.textContent = metrics.unservedComs;

    // Distribuição por Distrito de Duque de Caxias
    if (distGrid && metrics.districtStats) {
      distGrid.innerHTML = DISTRITOS_OFICIAIS.map(d => {
        const s = metrics.districtStats[d.id] || { total: 0, covered: 0 };
        const pct = s.total > 0 ? Math.round((s.covered / s.total) * 100) : 0;
        return `
          <div class="analysis-district-item">
            <span class="analysis-district-name" title="${d.nome}">${d.nome}</span>
            <span class="analysis-district-val">${s.covered}/${s.total} <small style="font-weight:600;font-size:10px;color:#64748b;">(${pct}%)</small></span>
          </div>
        `;
      }).join('');
    }

    // Lista compacta de comunidades desassistidas
    if (listEl) {
      if (metrics.unservedList.length === 0) {
        listEl.innerHTML = '<div style="padding:8px;text-align:center;color:#10b981;font-size:11px;font-weight:700;"><i class="ri-checkbox-circle-fill"></i> 100% das favelas atendidas neste raio!</div>';
      } else {
        listEl.innerHTML = metrics.unservedList.slice(0, 35).map(c => `
          <div class="analysis-unserved-row" onclick="window.flyToAnalysisCommunity(${c.lat}, ${c.lon}, '${escapeHtml(c.nome)}')">
            <span style="font-weight:600;color:#0f172a;">${escapeHtml(c.nome)}</span>
            <span style="font-size:10px;color:#64748b;">${c.distrito}</span>
          </div>
        `).join('');
      }
    }

    // Banner de impacto da simulação
    if (simNotice && simText) {
      if (state.simulatedPoint && metrics.simulatedGain.length > 0) {
        simNotice.style.display = 'block';
        simText.innerHTML = `<strong>+${metrics.simulatedGain.length} novas favelas cobertas:</strong> ${metrics.simulatedGain.slice(0, 3).join(', ')}${metrics.simulatedGain.length > 3 ? '...' : ''}`;
      } else if (state.simulatedPoint) {
        simNotice.style.display = 'block';
        simText.textContent = 'Esta unidade reforça a cobertura de comunidades já atendidas.';
      } else {
        simNotice.style.display = 'none';
      }
    }
  }

  // --- NAVEGAR ATÉ COMUNIDADE ---
  window.flyToAnalysisCommunity = function (lat, lon, nome) {
    const m = getMap();
    if (!m) return;
    m.flyTo([lat, lon], 16, { animate: true, duration: 1.2 });
    L.popup({ autoClose: true })
      .setLatLng([lat, lon])
      .setContent(`
        <div style="font-family:'Inter',sans-serif;font-size:12px;line-height:1.4;">
          <strong style="color:#b91c1c;"><i class="ri-alert-line"></i> Favela Desassistida</strong><br>
          <strong style="font-size:13px;">${nome}</strong><br>
          <span style="color:#64748b;">Fora do raio de ${state.radiusMeters}m de qualquer equipamento deste filtro.</span>
        </div>
      `)
      .openOn(m);
  };

  // --- MODO DE SIMULAÇÃO DE NOVA UNIDADE ---
  function startSimulationMode() {
    const m = getMap();
    if (!m) return;

    const btn = document.getElementById('btnStartSimulation');
    state.isListeningClick = true;

    if (btn) {
      btn.classList.add('listening');
      btn.innerHTML = '<i class="ri-crosshair-2-line"></i> Clique no mapa para posicionar...';
    }

    const container = document.getElementById('mapContainer');
    if (container) container.style.cursor = 'crosshair';

    m.once('click', onMapClickSimulation);
    showToast('Modo Simulação: Clique em qualquer ponto de Duque de Caxias para simular.');
  }

  function onMapClickSimulation(e) {
    const latlng = e.latlng;
    state.simulatedPoint = latlng;
    state.isListeningClick = false;

    const container = document.getElementById('mapContainer');
    if (container) container.style.cursor = '';

    const btn = document.getElementById('btnStartSimulation');
    if (btn) {
      btn.classList.remove('listening');
      btn.innerHTML = '<i class="ri-refresh-line"></i> Reposicionar no Mapa';
    }

    const clearBtn = document.getElementById('btnClearSimulation');
    if (clearBtn) clearBtn.style.display = 'inline-flex';

    renderSimulationMarker(latlng);
    runSpatialAnalysis();
    showToast('Unidade simulada inserida! Arraste-a pelo mapa para testar outras regiões.');
  }

  function renderSimulationMarker(latlng) {
    if (!ensureLayers()) return;
    analysisSimulationGroup.clearLayers();

    const simIcon = L.divIcon({
      className: 'simulated-school-icon',
      html: `
        <div style="background:linear-gradient(135deg, #f59e0b, #d97706); color:#fff; width:36px; height:36px; border-radius:50%; border:3px solid #fff; box-shadow:0 0 16px rgba(245, 158, 11, 0.95); display:flex; align-items:center; justify-content:center; font-size:18px; cursor:move;">
          <i class="ri-star-fill"></i>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

    state.simulatedMarker = L.marker(latlng, { icon: simIcon, draggable: true }).addTo(analysisSimulationGroup);

    state.simulatedBufferLayer = L.circle(latlng, {
      radius: state.radiusMeters,
      fillColor: '#f59e0b',
      fillOpacity: 0.28,
      color: '#d97706',
      weight: 2.5,
      dashArray: '6, 6'
    }).addTo(analysisSimulationGroup);

    state.simulatedMarker.bindPopup(`
      <div style="font-family:'Inter',sans-serif;font-size:12px;line-height:1.4;">
        <div style="font-size:10px;font-weight:700;color:#d97706;text-transform:uppercase;margin-bottom:3px;">
          ✨ UNIDADE HIPOTÉTICA EM SIMULAÇÃO
        </div>
        <strong>Nova Instalação Proposta</strong><br>
        <span style="color:#64748b;">Raio de Atendimento: ${state.radiusMeters} metros</span><br>
        <small style="color:#10b981;font-weight:600;">Arraste este marcador para testar outras regiões!</small>
      </div>
    `).openPopup();

    state.simulatedMarker.on('drag', function (evt) {
      const pos = evt.target.getLatLng();
      if (state.simulatedBufferLayer) {
        state.simulatedBufferLayer.setLatLng(pos);
      }
    });

    state.simulatedMarker.on('dragend', function (evt) {
      state.simulatedPoint = evt.target.getLatLng();
      runSpatialAnalysis();
    });
  }

  function cancelSimulationClick() {
    state.isListeningClick = false;
    const container = document.getElementById('mapContainer');
    if (container) container.style.cursor = '';
    const btn = document.getElementById('btnStartSimulation');
    if (btn) {
      btn.classList.remove('listening');
      btn.innerHTML = '<i class="ri-map-pin-add-line"></i> Simular Nova Unidade no Mapa';
    }
    const m = getMap();
    if (m) m.off('click', onMapClickSimulation);
  }

  function clearSimulation() {
    cancelSimulationClick();
    state.simulatedPoint = null;
    if (analysisSimulationGroup) analysisSimulationGroup.clearLayers();

    const clearBtn = document.getElementById('btnClearSimulation');
    if (clearBtn) clearBtn.style.display = 'none';

    const btn = document.getElementById('btnStartSimulation');
    if (btn) {
      btn.innerHTML = '<i class="ri-map-pin-add-line"></i> Simular Nova Unidade no Mapa';
    }

    const simNotice = document.getElementById('analysisSimImpactNotice');
    if (simNotice) simNotice.style.display = 'none';

    runSpatialAnalysis();
    showToast('Simulação removida.');
  }

  function clearAnalysisLayers() {
    if (analysisLayerGroup) analysisLayerGroup.clearLayers();
    clearSimulation();
    state.isActive = false;
  }

  function exportAnalysisReport() {
    if (!state.lastMetrics) {
      showToast('Execute uma análise antes de exportar.');
      return;
    }

    const payload = {
      titulo: 'Diagnóstico Territorial e Análise de Cobertura - SIGEM',
      municipio: 'Duque de Caxias - RJ',
      data: new Date().toISOString(),
      parametros: {
        raio_metros: state.radiusMeters,
        categoria_analisada: document.getElementById('mapFilterCategoria')?.value || 'Todas',
        distrito: document.getElementById('mapFilterDistrito')?.value || 'Todos',
        simulacao_ativa: !!state.simulatedPoint
      },
      metricas: state.lastMetrics
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SIGEM_Diagnostico_DuqueDeCaxias_${state.radiusMeters}m_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Diagnóstico territorial exportado em JSON!');
  }

  // Distância geodésica Haversine (metros)
  function calcDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- EXPOSIÇÃO GLOBAL DA API ---
  window.SmartAnalysis = {
    togglePanel: toggleSmartAnalysisPagePanel,
    setRadius: setAnalysisRadius,
    updateOption: updateAnalysisOption,
    run: runSpatialAnalysis,
    onMapFilterChanged: onMapFilterChanged,
    startSimulation: startSimulationMode,
    clearSimulation: clearSimulation,
    clearLayers: clearAnalysisLayers,
    exportReport: exportAnalysisReport,
    get isActive() { return state.isOpen; }
  };

  // Funções de atalho global para chamadas HTML
  window.toggleSmartAnalysisPagePanel = toggleSmartAnalysisPagePanel;
  window.toggleSmartAnalysisDrawer = toggleSmartAnalysisPagePanel;
  window.setAnalysisRadius = setAnalysisRadius;

})(window);
