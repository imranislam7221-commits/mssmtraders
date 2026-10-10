/* ---------- POS / billing ---------- */
VIEWS.pos = async function () {
  const [{ products }, { customers }] = await Promise.all([
    api('/products'),
    api('/customers').catch(() => ({ customers: [] }))
  ]);
  S.__products = products;
  S.__customers = customers;
  S.cart = S.cart || [];
  const isBn = window.LANG === 'bn';

  layout(`
    <div class="page-head">
      <div>
        <h1>${isBn ? 'পস — দ্রুত বিলিং ও বিক্রয়' : 'POS — Fast Billing'}</h1>
        <div class="sub">${isBn ? 'পণ্য নির্বাচন করুন → পরিমাণ ও দর দিন → মোট হিসাব স্বয়ংক্রিয়ভাবে হবে' : 'Select item → enter Qty & Price → totals auto-calculate'}</div>
      </div>
    </div>
    <div class="pos-grid">
      <div class="card">
        <h3>${isBn ? '১️⃣ পণ্য যোগ করুন' : '1️⃣ Add Items'}</h3>
        <div class="psearch-wrap">
          <input id="psearch" placeholder="${isBn ? '🔍 পণ্য খুঁজুন (রড, সিমেন্ট, ইট, বালি, টাইলস...)' : '🔍 Search item (Rod, Cement, Tiles…)'}" autocomplete="off" oninput="pDrop()" onfocus="pDrop()">
          <div id="pdrop" class="pdrop" style="display:none"></div>
        </div>
        <div class="qtyrow" style="margin-top:10px">
          <div style="flex:1.4">
            <label style="margin-top:0">${isBn ? 'পরিমাণ' : 'Qty'} (<span id="qtyunit" style="color:var(--brand)">—</span>) *</label>
            <input id="pqty" type="number" step="0.01" placeholder="${isBn ? 'পরিমাণ' : 'Qty'}">
          </div>
          <div style="flex:1.4">
            <label style="margin-top:0">${isBn ? 'দর / রেট (টাকা)' : 'Price (Tk)'}</label>
            <input id="pprice" type="number" step="0.01" placeholder="${isBn ? 'টাকা' : 'Tk'}">
          </div>
          <div style="flex:0.8;display:flex;align-items:flex-end">
            <button class="btn pri blk" style="padding:10px" onclick="addToCart()">${isBn ? '+ যোগ' : '+ Add'}</button>
          </div>
        </div>
        <h3 style="margin-top:16px">${isBn ? '২️⃣ নির্বাচিত পণ্য (কার্ট)' : '2️⃣ Cart'}</h3>
        <div id="cartbox">${cartHtml()}</div>
      </div>

      <div class="card">
        <h3>${isBn ? '৩️⃣ কাস্টমার ও পেমেন্ট' : '3️⃣ Customer & Payment'}</h3>
        <label>${isBn ? 'কাস্টমার (নাম বা মোবাইল নম্বর দিয়ে খুঁজুন)' : 'Customer (search by name/phone)'}</label>
        <div class="psearch-wrap">
          <input id="custsearch" placeholder="${isBn ? '🔍 কাস্টমারের নাম বা ফোন নম্বর লিখুন...' : '🔍 Customer name/phone…'}" autocomplete="off" oninput="cDrop()" onfocus="cDrop()">
          <div id="cdrop" class="pdrop" style="display:none"></div>
        </div>
        <input type="hidden" id="custsel" value="0">
        <button class="btn sm" style="margin-top:6px" onclick="newCustInline()">${isBn ? '+ নতুন কাস্টমার' : '+ New customer'}</button>

        <div id="newcust" style="display:none;background:#f8fafc;padding:10px;border-radius:8px;margin-top:8px;border:1px solid var(--line)">
          <label style="margin-top:0">${isBn ? 'নতুন কাস্টমারের নাম *' : 'New Customer Name *'}</label>
          <input id="ncname" placeholder="${isBn ? 'কাস্টমারের নাম' : 'Name'}">
          <label>${isBn ? 'মোবাইল নম্বর' : 'Phone'}</label>
          <input id="ncphone" placeholder="${isBn ? '০১XXXXXXXXX' : '01XXXXXXXXX'}">
          <label style="display:flex;gap:6px;align-items:center;margin-top:8px;cursor:pointer">
            <input type="checkbox" id="ncwa" style="width:auto"> ${isBn ? 'হোয়াটসঅ্যাপ মেসেজ পাঠানো যাবে' : 'WhatsApp enabled (statement via WhatsApp)'}
          </label>
        </div>

        <div class="grid g2" style="margin-top:10px">
          <div>
            <label style="margin-top:0">${isBn ? 'ছাড় / ডিসকাউন্ট (টাকা)' : 'Discount (Tk)'}</label>
            <input id="fdiscount" type="number" step="0.01" value="0" oninput="calcTotals()">
          </div>
          <div>
            <label style="margin-top:0">${isBn ? 'ভ্যাট %' : 'VAT %'}</label>
            <input id="fvat" type="number" step="0.01" value="0" oninput="calcTotals()">
          </div>
        </div>

        <label>${isBn ? 'জমা টাকা (নগদ)' : 'Paid Amount (Tk)'}</label>
        <input id="fpaid" type="number" step="0.01" value="0" oninput="calcTotals()">

        <div style="margin-top:10px" id="totalsbox">${totalsHtml()}</div>

        <label>${isBn ? 'মন্তব্য (ঐচ্ছিক)' : 'Note (optional)'}</label>
        <input id="fnote" placeholder="${isBn ? 'যেকোনো নোট বা মন্তব্য...' : 'any remark'}">

        <div style="display:flex;gap:8px;margin-top:14px">
          <button class="btn pri blk" onclick="saveInvoice(false)">${isBn ? '💾 সংরক্ষণ' : '💾 Save'}</button>
          <button class="btn grn blk" onclick="saveInvoice(true)">${isBn ? '🖨️ সংরক্ষণ ও মেমো প্রিন্ট' : '🖨️ Save & Print'}</button>
        </div>
      </div>
    </div>`, true);
};

