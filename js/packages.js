// =========================================
// GRACEON - Special Packages Page JS
// =========================================

let allPackages = [];
let activePkgFilters = { pkg_type: [], pkg_price: [] };

document.addEventListener('DOMContentLoaded', async () => {
  await loadPackages();
  initPkgFilters();
  initPkgSort();
  initClearPkgFilters();
});

// ---- Fetch all packages from Supabase ----
async function loadPackages() {
  const grid = document.getElementById('packages-grid-items');

  try {
    const { data, error } = await supabaseClient
      .from('packages')
      .select('*')
      .eq('in_stock', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    allPackages = data || [];
    renderPackages(allPackages);

  } catch (err) {
    console.error('Error loading packages:', err);
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">😔</div>
        <h3>Unable to load packages</h3>
        <p>Please try refreshing the page.</p>
      </div>
    `;
  }
}

// ---- Render packages to grid ----
function renderPackages(packages) {
  const grid = document.getElementById('packages-grid-items');
  const countEl = document.getElementById('pkg-results-count');

  if (countEl) {
    countEl.textContent = `Showing ${packages.length} special package${packages.length !== 1 ? 's' : ''}`;
  }

  if (packages.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎁</div>
        <h3>No packages found</h3>
        <p>Try adjusting your filters.</p>
        <button class="btn btn-secondary" onclick="clearAllPkgFilters()">Clear Filters</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = packages.map(pkg => createPackageCard(pkg)).join('');
}

// ---- Package Card Template ----
function createPackageCard(pkg) {
  const badge = pkg.badge ? `<span class="badge badge-bestseller">${pkg.badge}</span>` : '';

  const contents = pkg.contents && pkg.contents.length > 0
    ? `<div class="package-card-contents">
        <h4>What's Included:</h4>
        <ul>${pkg.contents.map(item => `<li>${item}</li>`).join('')}</ul>
       </div>`
    : '';

  return `
    <div class="package-card" style="cursor:pointer" onclick="window.location.href='package.html?id=${pkg.id}'">
      ${badge}
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
        ${contents}
        <div class="package-card-footer">
          <span class="package-card-price">${formatNaira(pkg.price)}</span>
          <button class="btn-pkg-cart" onclick='event.stopPropagation(); addToCart(${JSON.stringify({
            id: pkg.id,
            name: pkg.name,
            price: pkg.price,
            image_url: pkg.image_url
          })})'>
            🛒 Add to Cart
          </button>
        </div>
      </div>
    </div>
  `;
}

// ---- Filter Logic ----
function initPkgFilters() {
  document.querySelectorAll('.filter-option input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      const name = checkbox.getAttribute('name');
      const value = checkbox.value;

      if (checkbox.checked) {
        if (!activePkgFilters[name]) activePkgFilters[name] = [];
        if (!activePkgFilters[name].includes(value)) {
          activePkgFilters[name].push(value);
        }
      } else {
        activePkgFilters[name] = activePkgFilters[name].filter(v => v !== value);
      }

      applyPkgFilters();
    });
  });
}

// ---- Apply filters ----
function applyPkgFilters() {
  let filtered = [...allPackages];

  if (activePkgFilters.pkg_type?.length > 0) {
    filtered = filtered.filter(p =>
      activePkgFilters.pkg_type.includes(p.package_type)
    );
  }

  if (activePkgFilters.pkg_price?.length > 0) {
    filtered = filtered.filter(p => {
      return activePkgFilters.pkg_price.some(range => {
        if (range === 'under50') return p.price < 50000;
        if (range === '50to100') return p.price >= 50000 && p.price <= 100000;
        if (range === 'over100') return p.price > 100000;
        return true;
      });
    });
  }

  const sortVal = document.getElementById('pkg-sort-select')?.value || 'featured';
  filtered = sortPackages(filtered, sortVal);

  renderPackages(filtered);
}

// ---- Sort Logic ----
function initPkgSort() {
  document.getElementById('pkg-sort-select')?.addEventListener('change', () => {
    applyPkgFilters();
  });
}

function sortPackages(packages, sortVal) {
  const sorted = [...packages];
  switch (sortVal) {
    case 'price_asc':
      return sorted.sort((a, b) => a.price - b.price);
    case 'price_desc':
      return sorted.sort((a, b) => b.price - a.price);
    case 'newest':
      return sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    case 'featured':
    default:
      return sorted.sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0));
  }
}

// ---- Clear all filters ----
function initClearPkgFilters() {
  document.getElementById('clear-pkg-filters')?.addEventListener('click', clearAllPkgFilters);
}

function clearAllPkgFilters() {
  activePkgFilters = { pkg_type: [], pkg_price: [] };
  document.querySelectorAll('.filter-option input[type="checkbox"]').forEach(cb => {
    cb.checked = false;
  });
  renderPackages(allPackages);
}

// ---- Toggle filter group collapse ----
function toggleFilter(header) {
  const group = header.parentElement;
  group.classList.toggle('collapsed');
}