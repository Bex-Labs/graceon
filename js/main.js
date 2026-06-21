// =========================================
// GRACEON - Main JS (Shared across all pages)
// =========================================

document.addEventListener('DOMContentLoaded', () => {

  // ---- Active Nav Link ----
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    const linkPage = link.getAttribute('href');
    if (linkPage === currentPage) {
      link.classList.add('active');
    }
  });

  // ---- Hamburger Mobile Menu ----
  const hamburger = document.getElementById('hamburger');
  const navMenu = document.getElementById('nav-menu');

  hamburger?.addEventListener('click', () => {
    navMenu?.classList.toggle('open');
  });

  // Close menu when a nav link is clicked on mobile
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      navMenu?.classList.remove('open');
    });
  });

  // ---- Search ----
  const searchInput = document.getElementById('search-input');
  searchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const query = searchInput.value.trim();
      if (query) {
        window.location.href = `shop.html?search=${encodeURIComponent(query)}`;
      }
    }
  });

  // ---- Cookie Club Form ----
  const cookieClubForm = document.getElementById('cookie-club-form');
  cookieClubForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = cookieClubForm.querySelector('input[type="email"]').value.trim();
    if (!email) return;

    const btn = cookieClubForm.querySelector('button');
    btn.textContent = 'Joining...';
    btn.disabled = true;

    // Simulate signup (replace with Supabase insert later)
    await new Promise(resolve => setTimeout(resolve, 1000));

    showToast('Welcome to the Cookie Club! 🍪');
    cookieClubForm.reset();
    btn.textContent = 'Join Now';
    btn.disabled = false;
  });

  // ---- Load Featured Products on Homepage ----
  if (document.getElementById('featured-products')) {
    loadFeaturedProducts();
  }

  // ---- Load Featured Packages on Homepage ----
  if (document.getElementById('featured-packages')) {
    loadFeaturedPackages();
  }

  // ---- Checkout button ----
  document.querySelector('.btn-checkout')?.addEventListener('click', () => {
    window.location.href = 'checkout.html';
  });

});

// ---- Fetch Featured Products from Supabase ----
async function loadFeaturedProducts() {
  const container = document.getElementById('featured-products');

  try {
    const { data: products, error } = await supabaseClient
      .from('products')
      .select('*')
      .eq('is_featured', true)
      .limit(4);

    if (error) throw error;

    if (!products || products.length === 0) {
      container.innerHTML = `<p style="color:var(--gray); text-align:center; grid-column:1/-1;">No featured products found.</p>`;
      return;
    }

    container.innerHTML = products.map(p => createProductCard(p)).join('');

  } catch (err) {
    console.error('Error loading featured products:', err);
    container.innerHTML = `<p style="color:var(--gray); text-align:center; grid-column:1/-1;">Unable to load products right now.</p>`;
  }
}

// ---- Fetch Featured Packages from Supabase ----
async function loadFeaturedPackages() {
  const container = document.getElementById('featured-packages');

  try {
    const { data: packages, error } = await supabaseClient
      .from('packages')
      .select('*')
      .eq('is_featured', true)
      .limit(2);

    if (error) throw error;

    if (!packages || packages.length === 0) {
      container.innerHTML = `<p style="color:var(--gray); text-align:center; grid-column:1/-1;">No packages found.</p>`;
      return;
    }

    container.innerHTML = packages.map(p => createPackageCard(p)).join('');

  } catch (err) {
    console.error('Error loading featured packages:', err);
    container.innerHTML = `<p style="color:var(--gray); text-align:center; grid-column:1/-1;">Unable to load packages right now.</p>`;
  }
}

// ---- Product Card Template ----
function createProductCard(product) {
  const badge = product.badge ? getBadgeHTML(product.badge) : '';
  return `
    <div class="product-card">
      ${badge}
      <img
        src="${product.image_url || 'assets/images/placeholder.jpg'}"
        alt="${product.name}"
        class="product-card-img"
        onerror="this.src='assets/images/placeholder.jpg'"
      />
      <div class="product-card-body">
        <h3 class="product-card-name">${product.name}</h3>
        <p class="product-card-price">
          <strong>${formatNaira(product.price)}</strong> / ${product.price_unit || 'Dozen'}
        </p>
        <div class="product-card-actions">
          <button class="btn-add-cart" onclick='addToCart(${JSON.stringify({
            id: product.id,
            name: product.name,
            price: product.price,
            image_url: product.image_url
          })})'>
            🛒 Add to Cart
          </button>
          <a href="product.html?id=${product.id}" class="btn-quick-view">
            View Details
          </a>
        </div>
      </div>
    </div>
  `;
}

// ---- Package Card Template ----
function createPackageCard(pkg) {
  const badge = pkg.badge ? getBadgeHTML(pkg.badge) : '';
  return `
    <div class="product-card">
      ${badge}
      <img
        src="${pkg.image_url || 'assets/images/placeholder.jpg'}"
        alt="${pkg.name}"
        class="product-card-img"
        style="height:240px"
        onerror="this.src='assets/images/placeholder.jpg'"
      />
      <div class="product-card-body">
        <h3 class="product-card-name">${pkg.name}</h3>
        <p class="product-card-price">
          <strong>${formatNaira(pkg.price)}</strong>
        </p>
        <p style="font-size:12px; color:var(--gray); margin-bottom:12px;">
          ${pkg.package_type || ''}
        </p>
        <div class="product-card-actions">
          <button class="btn-add-cart" onclick='addToCart(${JSON.stringify({
            id: pkg.id,
            name: pkg.name,
            price: pkg.price,
            image_url: pkg.image_url
          })})'>
            🛒 Add to Cart
          </button>
          <a href="package.html?id=${pkg.id}" class="btn-quick-view">
            View Details
          </a>
        </div>
      </div>
    </div>
  `;
}

// ---- Badge HTML Helper ----
function getBadgeHTML(badge) {
  const map = {
    'Best Seller': 'badge-bestseller',
    'Limited Edition': 'badge-limited',
    'Gluten Free': 'badge-glutenfree',
    'New': 'badge-new'
  };
  const cls = map[badge] || 'badge-bestseller';
  return `<span class="badge ${cls}">${badge}</span>`;
}

// ---- Quick View (placeholder for now) ----
function openQuickView(productId) {
  showToast('Quick view coming soon!');
}

// ---- Contact Form ----
const contactForm = document.getElementById('contact-form');
contactForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = contactForm.querySelector('button[type="submit"]');
  btn.textContent = 'Sending...';
  btn.disabled = true;

  await new Promise(resolve => setTimeout(resolve, 1000));

  showToast('Message sent! We\'ll get back to you soon 🍪');
  contactForm.reset();
  btn.textContent = 'Send Message';
  btn.disabled = false;
});

// ---- Currency Formatter (Naira) ----
function formatNaira(amount) {
  const num = parseFloat(amount) || 0;
  return '₦' + num.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}