function pDrop() {
  const isBn = window.LANG === 'bn';
  const q = ($('#psearch').value || '').trim().toLowerCase();
  const box = $('#pdrop');
  const list = (S.__products || []).filter(p => {
    const hay = ((p.name || '') + ' ' + (p.category || '')).toLowerCase();
    return hay.includes(q);
  }).sort(prodSort).slice(0, 60);

  if (!list.length) {
    box.innerHTML = `<div class="pi dis">${isBn ? 'কোনো পণ্য পাওয়া যায়নি' : 'No product found'}</div>`;
    box.style.display = 'block';
    return;
  }

  box.innerHTML = list.map(p => {
    const sizeStr = p.size_mili ? ' • ' + (isBn ? bnDigits(p.size_mili) + ' মি.মি' : p.size_mili + 'mm') : '';
    const stockStr = isBn ? ('স্টক ' + bnDigits(p.current_stock)) : ('stock ' + p.current_stock);
    const priceStr = money(p.selling_price) + ' / ' + esc(p.unit);
    const dis = p.current_stock <= 0 ? 'dis' : '';
    return `
      <div class="pi ${dis}" onmousedown="pickProduct(${p.id})">
        <span>${esc(p.name)} <small style="color:var(--mut)">${esc(p.category)}${sizeStr}</small></span>
        <span class="st">${priceStr} • ${stockStr}</span>
      </div>`;
  }).join('');
  box.style.display = 'block';
}

function pickProduct(id) {
  const p = S.__products.find(x => x.id === id);
  if (!p) return;
  $('#psearch').value = p.name;
  $('#psearch').dataset.pid = p.id;
  $('#pdrop').style.display = 'none';
  $('#pprice').value = p.selling_price;
  const qu = $('#qtyunit');
  if (qu) qu.textContent = p.unit;
  $('#pqty').value = 1;
  $('#pqty').focus();
}

