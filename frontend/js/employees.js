// ========================================
// Employees Tab
// ========================================

async function loadEmployees() {
  try {
    const res = await apiGet('/employees');
    if (res.success) {
      window.__cache.employees = res.data;
      renderEmployeesTable(res.data);
    }
  } catch (err) { console.error(err); }
}

function renderEmployeesTable(data) {
  const tbody = document.getElementById('employeesTableBody');
  const isAdmin = getCurrentRole() === 'admin';

  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Không có nhân viên.</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(e => `
    <tr ${isAdmin ? `onclick='openEditEmployeeModal(${JSON.stringify(e).replace(/'/g, "&#39;")})' style="cursor:pointer"` : ''}>
      <td><strong>${formatId(e.id)}</strong></td>
      <td>${e.employee_code}</td>
      <td>${e.full_name}</td>
      <td>${e.position || '—'}</td>
      <td>${e.employment_type || '—'}</td>
      <td onclick="event.stopPropagation()">
        <label class="toggle-switch">
          <input type="checkbox" ${e.is_active ? 'checked' : ''} onchange="toggleEmployeeStatus(${e.id}, this.checked)">
          <span class="toggle-slider"></span>
        </label>
        <span class="badge-status ${e.is_active ? 'badge-active' : 'badge-inactive'}" style="margin-left:8px;">
          ${e.is_active ? 'Đang làm' : 'Nghỉ việc'}
        </span>
      </td>
    </tr>
  `).join('');
}

async function toggleEmployeeStatus(id, isActive) {
  try {
    const res = await apiPut(`/employees/${id}/status`, { is_active: isActive });
    if (res.success) {
      showToast(`Đã ${isActive ? 'kích hoạt' : 'vô hiệu hóa'} nhân viên!`, 'success');
      loadEmployees();
    } else showToast(res.message, 'error');
  } catch (err) { showToast('Lỗi kết nối!', 'error'); }
}

// ====== THÊM NHÂN VIÊN ======
function openAddEmployeeModal() {
  document.getElementById('empId').value = '';
  document.getElementById('employeeModalTitle').innerHTML = '<i class="bi bi-person-plus"></i> Thêm Nhân viên';
  document.getElementById('empFirstName').value = '';
  document.getElementById('empMiddleName').value = '';
  document.getElementById('empLastName').value = '';
  document.getElementById('empGender').value = 'Nam';
  document.getElementById('empProvince').value = '';
  document.getElementById('empPosition').value = '';
  document.getElementById('empEmploymentType').value = '';

  // Show all fields (they may have been hidden for edit mode)
  document.querySelectorAll('.emp-add-only').forEach(el => el.style.display = '');

  new bootstrap.Modal(document.getElementById('employeeModal')).show();
}

// ====== SỬA NHÂN VIÊN ======
function openEditEmployeeModal(emp) {
  document.getElementById('empId').value = emp.id;
  document.getElementById('employeeModalTitle').innerHTML = '<i class="bi bi-pencil-square"></i> Sửa Nhân viên';
  document.getElementById('empFirstName').value = emp.first_name || '';
  document.getElementById('empMiddleName').value = emp.middle_name || '';
  document.getElementById('empLastName').value = emp.last_name || '';
  document.getElementById('empGender').value = emp.gender || 'Nam';
  document.getElementById('empProvince').value = emp.province || '';
  document.getElementById('empPosition').value = emp.position || '';
  document.getElementById('empEmploymentType').value = emp.employment_type || '';

  new bootstrap.Modal(document.getElementById('employeeModal')).show();
}

// ====== LƯU (ADD hoặc EDIT) ======
async function saveEmployee() {
  const id = document.getElementById('empId').value;
  const position = document.getElementById('empPosition').value;
  const employment_type = document.getElementById('empEmploymentType').value;

  if (id) {
    // EDIT mode
    const body = { position, employment_type };
    try {
      const res = await apiPut(`/employees/${id}`, body);
      if (res.success) {
        showToast('Cập nhật nhân viên thành công!', 'success');
        bootstrap.Modal.getInstance(document.getElementById('employeeModal')).hide();
        loadEmployees();
      } else showToast(res.message, 'error');
    } catch (err) { showToast('Lỗi kết nối!', 'error'); }
  } else {
    // ADD mode
    const body = {
      first_name: document.getElementById('empFirstName').value,
      middle_name: document.getElementById('empMiddleName').value,
      last_name: document.getElementById('empLastName').value,
      gender: document.getElementById('empGender').value,
      province: document.getElementById('empProvince').value,
      position,
      employment_type,
    };
    try {
      const res = await apiPost('/employees', body);
      if (res.success) {
        showToast('Thêm nhân viên thành công!', 'success');
        bootstrap.Modal.getInstance(document.getElementById('employeeModal')).hide();
        loadEmployees();
      } else showToast(res.message, 'error');
    } catch (err) { showToast('Lỗi kết nối!', 'error'); }
  }
}
