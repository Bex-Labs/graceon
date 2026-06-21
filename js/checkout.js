// =========================================
// GRACEON - Checkout Page JS
// =========================================

let currentStep = 1;
let selectedWrapPrice = 0;

document.addEventListener('DOMContentLoaded', () => {
  renderSummary();
  initCharCount();
  initWrapOptions();

  // Redirect if cart is empty
  if (cart.length === 0) {
    document.querySelector('.checkout-grid').innerHTML = `
      <div style="grid-column:1/-1; text-align:center; padding:80px 20px;">
        <div style="font-size:56px; margin-bottom:16px;">🛒</div>
        <h2 style="color:var(--dark); margin-bottom:8px;">Your cart is empty</h2>
        <p style="color:var(--gray); margin-bottom:24px;">Add some delicious cookies before checking out!</p>
        <a href="shop.html" class="btn btn-primary">Browse Cookies</a>
      </div>
    `;
  }
});

// ---- Step Navigation ----
function goToStep(step) {
  // Validate step 1 before proceeding
  if (currentStep === 1 && step === 2) {
    if (!validateStep1()) return;
  }

  // Update panels
  document.querySelectorAll('.checkout-step-panel').forEach(panel => {
    panel.classList.remove('active');
  });
  document.getElementById(`step-${step}`)?.classList.add('active');

  // Update step indicators
  for (let i = 1; i <= 3; i++) {
    const indicator = document.getElementById(`step-${i}-indicator`);
    if (!indicator) continue;
    indicator.classList.remove('active', 'completed');
    if (i < step) indicator.classList.add('completed');
    if (i === step) indicator.classList.add('active');
  }

  currentStep = step;

  if (step === 3) {
    renderReview();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---- Validate Step 1 ----
function validateStep1() {
  const required = ['customer-name', 'customer-email', 'customer-phone', 'address-street', 'address-city', 'address-state', 'address-zip'];
  let valid = true;

  required.forEach(id => {
    const field = document.getElementById(id);
    if (field && !field.value.trim()) {
      field.style.borderColor = '#e53e3e';
      valid = false;
    } else if (field) {
      field.style.borderColor = '';
    }
  });

  if (!valid) {
    showToast('Please fill in all required fields.');
  }

  return valid;
}

// ---- Toggle Gift Options ----
function toggleGiftOptions() {
  const isGift = document.getElementById('is-gift-toggle').checked;
  const panel = document.getElementById('gift-options-panel');
  panel.style.display = isGift ? 'block' : 'none';
}

// ---- Character Count for Gift Message ----
function initCharCount() {
  const textarea = document.getElementById('gift-message');
  const counter = document.getElementById('char-count-num');

  textarea?.addEventListener('input', () => {
    counter.textContent = textarea.value.length;
  });
}

// ---- Wrap Options Pricing ----
function initWrapOptions() {
  document.querySelectorAll('input[name="gift-wrap"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const prices = { none: 0, ribbon: 2500, premium: 5000 };
      selectedWrapPrice = prices[radio.value] || 0;
      renderSummary();
    });
  });
}

// ---- Render Order Summary ----
function renderSummary() {
  const container = document.getElementById('summary-items');
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `<p style="font-size:13px; color:var(--gray); text-align:center;">No items in cart</p>`;
  } else {
    container.innerHTML = cart.map(item => `
      <div class="summary-item">
        <img src="${item.image_url}" alt="${item.name}" onerror="this.src='assets/images/placeholder.jpg'" />
        <div class="summary-item-info">
          <p class="summary-item-name">${item.name}</p>
          <p class="summary-item-qty">Qty: ${item.quantity}</p>
        </div>
        <span class="summary-item-price">${formatNaira(item.price * item.quantity)}</span>
      </div>
    `).join('');
  }

  const subtotal = getCartTotal();
  const shipping = subtotal >= 50000 ? 0 : 2500;
  const isGift = document.getElementById('is-gift-toggle')?.checked;
  const wrapCost = isGift ? selectedWrapPrice : 0;
  const total = subtotal + shipping + wrapCost;

  document.getElementById('summary-subtotal').textContent = formatNaira(subtotal);
  document.getElementById('summary-shipping').textContent = shipping === 0 ? 'Free' : formatNaira(shipping);
  document.getElementById('summary-total').textContent = formatNaira(total);

  const wrapRow = document.getElementById('summary-wrap-row');
  if (wrapCost > 0) {
    wrapRow.style.display = 'flex';
    document.getElementById('summary-wrap').textContent = formatNaira(wrapCost);
  } else {
    wrapRow.style.display = 'none';
  }
}

