// =========================================
// GRACEON - Package Detail Page JS
// =========================================

let currentPackage = null;
let currentPkgQty = 1;

document.addEventListener('DOMContentLoaded', async () => {
  const packageId = getPackageIdFromURL();

  if (!packageId) {
    showErrorState('No package specified.');
    return;
  }

  await loadPackage(packageId);
});

// ---- Get package ID from URL ----
function getPackageIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

// ---- Load package from Supabase ----
async function loadPackage(id) {
  try {
    const { data, error } = await supabaseClient
      .from('packages')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Package not found');

    currentPackage = data;
    renderPackage(data);
    loadOtherPackages(data.id);
    document.title = `${data.name} — Graceon Cookies`;
    if (!data.in_stock) prefillNotifyEmail();

  } catch (err) {
    console.error('Error loading package:', err);
    showErrorState('Package not found. It may have been removed.');
  }
}

// ---- Render package detail ----
function renderPackage(pkg) {
  const container = document.getElementById('package-detail');
  const breadcrumb = document.getElementById('breadcrumb-name');

  if (breadcrumb) breadcrumb.textContent = pkg.name;

  const badge = pkg.badge
    ? `<span class="badge badge-bestseller" style="position:absolute;top:16px;left:16px">${pkg.badge}</span>`
    : '';

  const contents = pkg.contents?.length
    ? `<div class="package-detail-contents">
        <h4>What's Included in This Package</h4>
        <div class="package-contents-list">
          ${pkg.contents.map(item => `
            <div class="package-content-item">
              <div class="package-content-check">✓</div>
              <span>${item}</span>
            </div>
          `).join('')}
        </div>
      </div>`
    : '';

  const isCorporate = pkg.package_type === 'Corporate Gifting';

  container.innerHTML = `
    <div class="package-detail-image-wrap" style="position:relative">
      ${badge}
      <img
        src="${pkg.image_url || 'assets/images/placeholder.jpg'}"
        alt="${pkg.name}"
        class="package-main-image"
        onerror="this.src='assets/images/placeholder.jpg'"
      />
    </div>

    <div class="package-detail-info">
      <p class="package-detail-type">${pkg.package_type || ''}</p>
      <h1 class="package-detail-name">${pkg.name}</h1>
      <p class="package-detail-price">${formatNaira(pkg.price)}</p>
      <p class="package-detail-description">${pkg.description || ''}</p>

      ${contents}

      <div class="package-detail-actions">
        ${pkg.in_stock ? `
          <div class="quantity-row">
            <span class="quantity-label">Quantity</span>
            <div class="quantity-controls">
              <button onclick="changePkgQty(-1)">−</button>
              <span id="pkg-detail-qty">1</span>
              <button onclick="changePkgQty(1)">+</button>
            </div>
          </div>

          <button class="btn-pkg-detail-cart" onclick="addToCartFromPkgDetail()">
            🛒 Add to Cart
          </button>

          <button class="btn-pkg-detail-secondary" onclick="sharePackage('whatsapp')">
            💬 Share This Package
          </button>
        ` : `
          <div class="out-of-stock-banner">
            <span>😔 Currently Out of Stock</span>
          </div>

          <div class="notify-me-box" id="notify-me-box">
            <p class="notify-me-label">📧 Get notified when this is back!</p>
            <div class="notify-me-row">
              <input type="email" id="notify-email-input" placeholder="your@email.com" />
              <button class="btn-notify-me" onclick="submitNotifyMe()">Notify Me</button>
            </div>
          </div>
        `}
      </div>

      ${isCorporate ? `
        <div class="corporate-section">
          <h4>🏢 Corporate & Bulk Orders</h4>
          <p>Need this package for your team or clients? Enter your required quantity below and we'll get in touch with a custom quote.</p>
          <div class="corporate-qty-row">
            <input
              type="number"
              class="corporate-qty-input"
              id="corporate-qty"
              placeholder="Qty (min 10)"
              min="10"
              value="10"
            />
            <button class="btn-corporate" onclick="submitCorporateOrder()">
              Request Quote
            </button>
          </div>
        </div>
      ` : ''}

      <div class="package-detail-share">
        <span class="share-label">Share:</span>
        <a class="share-btn" onclick="sharePackage('facebook')" title="Share on Facebook">📘</a>
        <a class="share-btn" onclick="sharePackage('twitter')" title="Share on Twitter">🐦</a>
        <a class="share-btn" onclick="sharePackage('whatsapp')" title="Share on WhatsApp">💬</a>
        <a class="share-btn" onclick="copyPackageLink()" title="Copy Link">🔗</a>
      </div>
    </div>
  `;
}

