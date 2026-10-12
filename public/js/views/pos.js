/* ---------- POS / billing ---------- */
VIEWS.pos = async function () {
  const [{ products }, { customers }] = await Promise.all([
    api('/products'),
    api('/customers').catch(() => ({ customers: [] }))
  ]);
  S.__products = products;
  S.__customers = customers;
  S.cart = S.cart || [];
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';

  layout(`
    <div class="page-head">
      <div>
        <h1>${isBn ? 'বিক্রয় — দ্রুত বিলিং' : 'POS — Fast Billing'}</h1>
        <div class="sub">${isBn ? 'পণ্য নির্বাচন করুন → পরিমাণ ও দর দিন → মোট হিসাব স্বয়ংক্রিয়ভাবে হবে' : 'Select item → enter Qty & Price → totals auto-calculate'}</div>
      </div>
    </div>
    <div class="pos-grid">
      <div class="card">
        <div class="pos-card-head">
          <h3 class="pos-card-title">
            <span class="step-badge">${isBn ? '১' : '1'}</span>
            <span>${isBn ? 'মালামাল যোগ করুন' : 'Add Items'}</span>
          </h3>
          <button class="btn sm" type="button" onclick="openRodCalcModal()">⚖️ ${isBn ? 'রড ওজন ক্যালকুলেটর' : 'Rod Calculator'}</button>
        </div>
        <div class="psearch-wrap">
          <input id="psearch" placeholder="${isBn ? '🔍 মাল খুঁজুন (রড, সিমেন্ট, ইট, বালি, টাইলস...)' : '🔍 Search item (Rod, Cement, Tiles…)'}" autocomplete="off" oninput="pDrop()" onfocus="pDrop()">
          <div id="pdrop" class="pdrop" style="display:none"></div>
        </div>
        <div style="margin-top:10px">
          <div class="qtyrow" style="align-items:flex-end">
            <div style="flex:1.4">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                <label style="margin:0">${isBn ? 'পরিমাণ' : 'Qty'} (<span id="qtyunit" style="color:var(--brand)">—</span>) *</label>
                <div id="unit-switch-wrap" class="unit-switcher" style="display:none">
                  <button type="button" class="unit-btn active" id="btn-u-kg" onclick="setPosUnitMode('kg')">${isBn ? 'কেজি' : 'kg'}</button>
                  <button type="button" class="unit-btn" id="btn-u-ton" onclick="setPosUnitMode('ton')">${isBn ? 'টন' : 'ton'}</button>
                </div>
              </div>
              <input id="pqty" type="number" step="0.001" placeholder="${isBn ? 'পরিমাণ লিখুন' : 'Qty'}" onfocus="this.select()" oninput="onQtyChange()">
            </div>
            <div style="flex:1.4">
              <label style="margin:0 0 4px 0">${isBn ? 'বিক্রয় দর (৳)' : 'Price (Tk)'} <span id="priceunit" style="font-weight:400;color:var(--mut)"></span></label>
              <input id="pprice" type="number" step="0.01" placeholder="${isBn ? 'দর দিন' : 'Tk'}" onfocus="this.select()" oninput="onPriceChange()">
            </div>
            <div style="flex:1">
              <button class="btn pri blk" style="padding:10px 12px;white-space:nowrap" onclick="addToCart()">${isBn ? '+ কার্টে যোগ' : '+ Add'}</button>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px">
            <div id="conv-info" class="conv-hint" style="display:none;margin:0"></div>
            <div id="price-conv-info" class="conv-hint" style="display:none;margin:0"></div>
            <label style="margin:0 0 0 auto;display:inline-flex;align-items:center;gap:5px;font-size:11.5px;color:var(--mut);cursor:pointer" title="${isBn ? 'চেক করলে এই নতুন দরটি পণ্য তালিকায় স্থায়ীভাবে সেভ হয়ে থাকবে' : 'Save as default product price'}">
              <input type="checkbox" id="save-as-default-price" style="width:auto;margin:0">
              ${isBn ? 'স্থায়ী দর হিসেবে সেভ' : 'Save as default'}
            </label>
          </div>
        </div>
        <div class="pos-card-head" style="margin-top:22px">
          <h3 class="pos-card-title">
            <span class="step-badge">${isBn ? '২' : '2'}</span>
            <span>${isBn ? 'নির্বাচিত পণ্য (কার্ট)' : 'Cart'}</span>
          </h3>
        </div>
        <div id="cartbox">${cartHtml()}</div>
      </div>

      <div class="card">
        <div class="pos-card-head">
          <h3 class="pos-card-title">
            <span class="step-badge">${isBn ? '৩' : '3'}</span>
            <span>${isBn ? 'কাস্টমার ও পেমেন্ট' : 'Customer & Payment'}</span>
          </h3>
        </div>
        <label>${isBn ? 'কাস্টমার নির্বাচন (নাম বা মোবাইল নম্বর দিয়ে খুঁজুন)' : 'Customer (search by name/phone)'}</label>
        <div class="psearch-wrap">
          <input id="custsearch" placeholder="${isBn ? '🔍 কাস্টমারের নাম বা ফোন নম্বর লিখুন...' : '🔍 Customer name/phone…'}" autocomplete="off" oninput="cDrop()" onfocus="cDrop()">
          <div id="cdrop" class="pdrop" style="display:none"></div>
        </div>
        <input type="hidden" id="custsel" value="0">
        <div id="cust-selected-card" style="display:none;background:#f8fafc;border:1px solid var(--line);border-radius:8px;padding:8px 10px;margin-top:8px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span id="cust-card-name" style="font-weight:700;color:var(--text);font-size:13px"></span>
            <span id="cust-card-due" class="badge"></span>
          </div>
          <div style="margin-top:4px;display:flex;gap:6px;align-items:center;color:var(--mut);font-size:12px">
            <span>📞</span><span id="cust-card-phone">—</span>
          </div>
          <div style="margin-top:6px;display:flex;gap:6px;align-items:center">
            <span style="font-size:12px">🏠</span>
            <input id="cust-card-address" style="flex:1;padding:4px 8px;font-size:12px;background:#fff;border:1px solid var(--line);border-radius:4px" placeholder="${isBn ? 'ঠিকানা (গ্রাম/এলাকা লিখুন বা সংশোধন করুন)' : 'Address (village/area)'}">
          </div>
        </div>
        <button class="btn sm" style="margin-top:6px" onclick="newCustInline()">${isBn ? '+ নতুন কাস্টমার' : '+ New customer'}</button>

        <div id="newcust" style="display:none;background:#f8fafc;padding:12px;border-radius:8px;margin-top:8px;border:1px solid var(--line)">
          <div style="font-weight:700;font-size:13px;color:var(--brand);margin-bottom:6px">📝 ${isBn ? 'নতুন কাস্টমারের তথ্য' : 'New Customer Details'}</div>
          <label style="margin-top:0">${isBn ? 'নতুন কাস্টমারের নাম *' : 'New Customer Name *'}</label>
          <input id="ncname" placeholder="${isBn ? 'কাস্টমারের নাম' : 'Name'}">
          <label style="margin-top:6px">${isBn ? 'ঠিকানা (গ্রাম / এলাকা)' : 'Address'}</label>
          <input id="ncaddress" placeholder="${isBn ? 'যেমন: দর্শনা পুরাতন বাজার, চুয়াডাঙ্গা' : 'e.g. Village/Area'}">
          <label style="margin-top:6px">${isBn ? 'মোবাইল নম্বর' : 'Phone'}</label>
          <input id="ncphone" placeholder="${isBn ? '০১XXXXXXXXX' : '01XXXXXXXXX'}">
          <label style="display:flex;gap:6px;align-items:center;margin-top:8px;cursor:pointer">
            <input type="checkbox" id="ncwa" style="width:auto"> ${isBn ? 'হোয়াটসঅ্যাপ চালু (রসিদ যাবে হোয়াটসঅ্যাপে)' : 'WhatsApp enabled'}
          </label>
        </div>

        <label style="margin-top:12px">${isBn ? 'জমা টাকা (৳)' : 'Paid Amount (Tk)'}</label>
        <input id="fpaid" type="number" step="0.01" placeholder="${isBn ? '০.০০' : '0.00'}" onfocus="this.select()" oninput="calcTotals()">

        <div class="grid g2" style="margin-top:10px">
          <div>
            <label style="margin-top:0">${isBn ? 'মূল্য ছাড় (৳)' : 'Discount (Tk)'}</label>
            <input id="fdiscount" type="number" step="0.01" placeholder="${isBn ? '০.০০' : '0.00'}" onfocus="this.select()" oninput="calcTotals()">
          </div>
          <div>
            <label style="margin-top:0">${isBn ? 'ভ্যাট (%)' : 'VAT (%)'}</label>
            <input id="fvat" type="number" step="0.01" placeholder="${isBn ? '০' : '0'}" onfocus="this.select()" oninput="calcTotals()">
          </div>
        </div>

        <div style="margin-top:10px" id="totalsbox">${totalsHtml()}</div>

        <label>${isBn ? 'মন্তব্য (ঐচ্ছিক)' : 'Note (optional)'}</label>
        <input id="fnote" placeholder="${isBn ? 'যেকোনো নোট বা মন্তব্য...' : 'any remark'}">

        <div style="display:flex;gap:8px;margin-top:14px">
          <button class="btn pri blk" onclick="saveInvoice(false)">${isBn ? '💾 শুধু সংরক্ষণ করুন' : '💾 Save'}</button>
          <button class="btn grn blk" onclick="saveInvoice(true)">${isBn ? '🖨️ সংরক্ষণ ও মেমো প্রিন্ট' : '🖨️ Save & Print'}</button>
        </div>
      </div>
    </div>`, true);
};

