/* ---------- login ---------- */
function renderLogin(err) {
  document.title = 'Login — M/S S.M. Traders POS';
  $('#app').innerHTML = `
  <div class="login-wrap"><div class="login-card">
    <div class="logo">🔧</div>
    <h2>M/S S.M. Traders</h2>
    <div class="sub">POS & Inventory System — Login</div>
    <div style="text-align:center;margin-top:8px"><button class="btn sm" type="button" onclick="toggleLang()">🌐 বাংলা / English</button></div>
    <form id="loginform">
      <label>Email</label><input name="email" type="email" required placeholder="owner@shop.com" autocomplete="username">
      <label>Password</label><input name="password" type="password" required placeholder="••••••••" autocomplete="current-password">
      ${err ? '<div class="err">' + esc(err) + '</div>' : ''}
      <br><button class="btn pri blk" type="submit">Login →</button>
    </form>
    <div class="login-hint"><b>Demo logins:</b><br>👑 Owner: owner@shop.com / owner123<br>🧑‍💼 Manager: manager@shop.com / manager123</div>
  </div></div>`;
  if (window.applyLang) applyLang();
  $('#loginform').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    try {
      const d = await api('/login', { method: 'POST', body: { email: f.email.value, password: f.password.value } });
      S.token = d.token; S.user = d.user;
      localStorage.setItem('pos_token', S.token);
      location.hash = '#/dashboard';
    } catch (ex) { renderLogin(ex.message); }
  });
}
async function logout() { try { await api('/logout', { method: 'POST' }); } catch (e) {} S.token = ''; S.user = null; localStorage.removeItem('pos_token'); location.hash = '#/login'; }
