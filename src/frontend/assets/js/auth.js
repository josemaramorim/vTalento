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

// Persiste tema preferido na API
async function saveThemePreference(theme) {
    const token = localStorage.getItem('@VTalentos:token');
    if (!token) return;
    try {
        await fetch('http://localhost:3001/api/auth/theme', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ tema: theme })
        });
    } catch (err) {
        console.error('Falha ao persistir tema no banco:', err);
    }
}

// Controle de Tema Unificado e Automático (Claro/Escuro)
window.addEventListener('DOMContentLoaded', async () => {
    // A tela de login é sempre forçada a manter o tema escuro premium
    if (window.location.pathname.includes('login.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
        document.body.setAttribute('data-theme', 'dark');
        return;
    }

    const token = localStorage.getItem('@VTalentos:token');
    let themeToApply = localStorage.getItem('theme') || 'dark';

    // Se estiver logado, tenta sincronizar e aplicar o tema preferido do banco
    if (token) {
        try {
            const response = await fetch('http://localhost:3001/api/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const userData = await response.json();
                if (userData.tema_preferido) {
                    themeToApply = userData.tema_preferido;
                    localStorage.setItem('theme', themeToApply);
                }
            }
        } catch (err) {
            console.error('Erro ao ler tema do banco:', err);
        }
    }

    document.body.setAttribute('data-theme', themeToApply);

    // Vincula todos os alternadores de temas (.theme-toggle ou #themeToggle) de forma totalmente automática
    document.querySelectorAll('.theme-toggle, #themeToggle').forEach(btn => {
        // Remove listeners duplicados clonando se necessário ou apenas tratando limpo
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.addEventListener('click', async () => {
            const currentTheme = document.body.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.body.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            
            await saveThemePreference(newTheme);
        });
    });
});
