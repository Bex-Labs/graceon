// =========================================
// GRACEON - Product Detail Page JS
// =========================================

let currentProduct = null;
let currentQty = 1;

document.addEventListener('DOMContentLoaded', async () => {
  const productId = getProductIdFromURL();

  if (!productId) {
    showErrorState('No product specified.');
    return;
  }

  await loadProduct(productId);
});

// ---- Get product ID from URL ----
function getProductIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

// ---- Load product from Supabase ----
async function loadProduct(id) {
  try {
    const { data, error } = await supabaseClient
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Product not found');

    currentProduct = data;
    renderProduct(data);
    loadRelatedProducts(data.category, data.id);
    updatePageTitle(data.name);

  } catch (err) {
    console.error('Error loading product:', err);
    showErrorState('Product not found. It may have been removed.');
  }
}

// ---- Render product detail ----
function renderProduct(product) {
  const container = document.getElementById('product-detail');
  const breadcrumb = document.getElementById('breadcrumb-name');

  if (breadcrumb) breadcrumb.textContent = product.name;

  const badge = product.badge ? `
    <div class="product-image-badge">
      <span class="badge ${getBadgeClass(product.badge)}">${product.badge}</span>
    </div>
  ` : '';

  const dietary = product.dietary?.length
    ? `<div class="product-detail-dietary">
        ${product.dietary.map(d => `<span class="dietary-tag">${d}</span>`).join('')}
       </div>`
    : '';

  container.innerHTML = `
    <div class="product-detail-image-wrap">
      ${badge}
      <img
        src="${product.image_url || 'assets/images/placeholder.jpg'}"
        alt="${product.name}"
        class="product-main-image"
        onerror="this.src='assets/images/placeholder.jpg'"
      />
    </div>

    <div class="product-detail-info">
      <p class="product-detail-category">${product.category || ''}</p>
      <h1 class="product-detail-name">${product.name}</h1>

      <div class="product-detail-price">
        <strong>${formatNaira(product.price)}</strong>
        <span>/ ${product.price_unit || 'Dozen'}</span>
      </div>

      <p class="product-detail-description">${product.description || ''}</p>

      ${dietary}

      ${product.occasion ? `
        <div class="product-detail-occasion">
          🎉 Perfect for: <strong>${product.occasion}</strong>
        </div>
      ` : ''}

      <div class="product-detail-actions">
        ${product.in_stock ? `
          <div class="quantity-row">
            <span class="quantity-label">Quantity</span>
            <div class="quantity-controls">
              <button onclick="changeQty(-1)">−</button>
              <span id="detail-qty">1</span>
              <button onclick="changeQty(1)">+</button>
            </div>
          </div>

          <button class="btn-detail-cart" onclick="addToCartFromDetail()">
            🛒 Add to Cart
          </button>

          <button class="btn-detail-wishlist" onclick="showToast('Wishlist coming soon! 🍪')">
            ♡ Save to Wishlist
          </button>
        ` : `
          <div class="out-of-stock-banner">
            <span>😔 Currently Out of Stock</span>
          </div>

          <button class="btn-detail-cart" onclick="handleNotifyClick('${product.id}', null)">
            📧 Notify Me When Available
          </button>
        `}
      </div>

      <div class="product-detail-share">
        <span class="share-label">Share:</span>
        <a class="share-btn" onclick="shareProduct('facebook')" title="Share on Facebook">📘</a>
        <a class="share-btn" onclick="shareProduct('twitter')" title="Share on Twitter">🐦</a>
        <a class="share-btn" onclick="shareProduct('whatsapp')" title="Share on WhatsApp">💬</a>
        <a class="share-btn" onclick="copyProductLink()" title="Copy Link">🔗</a>
      </div>

      <div class="product-detail-features">
        <h4>Why You'll Love It</h4>
        <div class="product-features-grid">
          <div class="product-feature-item">
            <span>🌿</span>
            <span>Premium ingredients</span>
          </div>
          <div class="product-feature-item">
            <span>🤲</span>
            <span>Handcrafted in small batches</span>
          </div>
          <div class="product-feature-item">
            <span>📦</span>
            <span>Beautiful gift packaging</span>
          </div>
          <div class="product-feature-item">
            <span>🚀</span>
            <span>Free shipping over ₦50,000</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ---- Change quantity ----
function changeQty(change) {
  currentQty += change;
  if (currentQty < 1) currentQty = 1;
  if (currentQty > 20) currentQty = 20;
  const qtyEl = document.getElementById('detail-qty');
  if (qtyEl) qtyEl.textContent = currentQty;
}

// ---- Add to cart from detail page ----
function addToCartFromDetail() {
  if (!currentProduct) return;

  for (let i = 0; i < currentQty; i++) {
    addToCart({
      id: currentProduct.id,
      name: currentProduct.name,
      price: currentProduct.price,
      image_url: currentProduct.image_url
    });
  }
}

// ---- Load related products ----
async function loadRelatedProducts(category, excludeId) {
  const grid = document.getElementById('related-products');

  try {
    const { data, error } = await supabaseClient
      .from('products')
      .select('*')
      .eq('category', category)
      .neq('id', excludeId)
      .limit(4);

    if (error) throw error;

    if (!data || data.length === 0) {
      // Fallback — load any 4 products
      const { data: fallback } = await supabaseClient
        .from('products')
        .select('*')
        .neq('id', excludeId)
        .limit(4);

      grid.innerHTML = (fallback || []).map(p => createProductCard(p)).join('');
      return;
    }

    grid.innerHTML = data.map(p => createProductCard(p)).join('');

  } catch (err) {
    console.error('Error loading related products:', err);
    grid.innerHTML = '';
  }
}

// ---- Share product ----
function shareProduct(platform) {
  const url = encodeURIComponent(window.location.href);
  const text = encodeURIComponent(`Check out ${currentProduct?.name} from Graceon Cookies! 🍪`);

  const links = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
    whatsapp: `https://wa.me/?text=${text}%20${url}`
  };

  if (links[platform]) {
    window.open(links[platform], '_blank', 'width=600,height=400');
  }
}

// ---- Copy product link ----
function copyProductLink() {
  navigator.clipboard.writeText(window.location.href).then(() => {
    showToast('Link copied to clipboard! 🔗');
  });
}

// ---- Badge class helper ----
function getBadgeClass(badge) {
  const map = {
    'Best Seller': 'badge-bestseller',
    'Limited Edition': 'badge-limited',
    'Gluten Free': 'badge-glutenfree',
    'New': 'badge-new'
  };
  return map[badge] || 'badge-bestseller';
}

// ---- Update page title ----
function updatePageTitle(name) {
  document.title = `${name} — Graceon Cookies`;
}

// ---- Error state ----
function showErrorState(message) {
  const container = document.getElementById('product-detail');
  if (container) {
    container.innerHTML = `
      <div style="grid-column:1/-1; text-align:center; padding:80px 20px; color:var(--gray);">
        <div style="font-size:56px; margin-bottom:16px;">🍪</div>
        <h2 style="color:var(--dark); margin-bottom:8px;">Oops!</h2>
        <p style="margin-bottom:24px;">${message}</p>
        <a href="shop.html" class="btn btn-primary">Back to Shop</a>
      </div>
    `;
  }
}