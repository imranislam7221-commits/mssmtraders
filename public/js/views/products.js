/* ---------- products ---------- */
VIEWS.products = async function () {
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  const { products } = await api('/products');
  const rows = products.slice().sort(prodSort).map(p => {
    const rawName = p.name || '';
    const pName = isBn ? (I18N_BN[rawName] || t(rawName) || rawName) : rawName;
    return `<tr>
    <td>
      <b>${esc(pName)}</b><br>
      <small style="color:var(--mut)">${esc(isBn ? bnCat(p.category) : p.category)}${p.size_mili ? ' • ' + (isBn ? bnDigits(p.size_mili) + ' মি.মি' : p.size_mili + 'mm') : ''}</small>
    </td>
    <td>${esc(isBn ? bnUnit(p.unit) : p.unit)}</td>
    <td class="num ${p.current_stock <= p.low_stock ? 'dueX' : ''}"><b>${isBn ? bnDigits(p.current_stock) : p.current_stock}</b></td>
    <td class="num">${money(p.purchase_price)}</td>
    <td class="num"><b>${money(p.selling_price)}</b></td>
    <td style="white-space:nowrap">
      <button class="btn sm grn" onclick="openStockIn(${p.id})">${isBn ? '+ স্টক ইন' : '+ Stock In'}</button>
      <button class="btn sm" onclick="editProduct(${p.id})">✏️</button>
      ${isOwner() ? `<button class="btn sm dan" onclick="delProduct(${p.id})">🗑️</button>` : ''}
    </td>
  </tr>`;
  }).join('') || `<tr><td colspan="6" class="empty">${isBn ? 'কোনো পণ্য পাওয়া যায়নি — নতুন পণ্য যোগ করুন' : 'No products — add your first product'}</td></tr>`;

  layout(`
    <div class="page-head">
      <div>
        <h1>${isBn ? 'পণ্য ও স্টক ব্যবস্থাপনা' : 'Products & Stock'}</h1>
        <div class="sub">${isBn ? 'মালের তালিকা, ক্রয় ও বিক্রয় মূল্য এবং স্টক নিয়ন্ত্রণ' : 'Manage inventory, prices and stock entries'}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <input id="psearch2" placeholder="${isBn ? '🔍 পণ্য খুঁজুন…' : '🔍 Search product…'}" style="width:220px" oninput="filterProducts(this.value)">
        <button class="btn pri" onclick="addProduct()">${isBn ? '+ নতুন পণ্য যোগ' : '+ Add Product'}</button>
    <div class="pill-group" style="margin-bottom:12px">
      <button type="button" class="cat-pill active" id="cp-all" onclick="filterByCat('all')">🏷️ ${isBn ? 'সব পণ্য' : 'All'}</button>
      <button type="button" class="cat-pill" id="cp-rod" onclick="filterByCat('Rod')">🏗️ ${isBn ? 'রড (Rod)' : 'Rod'}</button>
      <button type="button" class="cat-pill" id="cp-cement" onclick="filterByCat('Cement')">🧱 ${isBn ? 'সিমেন্ট (Cement)' : 'Cement'}</button>
      <button type="button" class="cat-pill" id="cp-brick" onclick="filterByCat('Brick')">🧱 ${isBn ? 'ইট (Bricks)' : 'Bricks'}</button>
      <button type="button" class="cat-pill" id="cp-sand" onclick="filterByCat('Sand')">🏖️ ${isBn ? 'বালি ও খোয়া' : 'Sand & Stone'}</button>
    </div>
    <div class="card">
      <div class="tblwrap">
        <table class="tbl" id="ptable">
          <tr>
            <th>${isBn ? 'পণ্য' : 'Product'}</th>
            <th>${isBn ? 'একক' : 'Unit'}</th>
            <th class="num">${isBn ? 'বর্তমান স্টক' : 'Current Stock'}</th>
            <th class="num">${isBn ? 'ক্রয় মূল্য' : 'Purchase Price'}</th>
            <th class="num">${isBn ? 'বিক্রয় মূল্য' : 'Selling Price'}</th>
            <th>${isBn ? 'অ্যাকশন' : 'Actions'}</th>
          </tr>
          ${rows}
        </table>
      </div>
    </div>`);
};