// ---- Render Review Step ----
function renderReview() {
  const detailsHTML = `
    <strong>${val('customer-name')}</strong><br/>
    ${val('customer-email')} • ${val('customer-phone')}<br/>
    ${val('address-street')}, ${val('address-city')}, ${val('address-state')} ${val('address-zip')}<br/>
    ${val('address-country')}
    ${val('delivery-date') ? `<br/>Delivery Date: ${val('delivery-date')}` : ''}
  `;
  document.getElementById('review-details').innerHTML = detailsHTML;

  const isGift = document.getElementById('is-gift-toggle')?.checked;
  const giftSection = document.getElementById('review-gift-section');

  if (isGift) {
    giftSection.style.display = 'block';
    const wrapLabels = { none: 'Standard Packaging', ribbon: 'Signature Ribbon Wrap', premium: 'Premium Gift Box' };
    const wrapVal = document.querySelector('input[name="gift-wrap"]:checked')?.value || 'none';

    document.getElementById('review-gift').innerHTML = `
      ${val('gift-recipient') ? `<strong>For:</strong> ${val('gift-recipient')}<br/>` : ''}
      ${val('gift-message') ? `<strong>Message:</strong> "${val('gift-message')}"<br/>` : ''}
      <strong>Wrapping:</strong> ${wrapLabels[wrapVal]}
    `;
  } else {
    giftSection.style.display = 'none';
  }

  renderSummary();
}

function val(id) {
  return document.getElementById(id)?.value.trim() || '';
}

// ---- Place Order ----
async function placeOrder() {
  const btn = document.querySelector('.btn-place-order');
  btn.textContent = 'Placing Order...';
  btn.disabled = true;

  const isGift = document.getElementById('is-gift-toggle')?.checked;
  const wrapVal = document.querySelector('input[name="gift-wrap"]:checked')?.value || 'none';
  const paymentVal = document.querySelector('input[name="payment"]:checked')?.value || 'card';

  const subtotal = getCartTotal();
  const shipping = subtotal >= 50000 ? 0 : 2500;
  const wrapPrices = { none: 0, ribbon: 2500, premium: 5000 };
  const wrapCost = isGift ? wrapPrices[wrapVal] : 0;
  const total = subtotal + shipping + wrapCost;

  const orderData = {
    customer_name: val('customer-name'),
    customer_email: val('customer-email'),
    items: cart,
    total: total,
    status: 'pending',
    gift_message: isGift ? val('gift-message') : null
  };

  try {
    const { data, error } = await supabaseClient
      .from('orders')
      .insert([orderData])
      .select();

    if (error) throw error;

    // Clear cart
    cart = [];
    saveCart();

    // Show success modal
    const orderId = data?.[0]?.id || 'GRC-' + Date.now();
    document.getElementById('order-id-display').textContent = `Order ID: ${orderId.toString().slice(0, 8).toUpperCase()}`;
    document.getElementById('success-overlay').classList.add('open');

  } catch (err) {
    console.error('Error placing order:', err);
    showToast('Something went wrong. Please try again.');
    btn.textContent = '🍪 Place Order';
    btn.disabled = false;
  }
}