// ---- Change quantity ----
function changePkgQty(change) {
  currentPkgQty += change;
  if (currentPkgQty < 1) currentPkgQty = 1;
  if (currentPkgQty > 20) currentPkgQty = 20;
  const qtyEl = document.getElementById('pkg-detail-qty');
  if (qtyEl) qtyEl.textContent = currentPkgQty;
}

// ---- Add to cart ----
function addToCartFromPkgDetail() {
  if (!currentPackage) return;

  for (let i = 0; i < currentPkgQty; i++) {
    addToCart({
      id: currentPackage.id,
      name: currentPackage.name,
      price: currentPackage.price,
      image_url: currentPackage.image_url
    });
  }
}

// ---- Corporate order ----
function submitCorporateOrder() {
  const qty = parseInt(document.getElementById('corporate-qty')?.value || 10);

  if (qty < 10) {
    showToast('Minimum corporate order is 10 packages.');
    return;
  }

  const total = (currentPackage.price * qty).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  showToast(`Quote request sent for ${qty} packages (₦${total})! We'll contact you soon. 🍪`);
}

// ---- Load other packages ----
async function loadOtherPackages(excludeId) {
  const grid = document.getElementById('other-packages');

  try {
    const { data, error } = await supabaseClient
      .from('packages')
      .select('*')
      .neq('id', excludeId)
      .limit(2);

    if (error) throw error;

    if (!data || data.length === 0) {
      grid.innerHTML = '';
      return;
    }

    grid.innerHTML = data.map(pkg => `
      <div class="package-card" style="cursor:pointer" onclick="window.location.href='package.html?id=${pkg.id}'">
        ${pkg.badge ? `<span class="badge badge-bestseller">${pkg.badge}</span>` : ''}
        <img
          src="${pkg.image_url || 'assets/images/placeholder.jpg'}"
          alt="${pkg.name}"
          class="package-card-img"
          onerror="this.src='assets/images/placeholder.jpg'"
        />
        <div class="package-card-body">
          <p class="package-card-type">${pkg.package_type || ''}</p>
          <h3 class="package-card-name">${pkg.name}</h3>
          <p class="package-card-desc">${pkg.description || ''}</p>
          <div class="package-card-footer">
            <span class="package-card-price">${formatNaira(pkg.price)}</span>
            <button class="btn-pkg-cart" onclick="event.stopPropagation(); addToCart(${JSON.stringify({
              id: pkg.id,
              name: pkg.name,
              price: pkg.price,
              image_url: pkg.image_url
            })})">
              🛒 Add to Cart
            </button>
          </div>
        </div>
      </div>
    `).join('');

  } catch (err) {
    console.error('Error loading other packages:', err);
    grid.innerHTML = '';
  }
}

// ---- Share package ----
function sharePackage(platform) {
  const url = encodeURIComponent(window.location.href);
  const text = encodeURIComponent(`Check out the ${currentPackage?.name} from Graceon Cookies! 🍪`);

  const links = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
    whatsapp: `https://wa.me/?text=${text}%20${url}`
  };

  if (links[platform]) {
    window.open(links[platform], '_blank', 'width=600,height=400');
  }
}

// ---- Copy link ----
function copyPackageLink() {
  navigator.clipboard.writeText(window.location.href).then(() => {
    showToast('Link copied to clipboard! 🔗');
  });
}

// ---- Notify Me ----
async function submitNotifyMe() {
  const emailInput = document.getElementById('notify-email-input');
  const email = emailInput.value.trim();

  if (!email || !email.includes('@')) {
    showToast('Please enter a valid email address.');
    return;
  }

  try {
    const { data: { session } } = await supabaseClient.auth.getSession();

    const { error } = await supabaseClient
      .from('stock_notifications')
      .insert([{
        package_id: currentPackage.id,
        email: email,
        user_id: session?.user?.id || null
      }]);

    if (error) throw error;

    document.getElementById('notify-me-box').innerHTML = `
      <p class="notify-me-success">✅ We'll email you the moment this is back in stock!</p>
    `;

  } catch (err) {
    console.error('Error submitting notify request:', err);
    showToast('Something went wrong. Please try again.');
  }
}

// ---- Pre-fill notify email if logged in ----
async function prefillNotifyEmail() {
  const input = document.getElementById('notify-email-input');
  if (!input) return;

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session?.user?.email) {
    input.value = session.user.email;
  }
}

// ---- Error state ----
function showErrorState(message) {
  const container = document.getElementById('package-detail');
  if (container) {
    container.innerHTML = `
      <div style="grid-column:1/-1; text-align:center; padding:80px 20px; color:var(--gray);">
        <div style="font-size:56px; margin-bottom:16px;">🎁</div>
        <h2 style="color:var(--dark); margin-bottom:8px;">Oops!</h2>
        <p style="margin-bottom:24px;">${message}</p>
        <a href="special-packages.html" class="btn btn-primary">Back to Packages</a>
      </div>
    `;
  }
}