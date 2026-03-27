// ========================================
// Products Tab
// ========================================

async function loadProducts() {
  try {
    const res = await apiGet('/products');
    if (res.success) {
      renderProductsTable(res.data);
    }
  } catch (err) {
    console.error('Error loading products:', err);
  }
}

function renderProductsTable(data) {
  const tbody = document.getElementById('productsTableBody');
  const isAdmin = getCurrentRole() === 'admin';

  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Không có sản phẩm nào.</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(p => `
    <tr onclick='openEditProductModal(${JSON.stringify(p).replace(/'/g, "&#39;")})'>
      <td><strong>${formatId(p.id)}</strong></td>
      <td>${p.name}</td>
      <td>${p.category_name || '—'}</td>
      <td>${p.manufacturer_name || '—'}</td>
      <td class="col-admin price" style="display:${isAdmin ? '' : 'none'}">${formatPrice(p.in_unit_price)}</td>
      <td class="price">${formatPrice(p.out_unit_price)}</td>
      <td>${stockBadge(p.stock_quantity)}</td>
    </tr>
  `).join('');
}

// Search
async function searchProducts() {
  const type = document.getElementById('productSearchType').value;
  const keyword = document.getElementById('productSearchKeyword').value.trim();
  if (!keyword) {
    loadProducts();
    return;
  }
  try {
    const res = await apiGet(`/products/search?type=${type}&keyword=${encodeURIComponent(keyword)}`);
    if (res.success) renderProductsTable(res.data);
  } catch (err) {
    console.error(err);
  }
}

// Filter toggle
function toggleProductFilter() {
  const row = document.getElementById('productFilterRow');
  row.style.display = row.style.display === 'none' ? 'block' : 'none';
}

// Filter
async function filterProducts() {
  const catId = document.getElementById('filterCategory').value;
  const manId = document.getElementById('filterManufacturer').value;
  let query = '/products/filter?';
  if (catId) query += `categoryId=${catId}&`;
  if (manId) query += `manufacturerId=${manId}&`;
  try {
    const res = await apiGet(query);
    if (res.success) renderProductsTable(res.data);
  } catch (err) {
    console.error(err);
  }
}

function resetProductFilter() {
  document.getElementById('filterCategory').value = '';
  document.getElementById('filterManufacturer').value = '';
  loadProducts();
}

// Edit Modal
function openEditProductModal(product) {
  document.getElementById('editProductId').value = product.id;
  document.getElementById('editProductName').value = product.name;
  document.getElementById('editProductPrice').value = product.out_unit_price;

  // Populate dropdowns
  const cats = window.__cache.categories;
  const mans = window.__cache.manufacturers;
  populateSelect('editProductCategory', cats, '-- Phân loại --');
  populateSelect('editProductManufacturer', mans, '-- Nhà sản xuất --');
  document.getElementById('editProductCategory').value = product.category_id || '';
  document.getElementById('editProductManufacturer').value = product.manufacturer_id || '';

  // Price field: disable for employee
  const isAdmin = getCurrentRole() === 'admin';
  document.getElementById('editProductPrice').disabled = !isAdmin;
  document.getElementById('editPriceNote').style.display = isAdmin ? 'none' : 'block';

  new bootstrap.Modal(document.getElementById('editProductModal')).show();
}

async function updateProduct() {
  const id = document.getElementById('editProductId').value;
  const body = {
    name: document.getElementById('editProductName').value,
    category_id: parseInt(document.getElementById('editProductCategory').value) || null,
    manufacturer_id: parseInt(document.getElementById('editProductManufacturer').value) || null,
    out_unit_price: parseFloat(document.getElementById('editProductPrice').value) || 0,
  };

  try {
    const res = await apiPut(`/products/${id}`, body);
    if (res.success) {
      showToast('Cập nhật sản phẩm thành công!', 'success');
      bootstrap.Modal.getInstance(document.getElementById('editProductModal')).hide();
      loadProducts();
    } else {
      showToast(res.message, 'error');
    }
  } catch (err) {
    showToast('Lỗi kết nối!', 'error');
  }
}

// Add Modal
function openAddProductModal() {
  document.getElementById('addProductName').value = '';
  document.getElementById('addProductInPrice').value = '';
  document.getElementById('addProductOutPrice').value = '';
  document.getElementById('addProductStock').value = '0';

  populateSelect('addProductCategory', window.__cache.categories, '-- Phân loại --');
  populateSelect('addProductManufacturer', window.__cache.manufacturers, '-- Nhà sản xuất --');

  new bootstrap.Modal(document.getElementById('addProductModal')).show();
}

async function saveProduct() {
  const body = {
    name: document.getElementById('addProductName').value,
    category_id: parseInt(document.getElementById('addProductCategory').value) || null,
    manufacturer_id: parseInt(document.getElementById('addProductManufacturer').value) || null,
    in_unit_price: parseFloat(document.getElementById('addProductInPrice').value) || 0,
    out_unit_price: parseFloat(document.getElementById('addProductOutPrice').value) || 0,
    stock_quantity: parseInt(document.getElementById('addProductStock').value) || 0,
  };

  try {
    const res = await apiPost('/products', body);
    if (res.success) {
      showToast('Thêm sản phẩm thành công!', 'success');
      bootstrap.Modal.getInstance(document.getElementById('addProductModal')).hide();
      loadProducts();
    } else {
      showToast(res.message, 'error');
    }
  } catch (err) {
    showToast('Lỗi kết nối!', 'error');
  }
}
