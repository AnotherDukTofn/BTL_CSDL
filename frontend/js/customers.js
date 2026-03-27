// ========================================
// Customers Tab
// ========================================

// Định dạng địa chỉ đầy đủ: "house_num street, district, province"
function formatAddress(c) {
  const parts = [
    c.house_num ? c.house_num + (c.street ? ' ' + c.street : '') : c.street,
    c.district,
    c.province,
  ].filter(p => p && p.trim());
  return parts.length ? parts.join(', ') : '—';
}

async function loadCustomers() {
  try {
    const res = await apiGet('/customers');
    if (res.success) {
      window.__cache.customers = res.data;
      renderCustomersTable(res.data);
    }
  } catch (err) {
    console.error('Error loading customers:', err);
  }
}

function renderCustomersTable(data) {
  const tbody = document.getElementById('customersTableBody');

  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Không có khách hàng nào.</td></tr>';
    return;
  }

  // Group by id to handle multiple phones
  const grouped = {};
  data.forEach(c => {
    if (!grouped[c.id]) {
      grouped[c.id] = { ...c, phones: [] };
    }
    if (c.phone_num) grouped[c.id].phones.push(c.phone_num);
  });

  const customers = Object.values(grouped);

  tbody.innerHTML = customers.map(c => `
    <tr onclick='openEditCustomerModal(${JSON.stringify(c).replace(/'/g, "&#39;")})'>
      <td><strong>${formatId(c.id)}</strong></td>
      <td>${c.full_name || '—'}</td>
      <td>${c.gender || '—'}</td>
      <td>${formatAddress(c)}</td>
      <td>${c.phones.join(', ') || '—'}</td>
    </tr>
  `).join('');
}

// Search
async function searchCustomers() {
  const keyword = document.getElementById('customerSearchKeyword').value.trim();
  if (!keyword) {
    loadCustomers();
    return;
  }
  try {
    const res = await apiGet(`/customers/search?keyword=${encodeURIComponent(keyword)}`);
    if (res.success) renderCustomersTable(res.data);
  } catch (err) {
    console.error(err);
  }
}

// Add Customer
function openAddCustomerModal() {
  document.getElementById('customerModalId').value = '';
  document.getElementById('customerModalTitle').innerHTML = '<i class="bi bi-person-plus"></i> Thêm Khách hàng';
  document.getElementById('customerFirstName').value = '';
  document.getElementById('customerMiddleName').value = '';
  document.getElementById('customerLastName').value = '';
  document.getElementById('customerGender').value = 'Nam';
  document.getElementById('customerPhone').value = '';
  document.getElementById('customerProvince').value = '';
  document.getElementById('customerModalSaveBtn').onclick = saveNewCustomer;

  new bootstrap.Modal(document.getElementById('customerModal')).show();
}

async function saveNewCustomer() {
  const body = {
    first_name: document.getElementById('customerFirstName').value,
    middle_name: document.getElementById('customerMiddleName').value,
    last_name: document.getElementById('customerLastName').value,
    gender: document.getElementById('customerGender').value,
    phone_num: document.getElementById('customerPhone').value,
    province: document.getElementById('customerProvince').value,
  };

  try {
    const res = await apiPost('/customers', body);
    if (res.success) {
      showToast('Thêm khách hàng thành công!', 'success');
      bootstrap.Modal.getInstance(document.getElementById('customerModal')).hide();
      loadCustomers();
    } else {
      showToast(res.message, 'error');
    }
  } catch (err) {
    showToast('Lỗi kết nối!', 'error');
  }
}

// Edit Customer
function openEditCustomerModal(customer) {
  document.getElementById('customerModalId').value = customer.id;
  document.getElementById('customerModalTitle').innerHTML = '<i class="bi bi-pencil-square"></i> Sửa Khách hàng';
  document.getElementById('customerFirstName').value = customer.first_name || '';
  document.getElementById('customerMiddleName').value = customer.middle_name || '';
  document.getElementById('customerLastName').value = customer.last_name || '';
  document.getElementById('customerGender').value = customer.gender || 'Nam';
  document.getElementById('customerPhone').value = (customer.phones && customer.phones[0]) || customer.phone_num || '';
  document.getElementById('customerProvince').value = customer.province || '';
  document.getElementById('customerModalSaveBtn').onclick = updateCustomerInfo;

  new bootstrap.Modal(document.getElementById('customerModal')).show();
}

async function updateCustomerInfo() {
  const id = document.getElementById('customerModalId').value;
  const body = {
    first_name: document.getElementById('customerFirstName').value,
    middle_name: document.getElementById('customerMiddleName').value,
    last_name: document.getElementById('customerLastName').value,
    gender: document.getElementById('customerGender').value,
    phone_num: document.getElementById('customerPhone').value,
    province: document.getElementById('customerProvince').value,
  };

  try {
    const res = await apiPut(`/customers/${id}`, body);
    if (res.success) {
      showToast('Cập nhật khách hàng thành công!', 'success');
      bootstrap.Modal.getInstance(document.getElementById('customerModal')).hide();
      loadCustomers();
    } else {
      showToast(res.message, 'error');
    }
  } catch (err) {
    showToast('Lỗi kết nối!', 'error');
  }
}

// Alias for the generic button handler
function saveCustomer() {
  const id = document.getElementById('customerModalId').value;
  if (id) {
    updateCustomerInfo();
  } else {
    saveNewCustomer();
  }
}
