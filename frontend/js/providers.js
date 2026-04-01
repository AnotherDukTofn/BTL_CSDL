// ========================================
// Providers Tab
// ========================================

async function loadProviders() {
  try {
    const res = await apiGet('/providers');
    if (res.success) {
      window.__cache.providers = res.data;
      renderProvidersTable(res.data);
    }
  } catch (err) {
    console.error('Error loading providers:', err);
  }
}

function renderProvidersTable(data) {
  const tbody = document.getElementById('providersTableBody');

  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Không có nhà cung cấp nào.</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(p => `
    <tr onclick='openEditProviderModal(${JSON.stringify(p).replace(/'/g, "&#39;")})'>
      <td><strong>${formatId(p.id)}</strong></td>
      <td>${p.name || '—'}</td>
      <td>${p.phone || '—'}</td>
      <td>${p.email || '—'}</td>
    </tr>
  `).join('');
}

// Search
async function searchProviders() {
  const type = document.getElementById('providerSearchType').value;
  const keyword = document.getElementById('providerSearchKeyword').value.trim();

  if (!keyword) {
    loadProviders();
    return;
  }

  try {
    const res = await apiGet(`/providers/search?type=${type}&keyword=${encodeURIComponent(keyword)}`);
    if (res.success) renderProvidersTable(res.data);
  } catch (err) {
    console.error(err);
  }
}

// Add Provider
function openAddProviderModal() {
  document.getElementById('providerModalId').value = '';
  document.getElementById('providerModalTitle').innerHTML = '<i class="bi bi-building-add"></i> Thêm Nhà cung cấp';
  document.getElementById('providerName').value = '';
  document.getElementById('providerPhone').value = '';
  document.getElementById('providerEmail').value = '';

  // Re-assign save button click
  document.getElementById('providerModalSaveBtn').onclick = saveNewProvider;

  new bootstrap.Modal(document.getElementById('providerModal')).show();
}

async function saveNewProvider() {
  const body = {
    name: document.getElementById('providerName').value.trim(),
    phone: document.getElementById('providerPhone').value.trim(),
    email: document.getElementById('providerEmail').value.trim(),
  };

  if (!body.name) {
    showToast('Tên nhà cung cấp không được để trống.', 'error');
    return;
  }

  try {
    const res = await apiPost('/providers', body);
    if (res.success) {
      showToast('Thêm nhà cung cấp thành công!', 'success');
      bootstrap.Modal.getInstance(document.getElementById('providerModal')).hide();
      loadProviders();
    } else {
      showToast(res.message, 'error');
    }
  } catch (err) {
    showToast('Lỗi kết nối!', 'error');
  }
}

// Edit Provider
function openEditProviderModal(provider) {
  document.getElementById('providerModalId').value = provider.id;
  document.getElementById('providerModalTitle').innerHTML = '<i class="bi bi-pencil-square"></i> Sửa Nhà cung cấp';
  document.getElementById('providerName').value = provider.name || '';
  document.getElementById('providerPhone').value = provider.phone || '';
  document.getElementById('providerEmail').value = provider.email || '';

  document.getElementById('providerModalSaveBtn').onclick = updateProviderInfo;

  new bootstrap.Modal(document.getElementById('providerModal')).show();
}

async function updateProviderInfo() {
  const id = document.getElementById('providerModalId').value;
  const body = {
    name: document.getElementById('providerName').value.trim(),
    phone: document.getElementById('providerPhone').value.trim(),
    email: document.getElementById('providerEmail').value.trim(),
  };

  if (!body.name) {
    showToast('Tên nhà cung cấp không được để trống.', 'error');
    return;
  }

  try {
    const res = await apiPut(`/providers/${id}`, body);
    if (res.success) {
      showToast('Cập nhật nhà cung cấp thành công!', 'success');
      bootstrap.Modal.getInstance(document.getElementById('providerModal')).hide();
      loadProviders();
    } else {
      showToast(res.message, 'error');
    }
  } catch (err) {
    showToast('Lỗi kết nối!', 'error');
  }
}

// Alias
function saveProvider() {
  const id = document.getElementById('providerModalId').value;
  if (id) {
    updateProviderInfo();
  } else {
    saveNewProvider();
  }
}
