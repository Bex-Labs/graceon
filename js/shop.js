// =========================================
// GRACEON - Shop Page JS
// =========================================

let allProducts = [];
let activeFilters = { category: [], occasion: [], dietary: [] };

// Load all products on page load
document.addEventListener('DOMContentLoaded', async () => {
  await loadShopProducts();
  initFilters();
  initSort();
  initClearFilters();
  handleSearchParam();

  // Mobile filter toggle
  const mobileBtn = document.getElementById('mobile-filter-btn');
  mobileBtn?.addEventListener('click', () => {
    document.querySelector('.shop-sidebar')?.classList.toggle('open');
  });
});

// ---- Fetch all products from Supabase ----
async function loadShopProducts() {
  const grid = document.getElementById('shop-products');

  try {
    const { data, error } = await supabaseClient
      .from('products')
      .select('*')
      .eq('in_stock', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    allProducts = data || [];
    renderProducts(allProducts);

  } catch (err) {
    console.error('Error loading shop products:', err);
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">😔</div>
        <h3>Unable to load products</h3>
        <p>Please try refreshing the page.</p>
      </div>
    `;
  }
}

// ---- Render products to grid ----
function renderProducts(products) {
  renderProductsPaginated(products);
}


// ---- Filter Logic ----
function initFilters() {
  document.querySelectorAll('.filter-option input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      const name = checkbox.getAttribute('name');
      const value = checkbox.value;

      if (checkbox.checked) {
        if (!activeFilters[name].includes(value)) {
          activeFilters[name].push(value);
        }
      } else {
        activeFilters[name] = activeFilters[name].filter(v => v !== value);
      }

      applyFilters();
      renderFilterTags();
    });
  });
}

// ---- Apply active filters ----
function applyFilters() {
  let filtered = [...allProducts];

  if (activeFilters.category.length > 0) {
    filtered = filtered.filter(p => activeFilters.category.includes(p.category));
  }

  if (activeFilters.occasion.length > 0) {
    filtered = filtered.filter(p => activeFilters.occasion.includes(p.occasion));
  }

  if (activeFilters.dietary.length > 0) {
    filtered = filtered.filter(p =>
      activeFilters.dietary.every(d => p.dietary && p.dietary.includes(d))
    );
  }

  // Apply current sort
  const sortVal = document.getElementById('sort-select')?.value || 'newest';
  filtered = sortProducts(filtered, sortVal);

  renderProducts(filtered);
}

// ---- Sort Logic ----
function initSort() {
  document.getElementById('sort-select')?.addEventListener('change', (e) => {
    applyFilters();
  });
}

function sortProducts(products, sortVal) {
  const sorted = [...products];
  switch (sortVal) {
    case 'price_asc':
      return sorted.sort((a, b) => a.price - b.price);
    case 'price_desc':
      return sorted.sort((a, b) => b.price - a.price);
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'newest':
    default:
      return sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
}

// ---- Filter Tags ----
function renderFilterTags() {
  let container = document.getElementById('active-filter-tags');
  if (!container) {
    container = document.createElement('div');
    container.id = 'active-filter-tags';
    container.className = 'active-filters';
    document.querySelector('.shop-sort-bar')?.insertAdjacentElement('afterend', container);
  }

  const allActive = [
    ...activeFilters.category.map(v => ({ type: 'category', value: v })),
    ...activeFilters.occasion.map(v => ({ type: 'occasion', value: v })),
    ...activeFilters.dietary.map(v => ({ type: 'dietary', value: v })),
  ];

  if (allActive.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = allActive.map(f => `
    <span class="filter-tag">
      ${f.value}
      <span class="filter-tag-remove" onclick="removeFilter('${f.type}', '${f.value}')">✕</span>
    </span>
  `).join('');
}

// ---- Remove individual filter ----
function removeFilter(type, value) {
  activeFilters[type] = activeFilters[type].filter(v => v !== value);

  // Uncheck the checkbox
  document.querySelectorAll(`.filter-option input[name="${type}"]`).forEach(cb => {
    if (cb.value === value) cb.checked = false;
  });

  applyFilters();
  renderFilterTags();
}

// ---- Clear all filters ----
function initClearFilters() {
  document.getElementById('clear-filters')?.addEventListener('click', clearAllFilters);
}

function clearAllFilters() {
  activeFilters = { category: [], occasion: [], dietary: [] };
  document.querySelectorAll('.filter-option input[type="checkbox"]').forEach(cb => {
    cb.checked = false;
  });
  renderFilterTags();
  renderProducts(allProducts);
}

// ---- Toggle filter group collapse ----
function toggleFilter(header) {
  const group = header.parentElement;
  group.classList.toggle('collapsed');
}

// ---- Handle search from URL param ----
function handleSearchParam() {
  const params = new URLSearchParams(window.location.search);
  const search = params.get('search');
  if (!search) return;

  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = search;

  const filtered = allProducts.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  );

  renderProducts(filtered);

  const countEl = document.getElementById('shop-results-count');
  if (countEl) {
    countEl.textContent = `Showing ${filtered.length} result${filtered.length !== 1 ? 's' : ''} for "${search}"`;
  }
}
// =========================================
// QUICK VIEW MODAL
// =========================================

function openQuickView(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  // Remove existing modal if any
  document.getElementById('quick-view-modal')?.remove();

  const badge = product.badge ? getBadgeHTML(product.badge) : '';
  const dietary = product.dietary?.length
    ? product.dietary.map(d => `<span class="dietary-tag">${d}</span>`).join('')
    : '';

  const modal = document.createElement('div');
  modal.id = 'quick-view-modal';
  modal.className = 'qv-overlay';
  modal.innerHTML = `
    <div class="qv-modal">
      <button class="qv-close" onclick="closeQuickView()">✕</button>
      <div class="qv-inner">
        <div class="qv-image-wrap">
          ${badge}
          <img src="${product.image_url}" alt="${product.name}" class="qv-image"
            onerror="this.src='assets/images/placeholder.jpg'" />
        </div>
        <div class="qv-details">
          <p class="qv-category">${product.category || ''}</p>
          <h2 class="qv-title">${product.name}</h2>
          <p class="qv-price">
            <strong>${formatNaira(product.price)}</strong>
            <span>/ ${product.price_unit || 'Dozen'}</span>
          </p>
          <p class="qv-description">${product.description || ''}</p>
          ${dietary ? `<div class="qv-dietary">${dietary}</div>` : ''}
          <div class="qv-quantity">
            <label>Quantity</label>
            <div class="qv-qty-controls">
              <button onclick="changeQVQty(-1)">−</button>
              <span id="qv-qty">1</span>
              <button onclick="changeQVQty(1)">+</button>
            </div>
          </div>
          <div class="qv-actions">
            <button class="btn btn-primary qv-add-btn" onclick="addToCartFromQV('${product.id}')">
              🛒 Add to Cart
            </button>
            <button class="btn btn-secondary" onclick="closeQuickView()">
              Continue Shopping
            </button>
          </div>
          <p class="qv-occasion">
            🎉 Perfect for: <strong>${product.occasion || 'Any occasion'}</strong>
          </p>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';

  // Close on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeQuickView();
  });

  // Animate in
  setTimeout(() => modal.classList.add('open'), 10);
}

