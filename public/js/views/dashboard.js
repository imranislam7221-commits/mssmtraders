/* ---------- dashboard ---------- */
VIEWS.dashboard = async function () {
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  const d = await api('/dashboard');

  const stats = `
    <div class="grid g4" style="margin-bottom:14px">
      <div class="stat brand">
        <div class="lab">${isBn ? 'আজকের মোট বিক্রয়' : "Today's Sales"}</div>
        <div class="val">${money(d.today_sales)}</div>
        <div class="lab" style="margin-top:4px">${isBn ? bnDigits(d.today_invoices) + ' টি বিক্রয় মেমো' : d.today_invoices + ' invoices'}</div>
      </div>
      <div class="stat">
        <div class="lab">${isBn ? 'আজকের নগদ আদায়' : "Today's Collection"}</div>
        <div class="val">${money(d.today_collection)}</div>
        <div class="lab" style="margin-top:4px;color:var(--green)">${isBn ? 'ক্যাশ জমা' : 'Cash in'}</div>
      </div>
      <div class="stat due">
        <div class="lab">💸 ${isBn ? 'আজকের মোট খরচ' : "Today's Expense"}</div>
        <div class="val">${money(d.today_expense || 0)}</div>
        <div class="lab" style="margin-top:4px">${isBn ? 'চলতি মাস: ' + money(d.month_expense || 0) : 'Month: ' + money(d.month_expense || 0)}</div>
      </div>
      <div class="stat brand">
        <div class="lab">💰 ${isBn ? 'হাতে নগদ ক্যাশ' : 'Cash in Hand'}</div>
        <div class="val">${money(d.cash_balance)}</div>
        <div class="lab" style="margin-top:4px">${isBn ? 'আদায় ও খরচ সমন্বিত' : 'Net balance'}</div>
      </div>
    </div>
    <div class="grid g4">
      <div class="stat due">
        <div class="lab">👥 ${isBn ? 'কাস্টমার বাকি (দোকানের মোট পাওনা)' : 'Customer Dues (Receivable)'}</div>
        <div class="val">${money(d.total_due)}</div>
        <div class="lab" style="margin-top:4px"><a href="#/customers" style="color:#fef08a;font-weight:600">${isBn ? 'কাস্টমার খাতা →' : 'Customers →'}</a></div>
      </div>
      <div class="stat">
        <div class="lab">👥 ${isBn ? 'মোট কাস্টমার' : 'Total Customers'}</div>
        <div class="val">${isBn ? bnDigits(d.customers) + ' জন' : d.customers}</div>
        <div class="lab" style="margin-top:4px"><a href="#/customers" style="color:var(--brand2);font-weight:600">${isBn ? 'কাস্টমার তালিকা →' : 'Customers →'}</a></div>
      </div>
      <div class="stat due0">
        <div class="lab">💰 ${isBn ? 'অন্যান্য আয় (কমিশন / লাভ)' : 'Other Income'}</div>
        <div class="val" style="color:var(--green)">${money(d.today_income || 0)}</div>
        <div class="lab" style="margin-top:4px">${isBn ? 'চলতি মাস: ' + money(d.month_income || 0) : 'Month: ' + money(d.month_income || 0)}</div>
      </div>
      ${isOwner() ? `
      <div class="stat">
        <div class="lab">${isBn ? 'স্টক মূল্য (ক্রয়দর)' : 'Stock Valuation'}</div>
        <div class="val">${money(d.stock_valuation_cost)}</div>
        <div class="lab" style="margin-top:4px">${isBn ? 'বিক্রয় মূল্য: ' + money(d.stock_valuation_sale) : 'Sale: ' + money(d.stock_valuation_sale)}</div>
      </div>` : `
      <div class="stat">
        <div class="lab">${isBn ? 'মোট পণ্য' : 'Products'}</div>
        <div class="val">${isBn ? bnDigits(d.products) : d.products}</div>
        <div class="lab" style="margin-top:4px"><a href="#/products" style="color:var(--brand2);font-weight:600">${isBn ? 'পণ্য তালিকা →' : 'Products →'}</a></div>
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

  const expRows = (d.recent_expenses || []).map(e => `
    <tr>
      <td>${fmtDate(e.date || e.timestamp)}</td>
      <td><b>${esc(e.category)}</b></td>
      <td>${esc(e.paid_to || e.note || '—')}</td>
      <td class="num dueX"><b>${money(e.amount)}</b></td>
      <td>${esc(e.user_name)}</td>
    </tr>`).join('') || `<tr><td colspan="5" class="empty">${isBn ? 'কোনো খরচ এন্ট্রি করা হয়নি' : 'No expenses recorded'}</td></tr>`;

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
        <a class="btn" href="#/expenses">${isBn ? '💸 খরচের খাতা' : '💸 Expenses'}</a>
        <a class="btn" href="#/incomes">${isBn ? '💰 অন্যান্য আয়' : '💰 Other Income'}</a>
        <a class="btn" href="#/customers">${isBn ? '👤 কাস্টমার বাকি খাতা' : '👤 Customer'}</a>
      </div>
    </div>
    ${stats}
    <div class="grid g2" style="margin-top:14px">
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <h3 style="margin:0">${isBn ? '🧾 সাম্প্রতিক বিক্রয় রসিদ (মেমো)' : 'Recent Invoices'}</h3>
          <a href="#/invoices" style="font-size:12.5px;color:var(--brand2);font-weight:600">${isBn ? 'সব দেখুন →' : 'View all →'}</a>
        </div>
        <div class="tblwrap">
          <table class="tbl">
            <tr>
              <th>${isBn ? 'মেমো / রসিদ নং' : 'Invoice'}</th>
              <th>${isBn ? 'কাস্টমার' : 'Customer'}</th>
              <th class="num">${isBn ? 'মোট' : 'Total'}</th>
              <th class="num">${isBn ? 'জমা' : 'Paid'}</th>
              <th class="num">${isBn ? 'বাকি' : 'Due'}</th>
              <th>${isBn ? 'তারিখ' : 'Date'}</th>
              <th>${isBn ? 'বিক্রেতা' : 'By'}</th>
            </tr>
            ${invRows}
          </table>
        </div>
      </div>

      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <h3 style="margin:0">💸 ${isBn ? 'সাম্প্রতিক খরচের হিসাব' : 'Recent Expenses'}</h3>
          <a href="#/expenses" style="font-size:12.5px;color:var(--brand2);font-weight:600">${isBn ? 'খরচের খাতা দেখুন →' : 'Manage →'}</a>
        </div>
        <div class="tblwrap">
          <table class="tbl">
            <tr>
              <th>${isBn ? 'তারিখ' : 'Date'}</th>
              <th>${isBn ? 'খাত' : 'Category'}</th>
              <th>${isBn ? 'প্রাপক / বিবরণ' : 'Paid To'}</th>
              <th class="num">${isBn ? 'পরিমাণ (৳)' : 'Amount'}</th>
              <th>${isBn ? 'ইউজার' : 'By'}</th>
            </tr>
            ${expRows}
          </table>
        </div>
      </div>

      <div class="card">
        <h3>💰 ${isBn ? 'নগদ ক্যাশ লেনদেন (ক্যাশ বুক)' : 'Cash Movements'}</h3>
        ${cashRows}
      </div>

      <div class="card">
        <h3>⚠️ ${isBn ? 'কম স্টক সতর্কতা' : 'Low Stock Alerts'}</h3>
        ${low}
      </div>
    </div>`);
};
