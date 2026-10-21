// ─────────────────────────────────────────────────────────────────────────────
// Carta de Serviço — Dashboard Controller (Conectado ao Backend)
// ─────────────────────────────────────────────────────────────────────────────

function getCdsBasePrefix() {
  const p = window.location.pathname.toLowerCase();
  if (p.startsWith('/gse')) return '/gse';
  return '';
}

const CDS_BASE = getCdsBasePrefix();
const API_AUTH_ME = CDS_BASE + '/cds/api/auth/me';
const API_AUTH_PROFILE = CDS_BASE + '/cds/api/auth/profile';
const API_SERVICES = CDS_BASE + '/cds/api/services';

// Interceptor transparente de requisições fetch para rotas /cds/api sob /gse
if (CDS_BASE) {
  const _origFetch = window.fetch;
  window.fetch = function (resource, init) {
    if (typeof resource === 'string' && resource.startsWith('/cds/api/')) {
      resource = CDS_BASE + resource;
    }
    return _origFetch.call(this, resource, init);
  };
}

const PRIORIDADES_PADRAO = [
  'Sem prioridade',
  'Idosos com idade igual ou superior a 80 anos',
  'Pessoas com deficiência',
  'Pessoas com Transtorno do Espectro Autista (TEA)',
  'Idosos com idade entre 60 e 79 anos',
  'Gestantes e lactantes',
  'Pessoas com crianças de colo',
  'Pessoas com obesidade',
  'Pessoas com mobilidade reduzida'
];

let currentUser = null;
let currentServices = [];
let categoriesList = [];
let selectedCategoriesFilter = [];
let searchQuery = '';
let selectedStatusFilter = 'all';
let currentViewingService = null;
let pendingDeleteService = null;

