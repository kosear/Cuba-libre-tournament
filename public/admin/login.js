// Login page: POST credentials, the server sets an HttpOnly session cookie for 30 days.
const $form = document.getElementById('login');
const $error = document.getElementById('error');

$form.addEventListener('submit', async (e) => {
  e.preventDefault();
  $error.hidden = true;
  const button = $form.querySelector('button');
  button.disabled = true;
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: document.getElementById('username').value,
        password: document.getElementById('password').value,
      }),
    });
    if (res.ok) {
      location.href = '/admin/';
      return;
    }
    $error.textContent = res.status === 401 ? 'Wrong login or password' : 'Server error, try again';
  } catch {
    $error.textContent = 'No connection, try again';
  }
  $error.hidden = false;
  button.disabled = false;
});
