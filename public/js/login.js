document.getElementById('brand').innerHTML = LOGO + '<div>AQUA<small>by AquaTech Solutions</small></div>';
const f = document.getElementById('f'), msg = document.getElementById('msg'), go = document.getElementById('go');

document.querySelectorAll('.demo button').forEach(b => b.addEventListener('click', () => {
  document.getElementById('email').value = b.dataset.e;
  document.getElementById('pw').value = b.dataset.p;
  document.getElementById('pw').focus();
}));

f.addEventListener('submit', async e => {
  e.preventDefault();
  msg.replaceChildren();
  go.disabled = true; go.textContent = 'Signing in...';
  try {
    const r = await api('/auth/login', { method: 'POST', body: { email: document.getElementById('email').value, password: document.getElementById('pw').value } });
    location.href = r.redirect;
  } catch (err) {
    msg.append(h('div', { class: 'error', text: err.message }));
    go.disabled = false; go.textContent = 'Sign in';
  }
});
// already signed in? go straight to the right portal
api('/auth/whoami', { quiet: true }).then(u => { location.href = u.role === 'admin' ? '/admin/' : '/app/'; }).catch(() => {});