// Proteção de Rota - Executado ao carregar
document.addEventListener('DOMContentLoaded', async () => {
  let token = localStorage.getItem('token');
  if (!token && localStorage.getItem('simac_auth_session')) {
    try {
      const simac = JSON.parse(localStorage.getItem('simac_auth_session') || '{}');
      if (simac.token) {
        token = simac.token;
        localStorage.setItem('token', token);
        if (simac.user && !localStorage.getItem('user')) {
          localStorage.setItem('user', JSON.stringify(simac.user));
        }
      }
    } catch (_) {}
  }
  
  if (!token) {
    // Se acessando dashboard.html especificamente, exige autenticação do servidor
    if (window.location.pathname.includes('dashboard')) {
      const loginTarget = (CDS_BASE || '') + '/login';
      window.location.href = loginTarget + '?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
      return;
    }
    // Caso contrário (consulta no catálogo /cds), ativa modo cidadão (leitura pública aberta)
    currentUser = {
      id: 0,
      username: 'cidadao',
      name: 'Cidadão / Visitante',
      role: 'citizen',
      secretariaNome: 'Consulta Pública Oficial'
    };
    updateUIForUser();
    await loadCategories();
    await loadServices();
    renderPrioritiesCheckboxGrid();

    // Captura parâmetro de busca da URL se vindo do Hub
    const urlParams = new URLSearchParams(window.location.search);
    const qParam = urlParams.get('q');
    if (qParam) {
      searchQuery = qParam.trim().toLowerCase();
      const input = document.getElementById('searchServiceInput');
      if (input) input.value = qParam;
      renderServices();
    }
    return;
  }

  try {
    // Valida o token e busca dados do usuário
    const response = await fetch(API_AUTH_ME, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    let data;
    if (response.ok) {
      data = await response.json();
    } else if (response.status === 404 && API_AUTH_ME.includes('/gse/')) {
      const fallbackRes = await fetch('/cds/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (fallbackRes.ok) {
        data = await fallbackRes.json();
      } else {
        throw new Error('Sessão expirada. Faça login novamente.');
      }
    } else {
      throw new Error('Sessão expirada. Faça login novamente.');
    }
    currentUser = data.user;

    // Preenche cabeçalho e formulário de perfil inicial
    updateUIForUser();

    // Inicializa a página
    await loadCategories();
    await loadServices();
    renderPrioritiesCheckboxGrid();

    const urlParams = new URLSearchParams(window.location.search);
    const qParam = urlParams.get('q');
    if (qParam) {
      searchQuery = qParam.trim().toLowerCase();
      const input = document.getElementById('searchServiceInput');
      if (input) input.value = qParam;
      renderServices();
    }

  } catch (err) {
    console.error(err);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('simac_auth_session');
    const loginTarget = (CDS_BASE || '') + '/login';
    window.location.href = loginTarget + '?expired=1&redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
  }
});

// Atualiza elementos da interface após obter o usuário
function updateUIForUser() {
  const secBadge = document.getElementById('navbarSecName');
  const welcomeTitle = document.getElementById('welcomeTitle');
  const welcomeDesc = document.getElementById('welcomeDesc');
  const statsDesc = document.querySelector('.stats-desc');

  if (currentUser.role === 'admin') {
    // Administrador: a barra superior já exibe o crachá de identificação.
    // Oculta o crachá secundário no banner para eliminar redundância visual.
    if (secBadge) secBadge.style.display = 'none';

    if (welcomeTitle) welcomeTitle.textContent = 'Painel Geral de Serviços';
    if (welcomeDesc) welcomeDesc.textContent = 'Catálogo consolidado de serviços municipais de todas as secretarias e órgãos da PMDC.';
    
    document.getElementById('menuBtnAdmin').style.display = 'flex';
    document.getElementById('formSecretariaGroup').style.display = 'block';
    if (statsDesc) statsDesc.textContent = 'cadastrados em todo o portal';

    loadAdminSecretariats();
    loadAdminUsersList();
    loadAdminApiKeysList();
  } else {
    // Representante de Secretaria: exibe o crachá institucional da pasta
    if (secBadge) {
      secBadge.style.display = 'inline-flex';
      secBadge.textContent = currentUser.secretariaNome || 'Secretaria Responsável';
    }

    if (welcomeTitle) welcomeTitle.textContent = currentUser.secretariaNome || 'Gestão da Secretaria';
    if (welcomeDesc) welcomeDesc.textContent = 'Gerencie os serviços públicos oficiais prestados pela sua pasta. Visualização restrita à sua jurisdição.';

    document.getElementById('menuBtnAdmin').style.display = 'none';
    document.getElementById('formSecretariaGroup').style.display = 'none';
    if (statsDesc) statsDesc.textContent = 'cadastrados para este órgão';
  }
  document.getElementById('profileUsername').value = currentUser.username;
}

// Alternar Abas (Tabs) do menu lateral
function switchTab(tabId, menuBtn) {
  // Oculta todas as abas
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  // Desativa todos os botões do menu
  document.querySelectorAll('.menu-item').forEach(btn => btn.classList.remove('active'));

  // Exibe a aba clicada e ativa o botão correspondente
  document.getElementById(tabId).classList.add('active');
  menuBtn.classList.add('active');

  // Ao entrar na aba de perfil, garante que o input de usuário reflita o valor atualizado
  if (tabId === 'profile-tab' && currentUser) {
    document.getElementById('profileUsername').value = currentUser.username;
    document.getElementById('profilePassword').value = '';
    document.getElementById('profileErrorBox').style.display = 'none';
  }

  // Ao entrar na aba de administração, atualiza dados do admin
  if (tabId === 'admin-tab' && currentUser && currentUser.role === 'admin') {
    loadAdminUsersList();
    loadAdminApiKeysList();
  }
}

// Logout
function handleLogout() {
  localStorage.clear();
  const loginTarget = (CDS_BASE || '') + '/login';
  window.location.href = loginTarget;
}

// ── CARREGAMENTO DE DADOS ──────────────────────────────────────────────────

async function loadServices() {
  const servicesListEl = document.getElementById('servicesList');
  const token = localStorage.getItem('token');
  const isCitizen = !token || currentUser?.role === 'citizen';
  const endpoint = isCitizen ? '/cds/api/services/public' : API_SERVICES;

  try {
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const response = await fetch(endpoint, { headers });

    if (!response.ok) throw new Error('Falha ao obter serviços.');

    currentServices = await response.json();
    renderServices();
    renderCategoryFilters();
    
    // Atualiza a estatística totalizadora no menu lateral
    document.getElementById('statsTotalCount').textContent = currentServices.length;
    updateStatusCounts();

  } catch (err) {
    showToast(err.message || 'Erro ao carregar serviços.', 'error');
  }
}

async function loadCategories() {
  const container = document.getElementById('formCategoryCheckboxesContainer');
  const token = localStorage.getItem('token');

  try {
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const response = await fetch(`${API_SERVICES}/categories`, { headers });

    if (!response.ok) throw new Error('Falha ao obter categorias.');

    categoriesList = await response.json();

    container.innerHTML = categoriesList.map(c => `
      <label class="priority-checkbox" for="formCategory_${c.id}">
        <input type="checkbox" name="formCategories" id="formCategory_${c.id}" value="${c.id}">
        ${c.name}
      </label>
    `).join('');

  } catch (err) {
    showToast('Erro ao obter categorias.', 'error');
  }
}

// ── REDERIZAÇÃO DA INTERFACE ───────────────────────────────────────────────

function filterByStatus(status, btn) {
  selectedStatusFilter = status;
  document.querySelectorAll('.status-tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderServices();
}

function updateStatusCounts() {
  const total = currentServices.length;
  const published = currentServices.filter(s => s.status === 'published' || !s.status).length;
  const hidden = currentServices.filter(s => s.status === 'hidden' || s.status === 'draft' || s.status === 'archived').length;

  const countAll = document.getElementById('countAll');
  const countPublished = document.getElementById('countPublished');
  const countHidden = document.getElementById('countHidden');

  if (countAll) countAll.textContent = total;
  if (countPublished) countPublished.textContent = published;
  if (countHidden) countHidden.textContent = hidden;
}

function renderServices() {
  const container = document.getElementById('servicesList');
  
  // Aplica os filtros de categorias selecionados (se houver)
  let filtered = selectedCategoriesFilter.length > 0
    ? currentServices.filter(s => selectedCategoriesFilter.includes(s.categoria_nome))
    : currentServices;

  // Aplica o filtro de status (all / published / hidden)
  if (selectedStatusFilter === 'published') {
    filtered = filtered.filter(s => s.status === 'published' || !s.status);
  } else if (selectedStatusFilter === 'hidden') {
    filtered = filtered.filter(s => s.status === 'hidden' || s.status === 'draft' || s.status === 'archived');
  }

  // Aplica o filtro de busca por nome do serviço (case insensitive)
  if (searchQuery) {
    filtered = filtered.filter(s => s.name.toLowerCase().includes(searchQuery));
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p>${searchQuery ? 'Nenhum serviço encontrado com esse nome.' : (selectedStatusFilter !== 'all' ? `Nenhum serviço encontrado com o status "${selectedStatusFilter === 'hidden' ? 'Oculto' : 'Publicado'}".` : (selectedCategoriesFilter.length > 0 ? 'Nenhum serviço nos responsáveis selecionados.' : 'Sua secretaria ainda não possui serviços cadastrados nesta base de dados.'))}</p>
        ${!searchQuery && selectedCategoriesFilter.length === 0 && selectedStatusFilter === 'all' ? '<p style="font-size: 13px; margin-top: 4px;">Clique em "+ Novo Serviço" acima para começar.</p>' : ''}
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  filtered.forEach(s => {
    const item = document.createElement('div');
    item.className = 'service-item';
    
    const isHidden = s.status === 'hidden' || s.status === 'draft' || s.status === 'archived';
    
    const statusBadge = isHidden
      ? `<span class="service-badge-status badge-hidden" title="Serviço oculto: não aparece no catálogo público e não é exportado"><svg style="width:12px;height:12px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>Oculto</span>`
      : `<span class="service-badge-status badge-published" title="Serviço publicado: ativo no catálogo"><svg style="width:12px;height:12px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>Publicado</span>`;

    const catBadge = s.categoria_nome 
      ? `<span class="service-badge-cat"><svg style="width:12px;height:12px;stroke-width:2;flex-shrink:0;" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>${window.DOMPurify ? DOMPurify.sanitize(s.categoria_nome) : s.categoria_nome}</span>` 
      : '<span class="service-badge-cat"><svg style="width:12px;height:12px;stroke-width:2;flex-shrink:0;" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>Sem Categoria</span>';

    const secBadge = (currentUser && currentUser.role === 'admin' && s.secretaria_nome)
      ? `<span class="service-badge-sec"><svg style="width:12px;height:12px;stroke-width:2;flex-shrink:0;" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/></svg>${window.DOMPurify ? DOMPurify.sanitize(s.secretaria_nome) : s.secretaria_nome}</span>`
      : '';

    item.innerHTML = `
      <div class="service-info">
        <div class="service-title">${window.DOMPurify ? DOMPurify.sanitize(s.name) : s.name}</div>
        <div class="service-category">
          ${statusBadge}
          ${catBadge}
          ${secBadge}
        </div>
      </div>
      <div class="service-item-actions">
        <button class="btn-action-sm btn-action-view" onclick="openViewModal(${s.id})" title="Visualizar ficha completa do serviço">
          <svg style="width:13px;height:13px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          Ver Detalhes
        </button>
        ${currentUser?.role !== 'citizen' ? `
        <button class="btn-action-sm btn-action-edit" onclick="openEditModal(${s.id})" title="Editar serviço">
          <svg style="width:13px;height:13px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          Editar
        </button>
        ${isHidden ? `
          <button class="btn-action-sm btn-action-toggle-status btn-status-show" onclick="handleToggleStatus(${s.id}, 'published')" title="Tornar serviço visível no catálogo e exportações">
            <svg style="width:13px;height:13px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Publicar
          </button>
        ` : `
          <button class="btn-action-sm btn-action-toggle-status btn-status-hide" onclick="handleToggleStatus(${s.id}, 'hidden')" title="Ocultar do catálogo público e exportações (fica salvo no banco)">
            <svg style="width:13px;height:13px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            Ocultar
          </button>
        `}
        <button class="btn-action-sm btn-action-delete" onclick="openDoubleDeleteModal(${s.id})" title="Excluir serviço com validação de segurança">
          <svg style="width:13px;height:13px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          Excluir
        </button>
        ` : ''}
      </div>
    `;
    container.appendChild(item);
  });
}

function handleSearchInput() {
  searchQuery = document.getElementById('searchServiceInput').value.trim().toLowerCase();
  renderServices();
}

function renderPrioritiesCheckboxGrid() {
  const container = document.getElementById('formPrioridadesGrid');
  container.innerHTML = PRIORIDADES_PADRAO.map((p, idx) => `
    <label class="priority-checkbox" for="formPriority_${idx}">
      <input type="checkbox" name="formPrioridades" id="formPriority_${idx}" value="${p}">
      ${p}
    </label>
  `).join('');
}

// ── GERENCIAMENTO DOS CAMPOS MULTIVALORADOS (DYNAMIC ROWS) ─────────────────

function addMultiRow(containerId, type, placeholder, value = '') {
  const container = document.getElementById(containerId);
  const row = document.createElement('div');
  row.className = 'multi-entry-row';

  const input = document.createElement('input');
  input.type = type;
  input.placeholder = placeholder;
  input.value = value;
  input.style.flex = '1';

  // Define um aria-label adequado para o leitor de telas
  if (containerId.includes('Telefones')) {
    input.setAttribute('aria-label', 'Telefone de contato');
  } else if (containerId.includes('Emails')) {
    input.setAttribute('aria-label', 'E-mail de contato');
  } else if (containerId.includes('Links')) {
    input.setAttribute('aria-label', 'Link ou site relacionado');
  } else if (containerId.includes('Passos')) {
    input.setAttribute('aria-label', 'Passo de instrução');
  } else if (containerId.includes('Docs')) {
    input.setAttribute('aria-label', 'Documento necessário');
  }

  const btnRemove = document.createElement('button');
  btnRemove.type = 'button';
  btnRemove.className = 'btn-remove-row';
  btnRemove.innerHTML = '&times;';
  btnRemove.onclick = () => row.remove();

  row.appendChild(input);
  row.appendChild(btnRemove);
  container.appendChild(row);
  
  if (!value) input.focus();
}

function getMultiValues(containerId) {
  const container = document.getElementById(containerId);
  return [...container.querySelectorAll('input')].map(i => i.value.trim()).filter(Boolean);
}

function setMultiValues(containerId, type, placeholder, array = []) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  array.forEach(val => addMultiRow(containerId, type, placeholder, val));
}

// ── ABERTURA E FECHAMENTO DO MODAL ──────────────────────────────────────────

function closeModal() {
  document.getElementById('serviceModal').classList.remove('show');
  document.getElementById('serviceForm').reset();
  document.body.classList.remove('modal-open');
}

function openAddModal() {
  document.getElementById('modalTitle').textContent = 'Cadastrar Novo Serviço';
  document.getElementById('formServiceId').value = '';
  document.getElementById('serviceForm').reset();
  
  // Limpa containers dinâmicos
  document.getElementById('formTelefonesContainer').innerHTML = '';
  document.getElementById('formEmailsContainer').innerHTML = '';
  document.getElementById('formLinksContainer').innerHTML = '';
  document.getElementById('formPassosContainer').innerHTML = '';
  document.getElementById('formDocsContainer').innerHTML = '';
  
  // Reseta checkboxes de prioridade e categorias
  document.querySelectorAll('input[name="formPrioridades"]').forEach(cb => cb.checked = false);
  document.querySelectorAll('input[name="formCategories"]').forEach(cb => cb.checked = false);
  document.getElementById('formStatus').value = 'published';

  // Adiciona linha padrão vazia em cada container multivalorado
  addMultiRow('formTelefonesContainer', 'tel', '(21) 00000-0000');
  addMultiRow('formEmailsContainer', 'email', 'email@caxias.rj.gov.br');
  addMultiRow('formLinksContainer', 'url', 'https://...');
  addMultiRow('formPassosContainer', 'text', '1. Passo Inicial...');
  addMultiRow('formDocsContainer', 'text', 'RG e CPF original');

  if (currentUser && currentUser.role === 'admin') {
    document.getElementById('formSecretariaId').value = '';
  }

  document.getElementById('serviceModal').classList.add('show');
  document.body.classList.add('modal-open');
}

async function openEditModal(id) {
  document.getElementById('modalTitle').textContent = 'Editar Serviço';
  document.getElementById('formServiceId').value = id;
  const token = localStorage.getItem('token');

  try {
    const response = await fetch(`${API_SERVICES}/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Não foi possível carregar os detalhes do serviço.');

    const service = await response.json();

    // Preenche os campos principais
    document.getElementById('formNome').value = service.name || '';
    document.getElementById('formStatus').value = service.status || 'published';
    document.getElementById('formDescricao').value = service.description || '';
    document.getElementById('formComoAcessar').value = service.how_to_access || '';
    document.getElementById('formQuemSolicita').value = service.who_can_request || '';
    document.getElementById('formEndereco').value = service.address || '';
    document.getElementById('formTempoEspera').value = service.waiting_time || '';
    document.getElementById('formPrazoMaximo').value = service.max_deadline || '';
    document.getElementById('formCusto').value = service.cost || '';
    document.getElementById('formNorma').value = service.regulation_norm || '';

    if (currentUser && currentUser.role === 'admin') {
      document.getElementById('formSecretariaId').value = service.secretaria_id || '';
    }

    // Preenche campos dinâmicos
    setMultiValues('formTelefonesContainer', 'tel', '(21) 00000-0000', service.telefones || []);
    setMultiValues('formEmailsContainer', 'email', 'email@caxias.rj.gov.br', service.emails || []);
    setMultiValues('formLinksContainer', 'url', 'https://...', service.links || []);
    setMultiValues('formPassosContainer', 'text', 'Passo...', service.passos || []);
    setMultiValues('formDocsContainer', 'text', 'Documento...', service.documentos || []);

    // Marca as categorias selecionadas
    const categoriasSelecionadas = service.category_ids || [];
    document.querySelectorAll('input[name="formCategories"]').forEach(cb => {
      cb.checked = categoriasSelecionadas.includes(Number(cb.value));
    });

    // Marca as prioridades selecionadas
    const prioridadesSelecionadas = service.prioridades || [];
    document.querySelectorAll('input[name="formPrioridades"]').forEach(cb => {
      cb.checked = prioridadesSelecionadas.includes(cb.value);
    });

    document.getElementById('serviceModal').classList.add('show');
    document.body.classList.add('modal-open');

  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── AÇÕES DE CRIAÇÃO, EDIÇÃO E EXCLUSÃO ─────────────────────────────────────

async function saveService() {
  const token = localStorage.getItem('token');
  const serviceId = document.getElementById('formServiceId').value;
  
  const name = document.getElementById('formNome').value.trim();
  const status = document.getElementById('formStatus').value;
  const description = document.getElementById('formDescricao').value.trim();
  const how_to_access = document.getElementById('formComoAcessar').value.trim();
  const who_can_request = document.getElementById('formQuemSolicita').value.trim();
  const address = document.getElementById('formEndereco').value.trim();
  const waiting_time = document.getElementById('formTempoEspera').value.trim();
  const max_deadline = document.getElementById('formPrazoMaximo').value.trim();
  const cost = document.getElementById('formCusto').value.trim();
  const regulation_norm = document.getElementById('formNorma').value.trim();

  const secretaria_id = (currentUser && currentUser.role === 'admin') ? document.getElementById('formSecretariaId').value : undefined;

  // Coleta categorias checadas
  const category_ids = [...document.querySelectorAll('input[name="formCategories"]:checked')].map(cb => Number(cb.value));

  if (!name) {
    showToast('O nome do serviço é obrigatório.', 'error');
    return;
  }
  if (category_ids.length === 0) {
    showToast('Pelo menos uma categoria é obrigatória.', 'error');
    return;
  }
  if (!description) {
    showToast('A descrição do serviço é obrigatória.', 'error');
    return;
  }
  if (currentUser && currentUser.role === 'admin' && !secretaria_id) {
    showToast('A secretaria responsável é obrigatória.', 'error');
    return;
  }

  // Coleta dados multivalorados
  const telefones = getMultiValues('formTelefonesContainer');
  const emails = getMultiValues('formEmailsContainer');
  const links = getMultiValues('formLinksContainer');
  const passos = getMultiValues('formPassosContainer');
  const documentos = getMultiValues('formDocsContainer');
  
  // Coleta prioridades checadas
  const prioridades = [...document.querySelectorAll('input[name="formPrioridades"]:checked')].map(cb => cb.value);

  const payload = {
    name,
    category_ids,
    status,
    description,
    how_to_access,
    who_can_request,
    address,
    waiting_time,
    max_deadline,
    cost,
    regulation_norm,
    telefones,
    emails,
    links,
    passos,
    documentos,
    prioridades,
    secretaria_id
  };

  const isEdit = !!serviceId;
  const url = isEdit ? `${API_SERVICES}/${serviceId}` : API_SERVICES;
  const method = isEdit ? 'PUT' : 'POST';

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) throw new Error(data.error || 'Erro ao salvar alterações.');

    showToast(data.message || 'Operação realizada com sucesso!', 'success');
    closeModal();
    await loadServices();

  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── CONTROLE DE VISIBILIDADE (OCULTAR / PUBLICAR) ──────────────────────────

async function handleToggleStatus(id, targetStatus) {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch(`${API_SERVICES}/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: targetStatus })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Erro ao alterar visibilidade do serviço.');

    // Atualiza localmente no currentServices
    const s = currentServices.find(item => item.id === id);
    if (s) s.status = targetStatus;

    showToast(data.message, 'success');
    updateStatusCounts();
    renderServices();

    // Se estiver com o modal de visualização aberto para este serviço, atualiza ele também
    if (currentViewingService && currentViewingService.id === id) {
      currentViewingService.status = targetStatus;
      renderViewModalContent(currentViewingService);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── MODAL DE VISUALIZAÇÃO COMPLETA DO SERVIÇO ─────────────────────────────

async function openViewModal(id) {
  const token = localStorage.getItem('token');
  const isCitizen = !token || currentUser?.role === 'citizen';
  const endpoint = isCitizen ? `/cds/api/services/public/${id}` : `${API_SERVICES}/${id}`;
  try {
    showToast('Carregando ficha do serviço...', 'info');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const response = await fetch(endpoint, { headers });
    if (!response.ok) throw new Error('Não foi possível carregar os detalhes do serviço.');

    const service = await response.json();
    currentViewingService = service;

    renderViewModalContent(service);

    const modal = document.getElementById('viewServiceModal');
    if (modal) {
      modal.classList.add('show');
      document.body.classList.add('modal-open');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function closeViewModal() {
  const modal = document.getElementById('viewServiceModal');
  if (modal) {
    modal.classList.remove('show');
    document.body.classList.remove('modal-open');
  }
  currentViewingService = null;
}

function renderViewModalContent(service) {
  const titleEl = document.getElementById('viewServiceName');
  if (titleEl) titleEl.textContent = service.name;

  const badgesRow = document.getElementById('viewBadgesRow');
  const isHidden = service.status === 'hidden' || service.status === 'draft' || service.status === 'archived';

  const statusBadgeHtml = isHidden
    ? `<span class="service-badge-status badge-hidden"><svg style="width:12px;height:12px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>Oculto</span>`
    : `<span class="service-badge-status badge-published"><svg style="width:12px;height:12px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>Publicado</span>`;

  const catBadgeHtml = service.categoria_nome
    ? `<span class="service-badge-cat"><svg style="width:12px;height:12px;stroke-width:2;flex-shrink:0;" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>${service.categoria_nome}</span>`
    : '<span class="service-badge-cat">Sem Categoria</span>';

  const secBadgeHtml = service.secretaria_nome
    ? `<span class="service-badge-sec"><svg style="width:12px;height:12px;stroke-width:2;flex-shrink:0;" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/></svg>${service.secretaria_nome}</span>`
    : '';

  if (badgesRow) {
    badgesRow.innerHTML = `${statusBadgeHtml} ${catBadgeHtml} ${secBadgeHtml}`;
  }

  const btnToggle = document.getElementById('btnViewToggleStatus');
  if (btnToggle) {
    if (isHidden) {
      btnToggle.className = 'btn-action btn-action-toggle-status btn-status-show';
      btnToggle.innerHTML = '<svg style="width:14px;height:14px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Publicar Serviço';
    } else {
      btnToggle.className = 'btn-action btn-action-toggle-status';
      btnToggle.innerHTML = '<svg style="width:14px;height:14px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg> Ocultar Serviço';
    }
  }

  const bodyEl = document.getElementById('viewModalBody');
  if (!bodyEl) return;

  const escapeHtml = (str) => {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  let passosHtml = '<p style="color: #64748b; font-size: 13px;">Atendimento direto (sem etapas cadastradas).</p>';
  if (service.passos && service.passos.length > 0) {
    passosHtml = `
      <div class="view-steps-timeline">
        ${service.passos.map((p, idx) => `
          <div class="view-step-item">
            <div class="view-step-num">${idx + 1}</div>
            <div class="view-step-text">${escapeHtml(p)}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  let docsHtml = '<p style="color: #64748b; font-size: 13px;">Nenhum documento específico exigido.</p>';
  if (service.documentos && service.documentos.length > 0) {
    docsHtml = `
      <div class="view-docs-grid">
        ${service.documentos.map(d => `
          <div class="view-doc-chip">
            <svg style="width:14px;height:14px;flex-shrink:0;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            <span>${escapeHtml(d)}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  let prioridadesHtml = '<p style="color: #64748b; font-size: 13px;">Atendimento geral.</p>';
  if (service.prioridades && service.prioridades.length > 0) {
    prioridadesHtml = `
      <div style="display: flex; flex-wrap: wrap; gap: 8px;">
        ${service.prioridades.map(p => `
          <span class="view-priority-tag">
            <svg style="width:12px;height:12px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            ${escapeHtml(p)}
          </span>
        `).join('')}
      </div>
    `;
  }

  const telefones = service.telefones || [];
  const emails = service.emails || [];
  const links = service.links || [];
  const hasContacts = telefones.length > 0 || emails.length > 0 || links.length > 0;

  let contatosHtml = '<p style="color: #64748b; font-size: 13px;">Canais oficiais na sede do órgão.</p>';
  if (hasContacts) {
    contatosHtml = `<div style="display: flex; flex-wrap: wrap; gap: 10px;">`;
    telefones.forEach(tel => {
      contatosHtml += `
        <a href="tel:${escapeHtml(tel.replace(/[^0-9]/g, ''))}" class="view-contact-item" title="Ligar para ${escapeHtml(tel)}">
          <svg style="width:14px;height:14px;color:#0284c7;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          <span>${escapeHtml(tel)}</span>
        </a>
      `;
    });
    emails.forEach(email => {
      contatosHtml += `
        <a href="mailto:${escapeHtml(email)}" class="view-contact-item" title="Enviar e-mail para ${escapeHtml(email)}">
          <svg style="width:14px;height:14px;color:#16a34a;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          <span>${escapeHtml(email)}</span>
        </a>
      `;
    });
    links.forEach(l => {
      contatosHtml += `
        <a href="${escapeHtml(l)}" target="_blank" rel="noopener noreferrer" class="view-contact-item" title="Abrir link externo">
          <svg style="width:14px;height:14px;color:#d97706;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          <span>${escapeHtml(l)}</span>
        </a>
      `;
    });
    contatosHtml += `</div>`;
  }

  bodyEl.innerHTML = `
    <div class="view-section-card">
      <div class="view-section-title">
        <svg style="width:16px;height:16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        O que é este serviço?
      </div>
      <div class="view-section-content">${escapeHtml(service.description) || 'Sem descrição cadastrada.'}</div>
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; margin-bottom: 16px;">
      <div class="view-section-card" style="margin-bottom: 0;">
        <div class="view-section-title">
          <svg style="width:16px;height:16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          Quem pode solicitar?
        </div>
        <div class="view-section-content">${escapeHtml(service.who_can_request) || 'Cidadãos em geral'}</div>
      </div>

      <div class="view-section-card" style="margin-bottom: 0;">
        <div class="view-section-title">
          <svg style="width:16px;height:16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          Como ter acesso?
        </div>
        <div class="view-section-content">${escapeHtml(service.how_to_access) || 'Presencialmente ou através dos canais municipais'}</div>
      </div>
    </div>

    ${service.address ? `
      <div class="view-section-card">
        <div class="view-section-title">
          <svg style="width:16px;height:16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          Endereço / Unidade de Atendimento
        </div>
        <div class="view-section-content">${escapeHtml(service.address)}</div>
      </div>
    ` : ''}

    <div class="view-section-card">
      <div class="view-section-title">
        <svg style="width:16px;height:16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
        Etapas de Atendimento (Passo a Passo)
      </div>
      ${passosHtml}
    </div>

    <div class="view-section-card">
      <div class="view-section-title">
        <svg style="width:16px;height:16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        Documentação Exigida
      </div>
      ${docsHtml}
    </div>

    <div class="view-section-card">
      <div class="view-section-title">
        <svg style="width:16px;height:16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        Prazos, Taxas e Regulamentação
      </div>
      <div class="view-metrics-grid">
        <div class="view-metric-card">
          <div class="view-metric-label">⏱️ Tempo de Espera</div>
          <div class="view-metric-val">${escapeHtml(service.waiting_time) || 'Atendimento por ordem de chegada'}</div>
        </div>
        <div class="view-metric-card">
          <div class="view-metric-label">📅 Prazo Máximo</div>
          <div class="view-metric-val">${escapeHtml(service.max_deadline) || 'Sob demanda'}</div>
        </div>
        <div class="view-metric-card">
          <div class="view-metric-label">💰 Custos / Taxas</div>
          <div class="view-metric-val">${escapeHtml(service.cost) || 'Gratuito'}</div>
        </div>
        <div class="view-metric-card">
          <div class="view-metric-label">⚖️ Norma / Base Legal</div>
          <div class="view-metric-val">${escapeHtml(service.regulation_norm) || 'Regulamento Setorial PMDC'}</div>
        </div>
      </div>
    </div>

    <div class="view-section-card">
      <div class="view-section-title">
        <svg style="width:16px;height:16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        Prioridades de Atendimento
      </div>
      ${prioridadesHtml}
    </div>

    <div class="view-section-card" style="margin-bottom: 0;">
      <div class="view-section-title">
        <svg style="width:16px;height:16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        Canais de Atendimento e Informações
      </div>
      ${contatosHtml}
    </div>
  `;
}

function handleToggleStatusFromViewModal() {
  if (!currentViewingService) return;
  const isCurrentlyHidden = currentViewingService.status === 'hidden' || currentViewingService.status === 'draft' || currentViewingService.status === 'archived';
  const target = isCurrentlyHidden ? 'published' : 'hidden';
  handleToggleStatus(currentViewingService.id, target);
}

function editFromViewModal() {
  if (!currentViewingService) return;
  const id = currentViewingService.id;
  closeViewModal();
  openEditModal(id);
}

function printServiceSheet() {
  window.print();
}

// ── EXCLUSÃO COM VALIDAÇÃO DUPLA ───────────────────────────────────────────

function openDoubleDeleteModal(id) {
  const service = currentServices.find(s => s.id === id);
  if (!service) return;

  pendingDeleteService = service;

  const nameEl1 = document.getElementById('deleteStep1ServiceName');
  const metaEl1 = document.getElementById('deleteStep1ServiceMeta');
  const nameEl2 = document.getElementById('deleteStep2ServiceName');

  if (nameEl1) nameEl1.textContent = service.name;
  if (nameEl2) nameEl2.textContent = `"${service.name}"`;
  if (metaEl1) {
    const cat = service.categoria_nome || 'Sem Categoria';
    const sec = service.secretaria_nome ? ` • ${service.secretaria_nome}` : '';
    metaEl1.textContent = `${cat}${sec}`;
  }

  goToDeleteStep1();

  const modal = document.getElementById('doubleDeleteModal');
  if (modal) {
    modal.classList.add('show');
    document.body.classList.add('modal-open');
  }
}

function closeDoubleDeleteModal() {
  const modal = document.getElementById('doubleDeleteModal');
  if (modal) {
    modal.classList.remove('show');
    document.body.classList.remove('modal-open');
  }
  pendingDeleteService = null;
}

function goToDeleteStep1() {
  const step1 = document.getElementById('deleteStep1');
  const step2 = document.getElementById('deleteStep2');
  const footer1 = document.getElementById('deleteFooterStep1');
  const footer2 = document.getElementById('deleteFooterStep2');
  const subTitle = document.getElementById('deleteModalSubtitle');

  if (step1) step1.style.display = 'block';
  if (step2) step2.style.display = 'none';
  if (footer1) footer1.style.display = 'flex';
  if (footer2) footer2.style.display = 'none';
  if (subTitle) subTitle.textContent = 'Etapa 1 de 2 • Verificação de Segurança';

  const input = document.getElementById('deleteConfirmWord');
  const check = document.getElementById('deleteConfirmCheck');
  const btn = document.getElementById('btnConfirmDeletePermanent');
  if (input) input.value = '';
  if (check) check.checked = false;
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Confirmar Exclusão Definitiva';
  }
}

function goToDeleteStep2() {
  const step1 = document.getElementById('deleteStep1');
  const step2 = document.getElementById('deleteStep2');
  const footer1 = document.getElementById('deleteFooterStep1');
  const footer2 = document.getElementById('deleteFooterStep2');
  const subTitle = document.getElementById('deleteModalSubtitle');

  if (step1) step1.style.display = 'none';
  if (step2) step2.style.display = 'block';
  if (footer1) footer1.style.display = 'none';
  if (footer2) footer2.style.display = 'flex';
  if (subTitle) subTitle.textContent = 'Etapa 2 de 2 • Confirmação Obrigatória';

  const input = document.getElementById('deleteConfirmWord');
  if (input) {
    input.value = '';
    setTimeout(() => input.focus(), 100);
  }
  checkDeleteInputs();
}

function checkDeleteInputs() {
  const input = document.getElementById('deleteConfirmWord');
  const check = document.getElementById('deleteConfirmCheck');
  const btn = document.getElementById('btnConfirmDeletePermanent');

  const wordOk = input && input.value.trim().toUpperCase() === 'EXCLUIR';
  const checkOk = check && check.checked;

  if (btn) {
    btn.disabled = !(wordOk || checkOk);
  }
}

async function executeDoubleDelete() {
  if (!pendingDeleteService) return;
  const id = pendingDeleteService.id;
  const token = localStorage.getItem('token');
  const btn = document.getElementById('btnConfirmDeletePermanent');

  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Excluindo serviço...';
    }

    const response = await fetch(`${API_SERVICES}/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Erro ao excluir o serviço.');

    showToast(data.message || 'Serviço excluído permanentemente com sucesso!', 'success');
    closeDoubleDeleteModal();
    await loadServices();

  } catch (err) {
    showToast(err.message, 'error');
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Confirmar Exclusão Definitiva';
    }
  }
}

// Alias legado para compatibilidade
async function handleDelete(id) {
  openDoubleDeleteModal(id);
}

// ── ATUALIZAÇÃO DO PERFIL (USUÁRIO E SENHA) ─────────────────────────────────

async function handleProfileUpdate(e) {
  e.preventDefault();
  const token = localStorage.getItem('token');
  const errorBox = document.getElementById('profileErrorBox');
  const saveBtn = document.getElementById('btnSaveProfile');

  const username = document.getElementById('profileUsername').value.trim();
  const password = document.getElementById('profilePassword').value;

  if (!username) {
    showToast('O nome do usuário é obrigatório.', 'error');
    return;
  }

  errorBox.style.display = 'none';
  saveBtn.disabled = true;
  saveBtn.textContent = 'Aguarde...';

  try {
    const response = await fetch(API_AUTH_PROFILE, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erro ao atualizar dados da conta.');
    }

    // Salva o novo token e dados do usuário atualizados
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    currentUser = data.user;

    // Atualiza cabeçalhos
    updateUIForUser();
    
    // Limpa campo de senha
    document.getElementById('profilePassword').value = '';

    showToast('Dados de acesso atualizados com sucesso!', 'success');

  } catch (err) {
    console.error(err);
    errorBox.textContent = err.message;
    errorBox.style.display = 'block';
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Atualizar Acesso';
  }
}

// ── TOAST NOTIFICATIONS ──────────────────────────────────────────────────────

function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3500);
}

// ── RENDERIZAR FILTROS DE CATEGORIA NA SIDEBAR ──────────────────────────────

function renderCategoryFilters() {
  const container = document.getElementById('sidebarFilterList');
  if (!container) return;

  const categoriasUnicas = [...new Set(currentServices.map(s => s.categoria_nome).filter(Boolean))].sort();

  // Botão "Todos"
  const isTodosActive = selectedCategoriesFilter.length === 0;
  container.innerHTML = `
    <button class="filter-btn ${isTodosActive ? 'active' : ''}" id="filterBtnTodos" onclick="clearCategoryFilters(this)">
      Todos os Serviços
    </button>
  `;

  categoriasUnicas.forEach(cat => {
    const isActive = selectedCategoriesFilter.includes(cat);
    const btn = document.createElement('button');
    btn.className = `filter-btn ${isActive ? 'active' : ''}`;
    btn.textContent = cat;
    btn.title = cat;
    btn.onclick = () => toggleCategoryFilter(cat, btn);
    container.appendChild(btn);
  });
}

function toggleCategoryFilter(categoriaName, btnEl) {
  const index = selectedCategoriesFilter.indexOf(categoriaName);

  if (index > -1) {
    // Se já estava selecionado, remove
    selectedCategoriesFilter.splice(index, 1);
    btnEl.classList.remove('active');
  } else {
    // Se não estava selecionado, adiciona
    selectedCategoriesFilter.push(categoriaName);
    btnEl.classList.add('active');
  }

  // Atualiza destaque do botão "Todos"
  const btnTodos = document.getElementById('filterBtnTodos');
  if (selectedCategoriesFilter.length === 0) {
    btnTodos.classList.add('active');
  } else {
    btnTodos.classList.remove('active');
  }

  renderServices();
}

function clearCategoryFilters(btnTodos) {
  selectedCategoriesFilter = [];
  
  // Limpa classe active de todos os botões específicos e destaca o "Todos"
  document.querySelectorAll('#sidebarFilterList .filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  btnTodos.classList.add('active');

  renderServices();
}

async function exportToExcel() {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    showToast('Gerando planilha, por favor aguarde...', 'success');

    const response = await fetch('/cds/api/services/export', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error('Falha ao exportar planilha do servidor.');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    
    // Obtém o nome da secretaria ou usa um padrão
    const secName = currentUser?.secretariaNome || 'Secretaria';
    const cleanSecName = secName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `Carta_Servicos_${cleanSecName}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    
    window.URL.revokeObjectURL(url);
    showToast('Planilha baixada com sucesso!', 'success');

  } catch (err) {
    console.error(err);
    showToast(err.message || 'Erro ao exportar planilha.', 'error');
  }
}

// ── PORTAL DO ADMINISTRADOR (ADMIN CONTROLS) ─────────────────────────────────

let allSecretarias = [];

function openAdminSecretariaModal() {
  document.getElementById('newSecName').value = '';
  document.getElementById('adminSecretariaModal').classList.add('show');
  document.body.classList.add('modal-open');
}

function closeAdminSecretariaModal() {
  document.getElementById('adminSecretariaModal').classList.remove('show');
  document.body.classList.remove('modal-open');
}

async function handleCreateSecretaria(e) {
  e.preventDefault();
  const token = localStorage.getItem('token');
  const name = document.getElementById('newSecName').value.trim();

  if (!name) return;

  try {
    const response = await fetch('/cds/api/admin/secretarias', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Erro ao cadastrar secretaria.');

    showToast('Secretaria cadastrada com sucesso!', 'success');
    closeAdminSecretariaModal();
    
    // Recarrega as secretarias
    await loadAdminSecretariats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function openAdminUserModal(userId = null) {
  const form = document.getElementById('adminUserForm');
  form.reset();
  
  const pwHelp = document.getElementById('adminUserPasswordHelp');
  const pwLabel = document.getElementById('adminUserPasswordLabel');
  const pwInput = document.getElementById('adminUserPassword');

  if (userId) {
    document.getElementById('adminUserModalTitle').textContent = 'Editar Usuário';
    document.getElementById('adminUserId').value = userId;
    pwHelp.style.display = 'block';
    pwLabel.textContent = 'Nova Senha (Opcional)';
    pwInput.required = false;
  } else {
    document.getElementById('adminUserModalTitle').textContent = 'Cadastrar Novo Usuário';
    document.getElementById('adminUserId').value = '';
    pwHelp.style.display = 'none';
    pwLabel.textContent = 'Senha *';
    pwInput.required = true;
  }

  document.getElementById('adminUserModal').classList.add('show');
  document.body.classList.add('modal-open');
}

function closeAdminUserModal() {
  document.getElementById('adminUserModal').classList.remove('show');
  document.body.classList.remove('modal-open');
}

async function loadAdminSecretariats() {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch('/cds/api/admin/secretarias', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Erro ao obter secretarias.');

    allSecretarias = await response.json();

    // Popula select de secretaria no cadastro do serviço
    const formSecSelect = document.getElementById('formSecretariaId');
    formSecSelect.innerHTML = '<option value="">Selecione uma secretaria responsável...</option>';
    allSecretarias.forEach(sec => {
      const opt = document.createElement('option');
      opt.value = sec.id;
      opt.textContent = sec.name;
      formSecSelect.appendChild(opt);
    });

    // Popula select de secretaria no cadastro do usuário
    const userSecSelect = document.getElementById('adminUserSecretaria');
    userSecSelect.innerHTML = '<option value="">Selecione uma secretaria...</option>';
    allSecretarias.forEach(sec => {
      const opt = document.createElement('option');
      opt.value = sec.id;
      opt.textContent = sec.name;
      userSecSelect.appendChild(opt);
    });

  } catch (err) {
    console.error(err);
  }
}

async function loadAdminUsersList() {
  const token = localStorage.getItem('token');
  const tableBody = document.getElementById('adminUsersTableBody');
  tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 12px;">Carregando acessos...</td></tr>';

  try {
    const response = await fetch('/cds/api/admin/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Erro ao obter usuários.');

    const users = await response.json();
    tableBody.innerHTML = '';

    if (users.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 12px;">Nenhum usuário cadastrado.</td></tr>';
      return;
    }

    users.forEach(user => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid var(--border)';
      
      const roleBadgeColor = user.role === 'admin' ? '#ef4444' : '#10b981';
      
      tr.innerHTML = `
        <td style="padding: 12px 8px; font-weight: 600; color: var(--text-main);">${window.DOMPurify ? DOMPurify.sanitize(user.secretaria_nome || 'Nenhuma/Administração') : (user.secretaria_nome || 'Nenhuma/Administração')}</td>
        <td style="padding: 12px 8px; font-family: monospace; font-size: 14px;">${window.DOMPurify ? DOMPurify.sanitize(user.username) : user.username}</td>
        <td style="padding: 12px 8px;">
          <span style="background: ${roleBadgeColor}15; color: ${roleBadgeColor}; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase;">
            ${user.role}
          </span>
        </td>
        <td style="padding: 12px 8px; text-align: right;">
          <button class="btn-action btn-edit" style="padding: 4px 8px; font-size: 12px; margin-right: 4px;" onclick="handleEditAdminUserClick(${user.id}, '${user.username}', '${user.role}', ${user.secretaria_id})">Editar</button>
          <button class="btn-action btn-delete" style="padding: 4px 8px; font-size: 12px;" onclick="handleDeleteAdminUser(${user.id})">Excluir</button>
        </td>
      `;
      tableBody.appendChild(tr);
    });

  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 12px; color: var(--error);">${err.message}</td></tr>`;
  }
}

async function handleSaveAdminUser(e) {
  e.preventDefault();
  const token = localStorage.getItem('token');
  const userId = document.getElementById('adminUserId').value;
  
  const username = document.getElementById('adminUserUsername').value.trim();
  const secretaria_id = document.getElementById('adminUserSecretaria').value;
  const role = document.getElementById('adminUserRole').value;
  const password = document.getElementById('adminUserPassword').value;

  if (!username || !secretaria_id || !role) {
    showToast('Todos os campos obrigatórios devem ser preenchidos.', 'error');
    return;
  }

  const isEdit = !!userId;
  const url = isEdit ? `/cds/api/admin/users/${userId}` : '/cds/api/admin/users';
  const method = isEdit ? 'PUT' : 'POST';

  const payload = { username, secretaria_id, role };
  if (password) {
    payload.password = password;
  }

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Erro ao salvar usuário.');

    showToast(data.message || 'Usuário salvo com sucesso!', 'success');
    closeAdminUserModal();
    await loadAdminUsersList();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function handleEditAdminUserClick(id, username, role, secretariaId) {
  openAdminUserModal(id);
  document.getElementById('adminUserUsername').value = username;
  document.getElementById('adminUserSecretaria').value = secretariaId || '';
  document.getElementById('adminUserRole').value = role;
  document.getElementById('adminUserPassword').value = '';
}

async function handleDeleteAdminUser(id) {
  if (!confirm('Deseja realmente excluir esta conta de acesso?')) return;
  const token = localStorage.getItem('token');

  try {
    const response = await fetch(`/cds/api/admin/users/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Erro ao excluir usuário.');

    showToast('Usuário excluído com sucesso!', 'success');
    await loadAdminUsersList();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function createNewCategoryPrompt() {
  const categoryName = prompt("Digite o nome da nova Categoria do Serviço:");
  if (!categoryName || !categoryName.trim()) return;

  const token = localStorage.getItem('token');
  try {
    const response = await fetch('/cds/api/services/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name: categoryName.trim() })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Erro ao criar categoria.');

    showToast(data.message || 'Categoria criada com sucesso!', 'success');
    
    // Save currently checked category IDs in the form
    const currentCheckedIds = [...document.querySelectorAll('input[name="formCategories"]:checked')].map(cb => Number(cb.value));
    
    // Add the new category ID to the checked list
    currentCheckedIds.push(Number(data.id));

    // Reload categories in checkboxes list
    await loadCategories();

    // Recheck the boxes including the new one
    document.querySelectorAll('input[name="formCategories"]').forEach(cb => {
      cb.checked = currentCheckedIds.includes(Number(cb.value));
    });

    // Refresh categories filters list
    renderCategoryFilters();

  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── GESTÃO DE API KEYS (ADMINISTRADOR) ────────────────────────────────────

async function loadAdminApiKeysList() {
  const tableBody = document.getElementById('adminApiKeysTableBody');
  if (!tableBody) return;

  const token = localStorage.getItem('token');
  if (!token) return;

  tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 16px; color: var(--text-muted);">Carregando chaves de API...</td></tr>';

  try {
    const response = await fetch('/cds/api/admin/api-keys', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Erro ao carregar chaves de API');
    }

    const res = await response.json();
    const keys = res.data || [];

    if (keys.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--text-muted);">Nenhuma chave de API emitida ainda. Clique em "+ Nova Chave de API" para gerar a primeira.</td></tr>';
      return;
    }

    tableBody.innerHTML = '';
    keys.forEach(k => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid var(--border)';

      const isAtivo = k.status === 'ATIVO';
      const statusBadge = isAtivo
        ? '<span style="background: rgba(16, 185, 129, 0.12); color: #059669; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;">ATIVO</span>'
        : k.status === 'SUSPENSO'
          ? '<span style="background: rgba(245, 158, 11, 0.12); color: #d97706; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;">SUSPENSO</span>'
          : '<span style="background: rgba(239, 68, 68, 0.12); color: #dc2626; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;">REVOGADO</span>';

      const maskedKey = k.chave.length > 18 ? `${k.chave.slice(0, 16)}...` : k.chave;
      const toggleLabel = isAtivo ? 'Suspender' : 'Ativar';
      const toggleColor = isAtivo ? '#d97706' : '#059669';

      tr.innerHTML = `
        <td style="padding: 12px 8px;">
          <div style="font-weight: 700; color: var(--text-main);">${window.DOMPurify ? DOMPurify.sanitize(k.nome_cliente) : k.nome_cliente}</div>
          <div style="font-size: 12px; color: var(--text-muted);">${window.DOMPurify ? DOMPurify.sanitize(k.orgao_empresa || k.email_cliente) : (k.orgao_empresa || k.email_cliente)}</div>
        </td>
        <td style="padding: 12px 8px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <code style="background: #f1f5f9; padding: 3px 6px; border-radius: 4px; font-family: monospace; font-size: 12px; border: 1px solid #e2e8f0;">${maskedKey}</code>
            <button class="btn-action" style="padding: 2px 6px; font-size: 11px;" onclick="copyApiKeyToClipboard('${k.chave}')" title="Copiar Chave Completa">
              <i class="ri-file-copy-line"></i>
            </button>
          </div>
        </td>
        <td style="padding: 12px 8px; font-size: 12.5px;">
          <div><strong>${k.limite_req_minuto || 60}</strong> /min</div>
          <div style="color: var(--text-muted); font-size: 11.5px;">${(k.limite_req_dia || 10000).toLocaleString('pt-BR')} /dia</div>
        </td>
        <td style="padding: 12px 8px; font-size: 12.5px;">
          <div><strong>${k.requisicoes_hoje || 0}</strong> hoje</div>
          <div style="color: var(--text-muted); font-size: 11px;">Total: ${(k.total_requisicoes || 0).toLocaleString('pt-BR')}</div>
        </td>
        <td style="padding: 12px 8px;">
          ${statusBadge}
        </td>
        <td style="padding: 12px 8px; text-align: right;">
          <button class="btn-action" style="padding: 4px 8px; font-size: 12px; margin-right: 4px; color: ${toggleColor};" onclick="handleToggleApiKeyStatus(${k.id}, '${k.status}')">${toggleLabel}</button>
          <button class="btn-action btn-delete" style="padding: 4px 8px; font-size: 12px;" onclick="handleDeleteApiKey(${k.id}, '${k.nome_cliente.replace(/'/g, "\\'")}')">Excluir</button>
        </td>
      `;
      tableBody.appendChild(tr);
    });

  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 12px; color: var(--error);">${err.message}</td></tr>`;
  }
}

function openCreateApiKeyModal() {
  const form = document.getElementById('apiKeyForm');
  if (form) form.reset();
  const successBox = document.getElementById('apiKeySuccessBox');
  if (successBox) successBox.style.display = 'none';
  const submitBtn = document.getElementById('btnSubmitApiKey');
  if (submitBtn) submitBtn.style.display = 'inline-flex';

  const modal = document.getElementById('apiKeyModal');
  if (modal) {
    modal.classList.add('show');
    document.body.classList.add('modal-open');
  }
}

function closeApiKeyModal() {
  const modal = document.getElementById('apiKeyModal');
  if (modal) {
    modal.classList.remove('show');
    document.body.classList.remove('modal-open');
  }
}

async function handleSaveApiKey(e) {
  e.preventDefault();
  const token = localStorage.getItem('token');
  if (!token) return;

  const nome_cliente = document.getElementById('apiKeyCliente').value.trim();
  const email_cliente = document.getElementById('apiKeyEmail').value.trim();
  const orgao_empresa = document.getElementById('apiKeyOrgao').value.trim();
  const limite_req_minuto = Number(document.getElementById('apiKeyLimitMin').value) || 60;
  const limite_req_dia = Number(document.getElementById('apiKeyLimitDia').value) || 10000;
  const notas = document.getElementById('apiKeyNotas').value.trim();

  if (!nome_cliente || !email_cliente) {
    showToast('Nome do cliente e e-mail são obrigatórios.', 'error');
    return;
  }

  try {
    const response = await fetch('/cds/api/admin/api-keys', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        nome_cliente,
        email_cliente,
        orgao_empresa,
        limite_req_minuto,
        limite_req_dia,
        notas
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Erro ao gerar chave de API');

    showToast('Chave de API gerada com sucesso!', 'success');

    // Mostra chave gerada no box de sucesso
    const successBox = document.getElementById('apiKeySuccessBox');
    const keyDisplay = document.getElementById('generatedKeyDisplay');
    const submitBtn = document.getElementById('btnSubmitApiKey');

    if (successBox && keyDisplay) {
      keyDisplay.value = data.data.chave;
      successBox.style.display = 'block';
      if (submitBtn) submitBtn.style.display = 'none';
    }

    await loadAdminApiKeysList();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function copyGeneratedKey() {
  const input = document.getElementById('generatedKeyDisplay');
  if (!input || !input.value) return;
  copyApiKeyToClipboard(input.value);
}

function copyApiKeyToClipboard(keyStr) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(keyStr).then(() => {
      showToast('Chave copiada para a área de transferência!', 'success');
    }).catch(() => {
      prompt('Copie a chave manualmente:', keyStr);
    });
  } else {
    prompt('Copie a chave manualmente:', keyStr);
  }
}

async function handleToggleApiKeyStatus(id, currentStatus) {
  const novoStatus = currentStatus === 'ATIVO' ? 'SUSPENSO' : 'ATIVO';
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const response = await fetch(`/cds/api/admin/api-keys/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: novoStatus })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Erro ao alterar status da chave');

    showToast(`Status da chave alterado para [${novoStatus}]!`, 'success');
    await loadAdminApiKeysList();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleDeleteApiKey(id, clientName) {
  if (!confirm(`Deseja realmente revogar e excluir permanentemente a chave de API de "${clientName}"? Esta ação não pode ser desfeita e interromperá todas as integrações ativas.`)) {
    return;
  }

  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const response = await fetch(`/cds/api/admin/api-keys/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Erro ao excluir chave');

    showToast('Chave de API excluída com sucesso!', 'success');
    await loadAdminApiKeysList();
  } catch (err) {
    showToast(err.message, 'error');
  }
}


