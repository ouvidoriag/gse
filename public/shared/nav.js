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
    window.location.href = '/login';
  };

  // Alias para retrocompatibilidade
  window.simacLogout = window.pmdcLogout;

    function ensureTopNavTabs() {
    const topBar = document.querySelector('.top-dashboard-bar');
    if (!topBar) return;

    // Remove elementos redundantes da barra superior
    topBar.querySelectorAll('.top-bar-left, .top-bar-right, .top-status-badge, #apiSyncBadge, #navbarSecName, .top-user-pill, .top-breadcrumb').forEach(el => el.remove());

    const currentPath = window.location.pathname.toLowerCase();
    const isHub = currentPath === '/' || currentPath === '/hub' || currentPath.endsWith('/hub/index.html') || currentPath.endsWith('/');
    const isCds = currentPath.includes('/cds');
    const isSigem = currentPath.includes('/sigem') || currentPath.includes('/enderecos');
    const isApi = currentPath === '/api' || currentPath === '/api/' || currentPath.startsWith('/api') || currentPath.includes('/docs');

    let center = topBar.querySelector('.top-bar-center');
    if (!center) {
      center = document.createElement('nav');
      center.className = 'top-bar-center';
      center.setAttribute('aria-label', 'Navegação rápida de módulos');
      topBar.appendChild(center);
    }

    center.innerHTML = `
      <div class="top-nav-tabs">
        <a href="/" class="top-nav-tab ${isHub ? 'active' : ''}" id="topTabHub" title="Ir para o Início / Hub Geral">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <span>Início (Hub)</span>
        </a>
        <a href="/cds/dashboard.html" class="top-nav-tab ${isCds ? 'active' : ''}" id="topTabCds" title="Ir para a Carta de Serviços">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
          <span>Carta de Serviços</span>
        </a>
        <a href="/sigem" class="top-nav-tab ${isSigem ? 'active' : ''}" id="topTabSigem" title="Ir para o SIGEM — Endereços e Cartografia">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" x2="9" y1="3" y2="18"/><line x1="15" x2="15" y1="6" y2="21"/></svg>
          <span>Endereços &amp; GIS</span>
        </a>
        <a href="/api" class="top-nav-tab ${isApi ? 'active' : ''}" id="topTabApi" title="Portal do Desenvolvedor &amp; API Oficial">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
          <span>API &amp; Docs</span>
        </a>
      </div>
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

    // Injeta / Garante as 3 abas no topo em todas as páginas
    ensureTopNavTabs();

    // Atualiza elementos da Sidebar se existirem
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
