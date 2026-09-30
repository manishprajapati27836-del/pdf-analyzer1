const form = document.getElementById('authForm');
const msg = document.getElementById('msg');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.textContent = '';
  const btn = form.querySelector('button');
  btn.disabled = true;
  try {
    const res = await fetch(form.dataset.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: document.getElementById('email').value,
        password: document.getElementById('password').value
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Something went wrong.');
    window.location.href = '/';
  } catch (err) {
    msg.textContent = err.message;
    btn.disabled = false;
  }
});
