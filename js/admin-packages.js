// =========================================
// GRACEON - Admin Packages Management
// =========================================

let allAdminPackages = [];
let editingPackageId = null;

document.addEventListener('DOMContentLoaded', async () => {
  const session = await requireAdminAuth();
  if (!session) return;

  await loadAdminPackages();
  initPackageSearch();
});

// ---- Load all packages ----
async function loadAdminPackages() {
  const tbody = document.getElementById('packages-table-body');

  try {
    const { data, error } = await supabaseClient
      .from('packages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    allAdminPackages = data || [];
    renderPackagesTable(allAdminPackages);

  } catch (err) {
    console.error('Error loading packages:', err);
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--gray)">Unable to load packages.</td></tr>`;
  }
}

// ---- Render packages table ----
function renderPackagesTable(packages) {
  const tbody = document.getElementById('packages-table-body');

  if (packages.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--gray)">No packages found.</td></tr>`;
    return;
  }

  tbody.innerHTML = packages.map(p => `
    <tr>
      <td><img src="${p.image_url || 'assets/images/placeholder.jpg'}" alt="${p.name}" onerror="this.src='assets/images/placeholder.jpg'" /></td>
      <td><strong>${p.name}</strong></td>
      <td>${p.package_type || '—'}</td>
      <td>${formatNaira(p.price)}</td>
      <td>${p.badge ? `<span class="admin-status-badge status-completed">${p.badge}</span>` : '—'}</td>
      <td>
        <span class="admin-status-badge ${p.in_stock ? 'status-completed' : 'status-cancelled'}">
          ${p.in_stock ? 'In Stock' : 'Out of Stock'}
        </span>
      </td>
      <td>
        <div class="admin-table-actions">
          <button class="admin-icon-btn" onclick="editPackage('${p.id}')" title="Edit">✏️</button>
          <button class="admin-icon-btn danger" onclick="deletePackage('${p.id}', '${p.name.replace(/'/g, "\\'")}')" title="Delete">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ---- Search packages ----
function initPackageSearch() {
  document.getElementById('package-search')?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    const filtered = allAdminPackages.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.package_type?.toLowerCase().includes(query)
    );
    renderPackagesTable(filtered);
  });
}

// ---- Open modal for new package ----
function openPackageModal() {
  editingPackageId = null;
  document.getElementById('package-modal-title').textContent = 'Add New Package';
  document.getElementById('package-id').value = '';
  document.getElementById('package-name').value = '';
  document.getElementById('package-description').value = '';
  document.getElementById('package-price').value = '';
  document.getElementById('package-type').value = 'Birthday Celebration';
  document.getElementById('package-contents').value = '';
  document.getElementById('package-badge').value = '';
  document.getElementById('package-in-stock').value = 'true';
  document.getElementById('package-image').value = '';
  document.getElementById('package-featured').value = 'false';

  document.getElementById('package-modal-overlay').classList.add('open');
}

// ---- Open modal for editing ----
function editPackage(id) {
  const pkg = allAdminPackages.find(p => p.id === id);
  if (!pkg) return;

  editingPackageId = id;
  document.getElementById('package-modal-title').textContent = 'Edit Package';
  document.getElementById('package-id').value = pkg.id;
  document.getElementById('package-name').value = pkg.name || '';
  document.getElementById('package-description').value = pkg.description || '';
  document.getElementById('package-price').value = pkg.price || '';
  document.getElementById('package-type').value = pkg.package_type || 'Birthday Celebration';
  document.getElementById('package-contents').value = (pkg.contents || []).join('\n');
  document.getElementById('package-badge').value = pkg.badge || '';
  document.getElementById('package-in-stock').value = String(pkg.in_stock);
  document.getElementById('package-image').value = pkg.image_url || '';
  document.getElementById('package-featured').value = String(pkg.is_featured);

  document.getElementById('package-modal-overlay').classList.add('open');
}

// ---- Close modal ----
function closePackageModal() {
  document.getElementById('package-modal-overlay').classList.remove('open');
}

// ---- Save package (Create or Update) ----
async function savePackage() {
  const name = document.getElementById('package-name').value.trim();
  const price = parseFloat(document.getElementById('package-price').value);

  if (!name || !price) {
    showToast('Please fill in at least the name and price.');
    return;
  }

  const btn = document.getElementById('package-save-btn');
  btn.textContent = 'Saving...';
  btn.disabled = true;

  const contentsRaw = document.getElementById('package-contents').value.trim();
  const contents = contentsRaw ? contentsRaw.split('\n').map(c => c.trim()).filter(Boolean) : [];

  const packageData = {
    name,
    description: document.getElementById('package-description').value.trim(),
    price,
    package_type: document.getElementById('package-type').value,
    contents,
    badge: document.getElementById('package-badge').value || null,
    image_url: document.getElementById('package-image').value.trim(),
    in_stock: document.getElementById('package-in-stock').value === 'true',
    is_featured: document.getElementById('package-featured').value === 'true'
  };

  try {
    let error;

    if (editingPackageId) {
      ({ error } = await supabaseClient
        .from('packages')
        .update(packageData)
        .eq('id', editingPackageId));
    } else {
      ({ error } = await supabaseClient
        .from('packages')
        .insert([packageData]));
    }

    if (error) throw error;

    showToast(editingPackageId ? 'Package updated! 🎁' : 'Package added! 🎁');
    closePackageModal();
    await loadAdminPackages();

  } catch (err) {
    console.error('Error saving package:', err);
    showToast('Something went wrong. Please try again.');
  } finally {
    btn.textContent = 'Save Package';
    btn.disabled = false;
  }
}

// ---- Delete package ----
async function deletePackage(id, name) {
  if (!confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) {
    return;
  }

  try {
    const { error } = await supabaseClient
      .from('packages')
      .delete()
      .eq('id', id);

    if (error) throw error;

    showToast('Package deleted.');
    await loadAdminPackages();

  } catch (err) {
    console.error('Error deleting package:', err);
    showToast('Unable to delete package.');
  }
}

// ---- Currency Formatter (Naira) ----
function formatNaira(amount) {
  const num = parseFloat(amount) || 0;
  return '₦' + num.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}