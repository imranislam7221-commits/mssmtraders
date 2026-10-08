/* ---------- settings (all roles) ---------- */
VIEWS.settings = async function () {
  if (!isOwner()) { location.hash = '#/dashboard'; return; }
  const { settings: s } = await api('/settings');
  layout(`
    <div class="page-head"><div><h1>Settings</h1><div class="sub">দোকানের প্রোফাইল, মেমো হেড, MiMSMS SMS গেটওয়ে কনফিগারেশন</div></div></div>
    <div class="card"><h3>🏪 দোকানের প্রোফাইল</h3><form id="setform">
      <div class="grid g2">
        <div><label>দোকানের নাম</label><input name="shop_name" value="${esc(s.shop_name)}"></div>
        <div><label>ফোন</label><input name="shop_phone" value="${esc(s.shop_phone)}"></div>
      </div>
      <label>ঠিকানা</label><input name="shop_address" value="${esc(s.shop_address)}">
      <div class="grid g2"><div><label>ডিফল্ট ভ্যাট %</label><input name="vat_percent" type="number" step="0.01" value="${s.vat_percent || 0}"></div><div><label>শুরুর নগদ টাকা (Opening Cash)</label><input name="opening_cash" type="number" step="0.01" value="${s.opening_cash || 0}"></div></div>
      <label>মালিকের SMS নম্বর (বিক্রি/বাকি/কেনা সব লেনদেনের খবর এই নম্বরে যাবে)</label><input name="notify_number" value="${esc(s.notify_number || '')}" placeholder="01XXXXXXXXX">
      <h3 style="margin-top:16px">🧾 মেমো হেড (প্রিন্ট রিসিটের উপরে যা দেখাবে)</h3>
      <div class="grid g3">
        <div><label>লোগো টেক্সট (MST ছোট বক্স)</label><input name="memo_logo" value="${esc(s.memo_logo || '')}" placeholder="MST"></div>
        <div><label>মেমো টাইটেল (বড় বাংলা নাম)</label><input name="memo_title_line" value="${esc(s.memo_title_line || '')}" placeholder="মেসার্স এস.এস ট্রেডার্স"></div>
        <div><label>প্রো লাইন (প্রো: XXX)</label><input name="memo_pro_line" value="${esc(s.memo_pro_line || '')}" placeholder="প্রো: মুনজুর আহমেদ"></div>
      </div>
      <label>ট্রেড লাইন (কী বিক্রি হয় — এক লাইনে)</label><input name="memo_trade_line" value="${esc(s.memo_trade_line || '')}" placeholder="এখানে রড, সিমেন্ট, ইট, বালি, খোয়া জাতীয় নির্মাণ সামগ্রী মূলত খুলনা বিক্রয় করা হয়।">
      <label>মেমো ঠিকানা লাইন</label><input name="memo_address_line" value="${esc(s.memo_address_line || '')}" placeholder="সেসাইট খুরাতন মার্কেট, খুরাতন বাজার, দক্ষিণ, চুয়াডাঙ্গা।">
      <label>মোবাইল ব্যানার (নীল বক্সে যাবে)</label><input name="memo_mobile_line" value="${esc(s.memo_mobile_line || '')}" placeholder="মোবাইল: ০১৭xxx-xxxxxx, ০১৯xx-xxxxxx">
      <label>ধন্যবাদ পিল (নীল ছোট বক্স)</label><input name="memo_footer_note" value="${esc(s.memo_footer_note || '')}" placeholder="এম.এস ট্রেডার্স এর মাল জ্বর করার জন্য আপনাকে ধন্যবাদ">
      <label>রিসিট হেড (মাল্টি-লাইন — প্রতি লাইন = প্রিন্টে এক লাইন)</label><textarea name="receipt_header" rows="2" placeholder="লাইন ১: ট্রেড লাইসেন্স ইত্যাদি">${esc(s.receipt_header || '')}</textarea>
      <label>রিসিট ফুট (মাল্টি-লাইন — বাকির নোটিশ ইত্যাদি)</label><textarea name="receipt_footer" rows="2" placeholder="লাইন ১: কেনা মাল ফেরত চলবে না">${esc(s.receipt_footer || '')}</textarea>
      <h3 style="margin-top:16px">📨 MiMSMS এসএমএস গেটওয়ে</h3>
      <div class="grid g3">
        <div><label>এপিআই কী</label><input name="api_key" value="${esc(s.mimsms.api_key)}" placeholder="YOUR_MIMSMS_API_KEY"></div>
        <div><label>প্যানেল ইমেইল (userName)</label><input name="user_name" value="${esc(s.mimsms.user_name)}" placeholder="YOUR_MIMSMS_PANEL_EMAIL"></div>
        <div><label>সেন্ডার আইডি (senderName)</label><input name="sender_name" value="${esc(s.mimsms.sender_name)}" placeholder="YOUR_APPROVED_SENDER_ID"></div>
      </div>
      <label>SMS টেমপ্লেট — অটো মেসেজ ({name} {total} {paid} {due} {shop})</label><textarea name="sms_template" rows="2">${esc(s.sms_template || 'Dear {name}, Total Bill: {total} tk. Paid: {paid} tk. Due: {due} tk. Thank you, {shop}.')}</textarea>
      <p style="font-size:12.5px;color:var(--mut);margin-top:8px">API কল যাবে <b>POST https://mimsms.com</b>, transactionType "T"। কী ফাঁকা থাকলে SMS বাদ যাবে।</p>
      <br><button class="btn pri">💾 সেটিংস সেভ করুন</button>
    </form></div>`);
  const f = $('#setform');
  f.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      await api('/settings', { method: 'PUT', body: { shop_name: f.shop_name.value, shop_phone: f.shop_phone.value, shop_address: f.shop_address.value, vat_percent: f.vat_percent.value, opening_cash: f.opening_cash.value, notify_number: f.notify_number.value, receipt_header: f.receipt_header.value, receipt_footer: f.receipt_footer.value,
        memo_logo: f.memo_logo.value, memo_title_line: f.memo_title_line.value, memo_pro_line: f.memo_pro_line.value, memo_trade_line: f.memo_trade_line.value, memo_address_line: f.memo_address_line.value, memo_mobile_line: f.memo_mobile_line.value, memo_footer_note: f.memo_footer_note.value,
        mimsms: { api_key: f.api_key.value, user_name: f.user_name.value, sender_name: f.sender_name.value } } });
      toast('সেটিংস সেভ হয়েছে ✅');
    } catch (ex) { toast(ex.message, true); }
  });
};