function closeQuickView() {
  const modal = document.getElementById('quick-view-modal');
  if (!modal) return;
  modal.classList.remove('open');
  setTimeout(() => {
    modal.remove();
    document.body.style.overflow = '';
  }, 300);
}

function changeQVQty(change) {
  const qtyEl = document.getElementById('qv-qty');
  if (!qtyEl) return;
  let qty = parseInt(qtyEl.textContent) + change;
  if (qty < 1) qty = 1;
  if (qty > 10) qty = 10;
  qtyEl.textContent = qty;
}

function addToCartFromQV(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;
  const qty = parseInt(document.getElementById('qv-qty')?.textContent || 1);

  for (let i = 0; i < qty; i++) {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url
    });
  }

  closeQuickView();
}

// ---- Quick View Styles ----
const qvStyles = document.createElement('style');
qvStyles.textContent = `
  .qv-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 3000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  .qv-overlay.open { opacity: 1; }

  .qv-modal {
    background: var(--white);
    border-radius: var(--radius);
    max-width: 800px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    position: relative;
    transform: translateY(20px);
    transition: transform 0.3s ease;
  }
  .qv-overlay.open .qv-modal { transform: translateY(0); }

  .qv-close {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--gray-light);
    border: none;
    cursor: pointer;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1;
    transition: var(--transition);
  }
  .qv-close:hover { background: var(--border); }

  .qv-inner {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
  }

  .qv-image-wrap {
    position: relative;
    border-radius: var(--radius) 0 0 var(--radius);
    overflow: hidden;
  }

  .qv-image {
    width: 100%;
    height: 100%;
    min-height: 380px;
    object-fit: cover;
    display: block;
  }

  .qv-details {
    padding: 36px 32px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .qv-category {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--orange);
  }

  .qv-title {
    font-family: var(--font-serif);
    font-size: 26px;
    color: var(--dark);
    line-height: 1.2;
  }

  .qv-price strong {
    font-size: 24px;
    color: var(--green);
  }
  .qv-price span {
    font-size: 14px;
    color: var(--gray);
    margin-left: 4px;
  }

  .qv-description {
    font-size: 14px;
    color: var(--gray);
    line-height: 1.7;
  }

  .qv-dietary {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .dietary-tag {
    background: var(--green-light);
    color: var(--green);
    border: 1px solid var(--green);
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
  }

  .qv-quantity label {
    display: block;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
    color: var(--dark);
  }

  .qv-qty-controls {
    display: flex;
    align-items: center;
    gap: 0;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    width: fit-content;
  }

  .qv-qty-controls button {
    width: 36px;
    height: 36px;
    border: none;
    background: var(--gray-light);
    font-size: 18px;
    cursor: pointer;
    transition: var(--transition);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .qv-qty-controls button:first-child {
    border-radius: var(--radius-sm) 0 0 var(--radius-sm);
  }

  .qv-qty-controls button:last-child {
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  }

  .qv-qty-controls button:hover { background: var(--green); color: white; }

  .qv-qty-controls span {
    min-width: 40px;
    text-align: center;
    font-size: 15px;
    font-weight: 600;
    padding: 0 8px;
  }

  .qv-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .qv-add-btn { width: 100%; }

  .qv-occasion {
    font-size: 13px;
    color: var(--gray);
  }

  @media (max-width: 600px) {
    .qv-inner { grid-template-columns: 1fr; }
    .qv-image { min-height: 220px; }
    .qv-image-wrap { border-radius: var(--radius) var(--radius) 0 0; }
    .qv-details { padding: 24px 20px; }
  }
`;
document.head.appendChild(qvStyles);

