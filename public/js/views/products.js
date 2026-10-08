/* ---------- products ---------- */
VIEWS.products = async function () {
  const { products } = await api('/products');
  const rows = products.slice().sort(prodSort).map(p => `<tr>
    <td><b>${esc(p.name)}</b><br><small style="color:var(--mut)">${esc(p.category)}${p.size_mili ? ' • ' + p.size_mili + 'mm' : ''}</small></td>
    <td>${esc(p.unit)}</td>
    <td class="num ${p.current_stock <= p.low_stock ? 'dueX' : ''}"><b>${p.current_stock}</b></td>
    <td class="num">${money(p.purchase_price)}</td>
    <td class="num"><b>${money(p.selling_price)}</b></td>
    <td style="white-space:nowrap"><button class="btn sm grn" onclick="openStockIn(${p.id})">+ Stock In</button> <button class="btn sm" onclick="editProduct(${p.id})">✏️</button> ${true ? `<button class="btn sm dan" onclick="delProduct(${p.id})">🗑️</button>` : ''}</td>
  </tr>`).join('') || '<tr><td colspan="6" class="empty">No products — add your first product</td></tr>';
  layout(`
    <div class="page-head"><div><h1>Products & Stock</h1><div class="sub">Manage inventory, prices and stock entries</div></div>
      <div style="display:flex;gap:8px;align-items:center"><input id="psearch2" placeholder="🔍 Product khujun…" style="width:220px" oninput="filterProducts(this.value)"><button class="btn pri" onclick="addProduct()">+ Add Product</button></div></div>
    <div class="card"><div class="tblwrap"><table class="tbl" id="ptable">
      <tr><th>Product</th><th>Unit</th><th class="num">Current Stock</th><th class="num">Purchase Price</th><th class="num">Selling Price</th><th>Actions</th></tr>${rows}
    </table></div></div>`);
};
function productModal(p) {
  p = p || {};
  modal(`<div class="modal-h"><h3>${p.id ? 'Edit Product' : 'Add New Product'}</h3><button class="modal-x" onclick="closeModal()">×</button></div>
  <div class="modal-b"><form id="pform">
    <label>Product Name *</label><input name="name" required value="${esc(p.name || '')}" placeholder="e.g. MS Rod 12mm">
    <div class="grid g2">
      <div><label>Category</label><input name="category" value="${esc(p.category || '')}" placeholder="Rod / Cement / Tiles / Pipes / Paint / Tools"></div>
      <div><label>Unit</label><select name="unit">${['kg', 'ton', 'bag', 'pc', 'sft', 'cft', 'hajar', 'bundle', 'ltr', 'box', 'pkt'].map(u => `<option ${p.unit === u ? 'selected' : ''}>${u}</option>`).join('')}</select></div>
    </div>
    <div class="grid g2">
      <div><label>Size (Mili / mm — for Rod)</label><input name="size_mili" type="number" step="0.5" value="${p.size_mili == null ? '' : p.size_mili}" placeholder="e.g. 12"></div>
      <div><label>Low Stock Alert Level</label><input name="low_stock" type="number" value="${p.low_stock == null ? 10 : p.low_stock}"></div>
    </div>
    <div class="grid g2">
      <div><label>Purchase Price (Tk)</label><input name="purchase_price" type="number" step="0.01" value="${p.purchase_price || ''}"></div>
      <div><label>Selling Price (Tk)</label><input name="selling_price" type="number" step="0.01" value="${p.selling_price || ''}"></div>
    </div>
    ${p.id ? '' : '<label>Opening Stock (optional)</label><input name="opening_stock" type="number" step="0.01" value="" placeholder="0">'}
    <br><button class="btn pri blk">Save</button>
  </form></div>`);
  $('#pform').addEventListener('submit', async e => {
    e.preventDefault(); const f = e.target;
    const body = { name: f.name.value, category: f.category.value, unit: f.unit.value, size_mili: f.size_mili.value, low_stock: f.low_stock.value, purchase_price: f.purchase_price.value, selling_price: f.selling_price.value };
    try {
      if (p.id) { body.opening_stock = undefined; await api('/products/' + p.id, { method: 'PUT', body }); }
      else { body.opening_stock = f.opening_stock ? f.opening_stock.value : 0; await api('/products', { method: 'POST', body }); }
      closeModal(); toast('Product saved ✅'); router();
    } catch (ex) { toast(ex.message, true); }
  });
}
function addProduct() { productModal(null); }
async function editProduct(id) { const { products } = await api('/products'); productModal(products.find(p => p.id === id)); }
async function delProduct(id) { askConfirm('Delete this product permanently?', async function () { try { await api('/products/' + id, { method: 'DELETE' }); toast(t('Product deleted')); router(); } catch (e) { toast(e.message, true); } }); }
function stockInModal(pid, products) {
  modal(`<div class="modal-h"><h3>📥 Stock In — New Shipment</h3><button class="modal-x" onclick="closeModal()">×</button></div>
  <div class="modal-b"><form id="siform">
    <label>Product *</label><select name="product_id" required>${(products || []).slice().sort(prodSort).map(p => `<option value="${p.id}" ${p.id === pid ? 'selected' : ''}>${esc(p.name)} (now: ${p.current_stock} ${esc(p.unit)})</option>`).join('')}</select>
    <div class="grid g2">
      <div><label>Quantity (+) * <span id="siunit" style="color:var(--brand);font-weight:400"></span></label><input name="quantity" type="number" step="0.01" required placeholder="e.g. 100"></div>
      <div><label>Purchase Cost / unit (Tk)</label><input name="unit_cost" type="number" step="0.01" placeholder="default = purchase price"></div>
    </div>
    <label>Supplier / Vendor Source</label><input name="supplier" placeholder="e.g. BSRM / Abul Khair">
    <br><button class="btn grn blk">Add Stock ➕</button>
  </form></div>`);
  const sif = $('#siform');
  const updSI = function () { const p = (products || []).find(x => x.id === +sif.product_id.value); const u = $('#siunit'); if (u) u.textContent = p ? '(' + p.unit + ')' : ''; };
  sif.product_id.addEventListener('change', updSI); updSI();
  $('#siform').addEventListener('submit', async e => {
    e.preventDefault(); const f = e.target;
    try { await api('/stockin', { method: 'POST', body: { product_id: +f.product_id.value, quantity: f.quantity.value, unit_cost: f.unit_cost.value, supplier: f.supplier.value } }); closeModal(); toast('Stock added ✅'); router(); } catch (ex) { toast(ex.message, true); }
  });
}

function filterProducts(q) { q = q.toLowerCase(); document.querySelectorAll("#ptable tr").forEach(function (tr, i) { if (i === 0) return; tr.style.display = tr.textContent.toLowerCase().includes(q) ? "" : "none"; }); }