function pDrop() {
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  const q = ($('#psearch').value || '').trim().toLowerCase();
  const box = $('#pdrop');
  const list = (S.__products || []).filter(p => {
    const rawN = (p.name || '').toLowerCase();
    const rawC = (p.category || '').toLowerCase();
    const bnN = (t(p.name) || '').toLowerCase();
    const bnC = (bnCat(p.category) || '').toLowerCase();
    return rawN.includes(q) || rawC.includes(q) || bnN.includes(q) || bnC.includes(q);
  }).sort(prodSort).slice(0, 60);

  if (!list.length) {
    box.innerHTML = `<div class="pi dis">${isBn ? 'কোনো পণ্য পাওয়া যায়নি' : 'No product found'}</div>`;
    box.style.display = 'block';
    return;
  }

  box.innerHTML = list.map(p => {
    const rawName = p.name || '';
    const pName = isBn ? (I18N_BN[rawName] || t(rawName) || rawName) : rawName;
    const pCat = isBn ? bnCat(p.category) : p.category;
    const pUnit = isBn ? bnUnit(p.unit) : p.unit;
    const sizeStr = p.size_mili ? ' • ' + (isBn ? p.size_mili + ' মি.লি' : p.size_mili + 'mm') : '';
    const stockStr = isBn ? ('স্টক ' + bnDigits(p.current_stock) + ' ' + pUnit) : ('stock ' + p.current_stock + ' ' + p.unit);
    const priceStr = (isBn ? '৳ ' + bnDigits(p.selling_price) : money(p.selling_price)) + ' / ' + esc(pUnit);
    const dis = p.current_stock <= 0 ? 'dis' : '';
    return `
      <div class="pi ${dis}" onmousedown="pickProduct(${p.id})">
        <span>${esc(pName)} <small style="color:var(--mut)">${esc(pCat)}${sizeStr}</small></span>
        <span class="st">${priceStr} • ${stockStr}</span>
      </div>`;
  }).join('');
  box.style.display = 'block';
}

