// =========================================
// GRACEON - Main JS (Shared across all pages)
// =========================================

// ---- Edge Function URL ----
const SEND_EMAIL_FN = 'https://pvzabostsjzxnmnbqvul.supabase.co/functions/v1/send-email';

// ---- Send Waitlist Confirmation Email ----
async function sendWaitlistConfirmationEmail(toEmail, productName) {
  try {
    await fetch(SEND_EMAIL_FN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: toEmail,
        subject: `You're on the waitlist for ${productName} 🍪`,
        html: `
          <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; background: #FDFAF5;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #1B6B35; font-size: 28px; margin: 0;">GraceOn</h1>
              <p style="color: #E07B00; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; margin: 4px 0 0;">Artisan Cookies</p>
            </div>
            <h2 style="color: #1a1a1a; font-size: 22px; margin-bottom: 12px;">You're on the list! 🎉</h2>
            <p style="color: #555; font-size: 15px; line-height: 1.7;">
              We've saved your spot for <strong>${productName}</strong>. As soon as it's back in stock, you'll be the first to know.
            </p>
            <p style="color: #555; font-size: 15px; line-height: 1.7;">
              In the meantime, feel free to explore our other freshly baked treats!
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="https://graceon-bx.vercel.app/shop.html"
                style="background: #1B6B35; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600;">
                Browse Our Shop
              </a>
            </div>
            <p style="color: #aaa; font-size: 12px; text-align: center; margin-top: 40px;">
              © GraceOn Artisan Cookies. You received this because you signed up for a restock notification.
            </p>
          </div>
        `
      })
    });
  } catch (err) {
    console.error('Failed to send waitlist confirmation email:', err);
  }
}

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

  // ---- Account Dropdown ----
  initAccountDropdown();

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
      ${!product.in_stock ? '<span class="badge badge-outofstock">Out of Stock</span>' : ''}
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
          ${product.in_stock ? `
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
          ` : `
            <button class="btn-card-notify-solo" onclick="handleNotifyClick('${product.id}', null)">
              📧 Notify Me
            </button>
            <a href="product.html?id=${product.id}" class="btn-quick-view">
              View Details
            </a>
          `}
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
      ${!pkg.in_stock ? '<span class="badge badge-outofstock">Out of Stock</span>' : ''}
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
          ${pkg.in_stock ? `
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
          ` : `
            <button class="btn-card-notify-solo" onclick="handleNotifyClick(null, '${pkg.id}')">
              📧 Notify Me
            </button>
            <a href="package.html?id=${pkg.id}" class="btn-quick-view">
              View Details
            </a>
          `}
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

// ---- Account Dropdown Logic ----
async function initAccountDropdown() {
  const accountBtn = document.getElementById('account-btn');
  const dropdown = document.getElementById('account-dropdown');
  if (!accountBtn || !dropdown) return;

  // Toggle dropdown open/close
  accountBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && e.target !== accountBtn) {
      dropdown.classList.remove('open');
    }
  });

  // Check login state and render dropdown content
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (session) {
      const firstName = session.user.user_metadata?.first_name || 'there';
      dropdown.innerHTML = `
        <div class="account-dropdown-greeting">Hi, ${firstName}! 👋</div>
        <a href="my-account.html" class="account-dropdown-link">👤 My Account</a>
        <a href="my-account.html" class="account-dropdown-link">📦 Order History</a>
        <button class="account-dropdown-link account-dropdown-logout" onclick="accountDropdownLogout()">🚪 Log Out</button>
      `;
    } else {
      dropdown.innerHTML = `
        <a href="login.html" class="account-dropdown-link">🔑 Log In</a>
        <a href="signup.html" class="account-dropdown-link account-dropdown-signup">✨ Create Account</a>
      `;
    }
  } catch (err) {
    console.error('Error checking session:', err);
    dropdown.innerHTML = `
      <a href="login.html" class="account-dropdown-link">🔑 Log In</a>
      <a href="signup.html" class="account-dropdown-link account-dropdown-signup">✨ Create Account</a>
    `;
  }
}

async function accountDropdownLogout() {
  await supabaseClient.auth.signOut();
  window.location.href = 'index.html';
}

// ---- Notify Me — smart click handler ----
async function handleNotifyClick(productId, packageId) {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (session?.user?.email) {
      // Logged in — submit immediately using their account email
      await saveNotifyRequest(productId, packageId, session.user.email, session.user.id);
    } else {
      // Guest — open the popup to ask for their email
      openNotifyPopup(productId, packageId);
    }
  } catch (err) {
    console.error('Error checking session:', err);
    openNotifyPopup(productId, packageId);
  }
}

// ---- Save notify request to Supabase ----
async function saveNotifyRequest(productId, packageId, email, userId) {
  try {
    const insertData = {
      email: email,
      user_id: userId || null
    };
    if (productId) insertData.product_id = productId;
    if (packageId) insertData.package_id = packageId;

    const { error } = await supabaseClient
      .from('stock_notifications')
      .insert([insertData]);

    if (error) throw error;

    showToast("You'll be notified when it's back! 📧");

    // Fetch product/package name for the confirmation email
    let itemName = 'this item';
    if (productId) {
      const { data } = await supabaseClient
        .from('products')
        .select('name')
        .eq('id', productId)
        .single();
      if (data?.name) itemName = data.name;
    } else if (packageId) {
      const { data } = await supabaseClient
        .from('packages')
        .select('name')
        .eq('id', packageId)
        .single();
      if (data?.name) itemName = data.name;
    }

    // Send waitlist confirmation email
    await sendWaitlistConfirmationEmail(email, itemName);

  } catch (err) {
    console.error('Error submitting notify request:', err);
    showToast('Something went wrong. Please try again.');
  }
}

// ---- Notify Me Popup (for guests) ----
function openNotifyPopup(productId, packageId) {
  document.getElementById('notify-popup-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'notify-popup-overlay';
  overlay.className = 'notify-popup-overlay';
  overlay.innerHTML = `
    <div class="notify-popup-box">
      <button class="notify-popup-close" onclick="closeNotifyPopup()">✕</button>
      <p class="notify-popup-icon">📧</p>
      <h3>Get Notified</h3>
      <p class="notify-popup-subtitle">Enter your email and we'll let you know when this is back in stock.</p>
      <input type="email" id="notify-popup-email" placeholder="your@email.com" />
      <button class="btn btn-primary" style="width:100%; margin-top:12px;" onclick="submitNotifyPopup('${productId || ''}', '${packageId || ''}')">
        Notify Me
      </button>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('notify-popup-email')?.focus();
}

function closeNotifyPopup() {
  document.getElementById('notify-popup-overlay')?.remove();
}

async function submitNotifyPopup(productId, packageId) {
  const input = document.getElementById('notify-popup-email');
  const email = input?.value.trim();

  if (!email || !email.includes('@')) {
    showToast('Please enter a valid email address.');
    return;
  }

  await saveNotifyRequest(productId || null, packageId || null, email, null);
  closeNotifyPopup();
}

// ---- Currency Formatter (Naira) ----
function formatNaira(amount) {
  const num = parseFloat(amount) || 0;
  return '₦' + num.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}