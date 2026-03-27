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

async function loadWarrantyClaims() {
  try {
    const res = await apiGet('/warranties/claims');
    if (res.success) renderClaimsTable(res.data);
  } catch (err) { console.error(err); }
}

function renderClaimsTable(data) {
  const tbody = document.getElementById('claimsTableBody');
  const isAdmin = getCurrentRole() === 'admin';
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Chưa có yêu cầu sửa chữa.</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(c => {
    const statusClass = c.status === 'Pending' ? 'badge-pending' : c.status === 'Processing' ? 'badge-processing' : 'badge-done';
    let statusHtml;
    if (isAdmin) {
      statusHtml = `<select class="status-select ${statusClass}" onchange="this.className='status-select ' + (this.value==='Pending'?'badge-pending':this.value==='Processing'?'badge-processing':'badge-done'); updateClaimStatus(${c.id}, this.value)">
        <option value="Pending" ${c.status==='Pending'?'selected':''}>Pending</option>
        <option value="Processing" ${c.status==='Processing'?'selected':''}>Processing</option>
        <option value="Done" ${c.status==='Done'?'selected':''}>Done</option>
      </select>`;
    } else {
      statusHtml = `<span class="badge-status ${statusClass}">${c.status}</span>`;
    }
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

async function openCreateClaimModal() {
  const res = await apiGet('/warranties');
  if (res.success) {
    const sel = document.getElementById('claimWarrantyId');
    sel.innerHTML = '<option value="">-- Chọn phiếu BH --</option>' +
      res.data.map(w => `<option value="${w.id}">${formatId(w.id)} - ${w.product_name} (${w.serial_number})</option>`).join('');
  }
  document.getElementById('claimDescription').value = '';
  new bootstrap.Modal(document.getElementById('claimModal')).show();
}

async function submitClaim() {
  const warranty_id = parseInt(document.getElementById('claimWarrantyId').value);
  const description = document.getElementById('claimDescription').value;
  if (!warranty_id || !description) { showToast('Vui lòng điền đầy đủ!', 'error'); return; }

  try {
    const res = await apiPost('/warranties/claims', { warranty_id, description });
    if (res.success) {
      showToast('Tạo yêu cầu thành công!', 'success');
      bootstrap.Modal.getInstance(document.getElementById('claimModal')).hide();
      loadWarrantyClaims();
    } else showToast(res.message, 'error');
  } catch (err) { showToast('Lỗi!', 'error'); }
}