let POS_UNIT_MODE = 'kg';

function setPosUnitMode(mode) {
  POS_UNIT_MODE = mode;
  const bKg = $('#btn-u-kg'), bTon = $('#btn-u-ton');
  if (bKg) bKg.className = 'unit-btn ' + (mode === 'kg' ? 'active' : '');
  if (bTon) bTon.className = 'unit-btn ' + (mode === 'ton' ? 'active' : '');
  const qu = $('#qtyunit');
  if (qu) qu.textContent = (mode === 'ton' ? 'টন' : 'কেজি');
  onQtyChange();
}

function onQtyChange() {
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  const val = parseFloat($('#pqty').value) || 0;
  const conv = $('#conv-info');
  const prConv = $('#price-conv-info');
  const pr = parseFloat($('#pprice').value) || 0;

  if (!conv) return;
  if (POS_UNIT_MODE === 'ton') {
    const kg = Math.round(val * 1000 * 100) / 100;
    conv.innerHTML = isBn ? `➡️ <b>${bnDigits(kg)} কেজি</b> (১ টন = ১০০০ কেজি)` : `➡️ <b>${kg} kg</b> (1 ton = 1000 kg)`;
    conv.style.display = val > 0 ? 'block' : 'none';
    if (prConv) {
      const tonPrice = Math.round(pr * 1000);
      prConv.innerHTML = isBn ? `প্রতি টন: <b>${money(tonPrice)}</b>` : `Per ton: <b>${money(tonPrice)}</b>`;
      prConv.style.display = pr > 0 ? 'block' : 'none';
    }
  } else {
    if (val >= 1000) {
      const tons = (val / 1000).toFixed(3);
      conv.innerHTML = isBn ? `💡 বা <b>${bnDigits(tons)} টন</b>` : `💡 or <b>${tons} ton</b>`;
      conv.style.display = 'block';
    } else {
      conv.style.display = 'none';
    }
    if (prConv) prConv.style.display = 'none';
  }
}

function onPriceChange() {
  onQtyChange();
}