function addToCart() {
  const isBn = window.LANG === 'bn';
  const ps = $('#psearch');
  let p = S.__products.find(x => x.id === +ps.dataset.pid) ||
          S.__products.find(x => (x.name || '').toLowerCase() === (ps.value || '').trim().toLowerCase());

  if (!p) {
    toast(isBn ? 'তালিকা থেকে পণ্য নির্বাচন করুন' : 'Select item from list', true);
    return;
  }
  const qty = parseFloat($('#pqty').value);
  const price = parseFloat($('#pprice').value);

  if (!(qty > 0)) {
    toast(isBn ? 'সঠিক পরিমাণ লিখুন' : 'Enter quantity', true);
    return;
  }
  if (!(price >= 0)) {
    toast(isBn ? 'সঠিক দর দিন' : 'Enter valid price', true);
    return;
  }

  const ex = S.cart.find(c => c.product_id === p.id);
  const currentInCart = ex ? ex.qty : 0;
  if ((currentInCart + qty) > (p.current_stock + 0.001)) {
    const left = Math.max(0, p.current_stock - currentInCart);
    toast(isBn ? `পর্যাপ্ত স্টক নেই! অবশিষ্ট স্টক: ${bnDigits(left)} ${p.unit}` : `Insufficient stock! Remaining: ${left} ${p.unit}`, true);
    return;
  }

  if (ex) {
    ex.qty = +(ex.qty + qty).toFixed(2);
    ex.price = price;
    ex.amount = +(ex.qty * ex.price).toFixed(2);
  } else {
    S.cart.push({
      product_id: p.id,
      name: p.name,
      unit: p.unit,
      qty,
      price,
      amount: +(qty * price).toFixed(2)
    });
  }

  ps.value = '';
  ps.dataset.pid = '';
  $('#pqty').value = '';
  $('#pprice').value = '';
  const qu = $('#qtyunit');
  if (qu) qu.textContent = '—';
  $('#cartbox').innerHTML = cartHtml();
  calcTotals();
}

function rmCart(i) {
  S.cart.splice(i, 1);
  $('#cartbox').innerHTML = cartHtml();
  calcTotals();
}

function cartHtml() {
  const isBn = window.LANG === 'bn';
  if (!S.cart.length) {
    return `<div class="empty">${isBn ? 'কার্ট খালি — উপরে পণ্য খুঁজে যোগ করুন' : 'Cart is empty — search & add items above'}</div>`;
  }
  return S.cart.map((c, i) => `
    <div class="cart-line">
      <div class="nm">
        ${esc(c.name)}
        <small>${isBn ? bnDigits(c.qty) : c.qty} ${esc(c.unit)} × ${money(c.price)}</small>
      </div>
      <b>${money(c.amount)}</b>
      <button class="btn sm dan" onclick="rmCart(${i})">✕</button>
    </div>`).join('');
}

function calcTotals() {
  const box = $('#totalsbox');
  if (box) box.innerHTML = totalsHtml();
}

function totalsHtml() {
  const isBn = window.LANG === 'bn';
  const sub = S.cart.reduce((s, c) => s + c.qty * c.price, 0);
  const disc = Math.max(0, parseFloat(($('#fdiscount') || {}).value) || 0);
  const vatP = parseFloat(($('#fvat') || {}).value) || 0;
  const vat = sub * vatP / 100;
  const total = Math.max(0, sub + vat - disc);
  const paid = Math.max(0, parseFloat(($('#fpaid') || {}).value) || 0);
  const due = total - paid;

  return `
    <div class="sumrow"><span>${isBn ? 'সাবটোটাল' : 'Subtotal'}</span><span>${money(sub)}</span></div>
    <div class="sumrow"><span>${isBn ? 'ছাড় (ডিসকাউন্ট)' : 'Discount'}</span><span>− ${money(disc)}</span></div>
    <div class="sumrow"><span>${isBn ? 'ভ্যাট' : 'VAT'} (${isBn ? bnDigits(vatP) : vatP}%)</span><span>+ ${money(vat)}</span></div>
    <div class="sumrow total"><span>${isBn ? 'সর্বমোট প্রদেয়' : 'Net Payable'}</span><span>${money(total)}</span></div>
    <div class="sumrow"><span>${isBn ? 'জমা টাকা' : 'Paid'}</span><span>${money(paid)}</span></div>
    <div class="sumrow duerow"><span>${isBn ? 'বকেয়া / বাকি' : 'Due (Baki)'}</span><span>${money(due)}</span></div>`;
}

function custChanged() {
  const nc = $('#newcust');
  if (nc) nc.style.display = ($('#custsel').value === 'new' ? 'block' : 'none');
}

function newCustInline() {
  const nc = $('#newcust');
  if (nc) {
    nc.style.display = (nc.style.display === 'none' ? 'block' : 'none');
    if (nc.style.display === 'block') $('#ncname').focus();
  }
}

