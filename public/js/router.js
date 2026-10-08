/* ---------- layout + router ---------- */
const NAV = [
  { h: '#/dashboard', ico: '📊', label: 'Dashboard' },
  { h: '#/pos', ico: '🧾', label: 'POS / Billing' },
  { h: '#/products', ico: '📦', label: 'Products' },
  { h: '#/stock', ico: '📋', label: 'Stock Ledger' },
  { h: '#/customers', ico: '👥', label: 'Customers' },
  { h: '#/invoices', ico: '🗂️', label: 'Invoices' },
  { h: '#/settings', ico: '⚙️', label: 'Settings' }
];
function layout(inner) {
  const cur = location.hash || '#/dashboard';
  const links = NAV.filter(n => !n.owner || isOwner()).map(n => '<a href="' + n.h + '" class="' + (cur === n.h ? 'active' : '') + '"><span class="ico">' + n.ico + '</span>' + n.label + '</a>').join('');
  document.title = 'M/S S.M. Traders — POS & Inventory';
  $('#app').innerHTML = `
  <div class="topbar"><div><div class="t">🔧 M/S S.M. Traders</div></div><div class="who">${esc(S.user.name)} (${esc(S.user.role)}) <button onclick="toggleLang()" style="background:none;border:1px solid #57534e;color:#fbbf24;border-radius:7px;padding:3px 8px;font-size:11px;cursor:pointer">🌐</button></div></div>
  <div class="layout">
    <aside class="sidebar">
      <div class="side-brand"><div class="t">🔧 M/S S.M. Traders</div><div class="s">POS & Inventory</div></div>
      <nav class="nav">${links}</nav>
      <div class="side-user"><div class="nm">${esc(S.user.name)}</div><div class="rl">${esc(S.user.role)} • ${esc(S.user.email)}</div><button onclick="toggleLang()" style="background:#292524;color:#fbbf24">🌐 <span id="langlabel">বাংলা</span></button>
      <button onclick="logout()">Logout ⏻</button></div>
    </aside>
    <main class="main">${inner}</main>
  </div>
  <nav class="bottomnav">${NAV.filter(n => !n.owner).slice(0, 5).map(n => '<a href="' + n.h + '" class="' + (cur === n.h ? 'active' : '') + '"><span class="ico">' + n.ico + '</span>' + n.label.split(' ')[0] + '</a>').join('')}</nav>`;
  if (window.applyLang) applyLang();
}
const VIEWS = {};
async function router() {
  if (!S.token) { renderLogin(); return; }
  if (!S.user) { try { const d = await api('/me'); S.user = d.user; } catch (e) { return; } }
  const h = location.hash || '#/dashboard';
  const fn = VIEWS[h.replace('#/', '')] || VIEWS.dashboard;
  try { await fn(); } catch (e) { toast(e.message, true); }
}
window.addEventListener('hashchange', router);
