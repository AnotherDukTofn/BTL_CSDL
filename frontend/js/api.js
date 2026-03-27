// ========================================
// API Helper - Fetch Wrapper
// ========================================

const API_BASE = 'https://little-paws-sing.loca.lt/api';

function getCurrentRole() {
  return window.__currentRole || 'admin';
}

async function apiGet(endpoint) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'x-role': getCurrentRole(),
      'bypass-tunnel-reminder': 'true',
    },
  });
  return response.json();
}

async function apiPost(endpoint, body) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-role': getCurrentRole(),
      'bypass-tunnel-reminder': 'true',
    },
    body: JSON.stringify(body),
  });
  return response.json();
}

async function apiPut(endpoint, body) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-role': getCurrentRole(),
      'bypass-tunnel-reminder': 'true',
    },
    body: JSON.stringify(body),
  });
  return response.json();
}

// Format số tiền VND
function formatPrice(value) {
  if (value == null) return '—';
  return Number(value).toLocaleString('vi-VN') + ' ₫';
}

// Format ID thành 3 chữ số
function formatId(id) {
  return String(id).padStart(3, '0');
}

// Format ngày
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Format datetime
function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Show toast notification
function showToast(message, type = 'success') {
  const toast = document.getElementById('toastNotification');
  const toastMsg = document.getElementById('toastMessage');
  toastMsg.textContent = message;
  toast.className = `toast align-items-center border-0 toast-${type}`;
  const bsToast = new bootstrap.Toast(toast, { delay: 3000 });
  bsToast.show();
}

// Stock badge
function stockBadge(qty) {
  if (qty <= 0) return `<span class="stock-out">${qty}</span>`;
  if (qty <= 10) return `<span class="stock-low">${qty}</span>`;
  return `<span class="stock-ok">${qty}</span>`;
}
