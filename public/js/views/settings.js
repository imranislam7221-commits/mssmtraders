/* ---------- settings (all roles) ---------- */
VIEWS.settings = async function () {
  if (!isOwner()) { location.hash = '#/dashboard'; return; }
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  const { settings: s } = await api('/settings');
  const gSync = s.google_sync || {};

  layout(`
    <div class="page-head">
      <div>
        <h1>${isBn ? 'দোকান ও সিস্টেম সেটিংস' : 'Settings'}</h1>
        <div class="sub">${isBn ? 'দোকানের প্রোফাইল, মেমো হেড, গুগল ড্রাইভ/শিট ক্লাউড ব্যাকআপ ও এসএমএস গেটওয়ে' : 'Shop profile, memo header, Google Drive/Sheet backup & SMS configuration'}</div>
      </div>
    </div>

    <!-- Shop Profile & Memo Header -->
    <div class="card">
      <h3>🏪 দোকানের প্রোফাইল</h3>
      <form id="setform">
        <div class="grid g2">
          <div><label>দোকানের নাম</label><input name="shop_name" value="${esc(s.shop_name)}"></div>
          <div><label>ফোন</label><input name="shop_phone" value="${esc(s.shop_phone)}"></div>
        </div>
        <label>ঠিকানা</label><input name="shop_address" value="${esc(s.shop_address)}">
        <div class="grid g2">
          <div><label>ডিফল্ট ভ্যাট %</label><input name="vat_percent" type="number" step="0.01" value="${s.vat_percent || 0}"></div>
          <div><label>শুরুর নগদ টাকা (Opening Cash)</label><input name="opening_cash" type="number" step="0.01" value="${s.opening_cash || 0}"></div>
        </div>
        <label>মালিকের SMS নম্বর (বিক্রি/বাকি/কেনা সব লেনদেনের খবর এই নম্বরে যাবে)</label><input name="notify_number" value="${esc(s.notify_number || '')}" placeholder="01XXXXXXXXX">

        <h3 style="margin-top:20px">🧾 মেমো হেড (প্রিন্ট রিসিটের উপরে যা দেখাবে)</h3>
        <div class="grid g3">
          <div><label>লোগো টেক্সট (MST ছোট বক্স)</label><input name="memo_logo" value="${esc(s.memo_logo || '')}" placeholder="MST"></div>
          <div><label>মেমো টাইটেল (বড় বাংলা নাম)</label><input name="memo_title_line" value="${esc(s.memo_title_line || '')}" placeholder="মেসার্স এম.এস ট্রেডার্স"></div>
          <div><label>প্রো লাইন (প্রো: XXX)</label><input name="memo_pro_line" value="${esc(s.memo_pro_line || '')}" placeholder="প্রোঃ মুনজুর আহমেদ"></div>
        </div>
        <label>ট্রেড লাইন (কী বিক্রি হয় — এক লাইনে)</label><input name="memo_trade_line" value="${esc(s.memo_trade_line || '')}" placeholder="এখানে রড, সিমেন্ট, ইট, বালি, খোয়া জাতীয় নির্মাণ সামগ্রী সুলভ মূল্যে বিক্রয় করা হয়।">
        <label>মেমো ঠিকানা লাইন</label><input name="memo_address_line" value="${esc(s.memo_address_line || '')}" placeholder="সোসাইটি পুরাতন মার্কেট, পুরাতন বাজার, দর্শনা, চুয়াডাঙ্গা।">
        <label>মোবাইল ব্যানার (নীল বক্সে যাবে)</label><input name="memo_mobile_line" value="${esc(s.memo_mobile_line || '')}" placeholder="মোবাইল: ০১৯৫৬-২২৬৪৬৫, ০১৭৪৮-১৫২০৩৬">
        <label>ধন্যবাদ পিল (নীল ছোট বক্স)</label><input name="memo_footer_note" value="${esc(s.memo_footer_note || '')}" placeholder="এম.এস ট্রেডার্স এর মাল ক্রয় করার জন্য আপনাকে ধন্যবাদ">
        <label>রিসিট হেড (মাল্টি-লাইন — অতিরিক্ত লাইন)</label><textarea name="receipt_header" rows="2" placeholder="লাইন ১: ট্রেড লাইসেন্স ইত্যাদি">${esc(s.receipt_header || '')}</textarea>
        <label>রিসিট ফুট (মাল্টি-লাইন — বাকির নোটিশ ইত্যাদি)</label><textarea name="receipt_footer" rows="2" placeholder="লাইন ১: কেনা মাল ফেরত চলবে না">${esc(s.receipt_footer || '')}</textarea>

        <h3 style="margin-top:20px">📨 MiMSMS এসএমএস গেটওয়ে</h3>
        <div class="grid g3">
          <div><label>এপিআই কী</label><input name="api_key" value="${esc(s.mimsms && s.mimsms.api_key)}" placeholder="YOUR_MIMSMS_API_KEY"></div>
          <div><label>প্যানেল ইমেইল (userName)</label><input name="user_name" value="${esc(s.mimsms && s.mimsms.user_name)}" placeholder="YOUR_MIMSMS_PANEL_EMAIL"></div>
          <div><label>সেন্ডার আইডি (senderName)</label><input name="sender_name" value="${esc(s.mimsms && s.mimsms.sender_name)}" placeholder="YOUR_APPROVED_SENDER_ID"></div>
        </div>
        <label>SMS টেমপ্লেট — অটো মেসেজ ({name} {total} {paid} {due} {shop})</label><textarea name="sms_template" rows="2">${esc(s.sms_template || 'Dear {name}, Total Bill: {total} tk. Paid: {paid} tk. Due: {due} tk. Thank you, {shop}.')}</textarea>
        <p style="font-size:12.5px;color:var(--mut);margin-top:8px">API কল যাবে <b>POST https://mimsms.com</b>, transactionType "T"। কী ফাঁকা থাকলে SMS বাদ যাবে।</p>
        <br><button class="btn pri">💾 মূল সেটিংস সেভ করুন</button>
      </form>
    </div>

    <!-- Google Drive & Google Sheet Cloud Backup -->
    <div class="card" style="margin-top:16px;border:1px solid rgba(59,130,246,0.3)">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <h3 style="margin:0;color:var(--brand2)">☁️ গুগল শিট ও গুগল ড্রাইভ ক্লাউড ব্যাকআপ (Google Sync)</h3>
        <span class="badge ${gSync.last_sync ? 'green' : 'gray'}" style="font-size:12px">
          ${gSync.last_sync ? 'সর্বশেষ সিঙ্ক: ' + fmtDate(gSync.last_sync) : 'এখনো সিঙ্ক করা হয়নি'}
        </span>
      </div>
      <p style="font-size:13.5px;color:var(--mut);margin:8px 0 16px 0">
        আপনার জিমেইল একাউন্টের গুগল শিট ও গুগল ড্রাইভে স্বয়ংক্রিয়ভাবে সকল বিক্রি, খরচ, কাস্টমার ও স্টকের ব্যাকআপ ফাইল সিঙ্ক হবে। নতুন যেকোনো মোবাইল, কম্পিউটার বা ল্যাপটপে এই সফটওয়্যার খুললেই এক ক্লিকে সব ডাটা ফিরে পাবেন।
      </p>

      <form id="googlesyncform">
        <label>গুগল শিট / ড্রাইভ ওয়েবহুক লিঙ্ক (Google Apps Script Web App URL)</label>
        <input name="google_webhook_url" value="${esc(gSync.webhook_url || '')}" placeholder="https://script.google.com/macros/s/AKfycb.../exec" style="font-family:monospace;font-size:13px">

        <div style="margin:12px 0">
          <label style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;font-weight:600">
            <input type="checkbox" name="google_auto_sync" ${gSync.auto_sync ? 'checked' : ''} style="width:18px;height:18px">
            <span>ইন্টারনেট থাকলে বিক্রয় বা খরচের পর স্বয়ংক্রিয় ক্লাউড ব্যাকআপ পাঠান (Auto-sync)</span>
          </label>
        </div>

        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px">
          <button type="submit" class="btn pri">💾 গুগল কনফিগ সেভ করুন</button>
          <button type="button" id="btnGoogleSyncNow" class="btn sec" style="background:#0284c7;color:#fff;border-color:#0284c7">☁️ এখনই ব্যাকআপ পাঠান (Push to Google)</button>
          <button type="button" id="btnGooglePullNow" class="btn sec" style="background:#059669;color:#fff;border-color:#059669">📥 গুগল ড্রাইভ থেকে রিস্টোর আনুন (Pull from Google)</button>
        </div>
      </form>
    </div>

    <!-- Local Offline Backup & Restore -->
    <div class="card" style="margin-top:16px">
      <h3>💾 লোকাল অফলাইন ব্যাকআপ ও ফাইল রিস্টোর</h3>
      <p style="font-size:13.5px;color:var(--mut);margin:8px 0 16px 0">
        ইন্টারনেট না থাকলেও আপনার সকল ডাটা সম্পূর্ণ নিরাপদে আপনার কম্পিউটারের লোকাল ড্রাইভে (<code style="background:var(--card2);padding:2px 6px;border-radius:4px">data/db.json</code>) জমা হচ্ছে। চাইলে যেকোনো সময় সম্পূর্ণ ডাটাবেজ ফাইল ডাউনলোড করে পেনড্রাইভে রাখতে পারেন।
      </p>
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
        <button id="btnDownloadBackup" class="btn sec">📥 ডাটাবেজ ব্যাকআপ ফাইল ডাউনলোড (.json)</button>
        <label class="btn sec" style="cursor:pointer;margin:0">
          📤 ব্যাকআপ ফাইল থেকে রিস্টোর করুন
          <input type="file" id="fileRestore" accept=".json" style="display:none">
        </label>
      </div>
    </div>

    <!-- PWA Install Guide -->
    <div class="card" style="margin-top:16px;background:rgba(30,58,138,0.1);border:1px solid rgba(59,130,246,0.25)">
      <h3 style="color:var(--brand2)">📱 মোবাইল / কম্পিউটার / ম্যাক অ্যাপ ইনস্টলেশন (PWA)</h3>
      <p style="font-size:13.5px;color:var(--mut);margin:8px 0 12px 0">
        এই সিস্টেমটি আধুনিক প্রোগ্রেসিভ ওয়েব অ্যাপ (PWA) হিসেবে তৈরি। আপনি সরাসরি ফোনের হোম স্ক্রিনে বা পিসিতে কোনো আলাদা সেটআপ ফাইল ছাড়াই অ্যাপ হিসেবে ইনস্টল করতে পারবেন:
      </p>
      <ul style="font-size:13.5px;line-height:1.7;margin-left:20px;color:var(--fg)">
        <li><b>অ্যান্ড্রয়েড ফোন (Chrome):</b> ব্রাউজারের উপরে ৩-ডট মেনুতে চাপ দিয়ে <b>"Add to Home screen"</b> বা <b>"Install app"</b> চাপুন।</li>
        <li><b>আইফোন / আইপ্যাড (Safari):</b> নিচে শেয়ার আইকনে (Share icon) চাপ দিয়ে <b>"Add to Home Screen"</b> চাপুন।</li>
        <li><b>উইন্ডোজ পিসি ও ম্যাক (Chrome / Edge):</b> ব্রাউজারের অ্যাড্রেস বারের ডানপাশে <b>⊕ ইনস্টল (Install)</b> আইকনে চাপুন।</li>
      </ul>
      <div style="margin-top:12px" id="pwaInstallBox">
        <button id="btnPwaInstall" class="btn pri" style="display:none">📲 এখনই এই ডিভাইসে অ্যাপ ইনস্টল করুন</button>
      </div>
    </div>
  `);

  // Shop settings submit
  const f = $('#setform');
  f.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      await api('/settings', {
        method: 'PUT',
        body: {
          shop_name: f.shop_name.value, shop_phone: f.shop_phone.value, shop_address: f.shop_address.value,
          vat_percent: f.vat_percent.value, opening_cash: f.opening_cash.value, notify_number: f.notify_number.value,
          receipt_header: f.receipt_header.value, receipt_footer: f.receipt_footer.value,
          memo_logo: f.memo_logo.value, memo_title_line: f.memo_title_line.value, memo_pro_line: f.memo_pro_line.value,
          memo_trade_line: f.memo_trade_line.value, memo_address_line: f.memo_address_line.value,
          memo_mobile_line: f.memo_mobile_line.value, memo_footer_note: f.memo_footer_note.value,
          mimsms: { api_key: f.api_key.value, user_name: f.user_name.value, sender_name: f.sender_name.value }
        }
      });
      toast('মূল সেটিংস সফলভাবে সেভ হয়েছে ✅');
    } catch (ex) { toast(ex.message, true); }
  });

  // Google Sync Config submit
  const gf = $('#googlesyncform');
  gf.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      await api('/settings', {
        method: 'PUT',
        body: {
          google_sync: {
            webhook_url: gf.google_webhook_url.value.trim(),
            auto_sync: gf.google_auto_sync.checked
          }
        }
      });
      toast('গুগল সিঙ্ক কনফিগারেশন সেভ হয়েছে ✅');
    } catch (ex) { toast(ex.message, true); }
  });

  // Google Sync Now button
  $('#btnGoogleSyncNow').addEventListener('click', async () => {
    const url = gf.google_webhook_url.value.trim();
    if (!url) { toast('আগে গুগল ওয়েবহুক URL দিন', true); return; }
    const btn = $('#btnGoogleSyncNow');
    btn.disabled = true;
    btn.textContent = '⏳ সিঙ্ক হচ্ছে...';
    try {
      const res = await api('/backup/google/sync', { method: 'POST', body: { webhook_url: url } });
      toast(res.message || 'গুগল শিট ও ড্রাইভে ব্যাকআপ সফল হয়েছে ✅');
      VIEWS.settings();
    } catch (ex) {
      toast(ex.message, true);
    } finally {
      btn.disabled = false;
      btn.textContent = '☁️ এখনই ব্যাকআপ পাঠান (Push to Google)';
    }
  });

  // Google Pull Now button
  $('#btnGooglePullNow').addEventListener('click', async () => {
    const url = gf.google_webhook_url.value.trim();
    if (!url) { toast('আগে গুগল ওয়েবহুক URL দিন', true); return; }
    if (!confirm('সতর্কতা: গুগল ড্রাইভ থেকে ডাটা আনলে বর্তমান লোকাল ডাটা আপডেট হয়ে যাবে। আপনি কি নিশ্চিত?')) return;
    const btn = $('#btnGooglePullNow');
    btn.disabled = true;
    btn.textContent = '⏳ ডাটা আনা হচ্ছে...';
    try {
      const res = await api('/backup/google/pull', { method: 'POST', body: { webhook_url: url } });
      toast(res.message || 'গুগল থেকে সফলভাবে রিস্টোর হয়েছে ✅');
      setTimeout(() => location.reload(), 1200);
    } catch (ex) {
      toast(ex.message, true);
    } finally {
      btn.disabled = false;
      btn.textContent = '📥 গুগল ড্রাইভ থেকে রিস্টোর আনুন (Pull from Google)';
    }
  });

  // Download local JSON backup
  $('#btnDownloadBackup').addEventListener('click', async () => {
    try {
      const data = await api('/backup/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = dlUrl;
      a.download = `MS_Traders_Backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(dlUrl);
      toast('ব্যাকআপ ফাইল ডাউনলোড হয়েছে ✅');
    } catch (ex) { toast(ex.message, true); }
  });

  // Restore from local JSON file
  $('#fileRestore').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    if (!confirm(`আপনি কি "${file.name}" ব্যাকআপ ফাইলটি থেকে সিস্টেম রিস্টোর করতে চান?`)) {
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = async evt => {
      try {
        const json = JSON.parse(evt.target.result);
        const res = await api('/backup/restore', { method: 'POST', body: json });
        toast(res.message || 'ডাটা সফলভাবে রিস্টোর হয়েছে ✅');
        setTimeout(() => location.reload(), 1200);
      } catch (ex) {
        toast('রিস্টোর ব্যর্থ: ' + ex.message, true);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  // PWA Install prompt listener
  if (window.mstDeferredPrompt) {
    const pwaBtn = $('#btnPwaInstall');
    if (pwaBtn) {
      pwaBtn.style.display = 'inline-block';
      pwaBtn.addEventListener('click', async () => {
        window.mstDeferredPrompt.prompt();
        const { outcome } = await window.mstDeferredPrompt.userChoice;
        if (outcome === 'accepted') {
          pwaBtn.style.display = 'none';
        }
        window.mstDeferredPrompt = null;
      });
    }
  }
};
