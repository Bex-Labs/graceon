// =========================================
// GRACEON - Admin Authentication
// =========================================

// ---- Login Form Handler ----
document.getElementById('admin-login-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('admin-email').value.trim();
  const password = document.getElementById('admin-password').value;
  const btn = document.getElementById('admin-login-btn');
  const errorBox = document.getElementById('admin-error');

  errorBox.classList.remove('show');
  btn.textContent = 'Logging in...';
  btn.disabled = true;

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    // Successful login — redirect to dashboard
    window.location.href = 'admin-dashboard.html';

  } catch (err) {
    console.error('Login error:', err);
    errorBox.textContent = 'Invalid email or password. Please try again.';
    errorBox.classList.add('show');
    btn.textContent = 'Log In';
    btn.disabled = false;
  }
});

// ---- Check Auth & Protect Admin Pages ----
// Call this on every admin page except admin-login.html
async function requireAdminAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    window.location.href = 'admin-login.html';
    return null;
  }

  return session;
}

// ---- Logout ----
async function adminLogout() {
  await supabaseClient.auth.signOut();
  window.location.href = 'admin-login.html';
}