function productModal(p) {
  const isBn = window.LANG === 'bn';
  p = p || {};
  modal(`
    <div class="modal-h">
      <h3>${p.id ? (isBn ? 'পণ্য তথ্য সংশোধন' : 'Edit Product') : (isBn ? 'নতুন পণ্য যোগ' : 'Add New Product')}</h3>
      <button class="modal-x" onclick="closeModal()">×</button>
    </div>
    <div class="modal-b">
      <form id="pform">
        <label>${isBn ? 'পণ্যের নাম *' : 'Product Name *'}</label>
        <input name="name" required value="${esc(p.name || '')}" placeholder="${isBn ? 'যেমন: এম.এস রড ১২ মি.মি' : 'e.g. MS Rod 12mm'}">
        <div class="grid g2">
          <div>
            <label>${isBn ? 'ক্যাটাগরি' : 'Category'}</label>
            <input name="category" value="${esc(p.category || '')}" placeholder="${isBn ? 'রড / সিমেন্ট / ইট / বালি / টাইলস' : 'Rod / Cement / Tiles'}">
          </div>
          <div>
            <label>${isBn ? 'পরিমাপের একক (Unit)' : 'Unit'}</label>
            <select name="unit">
              ${['কেজি', 'টন', 'ব্যাগ', 'পিস', 'বর্গফুট', 'ঘনফুট', 'হাজার', 'বান্ডিল', 'লিটার', 'কার্টন', 'kg', 'ton', 'bag', 'pc', 'sft', 'cft'].map(u => `<option ${p.unit === u ? 'selected' : ''}>${u}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="grid g2">
          <div>
            <label>${isBn ? 'সাইজ (মি.মি — রডের জন্য)' : 'Size (mm — for Rod)'}</label>
            <input name="size_mili" type="number" step="0.5" value="${p.size_mili == null ? '' : p.size_mili}" placeholder="8, 10, 12, 16...">
          </div>
          <div>
            <label>${isBn ? 'কম স্টক সতর্কতার লেভেল' : 'Low Stock Alert Level'}</label>
            <input name="low_stock" type="number" value="${p.low_stock == null ? 10 : p.low_stock}">
          </div>
        </div>
        <div class="grid g2">
          <div>
            <label>${isBn ? 'ক্রয় মূল্য / কেনা দর (টাকা)' : 'Purchase Price (Tk)'}</label>
            <input name="purchase_price" type="number" step="0.01" value="${p.purchase_price || ''}">
          </div>
          <div>
            <label>${isBn ? 'বিক্রয় মূল্য / বেচা দর (টাকা)' : 'Selling Price (Tk)'}</label>
            <input name="selling_price" type="number" step="0.01" value="${p.selling_price || ''}">
          </div>
        </div>
        ${p.id ? '' : `<label>${isBn ? 'প্রারম্ভিক স্টক (ঐচ্ছিক)' : 'Opening Stock (optional)'}</label><input name="opening_stock" type="number" step="0.01" value="" placeholder="0">`}
        <br>
        <button class="btn pri blk">${isBn ? 'সংরক্ষণ করুন' : 'Save'}</button>
      </form>
    </div>`);

  $('#pform').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    const body = {
      name: f.name.value,
      category: f.category.value,
      unit: f.unit.value,
      size_mili: f.size_mili.value,
      low_stock: f.low_stock.value,
      purchase_price: f.purchase_price.value,
      selling_price: f.selling_price.value
    };
    try {
      if (p.id) {
        body.opening_stock = undefined;
        await api('/products/' + p.id, { method: 'PUT', body });
      } else {
        body.opening_stock = f.opening_stock ? f.opening_stock.value : 0;
        await api('/products', { method: 'POST', body });
      }
      closeModal();
      toast(isBn ? 'পণ্য সংরক্ষিত হয়েছে ✅' : 'Product saved ✅');
      router();
    } catch (ex) {
      toast(ex.message, true);
    }
  });
}

function addProduct() { productModal(null); }
async function editProduct(id) {
  const { products } = await api('/products');
  productModal(products.find(p => p.id === id));
}
async function delProduct(id) {
  const isBn = window.LANG === 'bn';
  askConfirm(isBn ? 'এই পণ্যটি স্থায়ীভাবে মুছে ফেলবেন?' : 'Delete this product permanently?', async function () {
    try {
      await api('/products/' + id, { method: 'DELETE' });
      toast(isBn ? 'পণ্য মুছে ফেলা হয়েছে' : 'Product deleted');
      router();
    } catch (e) {
      toast(e.message, true);
    }
  });
}

function openStockIn(pid) {
  api('/products').then(d => stockInModal(pid, d.products));
}

let SI_UNIT_MODE = 'kg';

function setSIUnitMode(mode) {
  SI_UNIT_MODE = mode;
  const bKg = $('#btn-si-kg'), bTon = $('#btn-si-ton');
  if (bKg) bKg.className = 'unit-btn ' + (mode === 'kg' ? 'active' : '');
  if (bTon) bTon.className = 'unit-btn ' + (mode === 'ton' ? 'active' : '');
  calcSIHint();
}

function calcSIHint() {
  const isBn = window.LANG === 'bn';
  const val = parseFloat(($('#si-qty-in') || {}).value) || 0;
  const hint = $('#si-conv-hint');
  if (!hint) return;
  if (SI_UNIT_MODE === 'ton') {
    const kg = Math.round(val * 1000 * 100) / 100;
    hint.innerHTML = isBn ? `➡️ <b>${bnDigits(kg)} কেজি</b> স্টকে জমা হবে` : `➡️ <b>${kg} kg</b> will be added to stock`;
    hint.style.display = val > 0 ? 'block' : 'none';
  } else {
    hint.style.display = 'none';
  }
}

function stockInModal(pid, products) {
  const isBn = (window.LANG || localStorage.getItem('pos_lang') || 'bn') === 'bn';
  SI_UNIT_MODE = 'kg';
  modal(`
    <div class="modal-h">
      <h3>📥 ${isBn ? 'স্টক ইন — মালামাল গ্রহণ' : 'Stock In — New Shipment'}</h3>
      <button class="modal-x" onclick="closeModal()">×</button>
    </div>
    <div class="modal-b">
      <form id="siform">
        <label>${isBn ? 'পণ্য নির্বাচন করুন *' : 'Product *'}</label>
        <select name="product_id" id="si-prod-sel" required>
          ${(products || []).slice().sort(prodSort).map(p => {
            const rawName = p.name || '';
            const pName = isBn ? (I18N_BN[rawName] || t(rawName) || rawName) : rawName;
            const pUnit = isBn ? bnUnit(p.unit) : p.unit;
            return `<option value="${p.id}" ${p.id === pid ? 'selected' : ''}>${esc(pName)} (${isBn ? 'বর্তমান: ' + bnDigits(p.current_stock) : 'now: ' + p.current_stock} ${esc(pUnit)})</option>`;
          }).join('')}
        </select>
        <div class="grid g2">
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <label style="margin-top:0">${isBn ? 'পরিমাণ (+) *' : 'Quantity (+) *'} <span id="siunit" style="color:var(--brand);font-weight:400"></span></label>
              <div id="si-unit-wrap" class="unit-switcher" style="display:none">
                <button type="button" class="unit-btn active" id="btn-si-kg" onclick="setSIUnitMode('kg')">কেজি (kg)</button>
                <button type="button" class="unit-btn" id="btn-si-ton" onclick="setSIUnitMode('ton')">টন (ton)</button>
              </div>
            </div>
            <input name="quantity" id="si-qty-in" type="number" step="0.001" required placeholder="${isBn ? 'যেমন: ১০০' : 'e.g. 100'}" oninput="calcSIHint()">
            <div id="si-conv-hint" class="conv-hint" style="display:none"></div>
          </div>
          <div>
            <label>${isBn ? 'কেনা দর / ইউনিট প্রতি খরচ (টাকা)' : 'Purchase Cost / unit (Tk)'} <span id="si-cost-hint" style="color:var(--mut);font-weight:400"></span></label>
            <input name="unit_cost" id="si-cost-in" type="number" step="0.01" placeholder="${isBn ? 'আগের দর থাকবে খালি রাখলে' : 'default = purchase price'}">
          </div>
        </div>
        <div class="grid g2">
          <div>
            <label>${isBn ? 'সাপ্লায়ার / মহাজন / মিল' : 'Supplier / Vendor Source'}</label>
            <input name="supplier" placeholder="${isBn ? 'যেমন: বিএসআরএম / আবুল খায়ের / মেঘনা' : 'e.g. BSRM / Abul Khair'}">
          </div>
          <div>
            <label>${isBn ? 'পেমেন্ট ধরন' : 'Payment Type'}</label>
            <select name="is_credit">
              <option value="1">${isBn ? 'বাকিতে চালান / কোম্পানি ক্রেডিট (ক্যাশ কাটবে না)' : 'Company Credit (no cash deduction)'}</option>
              <option value="0">${isBn ? 'নগদ ক্যাশ প্রদান (ক্যাশ ব্যালেন্স থেকে কাটবে)' : 'Cash Payment (deduct from cash)'}</option>
            </select>
          </div>
        </div>
        <label>${isBn ? 'নোট বা চালান নং (ঐচ্ছিক)' : 'Note (optional)'}</label>
        <input name="note" id="si-note-in" placeholder="${isBn ? 'চালান নম্বর বা মন্তব্য' : 'invoice no or remark'}">
        <br>
        <button class="btn grn blk">${isBn ? 'স্টকে যোগ করুন ➕' : 'Add Stock ➕'}</button>
      </form>
    </div>`);

  const sif = $('#siform');
  const updSI = function () {
    const p = (products || []).find(x => x.id === +sif.product_id.value);
    const u = $('#siunit');
    if (u) u.textContent = p ? '(' + p.unit + ')' : '';
    const isRodOrKg = p && (p.unit === 'kg' || p.unit === 'কেজি' || (p.category && p.category.toLowerCase().includes('rod')));
    const wrap = $('#si-unit-wrap');
    if (wrap) wrap.style.display = isRodOrKg ? 'inline-flex' : 'none';
    setSIUnitMode('kg');
  };
  sif.product_id.addEventListener('change', updSI);
  updSI();

  $('#siform').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    let qty = parseFloat(f.quantity.value) || 0;
    let note = f.note ? f.note.value.trim() : '';

    if (SI_UNIT_MODE === 'ton') {
      const tonVal = qty;
      qty = +(qty * 1000).toFixed(2);
      note = (note ? note + ' • ' : '') + `${tonVal} টন চালান`;
    }

    try {
      await api('/stockin', {
        method: 'POST',
        body: {
          product_id: +f.product_id.value,
          quantity: qty,
          unit_cost: f.unit_cost.value,
          supplier: f.supplier.value,
          is_credit: f.is_credit.value === '1',
          note
        }
      });
      closeModal();
      toast(isBn ? 'স্টক সফলভাবে বৃদ্ধি করা হয়েছে ✅' : 'Stock added ✅');
      router();
    } catch (ex) {
      toast(ex.message, true);
    }
  });
}

function filterProducts(q) {
  q = (q || '').toLowerCase();
  document.querySelectorAll("#ptable tr").forEach(function (tr, i) {
    if (i === 0) return;
    tr.style.display = tr.textContent.toLowerCase().includes(q) ? "" : "none";
  });
}

function filterByCat(cat) {
  document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
  const btn = $(`#cp-${cat.toLowerCase()}`);
  if (btn) btn.classList.add('active');

  document.querySelectorAll("#ptable tr").forEach(function (tr, i) {
    if (i === 0) return;
    if (cat === 'all') {
      tr.style.display = "";
    } else {
      tr.style.display = tr.textContent.toLowerCase().includes(cat.toLowerCase()) ? "" : "none";
    }
  });
}
