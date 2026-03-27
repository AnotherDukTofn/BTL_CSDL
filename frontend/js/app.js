// ========================================
// App.js - Main SPA Router & Role Management
// ========================================

// Global state
window.__currentRole = 'admin';

// Cache for dropdown data
window.__cache = {
  categories: [],
  manufacturers: [],
  providers: [],
  products: [],
  customers: [],
  employees: [],
};

// ====== ROLE MANAGEMENT ======
function setRole(role) {
  window.__currentRole = role;

  // Update UI buttons
  document.getElementById('btnRoleAdmin').classList.toggle('active', role === 'admin');
  document.getElementById('btnRoleEmployee').classList.toggle('active', role === 'employee');

  // Toggle admin-only columns
  document.querySelectorAll('.col-admin').forEach(el => {
    el.style.display = role === 'admin' ? '' : 'none';
  });

  // Refresh current tab to apply role
  const activeTab = document.querySelector('.nav-item.active');
  if (activeTab) {
    switchTab(activeTab.dataset.tab);
  }
}

// ====== TAB SWITCHING ======
function switchTab(tabName) {
  // Update nav items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.tab === tabName);
  });

  // Update tab content
  document.querySelectorAll('.tab-content').forEach(section => {
    section.classList.remove('active');
  });
  const target = document.getElementById(`tab-${tabName}`);
  if (target) target.classList.add('active');

  // Load data for the tab
  switch (tabName) {
    case 'products':
      loadProducts();
      break;
    case 'customers':
      loadCustomers();
      break;
    case 'invoices':
      loadInvoices();
      break;
    case 'imports':
      loadImports();
      break;
    case 'employees':
      handleEmployeeTab();
      break;
    case 'warranties':
      loadWarranties();
      loadWarrantyClaims();
      break;
  }
}

// Employees tab: access control
function handleEmployeeTab() {
  const role = getCurrentRole();
  const denied = document.getElementById('employeeAccessDenied');
  const content = document.getElementById('employeeContent');

  if (role !== 'admin') {
    denied.style.display = 'block';
    content.style.display = 'none';
  } else {
    denied.style.display = 'none';
    content.style.display = 'block';
    loadEmployees();
  }
}

// ====== LOAD DROPDOWN DATA ======
async function loadDropdownData() {
  try {
    const [catRes, manRes, provRes] = await Promise.all([
      apiGet('/categories'),
      apiGet('/manufacturers'),
      apiGet('/providers'),
    ]);
    if (catRes.success) window.__cache.categories = catRes.data;
    if (manRes.success) window.__cache.manufacturers = manRes.data;
    if (provRes.success) window.__cache.providers = provRes.data;
  } catch (err) {
    console.error('Error loading dropdown data:', err);
  }
}

function populateSelect(selectId, items, placeholder = '-- Chọn --') {
  const el = document.getElementById(selectId);
  if (!el) return;
  el.innerHTML = `<option value="">${placeholder}</option>` +
    items.map(i => `<option value="${i.id}">${i.name || i.full_name || i.customer_code}</option>`).join('');
}

// ====== TABLE SORTING (Universal) ======
function initTableSorting() {
  document.querySelectorAll('.table.data-table').forEach(table => {
    const headers = table.querySelectorAll('thead th');
    headers.forEach((th, index) => {
      // Add cursor style
      th.style.cursor = 'pointer';
      th.title = 'Click để sắp xếp';
      th.dataset.sortDir = ''; // none, asc, desc

      // Chèn sẵn icon mặc định (tăng dần mờ mờ) vào tiêu đề
      // Bao bọc label vào một div hoặc span để dễ kiểm soát (nếu chưa có)
      const label = th.innerHTML;
      th.innerHTML = `<span>${label}</span> <i class="bi bi-sort-down text-muted sort-icon ms-1"></i>`;

      th.addEventListener('click', () => {
        // Determine intended direction (defaults to ASC)
        const isAsc = th.dataset.sortDir !== 'asc';

        // Reset all headers in this table về trạng thái mặc định
        headers.forEach(h => {
          h.dataset.sortDir = '';
          const icon = h.querySelector('.sort-icon');
          if (icon) {
            icon.className = 'bi bi-sort-down text-muted sort-icon ms-1';
          }
        });

        // Set active header
        th.dataset.sortDir = isAsc ? 'asc' : 'desc';
        // Đổi icon của cột được click
        const activeIcon = th.querySelector('.sort-icon');
        if (activeIcon) {
          activeIcon.className = isAsc 
            ? 'bi bi-sort-down sort-icon ms-1 text-primary' 
            : 'bi bi-sort-up sort-icon ms-1 text-primary';
        }

        // Sort DOM
        sortTableRows(table, index, isAsc);
      });
    });

    // We can also observe tbody changes to re-apply sort or clear headers
    const tbody = table.querySelector('tbody');
    if (tbody) {
      const observer = new MutationObserver(() => {
        // Find if a header is currently sorted
        const activeTh = Array.from(headers).find(h => h.dataset.sortDir);
        if (activeTh) {
          // If rows just changed (e.g. data loaded), re-apply sort silently
          const idx = Array.from(headers).indexOf(activeTh);
          const isAsc = activeTh.dataset.sortDir === 'asc';
          // Disconnect temporarily to avoid infinite loops
          observer.disconnect();
          sortTableRows(table, idx, isAsc);
          observer.observe(tbody, { childList: true });
        } else {
          // Default: trigger click on the very FIRST column to assure default ASC 
          // (Only if table is not showing "Đang tải...")
          if (tbody.rows.length > 0 && tbody.rows[0].cells.length > 1 && !table.dataset.initialized) {
            table.dataset.initialized = 'true';
            headers[0].click();
          }
        }
      });
      observer.observe(tbody, { childList: true });
    }
  });
}

function sortTableRows(table, colIndex, isAsc) {
  const tbody = table.querySelector('tbody');
  const rows = Array.from(tbody.querySelectorAll('tr'));
  
  // Guard clause against empty/loading states
  if (rows.length === 0 || (rows.length === 1 && rows[0].cells.length === 1)) return;

  rows.sort((a, b) => {
    let valA = a.cells[colIndex]?.textContent.trim() || '';
    let valB = b.cells[colIndex]?.textContent.trim() || '';
    
    // Check if numeric (strip everything except digits, minus, dot/comma)
    const numRegex = /^[0-9.,\s-₫]+$/;
    if (numRegex.test(valA) && numRegex.test(valB) && valA.match(/\d/) && valB.match(/\d/)) {
      valA = parseFloat(valA.replace(/[^\d.-]/g, ''));
      valB = parseFloat(valB.replace(/[^\d.-]/g, ''));
    } else {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
    }
    
    if (valA < valB) return isAsc ? -1 : 1;
    if (valA > valB) return isAsc ? 1 : -1;
    return 0;
  });
  
  tbody.append(...rows);
}

// ====== INIT ======
document.addEventListener('DOMContentLoaded', async () => {
  initTableSorting();
  await loadDropdownData();
  
  // Populate filter dropdowns
  populateSelect('filterCategory', window.__cache.categories, '-- Phân loại --');
  populateSelect('filterManufacturer', window.__cache.manufacturers, '-- Nhà sản xuất --');

  // Load default tab
  switchTab('products');
  setRole('admin');

  // Enter key search
  document.getElementById('productSearchKeyword')?.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') searchProducts();
  });
  document.getElementById('customerSearchKeyword')?.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') searchCustomers();
  });
});
