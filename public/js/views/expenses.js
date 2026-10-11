/* ---------- expenses (খরচের খাতা) ---------- */
VIEWS.expenses = async function () {
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  const { expenses } = await api('/expenses');
  window.__expenses = expenses || [];

  const todayStr = new Date().toISOString().slice(0, 10);
  const thisMonthStr = todayStr.slice(0, 7);

  const todayTotal = window.__expenses.filter(e => (e.date || e.timestamp).startsWith(todayStr)).reduce((s, e) => s + e.amount, 0);
  const monthTotal = window.__expenses.filter(e => (e.date || e.timestamp).startsWith(thisMonthStr)).reduce((s, e) => s + e.amount, 0);
  const grandTotal = window.__expenses.reduce((s, e) => s + e.amount, 0);

  const stats = `
    <div class="grid g3">
      <div class="stat due">
        <div class="lab">${isBn ? 'আজকের মোট খরচ' : "Today's Expenses"}</div>
        <div class="val">${money(todayTotal)}</div>
      </div>
      <div class="stat brand">
        <div class="lab">${isBn ? 'চলতি মাসের মোট খরচ' : 'This Month Expenses'}</div>
        <div class="val">${money(monthTotal)}</div>
      </div>
      <div class="stat">
        <div class="lab">${isBn ? 'সর্বমোট খরচ' : 'Total Expenses'}</div>
        <div class="val">${money(grandTotal)}</div>
      </div>
    </div>`;

  const rows = renderExpenseRows(window.__expenses, isBn);

  layout(`
    <div class="page-head">
      <div>
        <h1>${isBn ? '💸 খরচের খাতা' : 'Expense Ledger'}</h1>
        <div class="sub">${isBn ? 'দোকান ভাড়া, গোডাউন ভাড়া, বিদ্যুৎ বিল, কর্মচারীর বেতন ও দৈনন্দিন খরচের নির্ভুল হিসাব' : 'Track rent, electricity, salaries, pocket expenses & shop maintenance'}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <button class="btn pri" onclick="openExpenseModal()">${isBn ? '+ নতুন খরচ যোগ' : '+ Add Expense'}</button>
      </div>
    </div>
    ${stats}
    <div class="pill-group" style="margin-top:12px;margin-bottom:10px">
      <button type="button" class="cat-pill active" id="ecp-all" onclick="filterExpByCat('all')">🏷️ ${isBn ? 'সব খরচ' : 'All'}</button>
      <button type="button" class="cat-pill" id="ecp-rent" onclick="filterExpByCat('দোকান ভাড়া')">🏠 ${isBn ? 'দোকান ভাড়া' : 'Shop Rent'}</button>
      <button type="button" class="cat-pill" id="ecp-godown" onclick="filterExpByCat('গোডাউন ভাড়া')">🏭 ${isBn ? 'গোডাউন ভাড়া' : 'Godown Rent'}</button>
      <button type="button" class="cat-pill" id="ecp-bill" onclick="filterExpByCat('বিদ্যুৎ বিল')">⚡ ${isBn ? 'বিদ্যুৎ বিল' : 'Electricity'}</button>
      <button type="button" class="cat-pill" id="ecp-salary" onclick="filterExpByCat('ম্যানেজার / কর্মচারীর বেতন')">👨‍💼 ${isBn ? 'কর্মচারীর বেতন' : 'Salary'}</button>
      <button type="button" class="cat-pill" id="ecp-pocket" onclick="filterExpByCat('হাত খরচ / আপ্যায়ন')">☕ ${isBn ? 'হাত খরচ / নাস্তা' : 'Refreshment'}</button>
      <button type="button" class="cat-pill" id="ecp-transport" onclick="filterExpByCat('গাড়ি ভাড়া / পরিবহন')">🚚 ${isBn ? 'পরিবহন' : 'Transport'}</button>
      <button type="button" class="cat-pill" id="ecp-other" onclick="filterExpByCat('অন্যান্য')">📌 ${isBn ? 'অন্যান্য' : 'Other'}</button>
    </div>
    <div class="card">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:12px">
        <input id="exp-search" placeholder="${isBn ? '🔍 বিবরণ / খাত / প্রাপক দিয়ে খুঁজুন…' : 'Search expenses…'}" style="max-width:280px" oninput="filterExpTable()">
        <input type="date" id="exp-from" onchange="filterExpTable()" title="${isBn ? 'শুরুর তারিখ' : 'From Date'}">
        <input type="date" id="exp-to" onchange="filterExpTable()" title="${isBn ? 'শেষ তারিখ' : 'To Date'}">
        <button class="btn sm" onclick="clearExpFilter()">${isBn ? 'রিসেট' : 'Reset'}</button>
      </div>
      <div class="tblwrap">
        <table class="tbl" id="exptable">
          <tr>
            <th>${isBn ? 'তারিখ' : 'Date'}</th>
            <th>${isBn ? 'খরচের খাত' : 'Category'}</th>
            <th>${isBn ? 'প্রাপক / বিবরণ' : 'Paid To / Details'}</th>
            <th>${isBn ? 'মাধ্যম' : 'Method'}</th>
            <th class="num">${isBn ? 'পরিমাণ (৳)' : 'Amount (Tk)'}</th>
            <th>${isBn ? 'এন্ট্রি করেছেন' : 'By'}</th>
            <th>${isBn ? 'অ্যাকশন' : 'Actions'}</th>
          </tr>
          ${rows}
        </table>
      </div>
    </div>`);
};

