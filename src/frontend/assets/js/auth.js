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
        showToast(err.message, 'error');
        btnSubmit.disabled = false;
        btnSubmit.innerText = 'ENTRAR NO SISTEMA';
    }
});

// Função global para notificações flutuantes premium (Airy Glassmorphism Toast)
window.showToast = function(message, type = 'error') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✔️';
    if (type === 'error') icon = '❌';
    
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Trigger transition
    setTimeout(() => {
        toast.classList.add('active');
    }, 10);
    
    // Remove after duration
    setTimeout(() => {
        toast.classList.remove('active');
        setTimeout(() => {
            toast.remove();
        }, 400);
    }, 4000);
};

// Função para verificar se está logado
function checkAuth() {
    const token = localStorage.getItem('@VTalentos:token');
    if (!token && !window.location.pathname.includes('login.html')) {
        window.location.href = 'login.html';
    }
}

// Controle de Tema Unificado e Automático (Claro/Escuro)
window.addEventListener('DOMContentLoaded', () => {
    // A tela de login é sempre forçada a manter o tema escuro premium
    if (window.location.pathname.includes('login.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
        document.body.setAttribute('data-theme', 'dark');
        return;
    }

    // Carrega o tema selecionado ou adota 'dark' por padrão
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);

    // Vincula o alternador de temas de forma totalmente automática se houver o botão
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.body.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.body.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }
});
