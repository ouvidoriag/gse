// Verifica se o usuário já tem um token válido
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (token) {
    // Tenta redirecionar para o dashboard caso já esteja logado
    window.location.href = '/cds/dashboard.html';
  }

  const form = document.getElementById('loginForm');
  if (form) {
    form.addEventListener('submit', handleLogin);
  }
});

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const errorBox = document.getElementById('errorBox');
  const loginBtn = document.getElementById('loginBtn');

  errorBox.style.display = 'none';
  loginBtn.disabled = true;
  loginBtn.innerHTML = '<div class="spinner"></div> Carregando...';

  try {
    const response = await fetch('/cds/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Falha ao realizar login.');
    }

    // Armazena informações na localStorage
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    // Bridge SSO para o SIGEM
    localStorage.setItem('simac_auth_session', JSON.stringify({
      token: data.token,
      user: data.user,
      timestamp: Date.now()
    }));

    // Redireciona para o Dashboard
    window.location.href = '/cds/dashboard.html';
  } catch (err) {
    console.error(err);
    errorBox.textContent = err.message;
    errorBox.style.display = 'block';
  } finally {
    loginBtn.disabled = false;
    loginBtn.innerHTML = 'Acessar Painel';
  }
}
