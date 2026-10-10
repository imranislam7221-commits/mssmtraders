/* ---------- login ---------- */
function renderLogin(err) {
  document.title = 'লগইন — মেসার্স এম.এস ট্রেডার্স';
  $('#app').innerHTML = `
  <div class="login-wrap"><div class="login-card">
    <div class="logo">🏗️</div>
    <h2>মেসার্স এম.এস ট্রেডার্স</h2>
    <div class="sub">রড, সিমেন্ট ও নির্মাণ সামগ্রী — পিওএস ও হিসাব সিস্টেম</div>
    <div style="text-align:center;margin-top:8px"><button class="btn sm" type="button" onclick="toggleLang()">🌐 বাংলা / English</button></div>
    <form id="loginform">
      <label>ইউজারনেম বা জিমেইল (Username / Gmail)</label><input name="email" type="text" required placeholder="mssmtradersdokan অথবা monjurahmed1984dsn@gmail.com" autocomplete="username">
      <label>পাসওয়ার্ড (Password)</label><input name="password" type="password" required placeholder="••••••••" autocomplete="current-password">
      ${err ? '<div class="err">' + esc(err) + '</div>' : ''}
      <br><button class="btn pri blk" type="submit">লগইন করুন →</button>
    </form>
    <div class="login-hint"><b>লগইন তথ্য:</b><br>🔑 ইউজারনেম: <b>mssmtradersdokan</b><br>📧 জিমেইল: <b>monjurahmed1984dsn@gmail.com</b><br>🔒 পাসওয়ার্ড: <b>Smtradersdokan</b></div>
  </div></div>`;
  if (window.applyLang) applyLang();
  $('#loginform').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    const btn = f.querySelector('button[type=submit]');
    if (btn) { btn.disabled = true; btn.dataset.old = btn.textContent; btn.textContent = '⏳ লগইন হচ্ছে...'; }
    const slow = setTimeout(function () {
      if (btn) btn.textContent = '⏳ সার্ভার জাগাচ্ছে... অপেক্ষা করুন (১ম বার ~১ মিনিট)';
    }, 4000);
    try {
      const d = await api('/login', { method: 'POST', body: { email: f.email.value, password: f.password.value } });
      clearTimeout(slow);
      S.token = d.token; S.user = d.user;
      localStorage.setItem('pos_token', S.token);
      location.hash = '#/dashboard';
      router();
    } catch (ex) {
      clearTimeout(slow);
      if (btn) { btn.disabled = false; btn.textContent = btn.dataset.old || 'Login →'; }
      const box = f.querySelector('.err');
      if (box) box.textContent = ex.message;
      else f.insertAdjacentHTML('afterbegin', '<div class="err">' + esc(ex.message) + '</div>');
    }
  });
}
async function logout() {
  try { await api('/logout', { method: 'POST' }); } catch (e) {}
  S.token = ''; S.user = null;
  localStorage.removeItem('pos_token');
  location.hash = '#/login';
  renderLogin();
}
