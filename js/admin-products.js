// =========================================
// GRACEON - Admin Products Management
// =========================================

let allAdminProducts = [];
let editingProductId = null;

document.addEventListener('DOMContentLoaded', async () => {
  const session = await requireAdminAuth();
  if (!session) return;

  await loadAdminProducts();
  initProductSearch();
});

// ---- Load all products ----
async function loadAdminProducts() {
  const tbody = document.getElementById('products-table-body');

  try {
    const { data, error } = await supabaseClient
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    allAdminProducts = data || [];
    renderProductsTable(allAdminProducts);

  } catch (err) {
    console.error('Error loading products:', err);
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--gray)">Unable to load products.</td></tr>`;
  }
}

// ---- Render products table ----
function renderProductsTable(products) {
  const tbody = document.getElementById('products-table-body');

  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--gray)">No products found.</td></tr>`;
    return;
  }

  tbody.innerHTML = products.map(p => `
    <tr>
      <td><img src="${p.image_url || 'assets/images/placeholder.jpg'}" alt="${p.name}" onerror="this.src='assets/images/placeholder.jpg'" /></td>
      <td><strong>${p.name}</strong></td>
      <td>${p.category || '—'}</td>
      <td>${formatNaira(p.price)}</td>
      <td>${p.badge ? `<span class="admin-status-badge status-completed">${p.badge}</span>` : '—'}</td>
      <td>
        <span class="admin-status-badge ${p.in_stock ? 'status-completed' : 'status-cancelled'}">
          ${p.in_stock ? 'In Stock' : 'Out of Stock'}
        </span>
      </td>
      <td>
        <div class="admin-table-actions">
          <button class="admin-icon-btn" onclick="editProduct('${p.id}')" title="Edit">✏️</button>
          <button class="admin-icon-btn danger" onclick="deleteProduct('${p.id}', '${p.name.replace(/'/g, "\\'")}')" title="Delete">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ---- Search products ----
function initProductSearch() {
  document.getElementById('product-search')?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    const filtered = allAdminProducts.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.category?.toLowerCase().includes(query)
    );
    renderProductsTable(filtered);
  });
}

// ---- Open modal for new product ----
function openProductModal() {
  editingProductId = null;
  document.getElementById('product-modal-title').textContent = 'Add New Product';
  document.getElementById('product-id').value = '';
  document.getElementById('product-name').value = '';
  document.getElementById('product-description').value = '';
  document.getElementById('product-price').value = '';
  document.getElementById('product-price-unit').value = 'Dozen';
  document.getElementById('product-category').value = 'Classic Cookies';
  document.getElementById('product-occasion').value = 'Birthday';
  document.getElementById('product-badge').value = '';
  document.getElementById('product-dietary').value = '';
  document.getElementById('product-image').value = '';
  document.getElementById('product-in-stock').value = 'true';
  document.getElementById('product-featured').value = 'false';

  document.getElementById('product-modal-overlay').classList.add('open');
}

// ---- Open modal for editing ----
function editProduct(id) {
  const product = allAdminProducts.find(p => p.id === id);
  if (!product) return;

  editingProductId = id;
  document.getElementById('product-modal-title').textContent = 'Edit Product';
  document.getElementById('product-id').value = product.id;
  document.getElementById('product-name').value = product.name || '';
  document.getElementById('product-description').value = product.description || '';
  document.getElementById('product-price').value = product.price || '';
  document.getElementById('product-price-unit').value = product.price_unit || 'Dozen';
  document.getElementById('product-category').value = product.category || 'Classic Cookies';
  document.getElementById('product-occasion').value = product.occasion || 'Birthday';
  document.getElementById('product-badge').value = product.badge || '';
  document.getElementById('product-dietary').value = (product.dietary || []).join(', ');
  document.getElementById('product-image').value = product.image_url || '';
  document.getElementById('product-in-stock').value = String(product.in_stock);
  document.getElementById('product-featured').value = String(product.is_featured);

  document.getElementById('product-modal-overlay').classList.add('open');
}

// ---- Close modal ----
function closeProductModal() {
  document.getElementById('product-modal-overlay').classList.remove('open');
}

// ---- Save product (Create or Update) ----
async function saveProduct() {
  const name = document.getElementById('product-name').value.trim();
  const price = parseFloat(document.getElementById('product-price').value);

  if (!name || !price) {
    showToast('Please fill in at least the name and price.');
    return;
  }

  const btn = document.getElementById('product-save-btn');
  btn.textContent = 'Saving...';
  btn.disabled = true;

  const dietaryRaw = document.getElementById('product-dietary').value.trim();
  const dietary = dietaryRaw ? dietaryRaw.split(',').map(d => d.trim()).filter(Boolean) : [];

  const productData = {
    name,
    description: document.getElementById('product-description').value.trim(),
    price,
    price_unit: document.getElementById('product-price-unit').value.trim() || 'Dozen',
    category: document.getElementById('product-category').value,
    occasion: document.getElementById('product-occasion').value,
    badge: document.getElementById('product-badge').value || null,
    dietary,
    image_url: document.getElementById('product-image').value.trim(),
    in_stock: document.getElementById('product-in-stock').value === 'true',
    is_featured: document.getElementById('product-featured').value === 'true'
  };

  try {
    let error;

    if (editingProductId) {
      // Update
      ({ error } = await supabaseClient
        .from('products')
        .update(productData)
        .eq('id', editingProductId));
    } else {
      // Insert
      ({ error } = await supabaseClient
        .from('products')
        .insert([productData]));
    }

    if (error) throw error;

    showToast(editingProductId ? 'Product updated! 🍪' : 'Product added! 🍪');
    closeProductModal();
    await loadAdminProducts();

  } catch (err) {
    console.error('Error saving product:', err);
    showToast('Something went wrong. Please try again.');
  } finally {
    btn.textContent = 'Save Product';
    btn.disabled = false;
  }
}

// ---- Delete product ----
async function deleteProduct(id, name) {
  if (!confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) {
    return;
  }

  try {
    const { error } = await supabaseClient
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;

    showToast('Product deleted.');
    await loadAdminProducts();

  } catch (err) {
    console.error('Error deleting product:', err);
    showToast('Unable to delete product.');
  }
}

// ---- Currency Formatter (Naira) ----
function formatNaira(amount) {
  const num = parseFloat(amount) || 0;
  return '₦' + num.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}