// =========================================
// PAGINATION
// =========================================

const PRODUCTS_PER_PAGE = 6;
let currentPage = 1;
let paginatedProducts = [];

function renderProductsPaginated(products) {
  paginatedProducts = products;
  currentPage = 1;
  renderPage();
}

function renderPage() {
  const grid = document.getElementById('shop-products');
  const countEl = document.getElementById('shop-results-count');

  const total = paginatedProducts.length;
  const totalPages = Math.ceil(total / PRODUCTS_PER_PAGE);
  const start = (currentPage - 1) * PRODUCTS_PER_PAGE;
  const end = start + PRODUCTS_PER_PAGE;
  const pageProducts = paginatedProducts.slice(start, end);

  if (total === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🍪</div>
        <h3>No cookies found</h3>
        <p>Try adjusting your filters.</p>
        <button class="btn btn-secondary" onclick="clearAllFilters()">Clear Filters</button>
      </div>
    `;
    if (countEl) countEl.textContent = 'Showing 0 results';
    renderPagination(0, 0);
    return;
  }

  if (countEl) {
    countEl.textContent = `Showing ${start + 1}–${Math.min(end, total)} of ${total} gourmet treat${total !== 1 ? 's' : ''}`;
  }

  grid.innerHTML = pageProducts.map(p => createProductCard(p)).join('');
  renderPagination(currentPage, totalPages);
}

function renderPagination(current, total) {
  let container = document.getElementById('pagination');
  if (!container) {
    container = document.createElement('div');
    container.id = 'pagination';
    container.className = 'pagination';
    document.getElementById('shop-products')?.insertAdjacentElement('afterend', container);
  }

  if (total <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '';

  // Previous button
  html += `
    <button class="page-btn ${current === 1 ? 'disabled' : ''}"
      onclick="goToPage(${current - 1})" ${current === 1 ? 'disabled' : ''}>
      ← Prev
    </button>
  `;

  // Page numbers
  for (let i = 1; i <= total; i++) {
    html += `
      <button class="page-btn ${i === current ? 'active' : ''}" onclick="goToPage(${i})">
        ${i}
      </button>
    `;
  }

  // Next button
  html += `
    <button class="page-btn ${current === total ? 'disabled' : ''}"
      onclick="goToPage(${current + 1})" ${current === total ? 'disabled' : ''}>
      Next →
    </button>
  `;

  container.innerHTML = html;
}

function goToPage(page) {
  const total = Math.ceil(paginatedProducts.length / PRODUCTS_PER_PAGE);
  if (page < 1 || page > total) return;
  currentPage = page;
  renderPage();
  // Scroll back to top of products
  document.querySelector('.shop-main')?.scrollIntoView({ behavior: 'smooth' });
}

// Pagination styles
const paginationStyles = document.createElement('style');
paginationStyles.textContent = `
  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    margin-top: 40px;
    flex-wrap: wrap;
  }
  .page-btn {
    min-width: 40px;
    height: 40px;
    padding: 0 14px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    background: var(--white);
    color: var(--dark);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: var(--transition);
  }
  .page-btn:hover:not(.disabled):not(.active) {
    background: var(--green-light);
    border-color: var(--green);
    color: var(--green);
  }
  .page-btn.active {
    background: var(--green);
    color: var(--white);
    border-color: var(--green);
    font-weight: 700;
  }
  .page-btn.disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;
document.head.appendChild(paginationStyles);