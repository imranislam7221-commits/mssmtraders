const NAV = [
  { h: '#/dashboard', ico: '📊', label: 'Dashboard', bn: 'ড্যাশবোর্ড' },
  { h: '#/pos', ico: '🧾', label: 'POS / Billing', bn: 'বিক্রয় / বিলিং' },
  { h: '#/products', ico: '📦', label: 'Products', bn: 'পণ্য ও স্টক' },
  { h: '#/stock', ico: '📋', label: 'Stock Ledger', bn: 'স্টক খাতা' },
  { h: '#/customers', ico: '👥', label: 'Customers', bn: 'কাস্টমার হিসাব' },
  { h: '#/invoices', ico: '🗂️', label: 'Invoices', bn: 'ইনভয়েস তালিকা' },
  { h: '#/expenses', ico: '💸', label: 'Expenses', bn: 'খরচের খাতা' },
  { h: '#/incomes', ico: '💰', label: 'Other Income', bn: 'অন্যান্য আয়' },
  { h: '#/settings', ico: '⚙️', label: 'Settings', bn: 'সেটিংস' }
];
window.toggleMobileDrawer = function (force) {
  const sidebar = document.querySelector('.sidebar');
  const backdrop = document.getElementById('mobile-drawer-backdrop');
  if (!sidebar) return;
  const shouldOpen = force !== undefined ? !!force : !sidebar.classList.contains('open');
  if (shouldOpen) {
    sidebar.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
    document.body.classList.add('menu-open');
  } else {
    sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
    document.body.classList.remove('menu-open');
  }
};

function layout(inner) {
  const cur = location.hash || '#/dashboard';
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  const links = NAV.filter(n => !n.owner || isOwner()).map(n => '<a href="' + n.h + '" class="' + (cur === n.h ? 'active' : '') + '" onclick="toggleMobileDrawer(false)"><span class="ico">' + n.ico + '</span>' + (isBn ? n.bn : n.label) + '</a>').join('');
  document.title = 'মেসার্স এম.এস ট্রেডার্স — POS & Inventory';
  const roleTitle = isBn ? (S.user.role === 'owner' ? 'দোকানের মালিক' : (S.user.role === 'manager' ? 'ম্যানেজার' : esc(S.user.role))) : esc(S.user.role);

  const bottomQuickNav = [
    { h: '#/dashboard', ico: '📊', label: 'Home', bn: 'হোম' },
    { h: '#/pos', ico: '🧾', label: 'POS', bn: 'বিক্রয়' },
    { h: '#/products', ico: '📦', label: 'Products', bn: 'পণ্য' },
    { h: '#/customers', ico: '👥', label: 'Customers', bn: 'কাস্টমার' }
  ];

  const bottomLinks = bottomQuickNav.map(n => 
    '<a href="' + n.h + '" class="' + (cur === n.h ? 'active' : '') + '"><span class="ico">' + n.ico + '</span>' + (isBn ? n.bn : n.label) + '</a>'
  ).join('') + 
  `<a href="javascript:void(0)" class="menu-btn" onclick="toggleMobileDrawer(true)"><span class="ico">☰</span>${isBn ? 'মেনু' : 'Menu'}</a>`;

  $('#app').innerHTML = `
  <div class="topbar">
    <div class="topbar-left">
      <button type="button" class="topbar-btn" onclick="toggleMobileDrawer()" aria-label="Menu">☰</button>
      <div class="topbar-title">🏗️ মেসার্স এম.এস ট্রেডার্স</div>
    </div>
    <div class="topbar-right">
      <span id="offline-sync-badge" style="display:none;align-items:center;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600"></span>
      <button class="topbar-lang-btn" onclick="toggleLang()">🌐 ${isBn ? 'EN' : 'বাং'}</button>
    </div>
  </div>
  <div id="mobile-drawer-backdrop" class="drawer-backdrop" onclick="toggleMobileDrawer(false)"></div>
  <div class="layout">
    <aside class="sidebar">
      <div class="side-brand">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div class="t">🏗️ মেসার্স এম.এস ট্রেডার্স</div>
            <div class="s">রড, সিমেন্ট ও নির্মাণ সামগ্রী</div>
          </div>
          <button type="button" class="side-close-btn" onclick="toggleMobileDrawer(false)" aria-label="Close">✕</button>
        </div>
      </div>
      <nav class="nav">${links}</nav>
      <div class="side-user">
        <div class="nm">${esc(S.user.name)}</div>
        <div class="rl">${roleTitle} • ${esc(S.user.username || S.user.email)}</div>
        <button onclick="toggleLang()" style="background:#292524;color:#fbbf24">🌐 <span id="langlabel">${isBn ? 'English' : 'বাংলা'}</span></button>
        <button onclick="logout()">${isBn ? '🚪 লগআউট' : '🚪 Logout'}</button>
      </div>
    </aside>
    <main class="main">${inner}</main>
  </div>
  <nav class="bottomnav">${bottomLinks}</nav>`;
  if (window.applyLang) applyLang();
  if (window.MST_OFFLINE) window.MST_OFFLINE.updateStatus();
}
const VIEWS = {};
async function router() {
  const h = location.hash || '#/dashboard';
  if (!S.user) {
    if (S.token) {
      try {
        const d = await api('/me');
        S.user = d.user;
        try { localStorage.setItem('mst_cached_user', JSON.stringify(d.user)); } catch (_) {}
      } catch (e) {
        const cachedUser = localStorage.getItem('mst_cached_user');
        if (cachedUser && (!navigator.onLine || e.message.includes('fetch') || e.message.includes('Network') || e.message.includes('অফলাইন') || e.message.includes('503'))) {
          try { S.user = JSON.parse(cachedUser); } catch (_) {}
        } else {
          S.token = '';
          localStorage.removeItem('pos_token');
        }
      }
    }
    if (!S.user) {
      renderLogin();
      return;
    }
  }
  if (h === '#/login') {
    location.hash = '#/dashboard';
    return;
  }
  const fn = VIEWS[h.replace('#/', '')] || VIEWS.dashboard;
  try { await fn(); } catch (e) { toast(e.message, true); }
}
window.addEventListener('hashchange', router);
