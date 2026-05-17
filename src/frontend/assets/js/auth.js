const API_URL = 'http://localhost:3001/api';

document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;
    const btnSubmit = e.target.querySelector('button[type="submit"]');

    try {
        btnSubmit.disabled = true;
        btnSubmit.innerText = 'AUTENTICANDO...';

        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, senha })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erro ao realizar login');
        }

        // Sucesso: Armazena o Token e Info do Usuário
        localStorage.setItem('@VTalentos:token', data.token);
        localStorage.setItem('@VTalentos:user', JSON.stringify(data.usuario));

        // Feedback visual de sucesso
        btnSubmit.style.background = 'var(--success)';
        btnSubmit.innerText = 'ACESSO PERMITIDO!';

        // Redireciona após um breve delay
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);

    } catch (err) {
        alert(err.message);
        btnSubmit.disabled = false;
        btnSubmit.innerText = 'ENTRAR NO SISTEMA';
    }
});

// Função para verificar se está logado
function checkAuth() {
    const token = localStorage.getItem('@VTalentos:token');
    if (!token && !window.location.pathname.includes('login.html')) {
        window.location.href = 'login.html';
    }
}