async function saveInvoice(doPrint) {
  const isBn = window.LANG === 'bn';
  if (!S.cart.length) {
    toast(isBn ? 'কার্টে কোনো পণ্য নেই' : 'Cart is empty', true);
    return;
  }
  const custsel = $('#custsel').value;
  const body = {
    items: S.cart.map(c => ({ product_id: c.product_id, qty: c.qty, price: c.price })),
    discount: $('#fdiscount').value || 0,
    vat_percent: $('#fvat').value || 0,
    paid_amount: $('#fpaid').value || 0,
    note: $('#fnote').value
  };

  const ncDiv = $('#newcust');
  const ncName = (ncDiv && ncDiv.style.display !== 'none') ? $('#ncname').value.trim() : '';
  if (ncName) {
    body.customer = {
      name: ncName,
      phone: $('#ncphone').value,
      whatsapp_enabled: $('#ncwa').checked
    };
  } else if (+custsel > 0) {
    body.customer_id = +custsel;
  }

  try {
    const d = await api('/invoices', { method: 'POST', body });
    S.cart = [];
    invoiceSuccess(d.invoice, d.customer, doPrint);
  } catch (e) {
    toast(e.message, true);
  }
}

function invoiceSuccess(inv, customer, doPrint) {
  const isBn = window.LANG === 'bn';
  modal(`
    <div class="modal-h">
      <h3>${isBn ? `✅ চালান #${esc(inv.invoice_no)} সংরক্ষিত হয়েছে` : `✅ Invoice ${esc(inv.invoice_no)} saved`}</h3>
      <button class="modal-x" onclick="closeModal();router()">×</button>
    </div>
    <div class="modal-b">
      <div class="grid g2">
        <div class="stat">
          <div class="lab">${isBn ? 'সর্বমোট বিল' : 'Total'}</div>
          <div class="val">${money(inv.total)}</div>
        </div>
        <div class="stat ${inv.due > 0 ? 'due' : ''}">
          <div class="lab">${isBn ? 'বাকি' : 'Due (Baki)'}</div>
          <div class="val">${money(inv.due)}</div>
        </div>
      </div>
      <p style="margin-top:12px;font-size:13px;color:var(--mut)">
        📱 ${isBn ? 'কাস্টমার এসএমএস:' : 'Customer SMS:'} <b>${esc(inv.sms_status || 'pending')}</b>
      </p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
        <button class="btn grn" onclick="printInvoice(${inv.id})">${isBn ? '🖨️ মেমো প্রিভিউ ও প্রিন্ট' : '🖨️ Print Receipt'}</button>
        <button class="btn pri" onclick="closeModal();router()">${isBn ? 'সম্পন্ন' : 'Done'}</button>
      </div>
    </div>`);

  if (doPrint) {
    setTimeout(() => printInvoice(inv.id), 250);
  }
}

function cDrop() {
  const isBn = window.LANG === 'bn';
  const q = ($('#custsearch').value || '').trim().toLowerCase();
  const box = $('#cdrop');
  const list = (S.__customers || []).filter(c => {
    return ((c.name || '') + ' ' + (c.phone || '')).toLowerCase().includes(q);
  }).slice(0, 30);

  const cashTitle = isBn ? '🚶 নগদ কাস্টমার <small style="color:var(--mut)">(বাকি ছাড়া)</small>' : '🚶 Cash Customer <small style="color:var(--mut)">no due</small>';
  let html = `<div class="pi" onmousedown="pickCust(0, '${isBn ? 'নগদ কাস্টমার' : 'Cash Customer'}')"><span>${cashTitle}</span></div>`;

  html += list.map(c => {
    const dueTxt = c.total_due > 0 ? (isBn ? ('বাকি ' + bnDigits(c.total_due) + ' ৳') : ('due ' + c.total_due)) : (isBn ? 'বাকি নেই' : 'no due');
    return `
      <div class="pi" onmousedown="pickCust(${c.id}, this.dataset.nm)" data-nm="${esc(c.name)}">
        <span>${esc(c.name)} <small style="color:var(--mut)">${esc(c.phone || '')}</small></span>
        <span class="st">${dueTxt}</span>
      </div>`;
  }).join('');

  box.innerHTML = html;
  box.style.display = 'block';
}

function pickCust(id, name) {
  $('#custsel').value = id;
  $('#custsearch').value = name;
  $('#cdrop').style.display = 'none';
  const nc = $('#newcust');
  if (nc) nc.style.display = 'none';
}