function renderExpenseRows(list, isBn) {
  if (!list || !list.length) {
    return `<tr><td colspan="7" class="empty">${isBn ? 'কোনো খরচের এন্ট্রি পাওয়া যায়নি' : 'No expense entries found'}</td></tr>`;
  }
  return list.map(e => `
    <tr>
      <td>${fmtDate(e.date || e.timestamp)}</td>
      <td><b>${esc(e.category)}</b></td>
      <td>${esc(e.paid_to ? e.paid_to + (e.note ? ' • ' + e.note : '') : (e.note || '—'))}</td>
      <td><span class="badge ${e.payment_method === 'নগদ' ? 'in' : 'open'}">${esc(e.payment_method || 'নগদ')}</span></td>
      <td class="num dueX"><b>${money(e.amount)}</b></td>
      <td>${esc(e.user_name)}</td>
      <td style="white-space:nowrap">
        <button class="btn sm" onclick="printExpenseVoucher(${e.id})" title="${isBn ? 'ভাউচার প্রিন্ট' : 'Print Voucher'}">🖨️</button>
        ${isOwner() ? `<button class="btn sm dan" onclick="delExpense(${e.id})" title="${isBn ? 'মুছুন' : 'Delete'}">🗑️</button>` : ''}
      </td>
    </tr>`).join('');
}

let CURRENT_EXP_CAT = 'all';

function filterExpByCat(cat) {
  CURRENT_EXP_CAT = cat;
  document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
  const btn = $('#ecp-' + (cat === 'all' ? 'all' : (cat.includes('দোকান') ? 'rent' : cat.includes('গোডাউন') ? 'godown' : cat.includes('বিদ্যুৎ') ? 'bill' : cat.includes('বেতন') ? 'salary' : cat.includes('হাত') ? 'pocket' : cat.includes('পরিবহন') ? 'transport' : 'other')));
  if (btn) btn.classList.add('active');
  filterExpTable();
}

function clearExpFilter() {
  $('#exp-search').value = '';
  $('#exp-from').value = '';
  $('#exp-to').value = '';
  CURRENT_EXP_CAT = 'all';
  document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
  $('#ecp-all').classList.add('active');
  filterExpTable();
}

function filterExpTable() {
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  const q = ($('#exp-search').value || '').trim().toLowerCase();
  const from = $('#exp-from').value;
  const to = $('#exp-to').value;

  let list = (window.__expenses || []).slice();
  if (CURRENT_EXP_CAT !== 'all') {
    list = list.filter(e => e.category === CURRENT_EXP_CAT);
  }
  if (from) {
    list = list.filter(e => (e.date || e.timestamp).slice(0, 10) >= from);
  }
  if (to) {
    list = list.filter(e => (e.date || e.timestamp).slice(0, 10) <= to);
  }
  if (q) {
    list = list.filter(e => ((e.category || '') + ' ' + (e.paid_to || '') + ' ' + (e.note || '') + ' ' + (e.user_name || '')).toLowerCase().includes(q));
  }

  const tbl = $('#exptable');
  if (tbl) {
    tbl.innerHTML = `
      <tr>
        <th>${isBn ? 'তারিখ' : 'Date'}</th>
        <th>${isBn ? 'খরচের খাত' : 'Category'}</th>
        <th>${isBn ? 'প্রাপক / বিবরণ' : 'Paid To / Details'}</th>
        <th>${isBn ? 'মাধ্যম' : 'Method'}</th>
        <th class="num">${isBn ? 'পরিমাণ (৳)' : 'Amount (Tk)'}</th>
        <th>${isBn ? 'এন্ট্রি করেছেন' : 'By'}</th>
        <th>${isBn ? 'অ্যাকশন' : 'Actions'}</th>
      </tr>` + renderExpenseRows(list, isBn);
  }
}

