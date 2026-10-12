/* ---------- other incomes (অন্যান্য আয়ের খাতা) ---------- */
VIEWS.incomes = async function () {
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  const { incomes } = await api('/incomes');
  window.__incomes = incomes || [];

  const todayStr = new Date().toISOString().slice(0, 10);
  const thisMonthStr = todayStr.slice(0, 7);

  const todayTotal = window.__incomes.filter(e => (e.date || e.timestamp).startsWith(todayStr)).reduce((s, e) => s + e.amount, 0);
  const monthTotal = window.__incomes.filter(e => (e.date || e.timestamp).startsWith(thisMonthStr)).reduce((s, e) => s + e.amount, 0);
  const grandTotal = window.__incomes.reduce((s, e) => s + e.amount, 0);

  const stats = `
    <div class="grid g3">
      <div class="stat due0">
        <div class="lab">💰 ${isBn ? 'আজকের অন্যান্য আয়' : "Today's Other Income"}</div>
        <div class="val" style="color:var(--green)">${money(todayTotal)}</div>
      </div>
      <div class="stat brand">
        <div class="lab">📅 ${isBn ? 'চলতি মাসের অন্যান্য আয়' : 'This Month Income'}</div>
        <div class="val">${money(monthTotal)}</div>
      </div>
      <div class="stat">
        <div class="lab">📈 ${isBn ? 'সর্বমোট অন্যান্য আয়' : 'Total Other Income'}</div>
        <div class="val">${money(grandTotal)}</div>
      </div>
    </div>`;

  const rows = renderIncomeRows(window.__incomes, isBn);

  layout(`
    <div class="page-head">
      <div>
        <h1>${isBn ? '💰 অন্যান্য আয়ের খাতা' : 'Other Income Ledger'}</h1>
        <div class="sub">${isBn ? 'কোম্পানি থেকে সরাসরি কাস্টমারে মালামাল (বালু, ইট ইত্যাদি) সরবরাহ লাভ, কোম্পানি কমিশন ও অন্যান্য আয়ের নির্ভুল হিসাব' : 'Track direct company-to-customer commissions, transport profit, incentives & miscellaneous earnings'}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <button class="btn grn" style="padding:10px 20px;font-size:14px;font-weight:700;box-shadow:0 4px 14px rgba(22,163,74,0.35);display:flex;align-items:center;gap:6px" onclick="openIncomeModal()">➕ ${isBn ? 'নতুন আয় যোগ করুন' : 'Add New Income'}</button>
      </div>
    </div>
    ${stats}
    <div class="pill-group" style="margin-top:12px;margin-bottom:10px">
      <button type="button" class="cat-pill active" id="icp-all" onclick="filterIncByCat('all')">🏷️ ${isBn ? 'সব আয়' : 'All'}</button>
      <button type="button" class="cat-pill" id="icp-supply" onclick="filterIncByCat('সরাসরি সরবরাহ লাভ (বালু/ইট ইত্যাদি)')">🚚 ${isBn ? 'সরাসরি সরবরাহ লাভ' : 'Direct Supply'}</button>
      <button type="button" class="cat-pill" id="icp-comm" onclick="filterIncByCat('কোম্পানি কমিশন / ইনসেন্টিভ')">🏢 ${isBn ? 'কোম্পানি কমিশন' : 'Commission'}</button>
      <button type="button" class="cat-pill" id="icp-trans" onclick="filterIncByCat('গাড়ি ভাড়া / পরিবহন লাভ')">🚛 ${isBn ? 'পরিবহন লাভ' : 'Transport'}</button>
      <button type="button" class="cat-pill" id="icp-labor" onclick="filterIncByCat('লেবার / লোডিং চার্জ লাভ')">👷 ${isBn ? 'লেবার চার্জ লাভ' : 'Labour Charge'}</button>
      <button type="button" class="cat-pill" id="icp-other" onclick="filterIncByCat('অন্যান্য লাভ / আয়')">📌 ${isBn ? 'অন্যান্য আয়' : 'Other'}</button>
    </div>
    <div class="card">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:12px">
        <input id="inc-search" placeholder="${isBn ? '🔍 বিবরণ / খাত / উৎস দিয়ে খুঁজুন…' : 'Search income…'}" style="max-width:280px" oninput="filterIncTable()">
        <input type="date" id="inc-from" onchange="filterIncTable()" title="${isBn ? 'শুরুর তারিখ' : 'From Date'}">
        <input type="date" id="inc-to" onchange="filterIncTable()" title="${isBn ? 'শেষ তারিখ' : 'To Date'}">
        <button class="btn sm" onclick="clearIncFilter()">${isBn ? 'রিসেট' : 'Reset'}</button>
        <button class="btn grn sm" onclick="openIncomeModal()" style="margin-left:auto">➕ ${isBn ? 'আয় লিখুন' : 'Add Income'}</button>
      </div>
      <div class="tblwrap">
        <table class="tbl" id="inctable">
          <thead>
            <tr>
              <th style="width:50px;text-align:center">${isBn ? 'ক্র. নং' : 'SL'}</th>
              <th>${isBn ? 'তারিখ' : 'Date'}</th>
              <th>${isBn ? 'আয়ের খাত' : 'Category'}</th>
              <th>${isBn ? 'উৎস / কার কাছ থেকে' : 'Received From / Source'}</th>
              <th>${isBn ? 'মাধ্যম' : 'Method'}</th>
              <th class="num">${isBn ? 'পরিমাণ (টাকা)' : 'Amount (Tk)'}</th>
              <th>${isBn ? 'এন্ট্রি করেছেন' : 'By'}</th>
              <th>${isBn ? 'অ্যাকশন' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody id="inc-tbody">
            ${rows}
          </tbody>
        </table>
      </div>
    </div>`);
};

