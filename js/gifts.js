// =========================================
// GRACEON - Gifts Page JS
// =========================================

let allGiftProducts = [];
let activeOccasion = null;

document.addEventListener('DOMContentLoaded', async () => {
  await loadOccasions();
  await loadGiftProducts();
});

// ---- Load Occasions from Supabase ----
async function loadOccasions() {
  const grid = document.getElementById('occasions-grid');

  try {
    const { data, error } = await supabaseClient
      .from('gift_occasions')
      .select('*');

    if (error) throw error;

    if (!data || data.length === 0) {
      grid.innerHTML = `<p style="color:var(--gray); grid-column:1/-1; text-align:center;">No occasions found.</p>`;
      return;
    }

    grid.innerHTML = data.map(occasion => `
      <div class="occasion-card" onclick="filterByOccasion('${occasion.name}', this)">
        <div class="occasion-img-wrap">
          <img
            src="${occasion.image_url}"
            alt="${occasion.name}"
            onerror="this.src='assets/images/placeholder.jpg'"
          />
        </div>
        <span class="occasion-name">${occasion.name}</span>
      </div>
    `).join('');

  } catch (err) {
    console.error('Error loading occasions:', err);
    grid.innerHTML = `<p style="color:var(--gray); grid-column:1/-1; text-align:center;">Unable to load occasions.</p>`;
  }
}

// ---- Load Gift Products from Supabase ----
async function loadGiftProducts(occasion = null) {
  const grid = document.getElementById('gift-products-grid');
  const label = document.getElementById('gift-filter-label');

  // Show skeletons
  grid.innerHTML = `
    <div class="product-skeleton"></div>
    <div class="product-skeleton"></div>
    <div class="product-skeleton"></div>
    <div class="product-skeleton"></div>
  `;

  try {
    let query = supabaseClient
      .from('products')
      .select('*')
      .eq('in_stock', true);

    if (occasion) {
      query = query.eq('occasion', occasion);
    }

    const { data, error } = await query;

    if (error) throw error;

    allGiftProducts = data || [];

    if (label) {
      label.textContent = occasion
        ? `Showing ${allGiftProducts.length} gift${allGiftProducts.length !== 1 ? 's' : ''} for "${occasion}"`
        : `All gift products (${allGiftProducts.length})`;
    }

    if (allGiftProducts.length === 0) {
      grid.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:60px 20px; color:var(--gray);">
          <div style="font-size:48px; margin-bottom:16px;">🍪</div>
          <h3 style="color:var(--dark); margin-bottom:8px;">No gifts found for this occasion</h3>
          <p style="margin-bottom:20px;">Try another occasion or browse all our cookies.</p>
          <button class="btn btn-secondary" onclick="resetOccasionFilter()">View All Gifts</button>
        </div>
      `;
      return;
    }

    grid.innerHTML = allGiftProducts.map(p => createProductCard(p)).join('');

  } catch (err) {
    console.error('Error loading gift products:', err);
    grid.innerHTML = `
      <div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--gray);">
        Unable to load products right now.
      </div>
    `;
  }
}

// ---- Filter by Occasion ----
function filterByOccasion(occasion, cardEl) {
  // Toggle off if same occasion clicked
  if (activeOccasion === occasion) {
    resetOccasionFilter();
    return;
  }

  activeOccasion = occasion;

  // Update active card styling
  document.querySelectorAll('.occasion-card').forEach(c => c.classList.remove('active'));
  cardEl.classList.add('active');

  // Scroll to gift products section
  document.getElementById('gift-products')?.scrollIntoView({ behavior: 'smooth' });

  // Load filtered products
  loadGiftProducts(occasion);
}

// ---- Reset occasion filter ----
function resetOccasionFilter() {
  activeOccasion = null;
  document.querySelectorAll('.occasion-card').forEach(c => c.classList.remove('active'));
  loadGiftProducts();
}