function openExpenseModal() {
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  const todayDate = new Date().toISOString().slice(0, 10);
  modal(`
    <div class="modal-h">
      <h3>💸 ${isBn ? 'নতুন খরচ যোগ করুন' : 'Add New Expense'}</h3>
      <button class="modal-x" onclick="closeModal()">×</button>
    </div>
    <div class="modal-b">
      <form id="expform">
        <label>${isBn ? 'খরচের খাত নির্বাচন করুন *' : 'Expense Category *'}</label>
        <select name="category" required style="font-size:14px;padding:9px">
          <option value="দোকান ভাড়া">🏠 ${isBn ? 'দোকান ভাড়া' : 'Shop Rent'}</option>
          <option value="গোডাউন ভাড়া">🏭 ${isBn ? 'গোডাউন ভাড়া' : 'Godown Rent'}</option>
          <option value="বিদ্যুৎ বিল">⚡ ${isBn ? 'বিদ্যুৎ বিল' : 'Electricity Bill'}</option>
          <option value="ম্যানেজার / কর্মচারীর বেতন">👨‍💼 ${isBn ? 'ম্যানেজার / কর্মচারীর বেতন' : 'Manager / Staff Salary'}</option>
          <option value="হাত খরচ / আপ্যায়ন">☕ ${isBn ? 'হাত খরচ / চা-নাস্তা / আপ্যায়ন' : 'Pocket Expense / Refreshment'}</option>
          <option value="গাড়ি ভাড়া / পরিবহন">🚚 ${isBn ? 'গাড়ি ভাড়া / পরিবহন খরচ' : 'Transport / Carriage'}</option>
          <option value="মেরামত ও রক্ষণাবেক্ষণ">🛠️ ${isBn ? 'মেরামত ও রক্ষণাবেক্ষণ' : 'Repair & Maintenance'}</option>
          <option value="অন্যান্য" selected>📌 ${isBn ? 'অন্যান্য খরচ' : 'Other Expense'}</option>
        </select>

        <div class="grid g2" style="margin-top:8px">
          <div>
            <label style="margin-top:0">${isBn ? 'টাকার পরিমাণ (৳) *' : 'Amount (Tk) *'}</label>
            <input name="amount" type="number" step="0.01" required placeholder="${isBn ? 'যেমন: ৫০০' : 'e.g. 500'}">
          </div>
          <div>
            <label style="margin-top:0">${isBn ? 'পেমেন্ট মাধ্যম' : 'Payment Method'}</label>
            <select name="payment_method">
              <option value="নগদ">${isBn ? 'নগদ ক্যাশ (ড্রয়ার থেকে)' : 'Cash'}</option>
              <option value="ব্যাংক">${isBn ? 'ব্যাংক ট্রান্সফার' : 'Bank Transfer'}</option>
              <option value="বিকাশ / নগদ">${isBn ? 'বিকাশ / নগদ (MFS)' : 'bKash / Nagad'}</option>
            </select>
          </div>
        </div>

        <div class="grid g2" style="margin-top:8px">
          <div>
            <label style="margin-top:0">${isBn ? 'কার কাছে প্রদান করা হলো (প্রাপক)' : 'Paid To'}</label>
            <input name="paid_to" placeholder="${isBn ? 'যেমন: ম্যানেজার / বাড়িওয়ালা' : 'e.g. Manager / Landlord'}">
          </div>
          <div>
            <label style="margin-top:0">${isBn ? 'তারিখ' : 'Date'}</label>
            <input name="date" type="date" value="${todayDate}">
          </div>
        </div>

        <label style="margin-top:8px">${isBn ? 'মন্তব্য বা অতিরিক্ত বিবরণ (ঐচ্ছিক)' : 'Note (optional)'}</label>
        <input name="note" placeholder="${isBn ? 'যেমন: অক্টোবর মাসের অগ্রিম' : 'e.g. Advance payment'}">

        <p style="font-size:12px;color:var(--mut);margin-top:8px">
          💡 ${isBn ? 'নগদ ক্যাশে খরচ হলে নগদ ড্রয়ার ব্যালেন্স থেকে স্বয়ংক্রিয়ভাবে বাদ যাবে।' : 'Cash expenses will automatically be deducted from cash in hand.'}
        </p>

        <br>
        <button class="btn pri blk">${isBn ? 'খরচ সংরক্ষণ করুন 💾' : 'Save Expense 💾'}</button>
      </form>
    </div>`);

  $('#expform').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    const body = {
      category: f.category.value,
      amount: f.amount.value,
      payment_method: f.payment_method.value,
      paid_to: f.paid_to.value,
      date: f.date.value,
      note: f.note.value
    };
    try {
      await api('/expenses', { method: 'POST', body });
      closeModal();
      toast(isBn ? 'খরচ সফলভাবে সংরক্ষিত হয়েছে ✅' : 'Expense recorded successfully ✅');
      router();
    } catch (err) {
      toast(err.message, true);
    }
  });
}

