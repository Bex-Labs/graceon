// =========================================
// GRACEON - My Account Page JS
// =========================================

let currentCustomerSession = null;

document.addEventListener('DOMContentLoaded', async () => {
  const session = await requireCustomerAuth();
  if (!session) return;

  currentCustomerSession = session;

  await loadProfile();
  await loadAddress();
  await loadOrders();
  initAddressForm();
});

// ---- Load Profile Info ----
async function loadProfile() {
  const user = currentCustomerSession.user;
  const meta = user.user_metadata || {};

  const welcomeEl = document.getElementById('account-welcome');
  if (welcomeEl) {
    welcomeEl.textContent = `Welcome back, ${meta.first_name || user.email}!`;
  }

  const container = document.getElementById('profile-info');
  container.innerHTML = `
    <div class="profile-info-row">
      <span class="profile-info-label">Full Name</span>
      <span class="profile-info-value">${meta.first_name || ''} ${meta.last_name || ''}</span>
    </div>
    <div class="profile-info-row">
      <span class="profile-info-label">Email</span>
      <span class="profile-info-value">${user.email}</span>
    </div>
    <div class="profile-info-row">
      <span class="profile-info-label">Member Since</span>
      <span class="profile-info-value">${new Date(user.created_at).toLocaleDateString()}</span>
    </div>
  `;
}

// ---- Load Saved Address ----
async function loadAddress() {
  try {
    const { data, error } = await supabaseClient
      .from('customer_addresses')
      .select('*')
      .eq('user_id', currentCustomerSession.user.id)
      .eq('is_default', true)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      document.getElementById('addr-firstname').value = data.first_name || '';
      document.getElementById('addr-lastname').value = data.last_name || '';
      document.getElementById('addr-state').value = data.state || '';
      document.getElementById('addr-address').value = data.address || '';
      document.getElementById('addr-phone').value = data.phone || '';
    }

  } catch (err) {
    console.error('Error loading address:', err);
  }
}

// ---- Save / Update Address ----
function initAddressForm() {
  document.getElementById('address-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const addressData = {
      user_id: currentCustomerSession.user.id,
      first_name: document.getElementById('addr-firstname').value.trim(),
      last_name: document.getElementById('addr-lastname').value.trim(),
      state: document.getElementById('addr-state').value,
      address: document.getElementById('addr-address').value.trim(),
      phone: document.getElementById('addr-phone').value.trim(),
      is_default: true
    };

    try {
      // Check if an address already exists
      const { data: existing } = await supabaseClient
        .from('customer_addresses')
        .select('id')
        .eq('user_id', currentCustomerSession.user.id)
        .eq('is_default', true)
        .maybeSingle();

      let error;

      if (existing) {
        ({ error } = await supabaseClient
          .from('customer_addresses')
          .update(addressData)
          .eq('id', existing.id));
      } else {
        ({ error } = await supabaseClient
          .from('customer_addresses')
          .insert([addressData]));
      }

      if (error) throw error;

      showToast('Address saved! 📍');

    } catch (err) {
      console.error('Error saving address:', err);
      showToast('Unable to save address. Please try again.');
    }
  });
}

// ---- Load Order History ----
async function loadOrders() {
  const container = document.getElementById('orders-list');

  try {
    const { data, error } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('user_id', currentCustomerSession.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = `
        <div class="empty-orders">
          <div style="font-size:40px; margin-bottom:12px;">📦</div>
          <p>You haven't placed any orders yet.</p>
          <a href="shop.html" class="btn btn-primary" style="margin-top:16px; display:inline-block;">Start Shopping</a>
        </div>
      `;
      return;
    }

    container.innerHTML = data.map(order => {
      const itemCount = Array.isArray(order.items) ? order.items.length : 0;
      const itemNames = Array.isArray(order.items) ? order.items.map(i => i.name).join(', ') : '';

      return `
        <div class="order-card">
          <div class="order-card-header">
            <span class="order-card-id">Order #${order.id.toString().slice(0, 8).toUpperCase()}</span>
            <span class="order-card-date">${new Date(order.created_at).toLocaleDateString()}</span>
          </div>
          <div class="order-card-items">${itemCount} item${itemCount !== 1 ? 's' : ''}: ${itemNames}</div>
          <div class="order-card-footer">
            <span class="admin-status-badge status-${order.status}" style="display:inline-block; padding:4px 10px; border-radius:20px; font-size:11px; font-weight:700; text-transform:capitalize;">
              ${order.status}
            </span>
            <span class="order-card-total">${formatNaira(order.total)}</span>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('Error loading orders:', err);
    container.innerHTML = `<p style="color:var(--gray); font-size:13px;">Unable to load orders.</p>`;
  }
}

// ---- Tab Switching ----
function switchTab(tabName, btnEl) {
  document.querySelectorAll('.account-tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.account-nav-link').forEach(link => link.classList.remove('active'));

  document.getElementById(`tab-${tabName}`)?.classList.add('active');
  if (btnEl) btnEl.classList.add('active');
}