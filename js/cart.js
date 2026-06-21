// =========================================
// GRACEON - Cart Management
// =========================================

// Cart state stored in localStorage
let cart = JSON.parse(localStorage.getItem('graceon_cart')) || [];

// Save cart to localStorage
function saveCart() {
  localStorage.setItem('graceon_cart', JSON.stringify(cart));
  updateCartUI();
}

// Add item to cart
function addToCart(item) {
  const existing = cart.find(i => i.id === item.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...item, quantity: 1 });
  }
  saveCart();
  openCart();
  showToast(`${item.name} added to cart!`);
}

// Remove item from cart
function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  saveCart();
}

// Update quantity
function updateQuantity(id, change) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.quantity += change;
  if (item.quantity <= 0) removeFromCart(id);
  else saveCart();
}

// Get cart total
function getCartTotal() {
  return cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
}

// Get cart count
function getCartCount() {
  return cart.reduce((sum, i) => sum + i.quantity, 0);
}

// Update cart UI
function updateCartUI() {
  // Update badge count
  const badge = document.getElementById('cart-count');
  if (badge) {
    const count = getCartCount();
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }

  // Update total
  const totalEl = document.getElementById('cart-total');
  if (totalEl) {
    totalEl.textContent = formatNaira(getCartTotal());
  }

  // Render cart items
  const cartItemsEl = document.getElementById('cart-items');
  if (!cartItemsEl) return;

  if (cart.length === 0) {
    cartItemsEl.innerHTML = `
      <div class="cart-empty">
        <div style="font-size:48px">🍪</div>
        <p>Your cart is empty.<br/>Add some cookies!</p>
      </div>
    `;
    return;
  }

  cartItemsEl.innerHTML = cart.map(item => `
    <div class="cart-item" data-id="${item.id}">
      <img src="${item.image_url}" alt="${item.name}" class="cart-item-img" />
      <div class="cart-item-info">
        <p class="cart-item-name">${item.name}</p>
        <p class="cart-item-price">${formatNaira(item.price * item.quantity)}</p>
        <div class="cart-item-controls">
          <button class="qty-btn" onclick="updateQuantity('${item.id}', -1)">−</button>
          <span>${item.quantity}</span>
          <button class="qty-btn" onclick="updateQuantity('${item.id}', 1)">+</button>
          <button class="remove-btn" onclick="removeFromCart('${item.id}')">Remove</button>
        </div>
      </div>
    </div>
  `).join('');
}

// Open cart sidebar
function openCart() {
  document.getElementById('cart-sidebar')?.classList.add('open');
  document.getElementById('cart-overlay')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

// Close cart sidebar
function closeCart() {
  document.getElementById('cart-sidebar')?.classList.remove('open');
  document.getElementById('cart-overlay')?.classList.remove('open');
  document.body.style.overflow = '';
}

// Toast notification
function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// Cart item styles (injected dynamically)
const cartStyles = document.createElement('style');
cartStyles.textContent = `
  .cart-item {
    display: flex;
    gap: 12px;
    padding: 16px 0;
    border-bottom: 1px solid var(--border);
  }
  .cart-item-img {
    width: 72px;
    height: 72px;
    object-fit: cover;
    border-radius: 8px;
    flex-shrink: 0;
  }
  .cart-item-info { flex: 1; }
  .cart-item-name {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 4px;
    color: var(--dark);
  }
  .cart-item-price {
    font-size: 14px;
    color: var(--green);
    font-weight: 700;
    margin-bottom: 8px;
  }
  .cart-item-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .qty-btn {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 1px solid var(--border);
    background: var(--gray-light);
    font-size: 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: var(--transition);
  }
  .qty-btn:hover { background: var(--green); color: white; border-color: var(--green); }
  .cart-item-controls span {
    font-size: 14px;
    font-weight: 600;
    min-width: 20px;
    text-align: center;
  }
  .remove-btn {
    margin-left: auto;
    font-size: 12px;
    color: #e53e3e;
    cursor: pointer;
    background: none;
    border: none;
    text-decoration: underline;
  }
  .toast {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%) translateY(20px);
    background: var(--green);
    color: white;
    padding: 12px 24px;
    border-radius: 24px;
    font-size: 14px;
    font-weight: 500;
    z-index: 9999;
    opacity: 0;
    transition: all 0.3s ease;
    white-space: nowrap;
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  }
  .toast.show {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
`;
document.head.appendChild(cartStyles);

// Initialize cart on page load
document.addEventListener('DOMContentLoaded', () => {
  updateCartUI();

  // Cart open/close listeners
  document.getElementById('cart-btn')?.addEventListener('click', openCart);
  document.getElementById('cart-close')?.addEventListener('click', closeCart);
  document.getElementById('cart-overlay')?.addEventListener('click', closeCart);
});

// ---- Currency Formatter (Naira) ----
function formatNaira(amount) {
  const num = parseFloat(amount) || 0;
  return '₦' + num.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}