async function delExpense(id) {
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  askConfirm(isBn ? 'এই খরচের এন্ট্রিটি মুছে ফেলতে চান?' : 'Delete this expense entry?', async function () {
    try {
      await api('/expenses/' + id, { method: 'DELETE' });
      toast(isBn ? 'খরচ মুছে ফেলা হয়েছে' : 'Expense deleted');
      router();
    } catch (e) {
      toast(e.message, true);
    }
  });
}

function printExpenseVoucher(id) {
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  const exp = (window.__expenses || []).find(e => e.id === id);
  if (!exp) return;

  modal(`
    <div class="modal-h">
      <h3>🖨️ ${isBn ? 'খরচ ভাউচার স্লিপ' : 'Expense Voucher'}</h3>
      <button class="modal-x" onclick="closeModal()">×</button>
    </div>
    <div class="modal-b">
      <div id="voucher-print" style="background:#fff;border:1px solid #e2e8f0;padding:20px;border-radius:8px;font-family:'Hind Siliguri',sans-serif">
        <div style="text-align:center;border-bottom:2px dashed #94a3b8;padding-bottom:12px;margin-bottom:14px">
          <h2 style="margin:0;font-size:20px;color:#1e293b">মেসার্স এম.এস ট্রেডার্স</h2>
          <div style="font-size:12.5px;color:#64748b">সোসাইটি পুরাতন মার্কেট, পুরাতন বাজার, দর্শনা, চুয়াডাঙ্গা।</div>
          <div style="font-size:13px;font-weight:700;margin-top:6px;display:inline-block;padding:2px 10px;background:#f1f5f9;border-radius:12px">খরচের ভাউচার</div>
        </div>
        <table style="width:100%;font-size:13.5px;border-collapse:collapse;margin-bottom:12px">
          <tr><td style="color:#64748b;padding:4px 0">ভাউচার আইডি:</td><td style="font-weight:700">#EXP-${exp.id}</td></tr>
          <tr><td style="color:#64748b;padding:4px 0">তারিখ ও সময়:</td><td>${fmtDT(exp.timestamp)}</td></tr>
          <tr><td style="color:#64748b;padding:4px 0">খরচের খাত:</td><td style="font-weight:700">${esc(exp.category)}</td></tr>
          <tr><td style="color:#64748b;padding:4px 0">প্রাপক / ব্যক্তি:</td><td>${esc(exp.paid_to || '—')}</td></tr>
          <tr><td style="color:#64748b;padding:4px 0">পেমেন্ট মাধ্যম:</td><td>${esc(exp.payment_method || 'নগদ')}</td></tr>
          <tr><td style="color:#64748b;padding:4px 0">বিবরণ / নোট:</td><td>${esc(exp.note || '—')}</td></tr>
          <tr style="border-top:1px solid #cbd5e1;border-bottom:1px solid #cbd5e1"><td style="padding:8px 0;font-weight:700;font-size:15px">মোট খরচ:</td><td style="padding:8px 0;font-weight:700;font-size:16px;color:#b91c1c">${money(exp.amount)}</td></tr>
          <tr><td style="color:#64748b;padding:4px 0">অনুমোদনকারী:</td><td>${esc(exp.user_name)}</td></tr>
        </table>
        <div style="display:flex;justify-content:space-between;margin-top:35px;padding-top:10px;border-top:1px dotted #94a3b8;font-size:12px;color:#64748b">
          <div>গ্রহণকারীর স্বাক্ষর</div>
          <div>মালিকের স্বাক্ষর</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:14px">
        <button class="btn grn blk" onclick="doPrintVoucher()">${isBn ? '🖨️ প্রিন্ট করুন' : 'Print'}</button>
        <button class="btn blk" onclick="closeModal()">${isBn ? 'বন্ধ করুন' : 'Close'}</button>
      </div>
    </div>`);
}

function doPrintVoucher() {
  const pr = $('#voucher-print');
  if (!pr) return;
  const parea = $('#print-area');
  parea.innerHTML = pr.outerHTML;
  window.print();
  setTimeout(() => { parea.innerHTML = ''; }, 1000);
}
