/* ---------- dashboard ---------- */
VIEWS.dashboard = async function () {
  const isBn = window.LANG === 'bn';
  const d = await api('/dashboard');
  const stats = `
    <div class="grid g4">
      <div class="stat due">
        <div class="lab">${isBn ? 'সর্বমোট বাকি (দোকানের মোট পাওনা)' : 'Total Outstanding Dues'}</div>
        <div class="val">${money(d.total_due)}</div>
      </div>
      <div class="stat brand">
        <div class="lab">${isBn ? 'আজকের মোট বিক্রয়' : "Today's Sales"}</div>
        <div class="val">${money(d.today_sales)}</div>
        <div class="lab" style="margin-top:4px">${isBn ? bnDigits(d.today_invoices) + ' টি রশিদ' : d.today_invoices + ' invoices'}</div>
      </div>
      <div class="stat">
        <div class="lab">${isBn ? 'আজকের মোট নগদ আদায়' : "Today's Collection"}</div>
        <div class="val">${money(d.today_collection)}</div>
      </div>
      <div class="stat brand">
        <div class="lab">💰 ${isBn ? 'হাতে নগদ ক্যাশ' : 'Cash in Hand'}</div>
        <div class="val">${money(d.cash_balance)}</div>
      </div>
      ${isOwner() ? `
      <div class="stat">
        <div class="lab">${isBn ? 'বর্তমান স্টক মূল্য (ক্রয়মূল্য)' : 'Stock Valuation (cost)'}</div>
        <div class="val">${money(d.stock_valuation_cost)}</div>
        <div class="lab" style="margin-top:4px">${isBn ? 'বিক্রয় মূল্য: ' + money(d.stock_valuation_sale) : 'Sale value: ' + money(d.stock_valuation_sale)}</div>
      </div>` : `
      <div class="stat">
        <div class="lab">${isBn ? 'মোট কাস্টমার' : 'Customers'}</div>
        <div class="val">${isBn ? bnDigits(d.customers) : d.customers}</div>
      </div>`}
    </div>`;

  const invRows = d.recent_invoices.map(i => `
    <tr onclick="viewInvoice(${i.id})" style="cursor:pointer">
      <td><b>${esc(i.invoice_no)}</b></td>
      <td>${esc(i.customer_name)}</td>
      <td class="num">${money(i.total)}</td>
      <td class="num">${money(i.paid)}</td>
      <td class="num ${i.due > 0 ? 'dueX' : 'due0'}">${money(i.due)}</td>
      <td>${fmtDT(i.timestamp)}</td>
      <td>${esc(i.user_name)}</td>
    </tr>`).join('') || `<tr><td colspan="7" class="empty">${isBn ? 'এখনো কোনো ইনভয়েস হয়নি — পিওএস থেকে নতুন বিক্রয় করুন' : 'No invoices yet — start billing from POS'}</td></tr>`;

  const low = d.low_stock.slice().sort(prodSort).map(p => `
    <div class="lowrow">
      <span>📦 ${esc(p.name)}</span>
      <span class="dueX">${isBn ? bnDigits(p.current_stock) : p.current_stock} ${esc(p.unit)} ${isBn ? 'অবশিষ্ট (সর্বনিম্ন ' + bnDigits(p.low_stock) + ')' : `left (min ${p.low_stock})`}</span>
    </div>`).join('') || `<div class="empty">${isBn ? 'সকল পণ্যের স্টক পর্যাপ্ত রয়েছে 👍' : 'All stocks healthy 👍'}</div>`;

  const cashRows = (d.recent_cash || []).map(function (c) {
    return `
      <div class="lowrow">
        <span>${c.type === 'IN' ? '➕' : '➖'} ${esc(c.source)}</span>
        <span>${c.type === 'IN' ? '+' : '−'} ${money(c.amount)} <small style="color:var(--mut)">${esc(c.time_display)}</small></span>
      </div>`;
  }).join('') || `<div class="empty">${isBn ? 'কোনো নগদ লেনদেন নেই' : 'No cash movements'}</div>`;

  layout(`
    <div class="page-head">
      <div>
        <h1>${isBn ? 'ড্যাশবোর্ড' : 'Dashboard'}</h1>
        <div class="sub">${new Date().toLocaleDateString(isBn ? 'bn-BD' : 'en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <a class="btn pri" href="#/pos">${isBn ? '🧾 নতুন বিক্রয় (POS)' : '🧾 New Sale'}</a>
        <a class="btn" href="#/stock">${isBn ? '📥 স্টক ইন' : '📥 Stock In'}</a>
        <a class="btn" href="#/customers">${isBn ? '👤 কাস্টমার বাকি খাতা' : '👤 Customer'}</a>
      </div>
    </div>
    ${stats}
    <div class="grid g2">
      <div class="card">
        <h3>${isBn ? 'সাম্প্রতিক বিক্রয় রশিদ (ইনভয়েস)' : 'Recent Invoices'}</h3>
        <div class="tblwrap">
          <table class="tbl">
            <tr>
              <th>${isBn ? 'রশিদ নং' : 'Invoice'}</th>
              <th>${isBn ? 'কাস্টমার' : 'Customer'}</th>
              <th class="num">${isBn ? 'মোট' : 'Total'}</th>
              <th class="num">${isBn ? 'জমা' : 'Paid'}</th>
              <th class="num">${isBn ? 'বাকি' : 'Due'}</th>
              <th>${isBn ? 'তারিখ' : 'Date'}</th>
              <th>${isBn ? 'দ্বারা' : 'By'}</th>
            </tr>
            ${invRows}
          </table>
        </div>
      </div>
      <div class="card">
        <h3>⚠️ ${isBn ? 'কম স্টক সতর্কতা' : 'Low Stock Alerts'}</h3>
        ${low}
      </div>
      <div class="card">
        <h3>💰 ${isBn ? 'নগদ ক্যাশ লেনদেন' : 'Cash Movements'}</h3>
        ${cashRows}
      </div>
    </div>`);
};
