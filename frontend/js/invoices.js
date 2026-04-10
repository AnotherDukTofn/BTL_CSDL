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

// Search Invoices
async function searchInvoices() {
  const keyword = document.getElementById('invoiceSearchKeyword').value.trim();
  if (!keyword) {
    loadInvoices();
    return;
  }
  try {
    const res = await apiGet(`/invoices/search?keyword=${encodeURIComponent(keyword)}`);
    if (res.success) {
      renderInvoicesTable(res.data);
    }
  } catch (err) {
    console.error('Error searching invoices:', err);
  }
}

// View invoice details — hiển thị cả serial numbers
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

// Create Invoice Modal — giao diện quen thuộc: chọn SP + SL
async function openCreateInvoiceModal() {
  const [custRes, empRes, prodRes] = await Promise.all([
    apiGet('/customers'),
    apiGet('/employees'),
    apiGet('/products'),
  ]);

  if (custRes.success) {
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
  const products = window.__cache.products;

  const row = document.createElement('div');
  row.className = 'invoice-item-row';
  row.style.flexWrap = 'wrap';
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
    <div class="form-group" style="flex-basis:100%; margin-top:4px; display:none;" class="inv-serial-group">
      <label style="font-size:0.75rem; color:#aaa;"><i class="bi bi-upc-scan"></i> Chọn Serial (giữ Ctrl để chọn nhiều, bỏ trống = tự động FIFO)</label>
      <select multiple class="form-select form-select-sm inv-serials" size="3" style="font-size:0.75rem;" onchange="onSerialSelectionChange(this)">
      </select>
    </div>
  `;
  container.appendChild(row);
}

async function onInvoiceProductChange(select) {
  const option = select.options[select.selectedIndex];
  const row = select.closest('.invoice-item-row');
  const priceInput = row.querySelector('.inv-price');
  priceInput.value = option.dataset.price || '';

  // Load available serials
  const serialGroup = row.querySelector('.inv-serials').parentElement;
  const serialSelect = row.querySelector('.inv-serials');
  const productId = select.value;

  if (!productId) {
    serialGroup.style.display = 'none';
    serialSelect.innerHTML = '';
    return;
  }

  try {
    const res = await apiGet(`/products/${productId}/available-serials`);
    if (res.success && res.data.length) {
      serialSelect.innerHTML = res.data.map(s =>
        `<option value="${s.serial_number}">🏷️ ${s.serial_number} (Lô #${s.import_id})</option>`
      ).join('');
      serialGroup.style.display = 'block';
    } else {
      serialGroup.style.display = 'none';
      serialSelect.innerHTML = '';
    }
  } catch (err) {
    serialGroup.style.display = 'none';
  }
}

function onSerialSelectionChange(serialSelect) {
  const row = serialSelect.closest('.invoice-item-row');
  const qtyInput = row.querySelector('.inv-qty');
  const selected = serialSelect.selectedOptions.length;
  if (selected > 0) {
    qtyInput.value = selected;
  }
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

  const rows = document.querySelectorAll('#invoiceItems .invoice-item-row');
  const details = [];
  for (const row of rows) {
    const product_id = parseInt(row.querySelector('.inv-product').value);
    const buy_quantity = parseInt(row.querySelector('.inv-qty').value);
    const unit_price = parseFloat(row.querySelector('.inv-price').value);

    if (product_id) {
      if (!buy_quantity || buy_quantity <= 0) {
        errorDiv.textContent = 'Số lượng bán phải lớn hơn 0!';
        errorDiv.style.display = 'block';
        return;
      }

      // Thu thập serial đã chọn (nếu có)
      const serialSelect = row.querySelector('.inv-serials');
      const selectedSerials = [];
      if (serialSelect) {
        for (const opt of serialSelect.selectedOptions) {
          selectedSerials.push(opt.value);
        }
      }

      details.push({
        product_id,
        buy_quantity,
        unit_price: unit_price || 0,
        serials: selectedSerials.length > 0 ? selectedSerials : undefined
      });
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
      showToast(res.message, 'success');
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
