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
        const userObj = { ...data.usuario, empresa_nome: data.empresa ? data.empresa.nome : '' };
        localStorage.setItem('@VTalentos:user', JSON.stringify(userObj));

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

// Função global para renderizar o cabeçalho dinâmico premium unificado (Tarefa 13.1)
window.renderHeader = function(titulo, subtitulo) {
    const headerEl = document.getElementById('appHeader') || document.querySelector('header.header');
    if (!headerEl) return;

    const userStr = localStorage.getItem('@VTalentos:user');
    if (!userStr) return;

    const user = JSON.parse(userStr);
    const roleLabel = (user.perfil === 'ADMIN_EMPRESA' || user.perfil === 'SUPER_ADMIN') ? 'Administrador' : 'Colaborador';
    const inicial = user.nome.charAt(0).toUpperCase();
    const saldoExibido = parseFloat(user.saldo_disponivel || 0).toFixed(2);

    headerEl.innerHTML = `
        <div>
            <h1 id="welcomeText" style="font-size: 1.8rem; margin-bottom: 5px;">${titulo || 'Olá!'}</h1>
            <p id="dashboardSub" style="color: var(--text-secondary); font-size: 0.9rem;">${subtitulo || ''}</p>
        </div>
        <div class="user-info">
            <div class="user-profile-clickable" onclick="window.location.href='meu-perfil.html'" style="display: flex; align-items: center; gap: 8px; cursor: pointer;" title="Visualizar Meu Perfil">
                <div style="text-align: right; margin-right: 5px;">
                    <span id="userName" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 600; justify-content: flex-end; width: 100%;">
                        ${user.nome}
                        <span style="font-size: 0.65rem; font-weight: 500; color: var(--text-secondary); background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); padding: 2px 8px; border-radius: 12px; text-transform: uppercase; display: inline-block;">🏢 ${user.empresa_nome || 'Empresa'}</span>
                    </span>
                    <small id="userRoleBadge" style="color: var(--accent-primary); font-weight: 600; text-transform: uppercase; font-size: 0.75rem; display: block; margin-top: 2px;">${roleLabel} | <span id="userSaldoHeader">${saldoExibido} T$</span></small>
                </div>
                <div class="user-avatar" id="userInitial" style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, var(--accent-primary), #9b59b6); color: #fff; font-size: 1.1rem; font-weight: 600; display: flex; align-items: center; justify-content: center; border: 2px solid rgba(255,255,255,0.1);">${inicial}</div>
            </div>
            <button class="theme-toggle" id="themeToggle" title="Alternar Tema" style="margin-left: 10px;">🌓</button>
            <button class="btn" onclick="logout()" style="padding: 8px 16px; font-size: 0.8rem; background: rgba(255,0,0,0.1); color: var(--error); margin-left: 10px;">SAIR</button>
        </div>
    `;

    // Vincula novamente a alternância de temas do novo botão injetado
    const newBtn = headerEl.querySelector('#themeToggle');
    if (newBtn) {
        newBtn.addEventListener('click', async () => {
            const currentTheme = document.body.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.body.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            
            await saveThemePreference(newTheme);
        });
    }
};

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
                
                // Sincroniza usuário completo no localStorage para manter saldos e empresa atualizados
                const storedUserStr = localStorage.getItem('@VTalentos:user');
                if (storedUserStr) {
                    const currentUser = JSON.parse(storedUserStr);
                    const updatedUser = {
                        ...currentUser,
                        nome: userData.nome,
                        email: userData.email,
                        saldo_disponivel: userData.saldo_disponivel,
                        saldo_a_receber: userData.saldo_a_receber,
                        empresa_nome: userData.empresa_nome
                    };
                    localStorage.setItem('@VTalentos:user', JSON.stringify(updatedUser));
                }

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
