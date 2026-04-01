// ========================================
// Warranties Tab
// ========================================

async function loadWarranties() {
  try {
    const res = await apiGet('/warranties');
    if (res.success) renderWarrantiesTable(res.data);
  } catch (err) { console.error(err); }
}

function renderWarrantiesTable(data) {
  const tbody = document.getElementById('warrantiesTableBody');
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Chưa có phiếu bảo hành.</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(w => `
    <tr>
      <td><strong>${formatId(w.id)}</strong></td>
      <td>${formatId(w.invoice_id)}</td>
      <td>${w.product_name || '—'}</td>
      <td>${w.serial_number || '—'}</td>
      <td>${formatDate(w.start_date)}</td>
      <td>${formatDate(w.end_date)}</td>
    </tr>
  `).join('');
}

// Search both warranties and claims
async function searchWarrantiesAndClaims() {
  const keyword = document.getElementById('warrantySearchKeyword').value.trim();
  if (!keyword) {
    loadWarranties();
    loadWarrantyClaims();
    return;
  }
  
  try {
    const [wRes, cRes] = await Promise.all([
      apiGet(`/warranties/search?serial=${encodeURIComponent(keyword)}`),
      apiGet(`/warranties/claims/search?serial=${encodeURIComponent(keyword)}`)
    ]);
    
    if (wRes.success) renderWarrantiesTable(wRes.data);
    if (cRes.success) renderClaimsTable(cRes.data);
  } catch (err) {
    console.error('Error searching warranties/claims:', err);
  }
}

async function loadWarrantyClaims() {
  try {
    const res = await apiGet('/warranties/claims');
    if (res.success) renderClaimsTable(res.data);
  } catch (err) { console.error(err); }
}

function renderClaimsTable(data) {
  const tbody = document.getElementById('claimsTableBody');
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Chưa có yêu cầu sửa chữa.</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(c => {
    const statusClass = c.status === 'Pending' ? 'badge-pending' : c.status === 'Processing' ? 'badge-processing' : 'badge-done';
    const statusHtml = `<select class="status-select ${statusClass}" onchange="this.className='status-select ' + (this.value==='Pending'?'badge-pending':this.value==='Processing'?'badge-processing':'badge-done'); updateClaimStatus(${c.id}, this.value)">
        <option value="Pending" ${c.status==='Pending'?'selected':''}>Pending</option>
        <option value="Processing" ${c.status==='Processing'?'selected':''}>Processing</option>
        <option value="Done" ${c.status==='Done'?'selected':''}>Done</option>
      </select>`;
    return `
      <tr>
        <td><strong>${formatId(c.id)}</strong></td>
        <td>${c.product_name || '—'}</td>
        <td>${c.serial_number || '—'}</td>
        <td>${c.description || '—'}</td>
        <td>${c.employee_name || '—'}</td>
        <td>${formatDate(c.claim_date)}</td>
        <td>${statusHtml}</td>
      </tr>`;
  }).join('');
}

async function updateClaimStatus(id, status) {
  try {
    const res = await apiPut(`/warranties/claims/${id}/status`, { status });
    if (res.success) {
      showToast('Cập nhật trạng thái thành công!', 'success');
      loadWarrantyClaims();
    } else showToast(res.message, 'error');
  } catch (err) { showToast('Lỗi!', 'error'); }
}

window.__cache = window.__cache || {};

// ---- Custom autocomplete cho chọn phiếu BH ----
function filterClaimDropdown(query) {
  const dd = document.getElementById('claimAutocompleteDropdown');
  const warranties = window.__cache.warranties || [];
  const q = query.trim().toLowerCase();
  
  const filtered = q
    ? warranties.filter(w =>
        w.serial_number.toLowerCase().includes(q) ||
        (w.product_name || '').toLowerCase().includes(q)
      )
    : warranties;

  if (!filtered.length) {
    dd.innerHTML = '<div class="autocomplete-empty">Không tìm thấy kết quả</div>';
  } else {
    dd.innerHTML = filtered.map(w => `
      <div class="autocomplete-item" onmousedown="selectClaimItem('${w.serial_number}', ${w.id}, '${(w.product_name || '').replace(/'/g, "\\'")}')">
        <span class="ac-serial">${w.serial_number}</span>
        <span class="ac-sub">${formatId(w.id)} — ${w.product_name || '—'}</span>
      </div>
    `).join('');
  }
  dd.classList.add('open');
}

function selectClaimItem(serial, warrantyId, productName) {
  document.getElementById('claimWarrantyInput').value = serial;
  document.getElementById('claimWarrantyId').value = warrantyId;
  document.getElementById('claimAutocompleteDropdown').classList.remove('open');
}

// Đóng dropdown khi click ra ngoài
document.addEventListener('click', function(e) {
  const wrap = document.getElementById('claimSerialWrap');
  if (wrap && !wrap.contains(e.target)) {
    const dd = document.getElementById('claimAutocompleteDropdown');
    if (dd) dd.classList.remove('open');
  }
});

async function openCreateClaimModal() {
  const res = await apiGet('/warranties');
  if (res.success) {
    window.__cache.warranties = res.data;
  }
  document.getElementById('claimWarrantyInput').value = '';
  document.getElementById('claimWarrantyId').value = '';
  document.getElementById('claimAutocompleteDropdown').classList.remove('open');
  document.getElementById('claimDescription').value = '';
  new bootstrap.Modal(document.getElementById('claimModal')).show();
}

async function submitClaim() {
  const warrantyId = parseInt(document.getElementById('claimWarrantyId').value);
  const inputVal = document.getElementById('claimWarrantyInput').value.trim();
  const description = document.getElementById('claimDescription').value.trim();

  if (!inputVal || !warrantyId) {
    showToast('Vui lòng chọn một phiếu bảo hành từ danh sách!', 'error');
    return;
  }
  if (!description) {
    showToast('Vui lòng nhập mô tả lỗi!', 'error');
    return;
  }

  try {
    const res = await apiPost('/warranties/claims', { warranty_id: warrantyId, description });
    if (res.success) {
      showToast('Tạo yêu cầu thành công!', 'success');
      bootstrap.Modal.getInstance(document.getElementById('claimModal')).hide();
      loadWarrantyClaims();
    } else showToast(res.message, 'error');
  } catch (err) { showToast('Lỗi!', 'error'); }
}