function renderIncomeRows(list, isBn) {
  if (!list || !list.length) {
    return `<tr><td colspan="8" class="empty">${isBn ? 'কোনো আয়ের রেকর্ড পাওয়া যায়নি' : 'No income records found'}</td></tr>`;
  }
  return list.map((e, idx) => `
    <tr>
      <td class="c-sl" style="text-align:center;font-weight:600;color:var(--mut);width:50px">${isBn ? bnDigits(idx + 1) : (idx + 1)}</td>
      <td style="white-space:nowrap">${fmtDate(e.date || e.timestamp)}</td>
      <td><span class="badge in">💰 ${esc(e.category)}</span></td>
      <td>
        <b>${esc(e.received_from || '—')}</b>
        ${e.note ? `<br><small style="color:var(--mut)">${esc(e.note)}</small>` : ''}
      </td>
      <td><span class="badge mut">${esc(e.payment_method || (isBn ? 'নগদ' : 'Cash'))}</span></td>
      <td class="num due0" style="font-size:15px;color:var(--green)"><b>+ ${money(e.amount)}</b></td>
      <td><small>${esc(e.user_name || '—')}</small></td>
      <td style="white-space:nowrap">
        <button class="btn sm" onclick="viewIncomeReceipt(${e.id})" title="${isBn ? 'রসিদ / ভাউচার দেখুন' : 'View Voucher'}">🧾</button>
        ${isOwner() ? `<button class="btn sm dan" onclick="delIncome(${e.id})" title="${isBn ? 'মুছুন' : 'Delete'}">🗑️</button>` : ''}
      </td>
    </tr>`).join('');
}

let __curIncCat = 'all';

function filterIncByCat(cat) {
  __curIncCat = cat;
  document.querySelectorAll('.pill-group .cat-pill').forEach(b => {
    if (b.id && b.id.startsWith('icp-')) b.classList.remove('active');
  });
  const idMap = {
    'all': 'icp-all',
    'সরাসরি সরবরাহ লাভ (বালু/ইট ইত্যাদি)': 'icp-supply',
    'কোম্পানি কমিশন / ইনসেন্টিভ': 'icp-comm',
    'গাড়ি ভাড়া / পরিবহন লাভ': 'icp-trans',
    'লেবার / লোডিং চার্জ লাভ': 'icp-labor',
    'অন্যান্য লাভ / আয়': 'icp-other'
  };
  const btn = $('#' + (idMap[cat] || 'icp-all'));
  if (btn) btn.classList.add('active');
  filterIncTable();
}

