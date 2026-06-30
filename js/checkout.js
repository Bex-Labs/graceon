// =========================================
// GRACEON - Checkout Page JS
// =========================================

let currentStep = 1;
let selectedWrapPrice = 0;
let loggedInCustomer = null;
let savedAddress = null;

document.addEventListener('DOMContentLoaded', async () => {
  renderSummary();
  initCharCount();
  initWrapOptions();
  await checkLoggedInCustomer();

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

// ---- Check if customer is logged in, prefill their details ----
async function checkLoggedInCustomer() {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;

    loggedInCustomer = session.user;

    // Prefill name, email
    const meta = loggedInCustomer.user_metadata || {};
    const fullName = `${meta.first_name || ''} ${meta.last_name || ''}`.trim();
    if (fullName) document.getElementById('customer-name').value = fullName;
    document.getElementById('customer-email').value = loggedInCustomer.email;

    // Fetch their saved address
    const { data: address, error } = await supabaseClient
      .from('customer_addresses')
      .select('*')
      .eq('user_id', loggedInCustomer.id)
      .eq('is_default', true)
      .maybeSingle();

    if (error) throw error;
    if (!address) return;

    savedAddress = address;

    // Show the saved address banner
    const banner = document.getElementById('saved-address-banner');
    const preview = document.getElementById('saved-address-preview');
    if (banner && preview) {
      preview.textContent = `${address.address}, ${address.state}`;
      banner.style.display = 'block';
    }

    // Prefill phone + address fields by default (since "saved" is checked by default)
    fillFormWithSavedAddress();

  } catch (err) {
    console.error('Error checking logged in customer:', err);
  }
}

// ---- Fill form fields with saved address ----
function fillFormWithSavedAddress() {
  if (!savedAddress) return;

  document.getElementById('customer-phone').value = savedAddress.phone || '';
  document.getElementById('address-street').value = savedAddress.address || '';
  document.getElementById('address-state').value = savedAddress.state || '';
  document.getElementById('address-city').value = savedAddress.state || '';
  document.getElementById('address-zip').value = '';
}

// ---- Clear address fields (for "different address" choice) ----
function clearAddressFields() {
  document.getElementById('customer-phone').value = '';
  document.getElementById('address-street').value = '';
  document.getElementById('address-city').value = '';
  document.getElementById('address-state').value = '';
  document.getElementById('address-zip').value = '';
}

// ---- Toggle between saved address and different address ----
function toggleAddressSource() {
  const choice = document.querySelector('input[name="address-choice"]:checked')?.value;

  if (choice === 'saved') {
    fillFormWithSavedAddress();
  } else {
    clearAddressFields();
  }
}

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
  const isGift = document.getElementById('is-gift-toggle')?.checked;
  const wrapCost = isGift ? selectedWrapPrice : 0;
  const total = subtotal + wrapCost;

  document.getElementById('summary-subtotal').textContent = formatNaira(subtotal);
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
  const paymentVal = document.querySelector('input[name="payment"]:checked')?.value || 'card';

  const isGift = document.getElementById('is-gift-toggle')?.checked;
  const wrapVal = document.querySelector('input[name="gift-wrap"]:checked')?.value || 'none';
  const subtotal = getCartTotal();
  const wrapPrices = { none: 0, ribbon: 2500, premium: 5000 };
  const wrapCost = isGift ? wrapPrices[wrapVal] : 0;
  const total = subtotal + wrapCost;

  // For bank transfer or cash on delivery — save order directly
  if (paymentVal === 'transfer' || paymentVal === 'cod') {
    btn.textContent = 'Placing Order...';
    btn.disabled = true;
    await saveOrderToSupabase(total, isGift, wrapVal, 'pending');
    btn.textContent = '🍪 Place Order';
    btn.disabled = false;
    return;
  }

  // For card payment — launch Flutterwave
  btn.textContent = 'Redirecting to payment...';
  btn.disabled = true;

  const txRef = 'GRC-' + Date.now();

  FlutterwaveCheckout({
    public_key: 'FLWPUBK-274629f90b6f30abeb3e0b2b8d80df28-X',
    tx_ref: txRef,
    amount: total,
    currency: 'NGN',
    payment_options: 'card,banktransfer,ussd',
    customer: {
      email: val('customer-email'),
      phone_number: val('customer-phone'),
      name: val('customer-name'),
    },
    customizations: {
      title: 'Graceon Cookies',
      description: 'Payment for your Graceon cookie order',
      logo: 'https://pvzabostsjzxnmnbqvul.supabase.co/storage/v1/object/public/graceon-images/logo/graceon-logo.jpeg',
    },
    callback: async function(response) {
      if (response.status === 'successful' || response.status === 'completed') {
        await saveOrderToSupabase(total, isGift, wrapVal, 'paid', response.transaction_id, txRef);
      } else {
        showToast('Payment was not completed. Please try again.');
        btn.textContent = '🍪 Place Order';
        btn.disabled = false;
      }
    },
    onclose: function() {
      btn.textContent = '🍪 Place Order';
      btn.disabled = false;
    }
  });
}

// ---- Save order to Supabase after payment ----
async function saveOrderToSupabase(total, isGift, wrapVal, status, transactionId = null, txRef = null) {
  const orderData = {
    customer_name: val('customer-name'),
    customer_email: val('customer-email'),
    items: cart,
    total: total,
    status: status,
    gift_message: isGift ? val('gift-message') : null,
    user_id: loggedInCustomer ? loggedInCustomer.id : null,
    payment_method: document.querySelector('input[name="payment"]:checked')?.value || 'card',
    transaction_id: transactionId ? String(transactionId) : null,
    tx_ref: txRef
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
    console.error('Error saving order:', err);
    showToast('Payment received but order could not be saved. Please contact us.');
  }
}