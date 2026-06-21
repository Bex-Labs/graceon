// =========================================
// GRACEON - Admin Orders Management
// =========================================

let allAdminOrders = [];

document.addEventListener('DOMContentLoaded', async () => {
  const session = await requireAdminAuth();
  if (!session) return;

  await loadAdminOrders();
  initOrderSearch();
  initStatusFilter();
});

// ---- Load all orders ----
async function loadAdminOrders() {
  const tbody = document.getElementById('orders-table-body');

  try {
    const { data, error } = await supabaseClient
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    allAdminOrders = data || [];
    renderOrdersTable(allAdminOrders);

  } catch (err) {
    console.error('Error loading orders:', err);
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--gray)">Unable to load orders.</td></tr>`;
  }
}

// ---- Render orders table ----
function renderOrdersTable(orders) {
  const tbody = document.getElementById('orders-table-body');

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--gray)">No orders found.</td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map(order => {
    const itemCount = Array.isArray(order.items) ? order.items.length : 0;

    return `
      <tr>
        <td><strong>${order.customer_name}</strong></td>
        <td>${order.customer_email}</td>
        <td>${itemCount} item${itemCount !== 1 ? 's' : ''}</td>
        <td><strong>${formatNaira(order.total)}</strong></td>
        <td>
          <select class="order-status-select" data-id="${order.id}" onchange="updateOrderStatus('${order.id}', this.value)">
            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
            <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completed</option>
            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </td>
        <td>${new Date(order.created_at).toLocaleDateString()}</td>
        <td>
          <div class="admin-table-actions">
            <button class="admin-icon-btn" onclick="viewOrderDetail('${order.id}')" title="View Details">👁️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Add styling for the status select dropdown
  injectOrderStatusStyles();
}

// ---- Update order status ----
async function updateOrderStatus(id, newStatus) {
  try {
    const { error } = await supabaseClient
      .from('orders')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) throw error;

    showToast('Order status updated! ✅');

    // Update local cache
    const order = allAdminOrders.find(o => o.id === id);
    if (order) order.status = newStatus;

  } catch (err) {
    console.error('Error updating order status:', err);
    showToast('Unable to update status.');
  }
}

// ---- View order details ----
function viewOrderDetail(id) {
  const order = allAdminOrders.find(o => o.id === id);
  if (!order) return;

  const items = Array.isArray(order.items) ? order.items : [];

  const itemsHTML = items.map(item => `
    <div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid var(--border); font-size:13px;">
      <span>${item.name} × ${item.quantity}</span>
      <strong>${formatNaira(item.price * item.quantity)}</strong>
    </div>
  `).join('');

  document.getElementById('order-modal-body').innerHTML = `
    <div class="admin-form-group full">
      <label>Customer</label>
      <p style="font-size:14px; color:var(--dark);">${order.customer_name} (${order.customer_email})</p>
    </div>

    <div class="admin-form-group full">
      <label>Order Items</label>
      <div style="background:var(--gray-light); padding:12px 16px; border-radius:var(--radius-sm);">
        ${itemsHTML || '<p style="font-size:13px; color:var(--gray)">No items found.</p>'}
      </div>
    </div>

    ${order.gift_message ? `
      <div class="admin-form-group full">
        <label>Gift Message</label>
        <p style="font-size:13px; color:var(--gray); font-style:italic; background:var(--green-light); padding:12px 16px; border-radius:var(--radius-sm);">
          "${order.gift_message}"
        </p>
      </div>
    ` : ''}

    <div class="admin-form-row">
      <div class="admin-form-group">
        <label>Total</label>
        <p style="font-size:18px; font-weight:700; color:var(--green);">${formatNaira(order.total)}</p>
      </div>
      <div class="admin-form-group">
        <label>Order Date</label>
        <p style="font-size:14px; color:var(--dark);">${new Date(order.created_at).toLocaleString()}</p>
      </div>
    </div>
  `;

  document.getElementById('order-modal-overlay').classList.add('open');
}

// ---- Close modal ----
function closeOrderModal() {
  document.getElementById('order-modal-overlay').classList.remove('open');
}

// ---- Search orders ----
function initOrderSearch() {
  document.getElementById('order-search')?.addEventListener('input', applyOrderFilters);
}

function initStatusFilter() {
  document.getElementById('order-status-filter')?.addEventListener('change', applyOrderFilters);
}

function applyOrderFilters() {
  const query = document.getElementById('order-search')?.value.toLowerCase().trim() || '';
  const statusFilter = document.getElementById('order-status-filter')?.value || 'all';

  let filtered = [...allAdminOrders];

  if (query) {
    filtered = filtered.filter(o =>
      o.customer_name.toLowerCase().includes(query) ||
      o.customer_email.toLowerCase().includes(query)
    );
  }

  if (statusFilter !== 'all') {
    filtered = filtered.filter(o => o.status === statusFilter);
  }

  renderOrdersTable(filtered);
}

// ---- Inject status select styles ----
function injectOrderStatusStyles() {
  if (document.getElementById('order-status-styles')) return;

  const style = document.createElement('style');
  style.id = 'order-status-styles';
  style.textContent = `
    .order-status-select {
      padding: 6px 10px;
      border-radius: 6px;
      border: 1px solid var(--border);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      outline: none;
      background: var(--white);
    }
  `;
  document.head.appendChild(style);
}

// ---- Currency Formatter (Naira) ----
function formatNaira(amount) {
  const num = parseFloat(amount) || 0;
  return '₦' + num.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}