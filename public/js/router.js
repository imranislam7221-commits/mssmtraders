const NAV = [
  { h: '#/dashboard', ico: '📊', label: 'Dashboard', bn: 'ড্যাশবোর্ড' },
  { h: '#/pos', ico: '🧾', label: 'POS / Billing', bn: 'বিক্রয় / বিলিং' },
  { h: '#/products', ico: '📦', label: 'Products', bn: 'পণ্য ও স্টক' },
  { h: '#/stock', ico: '📋', label: 'Stock Ledger', bn: 'স্টক খাতা' },
  { h: '#/customers', ico: '👥', label: 'Customers', bn: 'কাস্টমার হিসাব' },
  { h: '#/invoices', ico: '🗂️', label: 'Invoices', bn: 'ইনভয়েস তালিকা' },
  { h: '#/settings', ico: '⚙️', label: 'Settings', bn: 'সেটিংস' }
];
function layout(inner) {
  const cur = location.hash || '#/dashboard';
  const isBn = window.LANG === 'bn';
  const links = NAV.filter(n => !n.owner || isOwner()).map(n => '<a href="' + n.h + '" class="' + (cur === n.h ? 'active' : '') + '"><span class="ico">' + n.ico + '</span>' + (isBn ? n.bn : n.label) + '</a>').join('');
  document.title = 'মেসার্স এম.এস ট্রেডার্স — POS & Inventory';
  $('#app').innerHTML = `
  <div class="topbar"><div><div class="t">🏗️ মেসার্স এম.এস ট্রেডার্স</div></div><div class="who">${esc(S.user.name)} (${isBn && S.user.role === 'owner' ? 'মালিক' : esc(S.user.role)}) <button onclick="toggleLang()" style="background:none;border:1px solid #57534e;color:#fbbf24;border-radius:7px;padding:3px 8px;font-size:11px;cursor:pointer">🌐 ${isBn ? 'English' : 'বাংলা'}</button></div></div>
  <div class="layout">
    <aside class="sidebar">
      <div class="side-brand"><div class="t">🏗️ মেসার্স এম.এস ট্রেডার্স</div><div class="s">রড, সিমেন্ট ও নির্মাণ সামগ্রী</div></div>
      <nav class="nav">${links}</nav>
      <div class="side-user">
        <div class="nm">${esc(S.user.name)}</div>
        <div class="rl">${isBn && S.user.role === 'owner' ? 'দোকানের মালিক' : esc(S.user.role)} • ${esc(S.user.username || S.user.email)}</div>
        <button onclick="toggleLang()" style="background:#292524;color:#fbbf24">🌐 <span id="langlabel">${isBn ? 'English' : 'বাংলা'}</span></button>
        <button onclick="logout()">${isBn ? 'লগআউট ⏻' : 'Logout ⏻'}</button>
      </div>
    </aside>
    <main class="main">${inner}</main>
  </div>
  <nav class="bottomnav">${NAV.filter(n => !n.owner || isOwner()).slice(0, 5).map(n => '<a href="' + n.h + '" class="' + (cur === n.h ? 'active' : '') + '"><span class="ico">' + n.ico + '</span>' + (isBn ? n.bn : n.label).split(' ')[0] + '</a>').join('')}</nav>`;
  if (window.applyLang) applyLang();
}
const VIEWS = {};
async function router() {
  const h = location.hash || '#/dashboard';
  if (!S.user) {
    if (S.token) {
      try {
        const d = await api('/me');
        S.user = d.user;
      } catch (e) {
        S.token = '';
        localStorage.removeItem('pos_token');
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
