// =========================================
// GRACEON - Admin Dashboard JS
// =========================================

document.addEventListener('DOMContentLoaded', async () => {
  const session = await requireAdminAuth();
  if (!session) return;

  // Show welcome message
  const welcomeEl = document.getElementById('admin-welcome');
  if (welcomeEl) {
    welcomeEl.textContent = `Welcome back, ${session.user.email}`;
  }

  await loadStats();
  await loadRecentOrders();
});

// ---- Load Dashboard Stats ----
async function loadStats() {
  try {
    const [productsRes, packagesRes, ordersRes] = await Promise.all([
      supabaseClient.from('products').select('id', { count: 'exact', head: true }),
      supabaseClient.from('packages').select('id', { count: 'exact', head: true }),
      supabaseClient.from('orders').select('total')
    ]);

    document.getElementById('stat-products').textContent = productsRes.count ?? 0;
    document.getElementById('stat-packages').textContent = packagesRes.count ?? 0;
    document.getElementById('stat-orders').textContent = ordersRes.data?.length ?? 0;

    const totalRevenue = (ordersRes.data || []).reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
    document.getElementById('stat-revenue').textContent = formatNaira(totalRevenue);

  } catch (err) {
    console.error('Error loading stats:', err);
  }
}

// ---- Load Recent Orders ----
async function loadRecentOrders() {
  const tbody = document.getElementById('recent-orders-body');

  try {
    const { data, error } = await supabaseClient
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;

    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--gray)">No orders yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(order => `
      <tr>
        <td>${order.customer_name}</td>
        <td>${order.customer_email}</td>
        <td><strong>${formatNaira(order.total)}</strong></td>
        <td><span class="admin-status-badge status-${order.status}">${order.status}</span></td>
        <td>${new Date(order.created_at).toLocaleDateString()}</td>
      </tr>
    `).join('');

  } catch (err) {
    console.error('Error loading orders:', err);
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--gray)">Unable to load orders.</td></tr>`;
  }
}

// ---- Currency Formatter (Naira) ----
function formatNaira(amount) {
  const num = parseFloat(amount) || 0;
  return '₦' + num.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}