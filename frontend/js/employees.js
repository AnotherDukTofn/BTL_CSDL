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
  const user = getCurrentUser();
  const isAdmin = user && user.role === 'manager';

  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">Không có nhân viên.</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(e => {
    // Role badge + dropdown
    const roleBadgeClass = e.account_role === 'manager' ? 'role-manager' : 'role-employee';
    const roleLabel = e.account_role === 'manager' ? 'Manager' : 'Employee';
    let roleHtml;
    if (isAdmin && e.username) {
      roleHtml = `<select class="status-select ${roleBadgeClass}" onchange="changeEmployeeRole(${e.id}, this.value); this.className='status-select ' + (this.value==='manager'?'role-manager':'role-employee');" onclick="event.stopPropagation()">
        <option value="employee" ${e.account_role === 'employee' ? 'selected' : ''}>Employee</option>
        <option value="manager" ${e.account_role === 'manager' ? 'selected' : ''}>Manager</option>
      </select>`;
    } else if (e.username) {
      roleHtml = `<span class="user-role-badge ${roleBadgeClass}">${roleLabel}</span>`;
    } else {
      roleHtml = '<span class="text-muted">—</span>';
    }

    // Status dropdown (req #5)
    const statusLabel = e.is_active ? 'Đang làm' : 'Nghỉ việc';
    const statusClass = e.is_active ? 'badge-active' : 'badge-inactive';
    let statusHtml;
    if (isAdmin) {
      statusHtml = `<select class="status-select ${statusClass}" onchange="toggleEmployeeStatus(${e.id}, this.value==='1'); this.className='status-select ' + (this.value==='1'?'badge-active':'badge-inactive');" onclick="event.stopPropagation()">
        <option value="1" ${e.is_active ? 'selected' : ''}>Đang làm</option>
        <option value="0" ${!e.is_active ? 'selected' : ''}>Nghỉ việc</option>
      </select>`;
    } else {
      statusHtml = `<span class="badge-status ${statusClass}">${statusLabel}</span>`;
    }

    return `
    <tr ${isAdmin ? `onclick='openEditEmployeeModal(${JSON.stringify(e).replace(/'/g, "&#39;")})' style="cursor:pointer"` : ''}>
      <td><strong>${formatId(e.id)}</strong></td>
      <td>${e.employee_code}</td>
      <td>${e.full_name}</td>
      <td>${e.position || '—'}</td>
      <td>${e.employment_type || '—'}</td>
      <td>${e.username || '—'}</td>
      <td onclick="event.stopPropagation()">${roleHtml}</td>
      <td onclick="event.stopPropagation()">${statusHtml}</td>
    </tr>`;
  }).join('');
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

async function changeEmployeeRole(id, role) {
  try {
    const res = await apiPut(`/employees/${id}/role`, { role });
    if (res.success) {
      showToast(`Đổi phân quyền thành ${role === 'manager' ? 'Manager' : 'Employee'} thành công!`, 'success');
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
  document.getElementById('empPhone').value = '';
  document.getElementById('empHouseNum').value = '';
  document.getElementById('empStreet').value = '';
  document.getElementById('empDistrict').value = '';
  document.getElementById('empProvince').value = '';
  document.getElementById('empPosition').value = '';
  document.getElementById('empEmploymentType').value = '';
  document.getElementById('empPassword').value = '123456';

  // Show all fields (they may have been hidden for edit mode)
  document.querySelectorAll('.emp-add-only').forEach(el => el.style.display = '');
  document.getElementById('empPasswordGroup').style.display = '';

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
  document.getElementById('empPhone').value = emp.phone_num || '';
  document.getElementById('empHouseNum').value = emp.house_num || '';
  document.getElementById('empStreet').value = emp.street || '';
  document.getElementById('empDistrict').value = emp.district || '';
  document.getElementById('empProvince').value = emp.province || '';
  document.getElementById('empPosition').value = emp.position || '';
  document.getElementById('empEmploymentType').value = emp.employment_type || '';
  
  // Hiển thị lại trường password khi sửa, nếu không nhập gì thì không đổi
  document.getElementById('empPassword').value = '';
  document.getElementById('empPassword').placeholder = 'Bỏ trống nếu giữ nguyên';
  document.getElementById('empPasswordGroup').style.display = '';

  new bootstrap.Modal(document.getElementById('employeeModal')).show();
}

// ====== LƯU (ADD hoặc EDIT) ======
async function saveEmployee() {
  const id = document.getElementById('empId').value;
  const position = document.getElementById('empPosition').value;
  const employment_type = document.getElementById('empEmploymentType').value;

  if (id) {
    // EDIT mode — includes address fields
    const body = {
      first_name: document.getElementById('empFirstName').value,
      middle_name: document.getElementById('empMiddleName').value,
      last_name: document.getElementById('empLastName').value,
      gender: document.getElementById('empGender').value,
      position,
      employment_type,
      phone_num: document.getElementById('empPhone').value,
      house_num: document.getElementById('empHouseNum').value,
      street: document.getElementById('empStreet').value,
      district: document.getElementById('empDistrict').value,
      province: document.getElementById('empProvince').value,
      password: document.getElementById('empPassword').value
    };
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
      phone_num: document.getElementById('empPhone').value,
      house_num: document.getElementById('empHouseNum').value,
      street: document.getElementById('empStreet').value,
      district: document.getElementById('empDistrict').value,
      province: document.getElementById('empProvince').value,
      position,
      employment_type,
      password: document.getElementById('empPassword').value || '123456',
    };
    try {
      const res = await apiPost('/employees', body);
      if (res.success) {
        showToast(res.message, 'success');
        bootstrap.Modal.getInstance(document.getElementById('employeeModal')).hide();
        loadEmployees();
      } else showToast(res.message, 'error');
    } catch (err) { showToast('Lỗi kết nối!', 'error'); }
  }
}