function pickProduct(id, customQty) {
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  const p = S.__products.find(x => x.id === id);
  if (!p) return;
  const rawName = p.name || '';
  const pName = isBn ? (I18N_BN[rawName] || t(rawName) || rawName) : rawName;
  $('#psearch').value = pName;
  $('#psearch').dataset.pid = p.id;
  $('#pdrop').style.display = 'none';
  $('#pprice').value = p.selling_price;

  const isRodOrKg = (p.unit === 'kg' || p.unit === 'কেজি' || (p.category && (p.category.toLowerCase().includes('rod') || p.category.includes('রড'))));
  const sw = $('#unit-switch-wrap');
  if (sw) sw.style.display = isRodOrKg ? 'inline-flex' : 'none';

  setPosUnitMode('kg');
  const pUnit = isBn ? bnUnit(p.unit) : p.unit;
  const qu = $('#qtyunit');
  if (qu) qu.textContent = pUnit;
  const pu = $('#priceunit');
  if (pu) pu.textContent = `/${pUnit}`;

  $('#pqty').value = (customQty != null && customQty > 0) ? customQty : '';
  onQtyChange();
  $('#pqty').focus();
}

function addToCart() {
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  const ps = $('#psearch');
  let p = S.__products.find(x => x.id === +ps.dataset.pid) ||
          S.__products.find(x => (x.name || '').toLowerCase() === (ps.value || '').trim().toLowerCase());

  if (!p) {
    toast(isBn ? 'তালিকা থেকে পণ্য নির্বাচন করুন' : 'Select item from list', true);
    return;
  }
  let qty = parseFloat($('#pqty').value);
  const price = parseFloat($('#pprice').value);

  if (!(qty > 0)) {
    toast(isBn ? 'সঠিক পরিমাণ লিখুন' : 'Enter quantity', true);
    return;
  }
  if (!(price >= 0)) {
    toast(isBn ? 'সঠিক দর দিন' : 'Enter valid price', true);
    return;
  }

  let enteredTon = null;
  if (POS_UNIT_MODE === 'ton' && (p.unit === 'kg' || p.unit === 'কেজি' || (p.category && (p.category.toLowerCase().includes('rod') || p.category.includes('রড'))))) {
    enteredTon = qty;
    qty = +(qty * 1000).toFixed(2);
  }

  const ex = S.cart.find(c => c.product_id === p.id);
  const currentInCart = ex ? ex.qty : 0;
  if ((currentInCart + qty) > (p.current_stock + 0.001)) {
    const left = Math.max(0, p.current_stock - currentInCart);
    const unitText = isBn ? bnUnit(p.unit) : p.unit;
    toast(isBn ? `পর্যাপ্ত স্টক নেই! অবশিষ্ট স্টক: ${bnDigits(left)} ${unitText}` : `Insufficient stock! Remaining: ${left} ${p.unit}`, true);
    return;
  }

  const rawName = p.name || '';
  const pName = isBn ? (I18N_BN[rawName] || t(rawName) || rawName) : rawName;
  const pUnit = isBn ? bnUnit(p.unit) : p.unit;

  if (ex) {
    ex.qty = +(ex.qty + qty).toFixed(2);
    ex.price = price;
    ex.amount = +(ex.qty * ex.price).toFixed(2);
    if (enteredTon) ex.ton_qty = +((ex.ton_qty || 0) + enteredTon).toFixed(3);
  } else {
    S.cart.push({
      product_id: p.id,
      name: pName,
      unit: pUnit,
      qty,
      ton_qty: enteredTon,
      price,
      amount: +(qty * price).toFixed(2)
    });
  }

  const saveDef = $('#save-as-default-price');
  if (saveDef && saveDef.checked && price > 0 && p) {
    p.selling_price = price;
    api('/products/' + p.id, { method: 'PUT', body: { selling_price: price } }).then(() => {
      toast(isBn ? `পণ্য তালিকায় স্থায়ী দর ৳${bnDigits(price)} সেট করা হয়েছে ✅` : `Default price updated to ${price} ✅`);
    }).catch(console.error);
    saveDef.checked = false;
  }

  ps.value = '';
  ps.dataset.pid = '';
  $('#pqty').value = '';
  $('#pprice').value = '';
  if (saveDef) saveDef.checked = false;
  const sw = $('#unit-switch-wrap');
  if (sw) sw.style.display = 'none';
  const conv = $('#conv-info');
  if (conv) conv.style.display = 'none';
  const prConv = $('#price-conv-info');
  if (prConv) prConv.style.display = 'none';
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
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  if (!S.cart.length) {
    return `<div class="empty">${isBn ? 'কার্ট খালি — উপরে মাল খুঁজে যোগ করুন' : 'Cart is empty — search & add items above'}</div>`;
  }
  return S.cart.map((c, i) => {
    const rawName = c.name || '';
    const cName = isBn ? (I18N_BN[rawName] || t(rawName) || rawName) : rawName;
    const cUnit = isBn ? bnUnit(c.unit) : c.unit;
    const tonNote = c.ton_qty ? ` <span style="color:var(--brand);font-weight:600">(${isBn ? bnDigits(c.ton_qty) + ' টন' : c.ton_qty + ' ton'})</span>` : '';
    return `
    <div class="cart-line">
      <div class="nm">
        ${esc(cName)}
        <small>${isBn ? bnDigits(c.qty) : c.qty} ${esc(cUnit)}${tonNote} × ${money(c.price)}</small>
      </div>
      <b>${money(c.amount)}</b>
      <button class="btn sm dan" onclick="rmCart(${i})">✕</button>
    </div>`;
  }).join('');
}

