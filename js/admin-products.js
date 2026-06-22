// =========================================
// GRACEON - Admin Products Management
// =========================================

// ---- Resend Email Config ----
const RESEND_API_KEY = 're_RzbnirFi_K7FVfiKBNdSkDfzfJ6WS3i8X'; // Replace with your re_... key
const RESEND_FROM = 'GraceOn Cookies <onboarding@resend.dev>'; // Update when domain is ready

// ---- Send Restock Notification Emails ----
async function sendRestockEmails(productId, productName) {
  try {
    // Fetch all waitlisted emails for this product
    const { data: waitlist, error } = await supabaseClient
      .from('stock_notifications')
      .select('email')
      .eq('product_id', productId);

    if (error || !waitlist || waitlist.length === 0) return;

    const emails = waitlist.map(r => r.email);

    // Send one email per address
    for (const email of emails) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: RESEND_FROM,
          to: [email],
          subject: `${productName} is back in stock! 🍪`,
          html: `
            <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; background: #FDFAF5;">
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #1B6B35; font-size: 28px; margin: 0;">GraceOn</h1>
                <p style="color: #E07B00; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; margin: 4px 0 0;">Artisan Cookies</p>
              </div>
              <h2 style="color: #1a1a1a; font-size: 22px; margin-bottom: 12px;">Great news — it's back! 🎉</h2>
              <p style="color: #555; font-size: 15px; line-height: 1.7;">
                <strong>${productName}</strong> is back in stock and ready to order. Don't wait too long — it sells fast!
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="https://graceon-bx.vercel.app/shop.html"
                  style="background: #1B6B35; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600;">
                  Shop Now
                </a>
              </div>
              <p style="color: #aaa; font-size: 12px; text-align: center; margin-top: 40px;">
                © GraceOn Artisan Cookies. You received this because you requested a restock notification.
              </p>
            </div>
          `
        })
      });
    }

    // Clear waitlist for this product now that emails are sent
    await supabaseClient
      .from('stock_notifications')
      .delete()
      .eq('product_id', productId);

    console.log(`Restock emails sent to ${emails.length} customer(s) for "${productName}"`);

  } catch (err) {
    console.error('Failed to send restock emails:', err);
  }
}

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
      // Check if product was previously out of stock and is now being restocked
      const previousProduct = allAdminProducts.find(p => p.id === editingProductId);
      const wasOutOfStock = previousProduct && previousProduct.in_stock === false;
      const isNowInStock = productData.in_stock === true;

      // Update
      ({ error } = await supabaseClient
        .from('products')
        .update(productData)
        .eq('id', editingProductId));

      if (error) throw error;

      // Send restock emails if product just came back in stock
      if (wasOutOfStock && isNowInStock) {
        await sendRestockEmails(editingProductId, name);
      }
    } else {
      // Insert
      ({ error } = await supabaseClient
        .from('products')
        .insert([productData]));

      if (error) throw error;
    }

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