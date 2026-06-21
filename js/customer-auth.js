// =========================================
// GRACEON - Customer Authentication
// =========================================

// ---- Signup Form Handler ----
document.getElementById('signup-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const firstName = document.getElementById('signup-firstname').value.trim();
  const lastName = document.getElementById('signup-lastname').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const state = document.getElementById('signup-state').value;
  const address = document.getElementById('signup-address').value.trim();
  const phone = document.getElementById('signup-phone').value.trim();

  const btn = document.getElementById('signup-btn');
  const errorBox = document.getElementById('signup-error');

  errorBox.classList.remove('show');

  if (!state) {
    errorBox.textContent = 'Please select your state.';
    errorBox.classList.add('show');
    return;
  }

  btn.textContent = 'Creating Account...';
  btn.disabled = true;

  try {
    // 1. Create the auth user
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName
        }
      }
    });

    if (error) throw error;

    // 2. Stash address details in localStorage — saved to the DB on first login
    // (signUp() doesn't give us an active session if email confirmation is required,
    // so we can't write to customer_addresses yet — RLS would block it)
    localStorage.setItem('graceon_pending_address', JSON.stringify({
      first_name: firstName,
      last_name: lastName,
      state,
      address,
      phone
    }));

    // 3. If a session WAS returned (email confirmation disabled), save immediately
    if (data.session && data.user) {
      await savePendingAddress(data.user.id);
    }

    // 4. Show success
    showSignupSuccess();

  } catch (err) {
    console.error('Signup error:', err);
    errorBox.textContent = err.message || 'Something went wrong. Please try again.';
    errorBox.classList.add('show');
    btn.textContent = 'Create Account';
    btn.disabled = false;
  }
});

// ---- Save pending address (called after signup if session exists, or after login) ----
async function savePendingAddress(userId) {
  const pending = localStorage.getItem('graceon_pending_address');
  if (!pending) return;

  try {
    const addressData = JSON.parse(pending);

    const { error } = await supabaseClient
      .from('customer_addresses')
      .insert([{
        user_id: userId,
        ...addressData,
        is_default: true
      }]);

    if (error) throw error;

    localStorage.removeItem('graceon_pending_address');

  } catch (err) {
    console.error('Error saving pending address:', err);
  }
}

function showSignupSuccess() {
  const card = document.querySelector('.auth-card');
  card.innerHTML = `
    <div style="text-align:center; padding:20px 0;">
      <div style="font-size:48px; margin-bottom:16px;">🎉</div>
      <h2 style="font-family:var(--font-serif); color:var(--dark); margin-bottom:8px;">Welcome to Graceon!</h2>
      <p style="font-size:13px; color:var(--gray); margin-bottom:24px;">Your account has been created successfully.</p>
      <a href="index.html" class="btn btn-primary" style="width:100%; display:block; text-align:center;">Start Shopping</a>
    </div>
  `;
}

// ---- Login Form Handler ----
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('login-btn');
  const errorBox = document.getElementById('login-error');

  errorBox.classList.remove('show');
  btn.textContent = 'Logging in...';
  btn.disabled = true;

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    // If there's a pending address from signup, save it now that we have a session
    if (data.user) {
      await savePendingAddress(data.user.id);
    }

    // Check if there's a redirect destination (e.g. came from checkout)
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect') || 'my-account.html';

    window.location.href = redirect;

  } catch (err) {
    console.error('Login error:', err);
    errorBox.textContent = 'Invalid email or password. Please try again.';
    errorBox.classList.add('show');
    btn.textContent = 'Log In';
    btn.disabled = false;
  }
});

// ---- Get Current Session (used across site) ----
async function getCustomerSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  return session;
}

// ---- Logout ----
async function customerLogout() {
  await supabaseClient.auth.signOut();
  window.location.href = 'index.html';
}

// ---- Require login (for my-account.html) ----
async function requireCustomerAuth() {
  const session = await getCustomerSession();
  if (!session) {
    window.location.href = 'login.html?redirect=my-account.html';
    return null;
  }
  return session;
}