function calcTotals() {
  const box = $('#totalsbox');
  if (box) box.innerHTML = totalsHtml();
}

function totalsHtml() {
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  const sub = S.cart.reduce((s, c) => s + c.qty * c.price, 0);
  const disc = Math.max(0, parseFloat(($('#fdiscount') || {}).value) || 0);
  const vatP = parseFloat(($('#fvat') || {}).value) || 0;
  const vat = sub * vatP / 100;
  const total = Math.max(0, sub + vat - disc);
  const paid = Math.max(0, parseFloat(($('#fpaid') || {}).value) || 0);
  
  const custId = +($('#custsel') ? $('#custsel').value : 0);
  const c = custId ? (S.__customers || []).find(x => x.id === custId) : null;
  const prevDue = c ? (c.total_due || 0) : 0;

  if (prevDue > 0) {
    const grandTotal = total + prevDue;
    const netRem = Math.max(0, grandTotal - paid);
    return `
      <div class="sumrow"><span>${isBn ? 'সাবটোটাল' : 'Subtotal'}</span><span>${money(sub)}</span></div>
      ${disc > 0 ? `<div class="sumrow"><span>${isBn ? 'ছাড় (ডিসকাউন্ট)' : 'Discount'}</span><span>− ${money(disc)}</span></div>` : ''}
      ${vat > 0 ? `<div class="sumrow"><span>${isBn ? 'ভ্যাট' : 'VAT'} (${isBn ? bnDigits(vatP) : vatP}%)</span><span>+ ${money(vat)}</span></div>` : ''}
      <div class="sumrow"><span>${isBn ? 'চলতি বিল' : 'Current Bill'}</span><span>${money(total)}</span></div>
      <div class="sumrow" style="color:var(--brand,#d97706);font-weight:600"><span>${isBn ? 'পূর্বের বকেয়া' : 'Previous Due'}</span><span>${money(prevDue)}</span></div>
      <div class="sumrow total"><span>${isBn ? 'সর্বমোট পাওনা (বিল + বকেয়া)' : 'Grand Total Due'}</span><span>${money(grandTotal)}</span></div>
      <div class="sumrow"><span>${isBn ? 'জমা টাকা' : 'Paid'}</span><span>${money(paid)}</span></div>
      <div class="sumrow duerow"><span style="color:var(--red,#dc2626)">${isBn ? 'অবশিষ্ট সর্বমোট বাকি' : 'Net Remaining Due'}</span><span>${money(netRem)}</span></div>`;
  }

  const due = Math.max(0, total - paid);
  return `
    <div class="sumrow"><span>${isBn ? 'সাবটোটাল' : 'Subtotal'}</span><span>${money(sub)}</span></div>
    ${disc > 0 ? `<div class="sumrow"><span>${isBn ? 'ছাড় (ডিসকাউন্ট)' : 'Discount'}</span><span>− ${money(disc)}</span></div>` : ''}
    ${vat > 0 ? `<div class="sumrow"><span>${isBn ? 'ভ্যাট' : 'VAT'} (${isBn ? bnDigits(vatP) : vatP}%)</span><span>+ ${money(vat)}</span></div>` : ''}
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
    if (nc.style.display === 'block') {
      $('#ncname').focus();
      $('#custsel').value = 0;
      $('#custsearch').value = '';
      const sc = $('#cust-selected-card');
      if (sc) sc.style.display = 'none';
    }
  }
}

async function saveInvoice(doPrint) {
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
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
      address: $('#ncaddress') ? $('#ncaddress').value.trim() : '',
      phone: $('#ncphone') ? $('#ncphone').value.trim() : '',
      whatsapp_enabled: $('#ncwa') ? $('#ncwa').checked : false
    };
  } else if (+custsel > 0) {
    body.customer_id = +custsel;
    const cardAddr = $('#cust-card-address') ? $('#cust-card-address').value.trim() : '';
    if (cardAddr) {
      body.customer_address = cardAddr;
    }
  }

  try {
    const d = await api('/invoices', { method: 'POST', body });
    S.cart = [];
    invoiceSuccess(d.invoice, d.customer, doPrint);
  } catch (e) {
    if (!navigator.onLine || e.message.includes('fetch') || e.message.includes('Network') || e.message.includes('অফলাইন') || e.message.includes('503')) {
      const sub = S.cart.reduce((s, c) => s + c.qty * c.price, 0);
      const disc = +body.discount || 0;
      const vatP = +body.vat_percent || 0;
      const vat = sub * vatP / 100;
      const total = Math.max(0, sub + vat - disc);
      const paid = +body.paid_amount || 0;
      const due = total - paid;
      const offlineId = 'OFF-' + Math.floor(1000 + Math.random() * 9000);
      const offlineCust = body.customer ? { name: body.customer.name, address: body.customer.address, phone: body.customer.phone } : (S.__customers.find(c => c.id === body.customer_id) || { name: 'নগদ কাস্টমার' });
      const offlineInv = {
        id: offlineId,
        invoice_no: offlineId,
        date: new Date().toISOString(),
        items: S.cart.map(c => {
          const p = (S.__products || []).find(x => x.id === c.product_id) || {};
          return {
            product_id: c.product_id,
            product_name: p.name || '',
            category: p.category || '',
            unit: p.unit || '',
            qty: c.qty,
            unit_price: c.price,
            total_price: c.qty * c.price
          };
        }),
        subtotal: sub,
        discount: disc,
        vat_percent: vatP,
        vat_amount: vat,
        total,
        paid_amount: paid,
        due_amount: due,
        customer_id: body.customer_id || null,
        customer_name: offlineCust.name,
        customer_address: offlineCust.address || '',
        customer_phone: offlineCust.phone || '',
        note: body.note,
        is_offline: true
      };

      if (window.MST_OFFLINE) {
        window.MST_OFFLINE.addInvoice(body, offlineInv);
      }
      S.cart = [];
      invoiceSuccess(offlineInv, offlineCust, doPrint);
      toast('📴 অফলাইন মোড: চালান #' + offlineId + ' লোকালি সেভ হয়েছে। নেট পেলেই অটো গুগল শিটে সিঙ্ক হবে!');
      return;
    }
    toast(e.message, true);
  }
}

function invoiceSuccess(inv, customer, doPrint) {
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
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
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
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
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  $('#custsel').value = id;
  $('#custsearch').value = name;
  $('#cdrop').style.display = 'none';
  const nc = $('#newcust');
  if (nc) nc.style.display = 'none';

  const card = $('#cust-selected-card');
  if (!card) return;
  if (!id) {
    card.style.display = 'none';
    return;
  }
  const c = (S.__customers || []).find(x => x.id === id);
  if (c) {
    $('#cust-card-name').textContent = c.name;
    $('#cust-card-phone').textContent = c.phone || (isBn ? 'ফোন নম্বর নেই' : 'No phone');
    const dueEl = $('#cust-card-due');
    if (c.total_due > 0) {
      dueEl.className = 'badge dan';
      dueEl.textContent = isBn ? `পূর্বের বাকি: ৳${bnDigits(c.total_due)}` : `Due: Tk ${c.total_due}`;
    } else {
      dueEl.className = 'badge grn';
      dueEl.textContent = isBn ? 'বাকি নেই' : 'No due';
    }
    const addrInput = $('#cust-card-address');
    if (addrInput) {
      addrInput.value = c.address || '';
      addrInput.oninput = () => { c.address = addrInput.value.trim(); };
    }
    card.style.display = 'block';
  } else {
    card.style.display = 'none';
  }
  calcTotals();
}

/* ---------- Rod & Ton Weight Calculator Modal ---------- */
function openRodCalcModal() {
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  modal(`
    <div class="modal-h">
      <h3>⚖️ ${isBn ? 'রড ওজন ও টন ⇄ কেজি ক্যালকুলেটর' : 'Rod Weight & Ton-Kg Calculator'}</h3>
      <button class="modal-x" onclick="closeModal()">×</button>
    </div>
    <div class="modal-b" style="padding:14px">
      <div style="background:#fffbeb;border:1px solid #fef3c7;border-radius:8px;padding:10px 12px;margin-bottom:12px;font-size:12.5px;color:#92400e">
        <b>💡 নোট:</b> ১ টন = ১,০০০ কেজি (1 Ton = 1000 Kg)। স্ট্যান্ডার্ড রডের ১টি বারের দৈর্ঘ্য = ১২ মিটার (~৪০ ফুট)।
      </div>

      <div class="grid g2" style="margin-bottom:12px">
        <div style="background:#f8fafc;padding:12px;border-radius:8px;border:1px solid var(--line)">
          <h4 style="margin:0 0 8px 0;font-size:13.5px">🔄 ${isBn ? '১. টন থেকে কেজি রূপান্তর' : '1. Ton to Kg Converter'}</h4>
          <label style="margin-top:0">${isBn ? 'টনের পরিমাণ' : 'Ton'}</label>
          <input id="calc-ton-in" type="number" step="0.001" placeholder="${isBn ? 'যেমন: ২.৫' : 'e.g. 2.5'}" onfocus="this.select()" oninput="calcTonToKg()">
          <div id="calc-ton-out" style="font-size:13px;font-weight:700;color:var(--brand);margin-top:6px">—</div>
          <button class="btn sm pri" style="margin-top:8px" onclick="applyCalcToPos('ton')">${isBn ? '📥 বিলে বসান' : 'Apply to POS'}</button>
        </div>

        <div style="background:#f8fafc;padding:12px;border-radius:8px;border:1px solid var(--line)">
          <h4 style="margin:0 0 8px 0;font-size:13.5px">🔄 ${isBn ? '২. কেজি থেকে টন রূপান্তর' : '2. Kg to Ton Converter'}</h4>
          <label style="margin-top:0">${isBn ? 'কেজির পরিমাণ' : 'Kg'}</label>
          <input id="calc-kg-in" type="number" step="1" placeholder="${isBn ? 'যেমন: ১৫০০' : 'e.g. 1500'}" onfocus="this.select()" oninput="calcKgToTon()">
          <div id="calc-kg-out" style="font-size:13px;font-weight:700;color:var(--brand);margin-top:6px">—</div>
          <button class="btn sm pri" style="margin-top:8px" onclick="applyCalcToPos('kg')">${isBn ? '📥 বিলে বসান' : 'Apply to POS'}</button>
        </div>
      </div>

      <div style="background:#f8fafc;padding:12px;border-radius:8px;border:1px solid var(--line)">
        <h4 style="margin:0 0 8px 0;font-size:13.5px">📏 ${isBn ? '৩. রডের সাইজ ও পিস থেকে আনুমানিক ওজন' : '3. Estimate Weight by Bar Count'}</h4>
        <div class="grid g2">
          <div>
            <label style="margin-top:0">${isBn ? 'রড সাইজ (মি.লি)' : 'Rod Size (mm)'}</label>
            <select id="calc-rod-size" onchange="calcBarWeight()">
              <option value="0.395" data-mili="8">8 মি.লি (8mm) — ~৪.৭৪ কেজি/বার</option>
              <option value="0.617" data-mili="10">10 মি.লি (10mm) — ~৭.৪০ কেজি/বার</option>
              <option value="0.888" data-mili="12" selected>12 মি.লি (12mm) — ~১০.৬৬ কেজি/বার</option>
              <option value="1.580" data-mili="16">16 মি.লি (16mm) — ~১৮.৯৬ কেজি/বার</option>
              <option value="2.470" data-mili="20">20 মি.লি (20mm) — ~২৯.৬৪ কেজি/বার</option>
              <option value="2.980" data-mili="22">22 মি.লি (22mm) — ~৩৫.৭৬ কেজি/বার</option>
              <option value="3.850" data-mili="25">25 মি.লি (25mm) — ~৪৬.২০ কেজি/বার</option>
            </select>
          </div>
          <div>
            <label style="margin-top:0">${isBn ? 'পিস / বারের সংখ্যা (১২ মিটার বার)' : 'Total Pieces / Bars'}</label>
            <input id="calc-bar-pcs" type="number" step="1" placeholder="${isBn ? 'যেমন: ১০' : 'e.g. 10'}" onfocus="this.select()" oninput="calcBarWeight()">
          </div>
        </div>
        <div id="calc-bar-result" style="margin-top:8px;font-size:13.5px;font-weight:700;color:var(--brand)">—</div>
        <button class="btn sm grn" style="margin-top:8px" onclick="applyBarWeightToPos()">${isBn ? '📥 এই ওজন ও মাল বিলে বসান' : 'Apply Weight & Product to POS'}</button>
      </div>
    </div>`);

  setTimeout(() => {
    // If a rod is already selected in POS, pre-select its size
    const curPid = +($('#psearch') && $('#psearch').dataset ? ($('#psearch').dataset.pid || 0) : 0);
    const curP = curPid ? (S.__products || []).find(x => x.id === curPid) : null;
    if (curP && curP.size_mili && $('#calc-rod-size')) {
      const opt = Array.from($('#calc-rod-size').options).find(o => +o.dataset.mili === +curP.size_mili);
      if (opt) opt.selected = true;
    }
    calcTonToKg();
    calcKgToTon();
    calcBarWeight();
  }, 50);
}

function calcTonToKg() {
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  const val = parseFloat($('#calc-ton-in').value) || 0;
  const kg = Math.round(val * 1000 * 100) / 100;
  $('#calc-ton-out').innerHTML = isBn ? `মোট: <b>${bnDigits(kg)} কেজি</b>` : `Total: <b>${kg} kg</b>`;
}

function calcKgToTon() {
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  const val = parseFloat($('#calc-kg-in').value) || 0;
  const ton = (val / 1000).toFixed(3);
  $('#calc-kg-out').innerHTML = isBn ? `মোট: <b>${bnDigits(ton)} টন</b>` : `Total: <b>${ton} Ton</b>`;
}

function calcBarWeight() {
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  const wtPerM = parseFloat($('#calc-rod-size').value) || 0.888;
  const pcs = parseFloat($('#calc-bar-pcs').value) || 0;
  if (pcs > 0) {
    const totalKg = Math.round(wtPerM * 12 * pcs * 100) / 100;
    const totalTon = (totalKg / 1000).toFixed(3);
    $('#calc-bar-result').innerHTML = isBn
      ? `আনুমানিক মোট ওজন: <b>${bnDigits(totalKg)} কেজি</b> (${bnDigits(totalTon)} টন)`
      : `Estimated Weight: <b>${totalKg} kg</b> (${totalTon} Ton)`;
    $('#calc-bar-result').dataset.kg = totalKg;
  } else {
    $('#calc-bar-result').innerHTML = '—';
    $('#calc-bar-result').dataset.kg = 0;
  }
}

function applyCalcToPos(type) {
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  if (type === 'ton') {
    const tonVal = parseFloat($('#calc-ton-in').value) || 0;
    if (tonVal > 0) {
      setPosUnitMode('ton');
      $('#pqty').value = tonVal;
      onQtyChange();
      closeModal();
      $('#pqty').focus();
      toast(isBn ? `টনের পরিমাণ (${bnDigits(tonVal)} টন) বিলে বসানো হয়েছে ✅` : `Applied ${tonVal} ton to POS ✅`);
    }
  } else {
    const kgVal = parseFloat($('#calc-kg-in').value) || 0;
    if (kgVal > 0) {
      setPosUnitMode('kg');
      $('#pqty').value = kgVal;
      onQtyChange();
      closeModal();
      $('#pqty').focus();
      toast(isBn ? `কেজির পরিমাণ (${bnDigits(kgVal)} কেজি) বিলে বসানো হয়েছে ✅` : `Applied ${kgVal} kg to POS ✅`);
    }
  }
}

function applyBarWeightToPos() {
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  const kg = parseFloat($('#calc-bar-result').dataset.kg) || 0;
  if (!(kg > 0)) {
    toast(isBn ? 'সঠিক পিস সংখ্যা দিন' : 'Enter valid piece count', true);
    return;
  }

  const sel = $('#calc-rod-size');
  const selOpt = sel ? sel.options[sel.selectedIndex] : null;
  const mili = selOpt ? +selOpt.dataset.mili : null;

  const curPid = +($('#psearch') && $('#psearch').dataset ? ($('#psearch').dataset.pid || 0) : 0);
  const curP = curPid ? (S.__products || []).find(x => x.id === curPid) : null;

  let targetProduct = curP;
  if (!targetProduct || (mili && +targetProduct.size_mili !== mili)) {
    targetProduct = (S.__products || []).find(p => +p.size_mili === mili && ((p.category || '').includes('রড') || (p.category || '').toLowerCase().includes('rod')));
  }

  if (targetProduct) {
    pickProduct(targetProduct.id, kg);
    toast(isBn ? `🎯 ${targetProduct.name} ও ওজন (${bnDigits(kg)} কেজি) বিলে যুক্ত হয়েছে ✅` : `Applied ${targetProduct.name} (${kg} kg) ✅`);
  } else {
    setPosUnitMode('kg');
    $('#pqty').value = kg;
    onQtyChange();
    toast(isBn ? `ওজন (${bnDigits(kg)} কেজি) বিলে যুক্ত হয়েছে ✅` : `Applied ${kg} kg to POS ✅`);
  }
  closeModal();
  $('#pqty').focus();
}
