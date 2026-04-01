// ========================================
// Imports Tab
// ========================================

async function loadImports() {
  try {
    const res = await apiGet('/imports');
    if (res.success) renderImportsTable(res.data);
  } catch (err) { console.error(err); }
}

function renderImportsTable(data) {
  const tbody = document.getElementById('importsTableBody');
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Chưa có phiếu nhập.</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(imp => `
    <tr onclick="viewImportDetails(${imp.id})">
      <td><strong>${formatId(imp.id)}</strong></td>
      <td>${imp.employee_name || '—'}</td>
      <td>${imp.provider_name || '—'}</td>
      <td>${formatDateTime(imp.create_time)}</td>
    </tr>
  `).join('');
}

// Search Imports
async function searchImports() {
  const type = document.getElementById('importSearchType').value;
  const keyword = document.getElementById('importSearchKeyword').value.trim();
  if (!keyword) {
    loadImports();
    return;
  }
  try {
    const res = await apiGet(`/imports/search?type=${type}&keyword=${encodeURIComponent(keyword)}`);
    if (res.success) {
      renderImportsTable(res.data);
    }
  } catch (err) {
    console.error('Error searching imports:', err);
  }
}

async function viewImportDetails(id) {
  try {
    const res = await apiGet(`/imports/${id}/details`);
    if (res.success) {
      const tbody = document.getElementById('importDetailBody');
      let total = 0;
      tbody.innerHTML = res.data.map(d => {
        const sub = d.import_quantity * d.unit_price;
        total += sub;
        return `<tr><td>${d.product_name}</td><td>${d.import_quantity}</td><td class="price">${formatPrice(d.unit_price)}</td><td class="price">${formatPrice(sub)}</td></tr>`;
      }).join('');
      document.getElementById('importDetailTotal').textContent = `Tổng cộng: ${formatPrice(total)}`;
      new bootstrap.Modal(document.getElementById('importDetailModal')).show();
    }
  } catch (err) { console.error(err); }
}

async function openCreateImportModal() {
  const [provRes, empRes, prodRes] = await Promise.all([apiGet('/providers'), apiGet('/employees'), apiGet('/products')]);
  if (provRes.success) window.__cache.providers = provRes.data;
  if (empRes.success) window.__cache.employees = empRes.data;
  if (prodRes.success) window.__cache.products = prodRes.data;

  const pSel = document.getElementById('importProvider');
  pSel.innerHTML = '<option value="">-- Chọn NCC --</option>' + window.__cache.providers.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  const eSel = document.getElementById('importEmployee');
  eSel.innerHTML = '<option value="">-- Chọn NV --</option>' + window.__cache.employees.map(e => `<option value="${e.id}">${e.employee_code} - ${e.full_name}</option>`).join('');

  document.getElementById('importItems').innerHTML = '';
  addImportItem();
  new bootstrap.Modal(document.getElementById('importModal')).show();
}

function addImportItem() {
  const c = document.getElementById('importItems');
  const prods = window.__cache.products;
  const row = document.createElement('div');
  row.className = 'invoice-item-row';
  row.innerHTML = `
    <div class="form-group" style="flex:3"><label>Sản phẩm</label>
      <select class="form-select form-select-sm imp-product"><option value="">-- Chọn --</option>${prods.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}</select>
    </div>
    <div class="form-group" style="flex:1"><label>SL</label><input type="number" class="form-control form-control-sm imp-qty" min="1" value="1"></div>
    <div class="form-group" style="flex:1"><label>Đơn giá</label><input type="number" class="form-control form-control-sm imp-price"></div>
    <button class="btn-remove" onclick="this.parentElement.remove()"><i class="bi bi-trash"></i></button>`;
  c.appendChild(row);
}

async function submitImport() {
  const provider_id = parseInt(document.getElementById('importProvider').value);
  const employee_id = parseInt(document.getElementById('importEmployee').value);
  if (!provider_id || !employee_id) { showToast('Chọn NCC và NV!', 'error'); return; }

  const details = [];
  document.querySelectorAll('#importItems .invoice-item-row').forEach(row => {
    const pid = parseInt(row.querySelector('.imp-product').value);
    const qty = parseInt(row.querySelector('.imp-qty').value);
    const price = parseFloat(row.querySelector('.imp-price').value);
    if (pid && qty > 0 && price > 0) details.push({ product_id: pid, import_quantity: qty, unit_price: price });
  });
  if (!details.length) { showToast('Thêm ít nhất 1 SP!', 'error'); return; }

  try {
    const res = await apiPost('/imports', { employee_id, provider_id, details });
    if (res.success) {
      showToast('Tạo phiếu nhập thành công!', 'success');
      bootstrap.Modal.getInstance(document.getElementById('importModal')).hide();
      loadImports();
    } else showToast(res.message, 'error');
  } catch (err) { showToast('Lỗi kết nối!', 'error'); }
}