function filterIncTable() {
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  const q = ($('#inc-search') ? $('#inc-search').value : '').toLowerCase().trim();
  const from = $('#inc-from') ? $('#inc-from').value : '';
  const to = $('#inc-to') ? $('#inc-to').value : '';

  let list = (window.__incomes || []).slice();

  if (__curIncCat && __curIncCat !== 'all') {
    list = list.filter(e => e.category === __curIncCat);
  }
  if (from) {
    list = list.filter(e => (e.date || e.timestamp).slice(0, 10) >= from);
  }
  if (to) {
    list = list.filter(e => (e.date || e.timestamp).slice(0, 10) <= to);
  }
  if (q) {
    list = list.filter(e => {
      const txt = [e.category, e.received_from, e.note, e.payment_method, e.user_name, e.amount].join(' ').toLowerCase();
      return txt.includes(q);
    });
  }

  const tbody = $('#inc-tbody');
  if (tbody) {
    tbody.innerHTML = renderIncomeRows(list, isBn);
  }
}

function clearIncFilter() {
  if ($('#inc-search')) $('#inc-search').value = '';
  if ($('#inc-from')) $('#inc-from').value = '';
  if ($('#inc-to')) $('#inc-to').value = '';
  filterIncByCat('all');
}

function openIncomeModal() {
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  const todayDate = new Date().toISOString().slice(0, 10);

  modal(`
    <div class="modal-h">
      <h3>💰 ${isBn ? 'নতুন অন্যান্য আয় যোগ করুন' : 'Record Other Income'}</h3>
      <button class="modal-x" onclick="closeModal()">×</button>
    </div>
    <div class="modal-b">
      <form id="incform">
        <label>${isBn ? 'আয়ের খাত নির্বাচন করুন *' : 'Income Category *'}</label>
        <select name="category" required style="font-size:14px;padding:9px">
          <option value="সরাসরি সরবরাহ লাভ (বালু/ইট ইত্যাদি)" selected>🚚 ${isBn ? 'সরাসরি সরবরাহ লাভ (বালু / ইট / টাইলস ইত্যাদি)' : 'Direct Supply Profit (Sand/Brick etc.)'}</option>
          <option value="কোম্পানি কমিশন / ইনসেন্টিভ">🏢 ${isBn ? 'কোম্পানি কমিশন / বিক্রয় ইনসেন্টিভ' : 'Company Commission / Incentive'}</option>
          <option value="গাড়ি ভাড়া / পরিবহন লাভ">🚛 ${isBn ? 'গাড়ি ভাড়া / পরিবহন কমিশন লাভ' : 'Carriage / Transport Profit'}</option>
          <option value="লেবার / লোডিং চার্জ লাভ">👷 ${isBn ? 'লেবার / আনলোডিং চার্জ লাভ' : 'Labour / Handling Profit'}</option>
          <option value="অন্যান্য লাভ / আয়">📌 ${isBn ? 'অন্যান্য সাধারণ আয়' : 'Other Miscellaneous Income'}</option>
        </select>

        <div class="grid g2" style="margin-top:8px">
          <div>
            <label style="margin-top:0">${isBn ? 'টাকার পরিমাণ (৳) *' : 'Amount (Tk) *'}</label>
            <input name="amount" type="number" step="0.01" required placeholder="${isBn ? 'যেমন: ১৫০০' : 'e.g. 1500'}">
          </div>
          <div>
            <label style="margin-top:0">${isBn ? 'পেমেন্ট মাধ্যম' : 'Payment Method'}</label>
            <select name="payment_method">
              <option value="নগদ">${isBn ? 'নগদ ক্যাশ (ড্রয়ারে জমা)' : 'Cash in Hand'}</option>
              <option value="ব্যাংক">${isBn ? 'ব্যাংক ট্রান্সফার' : 'Bank Transfer'}</option>
              <option value="বিকাশ / নগদ">${isBn ? 'বিকাশ / নগদ (MFS)' : 'bKash / Nagad'}</option>
            </select>
          </div>
        </div>

        <div class="grid g2" style="margin-top:8px">
          <div>
            <label style="margin-top:0">${isBn ? 'উৎস / কার কাছ থেকে প্রাপ্তি' : 'Received From / Source'}</label>
            <input name="received_from" placeholder="${isBn ? 'যেমন: কাস্টমার রহিম / মেঘনা কোম্পানি' : 'e.g. Rahim / Meghna Co.'}">
          </div>
          <div>
            <label style="margin-top:0">${isBn ? 'তারিখ' : 'Date'}</label>
            <input name="date" type="date" value="${todayDate}">
          </div>
        </div>

        <label style="margin-top:8px">${isBn ? 'মন্তব্য বা বিস্তারিত বিবরণ (ঐচ্ছিক)' : 'Note (optional)'}</label>
        <input name="note" placeholder="${isBn ? 'যেমন: ১০ গাড়ি বালু কোম্পানি থেকে সরাসরি সাপ্লাইয়ের কমিশন' : 'e.g. Commission on 10 trucks of sand'}">

        <p style="font-size:12px;color:var(--mut);margin-top:8px">
          💡 ${isBn ? 'নগদ ক্যাশে আয় হলে তা স্বয়ংক্রিয়ভাবে দোকানের নগদ ড্রয়ার ক্যাশ ব্যালেন্সে জমা হবে।' : 'Cash income will automatically increase the Cash in Hand drawer balance.'}
        </p>

        <br>
        <button class="btn grn blk">${isBn ? 'আয় সংরক্ষণ করুন 💾' : 'Save Income 💾'}</button>
      </form>
    </div>`);

  $('#incform').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    const body = {
      category: f.category.value,
      amount: f.amount.value,
      payment_method: f.payment_method.value,
      received_from: f.received_from.value,
      date: f.date.value,
      note: f.note.value
    };
    try {
      await api('/incomes', { method: 'POST', body });
      closeModal();
      toast(isBn ? 'অন্যান্য আয় সংরক্ষিত হয়েছে ও ক্যাশে জমা হয়েছে ✅' : 'Other income saved successfully ✅');
      router();
    } catch (ex) {
      toast(ex.message, true);
    }
  });
}

