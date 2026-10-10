/* ---------- products ---------- */
VIEWS.products = async function () {
  const isBn = window.LANG === 'bn';
  const { products } = await api('/products');
  const rows = products.slice().sort(prodSort).map(p => `<tr>
    <td>
      <b>${esc(p.name)}</b><br>
      <small style="color:var(--mut)">${esc(p.category)}${p.size_mili ? ' • ' + (isBn ? bnDigits(p.size_mili) + ' মি.মি' : p.size_mili + 'mm') : ''}</small>
    </td>
    <td>${esc(p.unit)}</td>
    <td class="num ${p.current_stock <= p.low_stock ? 'dueX' : ''}"><b>${isBn ? bnDigits(p.current_stock) : p.current_stock}</b></td>
    <td class="num">${money(p.purchase_price)}</td>
    <td class="num"><b>${money(p.selling_price)}</b></td>
    <td style="white-space:nowrap">
      <button class="btn sm grn" onclick="openStockIn(${p.id})">${isBn ? '+ স্টক ইন' : '+ Stock In'}</button>
      <button class="btn sm" onclick="editProduct(${p.id})">✏️</button>
      ${isOwner() ? `<button class="btn sm dan" onclick="delProduct(${p.id})">🗑️</button>` : ''}
    </td>
  </tr>`).join('') || `<tr><td colspan="6" class="empty">${isBn ? 'কোনো পণ্য পাওয়া যায়নি — নতুন পণ্য যোগ করুন' : 'No products — add your first product'}</td></tr>`;

  layout(`
    <div class="page-head">
      <div>
        <h1>${isBn ? 'পণ্য ও স্টক ব্যবস্থাপনা' : 'Products & Stock'}</h1>
        <div class="sub">${isBn ? 'মালের তালিকা, ক্রয় ও বিক্রয় মূল্য এবং স্টক নিয়ন্ত্রণ' : 'Manage inventory, prices and stock entries'}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <input id="psearch2" placeholder="${isBn ? '🔍 পণ্য খুঁজুন…' : '🔍 Search product…'}" style="width:220px" oninput="filterProducts(this.value)">
        <button class="btn pri" onclick="addProduct()">${isBn ? '+ নতুন পণ্য যোগ' : '+ Add Product'}</button>
      </div>
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

function stockInModal(pid, products) {
  const isBn = window.LANG === 'bn';
  modal(`
    <div class="modal-h">
      <h3>📥 ${isBn ? 'স্টক ইন — মালামাল গ্রহণ' : 'Stock In — New Shipment'}</h3>
      <button class="modal-x" onclick="closeModal()">×</button>
    </div>
    <div class="modal-b">
      <form id="siform">
        <label>${isBn ? 'পণ্য নির্বাচন করুন *' : 'Product *'}</label>
        <select name="product_id" required>
          ${(products || []).slice().sort(prodSort).map(p => `<option value="${p.id}" ${p.id === pid ? 'selected' : ''}>${esc(p.name)} (${isBn ? 'বর্তমান: ' + bnDigits(p.current_stock) : 'now: ' + p.current_stock} ${esc(p.unit)})</option>`).join('')}
        </select>
        <div class="grid g2">
          <div>
            <label>${isBn ? 'পরিমাণ (+) *' : 'Quantity (+) *'} <span id="siunit" style="color:var(--brand);font-weight:400"></span></label>
            <input name="quantity" type="number" step="0.01" required placeholder="${isBn ? 'যেমন: ১০০' : 'e.g. 100'}">
          </div>
          <div>
            <label>${isBn ? 'কেনা দর / ইউনিট প্রতি খরচ (টাকা)' : 'Purchase Cost / unit (Tk)'}</label>
            <input name="unit_cost" type="number" step="0.01" placeholder="${isBn ? 'আগের দর থাকবে খালি রাখলে' : 'default = purchase price'}">
          </div>
        </div>
        <div class="grid g2">
          <div>
            <label>${isBn ? 'সাপ্লায়ার / মহাজন / উৎস' : 'Supplier / Vendor Source'}</label>
            <input name="supplier" placeholder="${isBn ? 'যেমন: বিএসআরএম / আবুল খায়ের' : 'e.g. BSRM / Abul Khair'}">
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
        <input name="note" placeholder="${isBn ? 'চালান নম্বর বা মন্তব্য' : 'invoice no or remark'}">
        <br>
        <button class="btn grn blk">${isBn ? 'স্টকে যোগ করুন ➕' : 'Add Stock ➕'}</button>
      </form>
    </div>`);

  const sif = $('#siform');
  const updSI = function () {
    const p = (products || []).find(x => x.id === +sif.product_id.value);
    const u = $('#siunit');
    if (u) u.textContent = p ? '(' + p.unit + ')' : '';
  };
  sif.product_id.addEventListener('change', updSI);
  updSI();

  $('#siform').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    try {
      await api('/stockin', {
        method: 'POST',
        body: {
          product_id: +f.product_id.value,
          quantity: f.quantity.value,
          unit_cost: f.unit_cost.value,
          supplier: f.supplier.value,
          is_credit: f.is_credit.value === '1',
          note: f.note ? f.note.value : ''
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
  q = q.toLowerCase();
  document.querySelectorAll("#ptable tr").forEach(function (tr, i) {
    if (i === 0) return;
    tr.style.display = tr.textContent.toLowerCase().includes(q) ? "" : "none";
  });
}
