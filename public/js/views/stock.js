/* ---------- stock ledger ---------- */
VIEWS.stock = async function () {
  const isBn = window.LANG === 'bn';
  const [{ rows }, { ledger }] = await Promise.all([api('/stock/summary'), api('/stock/ledger')]);
  const sum = rows.slice().sort(prodSort).map(r => `<tr>
    <td><b>${esc(isBn ? t(r.name) : r.name)}</b></td><td>${esc(isBn ? bnUnit(r.unit) : r.unit)}</td>
    <td class="num">${isBn ? bnDigits(r.opening_stock) : r.opening_stock}</td>
    <td class="num due0">+${isBn ? bnDigits(r.stock_in) : r.stock_in}</td>
    <td class="num dueX">−${isBn ? bnDigits(r.stock_out) : r.stock_out}</td>
    <td class="num"><b>${isBn ? bnDigits(r.current_stock) : r.current_stock}</b></td>
    <td class="num">${money(r.current_stock * r.purchase_price)}</td>
    <td><button class="btn sm grn" onclick="openStockIn(${r.id})">${isBn ? '+ স্টক ইন' : '+ In'}</button></td>
  </tr>`).join('');

  const log = ledger.map(l => {
    const typeLabel = isBn ? (l.type === 'IN' ? 'স্টক ইন' : l.type === 'OUT' ? 'স্টক আউট' : 'প্রারম্ভিক') : l.type;
    return `<tr>
      <td>${fmtDT(l.timestamp)}</td>
      <td><b>${esc(isBn ? t(l.product_name) : l.product_name)}</b></td>
      <td><span class="badge ${l.type === 'IN' ? 'in' : l.type === 'OUT' ? 'out' : 'open'}">${typeLabel}</span></td>
      <td class="num">${l.type === 'OUT' ? '−' : '+'}${isBn ? bnDigits(l.quantity) : l.quantity}</td>
      <td class="num">${l.unit_cost != null ? money(l.unit_cost) : (l.unit_price != null ? money(l.unit_price) : '—')}</td>
      <td>${esc(l.source)}${l.note ? ' <small style="color:var(--mut)">' + esc(l.note) + '</small>' : ''}</td>
      <td>${esc(l.user_name)}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="7" class="empty">${isBn ? 'এখনো কোনো স্টক চলাচল নেই' : 'No stock movements yet'}</td></tr>`;

  layout(`
    <div class="page-head">
      <div>
        <h1>${isBn ? 'স্টক খাতা (ইন−আউট হিসাব)' : 'Stock Ledger (In−Out Tracking)'}</h1>
        <div class="sub">${isBn ? 'বর্তমান স্টক = প্রারম্ভিক + মোট ইন − মোট আউট • প্রতিটা এন্ট্রিতে তারিখ ও সময় থাকে' : 'Current = Opening + In − Out • every movement time-stamped'}</div>
      </div>
      <button class="btn pri" onclick="openStockIn()">📥 ${isBn ? 'স্টক ইন' : 'Stock In'}</button>
    </div>
    <div class="card">
      <h3>📊 ${isBn ? 'প্রতি মালামালের স্টক সারসংক্ষেপ' : 'Per-Item Stock Summary'}</h3>
      <div class="tblwrap">
        <table class="tbl">
          <tr>
            <th>${isBn ? 'পণ্য' : 'Product'}</th>
            <th>${isBn ? 'একক' : 'Unit'}</th>
            <th class="num">${isBn ? 'প্রারম্ভিক' : 'Opening'}</th>
            <th class="num">${isBn ? 'স্টক ইন (+)' : 'Stock In (+)'}</th>
            <th class="num">${isBn ? 'স্টক আউট (−)' : 'Stock Out (−)'}</th>
            <th class="num">${isBn ? 'বর্তমান স্টক' : 'Current Stock'}</th>
            <th class="num">${isBn ? 'মজুদ পণ্যের মূল্য' : 'Valuation (cost)'}</th>
            <th>${isBn ? 'অ্যাকশন' : 'Action'}</th>
          </tr>
          ${sum}
        </table>
      </div>
    </div>
    <div class="card">
      <h3>🧾 ${isBn ? 'লাইভ স্টক চলাচল খাতা (লেজার)' : 'Live Movement Log'}</h3>
      <input id="slq" placeholder="${isBn ? '🔍 পণ্য / মহাজন / ইউজার দিয়ে খুঁজুন…' : 'Search product / source / user…'}" oninput="filterLedger(this.value)" style="max-width:320px;margin-bottom:10px">
      <div class="tblwrap">
        <table class="tbl" id="sltbl">
          <tr>
            <th>${isBn ? 'তারিখ ও সময়' : 'Date & Time'}</th>
            <th>${isBn ? 'পণ্য' : 'Product'}</th>
            <th>${isBn ? 'ধরন' : 'Type'}</th>
            <th class="num">${isBn ? 'পরিমাণ' : 'Qty'}</th>
            <th class="num">${isBn ? 'দর / রেট' : 'Cost/Price'}</th>
            <th>${isBn ? 'উৎস / চালান' : 'Source'}</th>
            <th>${isBn ? 'ইউজার' : 'By (User)'}</th>
          </tr>
          ${log}
        </table>
      </div>
    </div>`);
  window.__ledger = ledger;
};

function filterLedger(q) {
  const isBn = window.LANG === 'bn';
  q = q.toLowerCase();
  const tbl = $('#sltbl');
  const rows = (window.__ledger || []).filter(l => (l.product_name + ' ' + l.source + ' ' + l.type + ' ' + l.user_name).toLowerCase().includes(q));
  tbl.innerHTML = `<tr>
    <th>${isBn ? 'তারিখ ও সময়' : 'Date & Time'}</th>
    <th>${isBn ? 'পণ্য' : 'Product'}</th>
    <th>${isBn ? 'ধরন' : 'Type'}</th>
    <th class="num">${isBn ? 'পরিমাণ' : 'Qty'}</th>
    <th class="num">${isBn ? 'দর / রেট' : 'Cost/Price'}</th>
    <th>${isBn ? 'উৎস / চালান' : 'Source'}</th>
    <th>${isBn ? 'ইউজার' : 'By (User)'}</th>
  </tr>` + (rows.map(l => {
    const typeLabel = isBn ? (l.type === 'IN' ? 'স্টক ইন' : l.type === 'OUT' ? 'স্টক আউট' : 'প্রারম্ভিক') : l.type;
    return `<tr>
      <td>${fmtDT(l.timestamp)}</td>
      <td><b>${esc(isBn ? t(l.product_name) : l.product_name)}</b></td>
      <td><span class="badge ${l.type === 'IN' ? 'in' : l.type === 'OUT' ? 'out' : 'open'}">${typeLabel}</span></td>
      <td class="num">${l.type === 'OUT' ? '−' : '+'}${isBn ? bnDigits(l.quantity) : l.quantity}</td>
      <td class="num">${l.unit_cost != null ? money(l.unit_cost) : (l.unit_price != null ? money(l.unit_price) : '—')}</td>
      <td>${esc(l.source)}</td>
      <td>${esc(l.user_name)}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="7" class="empty">${isBn ? 'কোনো তথ্য পাওয়া যায়নি' : 'No match'}</td></tr>`);
}

async function openStockIn(pid) {
  const { products } = await api('/products');
  stockInModal(pid || null, products);
}