async function delIncome(id) {
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  askConfirm(isBn ? 'এই আয়ের এন্ট্রিটি মুছে ফেলতে চান? নগদ ক্যাশ থেকে সমপরিমাণ টাকা সমন্বয় হবে।' : 'Delete this income? Corresponding cash will be adjusted.', async () => {
    try {
      await api('/incomes/' + id, { method: 'DELETE' });
      toast(isBn ? 'আয়ের এন্ট্রি মুছে ফেলা হয়েছে ও ক্যাশ সমন্বয় হয়েছে' : 'Income entry deleted & cash adjusted');
      router();
    } catch (ex) {
      toast(ex.message, true);
    }
  });
}

function viewIncomeReceipt(id) {
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  const inc = (window.__incomes || []).find(e => e.id === id);
  if (!inc) return toast(isBn ? 'আয়ের রেকর্ড পাওয়া যায়নি' : 'Record not found', true);

  modal(`
    <div class="modal-h">
      <h3>💰 ${isBn ? 'আয়ের ভাউচার / বিবরণ' : 'Income Voucher'} #${inc.id}</h3>
      <button class="modal-x" onclick="closeModal()">×</button>
    </div>
    <div class="modal-b">
      <div style="background:#f8fafc;padding:16px;border-radius:10px;border:1px solid var(--line);margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="color:var(--mut)">${isBn ? 'ভাউচার নম্বর:' : 'Voucher No:'}</span>
          <b>INC-${inc.id}</b>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="color:var(--mut)">${isBn ? 'তারিখ ও সময়:' : 'Date & Time:'}</span>
          <span>${fmtDT(inc.timestamp || inc.date)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="color:var(--mut)">${isBn ? 'আয়ের খাত:' : 'Category:'}</span>
          <b>${esc(inc.category)}</b>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="color:var(--mut)">${isBn ? 'উৎস / কার কাছ থেকে:' : 'Received From:'}</span>
          <span>${esc(inc.received_from || '—')}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="color:var(--mut)">${isBn ? 'পেমেন্ট মাধ্যম:' : 'Payment Method:'}</span>
          <span>${esc(inc.payment_method || 'নগদ')}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="color:var(--mut)">${isBn ? 'বিবরণ / নোট:' : 'Note:'}</span>
          <span>${esc(inc.note || '—')}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:12px;padding-top:10px;border-top:2px dashed var(--line);font-size:16px">
          <b>${isBn ? 'মোট প্রাপ্ত টাকা:' : 'Received Amount:'}</b>
          <b style="color:var(--green)">${money(inc.amount)}</b>
        </div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn blk" onclick="closeModal()">${isBn ? 'বন্ধ করুন' : 'Close'}</button>
      </div>
    </div>`);
}
