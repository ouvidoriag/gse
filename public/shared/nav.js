/**
 * PREFEITURA DE DUQUE DE CAXIAS — BARRA & SIDEBAR UNIFICADA
 * Gerencia a Sidebar Corporativa, Topbar, 3 Botões de Navegação (Hub, CDS, SIGEM) e Sessão SSO
 */

(function () {
  function getInitials(name) {
    if (!name) return 'AM';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function getUserSession() {
    try {
      const u = localStorage.getItem('user');
      if (u) return JSON.parse(u);
    } catch (_) {}

    try {
      const s = localStorage.getItem('simac_auth_session');
      if (s) {
        const simac = JSON.parse(s);
        if (simac.user || simac.name) {
          return {
            username: simac.user,
            name: simac.name || simac.user,
            role: simac.role || 'editor',
            secretariaNome: simac.secretariaNome
          };
        }
      }
    } catch (_) {}

    return null;
  }

  function getAppBasePath() {
    const p = window.location.pathname.toLowerCase();
    if (p.startsWith('/gse')) return '/gse';
    const h = window.location.hostname.toLowerCase();
    // Em produção na VM (ogm.duquedecaxias.rj.gov.br ou porta 8059), toda a suíte é servida sob /gse
    if (h.includes('duquedecaxias.rj.gov.br') || window.location.port === '8059') {
      return '/gse';
    }
    return '';
  }

  window.getAppBasePath = getAppBasePath;
  window.getGseBasePrefix = getAppBasePath;

  window.toggleSidebar = function () {
    const sidebar = document.getElementById('sidebarNav');
    if (!sidebar) return;
    sidebar.classList.toggle('collapsed');
    const isCollapsed = sidebar.classList.contains('collapsed');
    localStorage.setItem('pmdc_sidebar_collapsed', isCollapsed ? 'true' : 'false');
  };

  window.pmdcLogout = function () {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('simac_auth_session');
    document.cookie = "pmdc_token=; path=/; max-age=0";
    document.cookie = "token=; path=/; max-age=0";
    const base = getAppBasePath();
    window.location.href = (base || '') + '/login?logout=true';
  };

  // Alias para retrocompatibilidade
  window.simacLogout = window.pmdcLogout;

  window.toggleUserDropdown = function (e) {
    if (e) e.stopPropagation();
    const dd = document.getElementById('topUserDropdown');
    if (dd) dd.classList.toggle('active');
  };

  document.addEventListener('click', function (e) {
    const dd = document.getElementById('topUserDropdown');
    const pill = document.getElementById('topUserPill');
    if (dd && dd.classList.contains('active')) {
      if (!dd.contains(e.target) && (!pill || !pill.contains(e.target))) {
        dd.classList.remove('active');
      }
    }
  });

  window.openGlobalProfileModal = function () {
    const dd = document.getElementById('topUserDropdown');
    if (dd) dd.classList.remove('active');

    let modal = document.getElementById('globalProfileModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'globalProfileModal';
      modal.className = 'global-profile-backdrop';
      modal.innerHTML = `
        <div class="global-profile-box">
          <div class="global-profile-header">
            <h3><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #0284c7;"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Configurações da Conta / Meu Perfil</h3>
            <button type="button" class="global-profile-close" onclick="closeGlobalProfileModal()">&times;</button>
          </div>
          <form id="globalProfileForm" onsubmit="handleGlobalProfileSubmit(event)">
            <div class="global-profile-body">
              <div id="globalProfileError" class="global-profile-error"></div>
              
              <div style="margin-bottom: 16px;">
                <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Usuário de Acesso (Login)</label>
                <input type="text" id="globalProfileUsername" required style="width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; box-sizing: border-box; outline: none;">
              </div>

              <div style="margin-bottom: 16px;">
                <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Nova Senha</label>
                <input type="password" id="globalProfilePassword" placeholder="Deixe em branco para manter a senha atual" autocomplete="new-password" style="width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; box-sizing: border-box; outline: none;">
                <small style="display: block; font-size: 11px; color: #64748b; margin-top: 4px;">Mínimo 6 caracteres caso queira alterar.</small>
              </div>

              <div style="margin-bottom: 8px;">
                <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Confirmar Nova Senha</label>
                <input type="password" id="globalProfilePasswordConfirm" placeholder="Confirme a nova senha" autocomplete="new-password" style="width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; box-sizing: border-box; outline: none;">
              </div>
            </div>
            <div class="global-profile-footer">
              <button type="button" class="btn-action" onclick="closeGlobalProfileModal()" style="padding: 8px 16px; border: 1px solid #cbd5e1; background: #fff; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">Cancelar</button>
              <button type="submit" id="btnSalvarGlobalProfile" style="padding: 8px 18px; border: none; background: #0284c7; color: #fff; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">Salvar Alterações</button>
            </div>
          </form>
        </div>
      `;
      document.body.appendChild(modal);
    }

    const u = getUserSession();
    const unameInput = document.getElementById('globalProfileUsername');
    if (unameInput && u) unameInput.value = u.username || '';
    const pwdInput = document.getElementById('globalProfilePassword');
    if (pwdInput) pwdInput.value = '';
    const pwdConf = document.getElementById('globalProfilePasswordConfirm');
    if (pwdConf) pwdConf.value = '';
    const errBox = document.getElementById('globalProfileError');
    if (errBox) errBox.style.display = 'none';

    modal.classList.add('active');
  };

  window.closeGlobalProfileModal = function () {
    const modal = document.getElementById('globalProfileModal');
    if (modal) modal.classList.remove('active');
  };

  window.handleGlobalProfileSubmit = async function (e) {
    e.preventDefault();
    const errBox = document.getElementById('globalProfileError');
    const saveBtn = document.getElementById('btnSalvarGlobalProfile');
    const username = document.getElementById('globalProfileUsername').value.trim();
    const password = document.getElementById('globalProfilePassword').value;
    const confirm = document.getElementById('globalProfilePasswordConfirm').value;
    const token = localStorage.getItem('token');

    if (password && password.length < 6) {
      errBox.textContent = 'A nova senha deve ter no mínimo 6 caracteres.';
      errBox.style.display = 'block';
      return;
    }

    if (password && password !== confirm) {
      errBox.textContent = 'A confirmação de senha não coincide com a nova senha digitada.';
      errBox.style.display = 'block';
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Salvando...';
    errBox.style.display = 'none';

    try {
      const base = getAppBasePath();
      const res = await fetch((base || '') + '/cds/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao atualizar perfil.');

      if (data.token) localStorage.setItem('token', data.token);
      if (data.user) localStorage.setItem('user', JSON.stringify(data.user));

      alert('Perfil atualizado com sucesso!');
      closeGlobalProfileModal();

      // Atualiza na interface
      const u = getUserSession();
      if (u) {
        const displayName = u.name || u.username;
        const initials = getInitials(displayName);
        const sAvatar = document.getElementById('sidebarAvatar');
        if (sAvatar) sAvatar.textContent = initials;
        const sName = document.getElementById('sidebarUserName');
        if (sName) sName.textContent = displayName;
        const tAvatar = document.getElementById('topUserAvatar');
        if (tAvatar) tAvatar.textContent = initials;
        const tName = document.getElementById('topUserName');
        if (tName) tName.textContent = displayName;
      }
    } catch (err) {
      errBox.textContent = err.message;
      errBox.style.display = 'block';
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Salvar Alterações';
    }
  };

  function ensureTopNavTabs() {
    const topBar = document.querySelector('.top-dashboard-bar');
    if (!topBar) return;

    // Remove elementos obsoletos
    topBar.querySelectorAll('.top-status-badge, #apiSyncBadge, #navbarSecName, .top-breadcrumb').forEach(el => el.remove());

    const base = getAppBasePath();
    const currentPath = window.location.pathname.toLowerCase();
    const isHub = currentPath === (base + '/') || currentPath === (base || '/') || currentPath.endsWith('/hub/index.html') || currentPath === (base + '/hub') || currentPath === '/' || currentPath === '/gse' || currentPath === '/gse/';
    const isCds = currentPath.includes('/cds');
    const isSigem = currentPath.includes('/sigem') || currentPath.includes('/enderecos');
    const isApi = currentPath.includes('/api') || currentPath.includes('/docs');
    const isUsuarios = currentPath.includes('/admin/usuarios') || currentPath.includes('/usuarios');
    const isConfig = currentPath.includes('/admin/configuracoes') || currentPath.includes('/configuracoes');

    const user = getUserSession();
    const isAdmin = user && user.role === 'admin';
    const displayName = user ? (user.name || user.username) : 'Administrador Master';
    const displayRole = user ? (user.role === 'admin' ? 'MASTER' : 'GESTOR') : 'MASTER';
    const initials = getInitials(displayName);

    let center = topBar.querySelector('.top-bar-center');
    if (!center) {
      center = document.createElement('nav');
      center.className = 'top-bar-center';
      center.setAttribute('aria-label', 'Navegação rápida de módulos');
      topBar.appendChild(center);
    }

    center.innerHTML = `
      <div class="top-nav-tabs">
        <a href="${base}/" class="top-nav-tab ${isHub ? 'active' : ''}" id="topTabHub" title="Ir para o Início / Hub Geral">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <span>Início (GSE Hub)</span>
        </a>
        <a href="${base}/cds/dashboard.html" class="top-nav-tab ${isCds ? 'active' : ''}" id="topTabCds" title="Ir para a Carta de Serviços">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
          <span>Carta de Serviços</span>
        </a>
        <a href="${base}/sigem/" class="top-nav-tab ${isSigem ? 'active' : ''}" id="topTabSigem" title="Ir para o SIGEM — Endereços e Mapa Oficial">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" x2="9" y1="3" y2="18"/><line x1="15" x2="15" y1="6" y2="21"/></svg>
          <span>Endereços &amp; Mapa</span>
        </a>
        <a href="${base}/docs" class="top-nav-tab ${isApi ? 'active' : ''}" id="topTabApi" title="Portal do Desenvolvedor &amp; API Oficial">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
          <span>API &amp; Docs</span>
        </a>
        ${isAdmin ? `
        <a href="${base}/admin/usuarios" class="top-nav-tab ${isUsuarios ? 'active' : ''}" id="topTabUsuarios" title="Gestão de Usuários e Operadores">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <span>Usuários</span>
        </a>
        <a href="${base}/admin/configuracoes" class="top-nav-tab ${isConfig ? 'active' : ''}" id="topTabConfig" title="Configurações e Parâmetros Globais do Sistema">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          <span>Configurações</span>
        </a>
        ` : ''}
      </div>
    `;

    // Garante a área da direita com o Perfil e Dropdown
    let right = topBar.querySelector('.top-bar-right');
    if (!right) {
      right = document.createElement('div');
      right.className = 'top-bar-right';
      topBar.appendChild(right);
    }

    right.innerHTML = `
      <div class="top-user-pill" id="topUserPill" onclick="toggleUserDropdown(event)" title="Clique para gerenciar sua conta e perfil">
        <div class="top-user-avatar" id="topUserAvatar">${initials}</div>
        <div class="top-user-info">
          <span class="top-user-name" id="topUserName">${displayName}</span>
          <span class="top-user-badge ${displayRole === 'MASTER' ? 'badge-master' : 'badge-gestor'}" id="topUserRole">${displayRole}</span>
        </div>
        <svg class="top-user-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </div>

      <div class="top-user-dropdown" id="topUserDropdown">
        <div class="top-dropdown-header">
          <div class="top-dropdown-name">${displayName}</div>
          <div class="top-dropdown-sec">${user ? (user.secretariaNome || 'Administração Central') : 'Prefeitura Municipal'}</div>
        </div>
        <div class="top-dropdown-body">
          <button type="button" class="top-dropdown-item" onclick="openGlobalProfileModal()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span>Meu Perfil / Alterar Senha</span>
          </button>
          ${isAdmin ? `
          <a href="${base}/admin/usuarios" class="top-dropdown-item">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span>Gestão de Usuários</span>
          </a>
          <a href="${base}/admin/configuracoes" class="top-dropdown-item">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <span>Configurações do Sistema</span>
          </a>
          ` : ''}
          <div class="top-dropdown-divider"></div>
          <button type="button" class="top-dropdown-item top-dropdown-item-logout" onclick="pmdcLogout()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span>Encerrar Sessão</span>
          </button>
        </div>
      </div>
    `;
  }

  function prefixInternalLinks() {
    const base = getAppBasePath();

    // Garante favicon oficial PMDC em todas as telas
    if (!document.querySelector('link[rel="icon"]')) {
      const link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/png';
      link.href = `${base || ''}/shared/logo.png`;
      document.head.appendChild(link);
    }

    // Atualiza marca e brasão oficial PMDC na Sidebar
    const brandBox = document.querySelector('.sidebar-brand-box');
    if (brandBox) {
      brandBox.setAttribute('href', (base || '') + '/');
      const brandTitle = brandBox.querySelector('.sidebar-app-title');
      if (brandTitle && !brandTitle.textContent.includes('GSE')) {
        brandTitle.textContent = 'PORTAL GSE';
      }
      const logoBadge = brandBox.querySelector('.sidebar-logo-badge');
      if (logoBadge && !logoBadge.querySelector('img')) {
        logoBadge.innerHTML = `<img src="${base || ''}/shared/logo.png" alt="Brasão PMDC" class="sidebar-logo-img">`;
      }
    }

    // Prefixa links da Sidebar e do Conteúdo se começarem com '/' mas sem prefixo base
    document.querySelectorAll('a[href]').forEach(a => {
      let href = a.getAttribute('href');
      if (!href) return;
      if (href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;

      // Normaliza /sigem e ${base}/sigem para sempre conter barra final / evitando 301 do Nginx
      if (href === '/sigem' || (base && href === base + '/sigem')) {
        a.setAttribute('href', (base ? base + '/sigem/' : '/sigem/'));
        return;
      }

      if (base && href.startsWith('/') && !href.startsWith(base)) {
        let newHref = base + href;
        if (newHref === base + '/sigem' || newHref === base + '/sigem/') {
          newHref = base + '/sigem/';
        }
        a.setAttribute('href', newHref);
      }
    });
  }

  function renderUnifiedSidebar(menuScroll, base, user) {
    if (!menuScroll) return;
    const p = window.location.pathname.toLowerCase();
    const isHub = p === (base + '/') || p === (base || '/') || p.endsWith('/hub/index.html') || p === (base + '/hub') || p === '/' || p === '/gse' || p === '/gse/';
    const isCds = p.includes('/cds');
    const isSigem = p.includes('/sigem') || p.includes('/enderecos');
    const isApi = p.includes('/api') || p.includes('/docs');
    const isUsuarios = p.includes('/admin/usuarios');
    const isConfig = p.includes('/admin/configuracoes');

    const isAdmin = user && user.role === 'admin';

    menuScroll.innerHTML = `
      <div class="sidebar-section-header">MÓDULOS DO SISTEMA</div>
      <a href="${base}/" class="sidebar-nav-item ${isHub ? 'active' : ''}" title="Início — Painel Geral GSE">
        <div class="nav-icon-box"><i class="ri-home-4-line"></i></div>
        <div class="nav-text-box">
          <span class="nav-main-title">Início (GSE Hub)</span>
          <span class="nav-sub-title">Visão Geral &amp; Indicadores</span>
        </div>
      </a>

      <a href="${base}/cds/dashboard.html" class="sidebar-nav-item ${isCds ? 'active' : ''}" title="Carta de Serviços ao Cidadão">
        <div class="nav-icon-box"><i class="ri-file-list-3-line"></i></div>
        <div class="nav-text-box">
          <span class="nav-main-title">Carta de Serviços</span>
          <span class="nav-sub-title">Catálogo Municipal</span>
        </div>
      </a>

      <a href="${base}/sigem/" class="sidebar-nav-item ${isSigem ? 'active' : ''}" title="SIGEM — Endereços e Mapa Oficial">
        <div class="nav-icon-box"><i class="ri-map-pin-line"></i></div>
        <div class="nav-text-box">
          <span class="nav-main-title">Endereços &amp; Mapa</span>
          <span class="nav-sub-title">SIGEM Municipal</span>
        </div>
      </a>

      ${isSigem ? `
      <div style="margin-left: 14px; border-left: 2px solid rgba(255,255,255,0.12); padding-left: 8px; display: flex; flex-direction: column; gap: 2px;">
        <a href="${base}/sigem/#equipamentos" class="sidebar-nav-item" onclick="if(window.navigateTab){ window.navigateTab('equipamentos', this); return false; }" style="padding: 6px 8px; font-size: 11.5px;">
          <div class="nav-icon-box" style="font-size: 13px;"><i class="ri-government-line"></i></div>
          <div class="nav-text-box"><span class="nav-main-title" style="font-size: 11.5px;">Equipamentos Públicos</span></div>
        </a>
        <a href="${base}/sigem/#hubs" class="sidebar-nav-item" onclick="if(window.navigateTab){ window.navigateTab('hubs', this); return false; }" style="padding: 6px 8px; font-size: 11.5px;">
          <div class="nav-icon-box" style="font-size: 13px;"><i class="ri-building-line"></i></div>
          <div class="nav-text-box"><span class="nav-main-title" style="font-size: 11.5px;">Prédios Compartilhados</span></div>
        </a>
        <a href="${base}/sigem/#mapa" class="sidebar-nav-item" onclick="if(window.navigateTab){ window.navigateTab('mapa', this); return false; }" style="padding: 6px 8px; font-size: 11.5px;">
          <div class="nav-icon-box" style="font-size: 13px;"><i class="ri-map-2-line"></i></div>
          <div class="nav-text-box"><span class="nav-main-title" style="font-size: 11.5px;">Mapa Interativo</span></div>
        </a>
        <a href="${base}/sigem/#relatorios" class="sidebar-nav-item" onclick="if(window.navigateTab){ window.navigateTab('relatorios', this); return false; }" style="padding: 6px 8px; font-size: 11.5px;">
          <div class="nav-icon-box" style="font-size: 13px;"><i class="ri-bar-chart-box-line"></i></div>
          <div class="nav-text-box"><span class="nav-main-title" style="font-size: 11.5px;">Indicadores &amp; Planilhas</span></div>
        </a>
      </div>
      ` : ''}

      <a href="${base}/docs" class="sidebar-nav-item ${isApi ? 'active' : ''}" title="Portal do Desenvolvedor &amp; API Oficial">
        <div class="nav-icon-box"><i class="ri-code-s-slash-line"></i></div>
        <div class="nav-text-box">
          <span class="nav-main-title">API &amp; Desenvolvedores</span>
          <span class="nav-sub-title">Documentação &amp; Chaves</span>
        </div>
      </a>

      ${isAdmin ? `
      <div class="sidebar-section-header" style="margin-top: 10px;">ADMINISTRAÇÃO</div>
      <a href="${base}/admin/usuarios" class="sidebar-nav-item ${isUsuarios ? 'active' : ''}" title="Gestão de Usuários e Operadores">
        <div class="nav-icon-box"><i class="ri-user-settings-line"></i></div>
        <div class="nav-text-box">
          <span class="nav-main-title">Gestão de Usuários</span>
          <span class="nav-sub-title">Operadores &amp; Secretarias</span>
        </div>
      </a>
      <a href="${base}/admin/configuracoes" class="sidebar-nav-item ${isConfig ? 'active' : ''}" title="Configurações e Parâmetros do Sistema">
        <div class="nav-icon-box"><i class="ri-settings-3-line"></i></div>
        <div class="nav-text-box">
          <span class="nav-main-title">Configurações</span>
          <span class="nav-sub-title">Parâmetros, SMTP &amp; Auditoria</span>
        </div>
      </a>
      ` : ''}
    `;
  }

  function initPmdcLayout() {
    const sidebar = document.getElementById('sidebarNav');
    if (sidebar) {
      const isSavedCollapsed = localStorage.getItem('pmdc_sidebar_collapsed') === 'true';
      if (isSavedCollapsed) {
        sidebar.classList.add('collapsed');
      }
    }

    const user = getUserSession();
    const displayName = user ? (user.name || user.username) : 'Administrador Master';
    const displayRole = user ? (user.role === 'admin' ? 'MASTER' : 'GESTOR') : 'MASTER';
    const initials = getInitials(displayName);

    // Renderiza o menu lateral padronizado e unificado em 100% das páginas (g3, g4, g5)
    const base = getAppBasePath();
    const menuScroll = document.querySelector('.sidebar-menu-scroll');
    if (menuScroll) {
      renderUnifiedSidebar(menuScroll, base, user);
    }

    // Injeta / Garante as abas no topo para modo mobile/tablet
    ensureTopNavTabs();

    // Prefixa links se sob /gse
    prefixInternalLinks();

    // Atualiza elementos da Sidebar se existirem
    const sCard = document.querySelector('.sidebar-user-card');
    if (sCard) {
      sCard.style.cursor = 'pointer';
      sCard.setAttribute('title', 'Clique para ver seu perfil / alterar senha');
      sCard.onclick = window.openGlobalProfileModal;
    }

    const sAvatar = document.getElementById('sidebarAvatar');
    if (sAvatar) sAvatar.textContent = initials;

    const sName = document.getElementById('sidebarUserName');
    if (sName) sName.textContent = displayName;

    const sRole = document.getElementById('sidebarUserRole');
    if (sRole) sRole.textContent = displayRole;

    // Atualiza elementos da Topbar se existirem
    const tAvatar = document.getElementById('topUserAvatar');
    if (tAvatar) tAvatar.textContent = initials;

    const tName = document.getElementById('topUserName');
    if (tName) tName.textContent = displayName;

    const tRole = document.getElementById('topUserRole');
    if (tRole) tRole.textContent = displayRole;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPmdcLayout);
  } else {
    initPmdcLayout();
  }
})();
