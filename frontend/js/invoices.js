// ========================================
// Invoices Tab
// ========================================

async function loadInvoices() {
  try {
    const res = await apiGet('/invoices');
    if (res.success) {
      renderInvoicesTable(res.data);
    }
  } catch (err) {
    console.error('Error loading invoices:', err);
  }
}

function renderInvoicesTable(data) {
  const tbody = document.getElementById('invoicesTableBody');

  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Chưa có hóa đơn nào.</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(inv => `
    <tr onclick="viewInvoiceDetails(${inv.id})">
      <td><strong>${formatId(inv.id)}</strong></td>
      <td>${inv.customer_name || '—'}</td>
      <td>${inv.employee_name || '—'}</td>
      <td>${formatDateTime(inv.create_time)}</td>
    </tr>
  `).join('');
}

// View invoice details
async function viewInvoiceDetails(id) {
  try {
    const res = await apiGet(`/invoices/${id}/details`);
    if (res.success) {
      const tbody = document.getElementById('invoiceDetailBody');
      let total = 0;

      tbody.innerHTML = res.data.map(d => {
        const subtotal = d.buy_quantity * d.unit_price;
        total += subtotal;
        return `
          <tr>
            <td>${d.product_name}</td>
            <td>${d.buy_quantity}</td>
            <td class="price">${formatPrice(d.unit_price)}</td>
            <td class="price">${formatPrice(subtotal)}</td>
          </tr>
        `;
      }).join('');

      document.getElementById('invoiceDetailTotal').textContent = `Tổng cộng: ${formatPrice(total)}`;
      new bootstrap.Modal(document.getElementById('invoiceDetailModal')).show();
    }
  } catch (err) {
    console.error(err);
  }
}

// Create Invoice Modal
async function openCreateInvoiceModal() {
  // Load fresh data
  const [custRes, empRes, prodRes] = await Promise.all([
    apiGet('/customers'),
    apiGet('/employees'),
    apiGet('/products'),
  ]);

  if (custRes.success) {
    // Deduplicate customers
    const unique = {};
    custRes.data.forEach(c => {
      if (!unique[c.id]) unique[c.id] = c;
    });
    window.__cache.customers = Object.values(unique);
  }
  if (empRes.success) window.__cache.employees = empRes.data;
  if (prodRes.success) window.__cache.products = prodRes.data;

  // Populate customer dropdown
  const custSelect = document.getElementById('invoiceCustomer');
  custSelect.innerHTML = '<option value="">-- Chọn Khách hàng --</option>' +
    window.__cache.customers.map(c => `<option value="${c.id}">${c.customer_code} - ${c.full_name}</option>`).join('');

  // Populate employee dropdown
  const empSelect = document.getElementById('invoiceEmployee');
  empSelect.innerHTML = '<option value="">-- Chọn Nhân viên --</option>' +
    window.__cache.employees.map(e => `<option value="${e.id}">${e.employee_code} - ${e.full_name}</option>`).join('');

  // Clear items
  document.getElementById('invoiceItems').innerHTML = '';
  document.getElementById('invoiceError').style.display = 'none';

  // Add first item row
  addInvoiceItem();

  new bootstrap.Modal(document.getElementById('invoiceModal')).show();
}

function addInvoiceItem() {
  const container = document.getElementById('invoiceItems');
  const idx = container.children.length;
  const products = window.__cache.products;

  const row = document.createElement('div');
  row.className = 'invoice-item-row';
  row.innerHTML = `
    <div class="form-group" style="flex:3">
      <label>Sản phẩm</label>
      <select class="form-select form-select-sm inv-product" onchange="onInvoiceProductChange(this)">
        <option value="">-- Chọn SP --</option>
        ${products.map(p => `<option value="${p.id}" data-price="${p.out_unit_price}" data-stock="${p.stock_quantity}">${p.name} (Tồn: ${p.stock_quantity})</option>`).join('')}
      </select>
    </div>
    <div class="form-group" style="flex:1">
      <label>Số lượng</label>
      <input type="number" class="form-control form-control-sm inv-qty" min="1" value="1">
    </div>
    <div class="form-group" style="flex:1">
      <label>Đơn giá</label>
      <input type="number" class="form-control form-control-sm inv-price" readonly>
    </div>
    <button class="btn-remove" onclick="this.parentElement.remove()">
      <i class="bi bi-trash"></i>
    </button>
  `;
  container.appendChild(row);
}

function onInvoiceProductChange(select) {
  const option = select.options[select.selectedIndex];
  const priceInput = select.closest('.invoice-item-row').querySelector('.inv-price');
  priceInput.value = option.dataset.price || '';
}

async function submitInvoice() {
  const customer_id = parseInt(document.getElementById('invoiceCustomer').value);
  const employee_id = parseInt(document.getElementById('invoiceEmployee').value);
  const errorDiv = document.getElementById('invoiceError');

  if (!customer_id || !employee_id) {
    errorDiv.textContent = 'Vui lòng chọn Khách hàng và Nhân viên!';
    errorDiv.style.display = 'block';
    return;
  }

  const rows = document.querySelectorAll('.invoice-item-row');
  const details = [];
  for (const row of rows) {
    const product_id = parseInt(row.querySelector('.inv-product').value);
    const buy_quantity = parseInt(row.querySelector('.inv-qty').value);
    const unit_price = parseFloat(row.querySelector('.inv-price').value);
    if (product_id && buy_quantity > 0) {
      details.push({ product_id, buy_quantity, unit_price });
    }
  }

  if (!details.length) {
    errorDiv.textContent = 'Vui lòng thêm ít nhất 1 sản phẩm!';
    errorDiv.style.display = 'block';
    return;
  }

  try {
    const res = await apiPost('/invoices', { customer_id, employee_id, details });
    if (res.success) {
      showToast('Tạo hóa đơn thành công!', 'success');
      bootstrap.Modal.getInstance(document.getElementById('invoiceModal')).hide();
      loadInvoices();
    } else {
      errorDiv.textContent = res.message;
      errorDiv.style.display = 'block';
    }
  } catch (err) {
    errorDiv.textContent = 'Lỗi kết nối server!';
    errorDiv.style.display = 'block';
  }
}
