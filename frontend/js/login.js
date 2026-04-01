// ========================================
// Login & Authentication
// ========================================

async function doLogin() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  const errorEl = document.getElementById('loginError');

  if (!username || !password) {
    errorEl.textContent = 'Vui lòng nhập đầy đủ thông tin!';
    errorEl.style.display = 'block';
    return;
  }

  errorEl.style.display = 'none';

  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const res = await response.json();

    if (res.success) {
      // Lưu thông tin user vào session
      sessionStorage.setItem('currentUser', JSON.stringify(res.data));

      // Ẩn login, hiện app
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('sidebar').style.display = '';
      document.getElementById('mainContent').style.display = '';

      // Cập nhật UI user info
      updateUserInfo(res.data);

      // Khởi tạo app
      initApp();

      showToast(`Chào mừng ${res.data.full_name}!`, 'success');
    } else {
      errorEl.textContent = res.message;
      errorEl.style.display = 'block';
      // Shake animation
      document.getElementById('loginCard').classList.add('shake');
      setTimeout(() => document.getElementById('loginCard').classList.remove('shake'), 500);
    }
  } catch (err) {
    errorEl.textContent = 'Không thể kết nối đến server!';
    errorEl.style.display = 'block';
  }
}

function doLogout() {
  sessionStorage.removeItem('currentUser');

  // Hiện login, ẩn app
  document.getElementById('loginScreen').style.display = '';
  document.getElementById('sidebar').style.display = 'none';
  document.getElementById('mainContent').style.display = 'none';

  // Reset login form
  document.getElementById('loginUsername').value = '';
  document.getElementById('loginPassword').value = '';
  document.getElementById('loginError').style.display = 'none';
}

function checkAuth() {
  const user = getCurrentUser();
  if (user) {
    // Đã đăng nhập — hiện app
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('sidebar').style.display = '';
    document.getElementById('mainContent').style.display = '';
    updateUserInfo(user);
    return true;
  } else {
    // Chưa đăng nhập — hiện login
    document.getElementById('loginScreen').style.display = '';
    document.getElementById('sidebar').style.display = 'none';
    document.getElementById('mainContent').style.display = 'none';
    return false;
  }
}

function updateUserInfo(user) {
  const nameEl = document.getElementById('userDisplayName');
  const roleEl = document.getElementById('userDisplayRole');
  if (nameEl) nameEl.textContent = user.full_name;
  if (roleEl) {
    roleEl.textContent = user.role === 'manager' ? 'Quản lý' : 'Nhân viên';
    roleEl.className = 'user-role-badge ' + (user.role === 'manager' ? 'role-manager' : 'role-employee');
  }

  // Toggle admin-only elements based on actual role
  const isAdmin = user.role === 'manager';
  document.querySelectorAll('.col-admin').forEach(el => {
    el.style.display = isAdmin ? '' : 'none';
  });
}
