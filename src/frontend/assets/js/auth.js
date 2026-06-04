const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
window.API_URL = isLocal ? 'http://localhost:3001/api' : `${window.location.origin}/api`;

const API_URL = window.API_URL;

// Interceptor Global Fetch para Redirecionamento Dinâmico de API & Bloqueio de Mensalidades do SaaS (HTTP 402)
const originalFetch = window.fetch;
window.fetch = async function(input, init) {
    let url = typeof input === 'string' ? input : '';
    
    // Reescreve a URL se apontar para localhost:3001 em ambiente de produção
    if (url.startsWith('http://localhost:3001/api')) {
        url = url.replace('http://localhost:3001/api', window.API_URL);
        input = url;
    }
    
    const response = await originalFetch(input, init);
    
    if (response.status === 401) {
        const data = await response.clone().json().catch(() => ({}));
        
        // Se não for a rota de login, limpa a sessão expirada/inválida e redireciona
        if (!url.includes('/auth/login')) {
            localStorage.removeItem('@VTalentos:token');
            localStorage.removeItem('@VTalentos:user');
            
            if (!window.location.pathname.includes('login')) {
                if (data.error === 'USER_INACTIVE') {
                    window.location.href = 'login.html?error=inactive';
                } else {
                    window.location.href = 'login.html?error=expired';
                }
                return response;
            }
        }
    }
    
    if (response.status === 402) {
        const data = await response.clone().json().catch(() => ({}));
        if (data.error === 'SUBSCRIPTION_EXPIRED') {
            const userStr = localStorage.getItem('@VTalentos:user');
            if (userStr) {
                const user = JSON.parse(userStr);
                // O Super-Admin está imune a bloqueios de tenants
                if (user.perfil !== 'SUPER_ADMIN') {
                    if (!window.location.pathname.includes('fatura-vencida')) {
                        window.location.href = 'fatura-vencida.html';
                    }
                }
            }
        }
    }
    return response;
};


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
        const userObj = { 
            ...data.usuario, 
            empresa_nome: data.empresa ? data.empresa.nome : '',
            empresa_logo_url: data.empresa ? data.empresa.logo_url : '',
            empresa_cor_primaria: data.empresa ? data.empresa.cor_primaria : ''
        };
        localStorage.setItem('@VTalentos:user', JSON.stringify(userObj));

        // Feedback visual de sucesso
        btnSubmit.style.background = 'var(--success)';
        btnSubmit.innerText = 'ACESSO PERMITIDO!';

        // Redireciona após um breve delay com base no perfil
        setTimeout(() => {
            if (data.usuario.perfil === 'SUPER_ADMIN') {
                window.location.href = 'super-dashboard.html';
            } else {
                window.location.href = 'dashboard.html';
            }
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

window.logout = function() {
    localStorage.removeItem('@VTalentos:token');
    localStorage.removeItem('@VTalentos:user');
    window.location.href = 'login.html';
};

// Função global para Modal de Confirmação Premium Glassmorphism
window.showConfirmModal = function(title, message, onConfirm, onCancel = null) {
    const existing = document.getElementById('premiumConfirmModal');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.id = 'premiumConfirmModal';
    backdrop.style.cssText = `
        position: fixed;
        top: 0; left: 0;
        width: 100vw; height: 100vh;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;

    const card = document.createElement('div');
    card.className = 'modal-card glass';
    card.style.cssText = `
        max-width: 480px;
        width: 90%;
        padding: 30px;
        border-radius: var(--radius-md);
        border: 1px solid var(--glass-border);
        background: var(--glass-bg);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        transform: scale(0.9);
        transition: transform 0.3s ease;
        text-align: center;
    `;

    card.innerHTML = `
        <div style="font-size: 2.5rem; margin-bottom: 15px; color: var(--accent-primary);">⚠️</div>
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 12px; color: var(--text-primary);">${title}</h3>
        <p style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 25px;">${message}</p>
        <div style="display: flex; justify-content: center; gap: 12px;">
            <button id="modalBtnCancel" class="btn" style="background: rgba(255, 255, 255, 0.05); color: var(--text-secondary); border: 1px solid var(--glass-border); padding: 10px 20px; font-weight: 600;">Cancelar</button>
            <button id="modalBtnConfirm" class="btn btn-primary" style="padding: 10px 24px; font-weight: 600;">Confirmar</button>
        </div>
    `;

    backdrop.appendChild(card);
    document.body.appendChild(backdrop);

    // Fade in
    setTimeout(() => {
        backdrop.style.opacity = '1';
        card.style.transform = 'scale(1)';
    }, 10);

    const close = () => {
        backdrop.style.opacity = '0';
        card.style.transform = 'scale(0.9)';
        setTimeout(() => {
            backdrop.remove();
        }, 300);
    };

    backdrop.querySelector('#modalBtnConfirm').addEventListener('click', () => {
        close();
        if (onConfirm) onConfirm();
    });

    const cancelAction = () => {
        close();
        if (onCancel) onCancel();
    };

    backdrop.querySelector('#modalBtnCancel').addEventListener('click', cancelAction);
};

// Função global para Modal de Input (Prompt) Premium Glassmorphism
window.showPromptModal = function(title, message, placeholder, onConfirm, onCancel = null) {
    const existing = document.getElementById('premiumPromptModal');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.id = 'premiumPromptModal';
    backdrop.style.cssText = `
        position: fixed;
        top: 0; left: 0;
        width: 100vw; height: 100vh;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;

    const card = document.createElement('div');
    card.className = 'modal-card glass';
    card.style.cssText = `
        max-width: 480px;
        width: 90%;
        padding: 30px;
        border-radius: var(--radius-md, 12px);
        border: 1px solid var(--glass-border);
        background: var(--glass-bg, rgba(20,20,20,0.8));
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        transform: scale(0.9);
        transition: transform 0.3s ease;
        text-align: center;
    `;

    card.innerHTML = `
        <div style="font-size: 2.5rem; margin-bottom: 15px; color: var(--accent-primary, #D4AF37);">🤖</div>
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 12px; color: var(--text-primary, #fff);">${title}</h3>
        <p style="font-size: 0.88rem; color: var(--text-secondary, #a9b2c3); line-height: 1.5; margin-bottom: 20px;">${message}</p>
        <div style="margin-bottom: 25px;">
            <input type="text" id="modalPromptInput" placeholder="${placeholder}" class="form-control" style="width: 100%; padding: 12px 15px; border-radius: 8px; border: 1px solid var(--glass-border); background: rgba(255,255,255,0.05); color: #fff; box-sizing: border-box; font-size: 0.85rem;">
        </div>
        <div style="display: flex; justify-content: center; gap: 12px;">
            <button id="promptBtnCancel" class="btn" style="background: rgba(255, 255, 255, 0.05); color: var(--text-secondary, #a9b2c3); border: 1px solid var(--glass-border); padding: 10px 20px; font-weight: 600; border-radius: 8px; cursor: pointer;">Cancelar</button>
            <button id="promptBtnConfirm" class="btn btn-primary" style="padding: 10px 24px; font-weight: 600; background: var(--accent-primary, #D4AF37); color: #fff; border: none; border-radius: 8px; cursor: pointer;">Confirmar</button>
        </div>
    `;

    backdrop.appendChild(card);
    document.body.appendChild(backdrop);

    // Fade in
    setTimeout(() => {
        backdrop.style.opacity = '1';
        card.style.transform = 'scale(1)';
        document.getElementById('modalPromptInput').focus();
    }, 10);

    const close = () => {
        backdrop.style.opacity = '0';
        card.style.transform = 'scale(0.9)';
        setTimeout(() => {
            backdrop.remove();
        }, 300);
    };

    backdrop.querySelector('#promptBtnConfirm').addEventListener('click', () => {
        const val = document.getElementById('modalPromptInput').value.trim();
        close();
        if (onConfirm) onConfirm(val);
    });

    backdrop.querySelector('#modalPromptInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const val = document.getElementById('modalPromptInput').value.trim();
            close();
            if (onConfirm) onConfirm(val);
        }
    });

    const cancelAction = () => {
        close();
        if (onCancel) onCancel();
    };

    backdrop.querySelector('#promptBtnCancel').addEventListener('click', cancelAction);
};

// Função para verificar se está logado
function checkAuth() {
    const token = localStorage.getItem('@VTalentos:token');
    if (!token && !window.location.pathname.includes('login')) {
        window.location.href = 'login.html';
    }
}

// Persiste tema preferido na API
async function saveThemePreference(theme) {
    const token = localStorage.getItem('@VTalentos:token');
    if (!token) return;
    try {
        await fetch(`${API_URL}/auth/theme`, {
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
    const roleLabel = user.perfil === 'SUPER_ADMIN' ? 'Super Admin' : (user.perfil === 'ADMIN_EMPRESA' ? 'Administrador' : 'Colaborador');
    const inicial = user.nome.charAt(0).toUpperCase();
    const saldoExibido = parseFloat(user.saldo_disponivel || 0).toFixed(2);

    const empresaBadge = user.perfil === 'SUPER_ADMIN'
        ? `<span style="font-size: 0.65rem; font-weight: 500; color: var(--accent-primary); background: rgba(212,175,55,0.1); border: 1px solid rgba(212,175,55,0.2); padding: 2px 8px; border-radius: 12px; text-transform: uppercase; display: inline-block;">⚡ Plataforma</span>`
        : `<span style="font-size: 0.65rem; font-weight: 500; color: var(--text-secondary); background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); padding: 2px 8px; border-radius: 12px; text-transform: uppercase; display: inline-block;">🏢 ${user.empresa_nome || 'Empresa'}</span>`;

    const roleBadgeContent = user.perfil === 'SUPER_ADMIN'
        ? `${roleLabel}`
        : `${roleLabel} | <span id="userSaldoHeader">${saldoExibido} T$</span>`;

    // Persiste titulo/subtitulo para que o re-render do auth.js possa recuperá-los
    if (titulo) headerEl.setAttribute('data-titulo', titulo);
    if (subtitulo) headerEl.setAttribute('data-subtitulo', subtitulo);

    headerEl.innerHTML = `
        <div style="display: flex; align-items: center;">
            <button id="menuToggleBtn" style="background: none; border: none; font-size: 1.6rem; color: var(--text-primary); cursor: pointer; display: none; margin-right: 15px;" title="Abrir Menu">☰</button>
            <div>
                <h1 id="welcomeText" style="font-size: 1.8rem; margin-bottom: 5px;">${titulo || 'Olá!'}</h1>
                <p id="dashboardSub" style="color: var(--text-secondary); font-size: 0.9rem;">${subtitulo || ''}</p>
            </div>
        </div>
        <div class="user-info">
            <div class="user-profile-clickable" onclick="window.location.href='meu-perfil.html'" style="display: flex; align-items: center; gap: 8px; cursor: pointer;" title="Visualizar Meu Perfil">
                <div style="text-align: right; margin-right: 5px;">
                    <span id="userName" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 600; justify-content: flex-end; width: 100%;">
                        ${user.nome}
                        ${empresaBadge}
                    </span>
                    <small id="userRoleBadge" style="color: var(--accent-primary); font-weight: 600; text-transform: uppercase; font-size: 0.75rem; display: block; margin-top: 2px;">${roleBadgeContent}</small>
                </div>
                <div class="user-avatar" id="userInitial" style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, var(--accent-primary), #9b59b6); color: #fff; font-size: 1.1rem; font-weight: 600; display: flex; align-items: center; justify-content: center; border: 2px solid rgba(255,255,255,0.1);">${inicial}</div>
            </div>
            <button class="theme-toggle" id="themeToggle" title="Alternar Tema" style="margin-left: 10px;">🌓</button>
            <button class="btn" onclick="logout()" style="padding: 8px 16px; font-size: 0.8rem; background: rgba(255,0,0,0.1); color: var(--error); margin-left: 10px;">SAIR</button>
        </div>
    `;

    // Vincula a alternância do menu lateral mobile
    const toggleBtn = headerEl.querySelector('#menuToggleBtn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) {
                sidebar.classList.toggle('active');
                
                // Cria ou remove overlay/backdrop
                let backdrop = document.querySelector('.sidebar-backdrop');
                if (!backdrop) {
                    backdrop = document.createElement('div');
                    backdrop.className = 'sidebar-backdrop';
                    backdrop.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); z-index: 999; transition: opacity 0.3s ease;';
                    document.body.appendChild(backdrop);
                    
                    backdrop.addEventListener('click', () => {
                        sidebar.classList.remove('active');
                        backdrop.remove();
                    });
                } else {
                    backdrop.remove();
                }
            }
        });
    }

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

// Componente de Sidebar Dinâmica Premium Unificada (Request 1)
window.renderSidebar = function() {
    const nav = document.getElementById('navLinks');
    if (!nav) return;

    const userStr = localStorage.getItem('@VTalentos:user');
    if (!userStr) return;

    const user = JSON.parse(userStr);
    
    // Extrai o nome do arquivo atual sem extensão
    const path = window.location.pathname.split('/').pop() || 'dashboard';
    const activePage = path.replace('.html', '') || 'dashboard';

    // Helper robusto para comparar link atual com ou sem extensão .html
    const isPageActive = (href) => {
        const linkPage = href.split('/').pop().replace('.html', '');
        return activePage === linkPage;
    };

    let html = '';

    if (user.perfil === 'SUPER_ADMIN') {
        html = `
            <p style="color: var(--text-secondary); font-size: 0.8rem; letter-spacing: 1px; margin-bottom: 10px;">SAAS PLATAFORMA</p>
            <a href="super-dashboard.html" class="${isPageActive('super-dashboard.html') ? 'active' : ''}" style="${isPageActive('super-dashboard.html') ? 'color: var(--accent-primary) !important; font-weight: 600;' : ''}">📊 Plataforma Dashboard</a>
            <a href="super-empresas.html" class="${isPageActive('super-empresas.html') ? 'active' : ''}" style="${isPageActive('super-empresas.html') ? 'color: var(--accent-primary) !important; font-weight: 600;' : ''}">🏢 Inquilinos (Empresas)</a>
            <a href="super-usuarios.html" class="${isPageActive('super-usuarios.html') ? 'active' : ''}" style="${isPageActive('super-usuarios.html') ? 'color: var(--accent-primary) !important; font-weight: 600;' : ''}">👥 Usuários Isolados</a>
            <a href="super-faturamento.html" class="${isPageActive('super-faturamento.html') ? 'active' : ''}" style="${isPageActive('super-faturamento.html') ? 'color: var(--accent-primary) !important; font-weight: 600;' : ''}">💰 Faturamento SaaS</a>
            <a href="super-provedores.html" class="${isPageActive('super-provedores.html') ? 'active' : ''}" style="${isPageActive('super-provedores.html') ? 'color: var(--accent-primary) !important; font-weight: 600;' : ''}">💳 Provedores de Pgto.</a>
            <p style="color: var(--text-secondary); font-size: 0.8rem; letter-spacing: 1px; margin-top: 20px; margin-bottom: 10px;">PERFIL</p>
            <a href="meu-perfil.html" class="${isPageActive('meu-perfil.html') ? 'active' : ''}" style="${isPageActive('meu-perfil.html') ? 'color: var(--accent-primary) !important; font-weight: 600;' : ''}">👤 Meus Dados</a>
        `;
    } else {
        html = `
            <p style="color: var(--text-secondary); font-size: 0.8rem; letter-spacing: 1px; margin-bottom: 10px;">MENU PRINCIPAL</p>
            <a href="dashboard.html" class="${isPageActive('dashboard.html') ? 'active' : ''}" style="${isPageActive('dashboard.html') ? 'color: var(--accent-primary) !important; font-weight: 600;' : ''}">🏠 Dashboard</a>
            <a href="vitrine.html" class="${isPageActive('vitrine.html') ? 'active' : ''}" style="${isPageActive('vitrine.html') ? 'color: var(--accent-primary) !important; font-weight: 600;' : ''}">🎁 Vitrine de Prêmios</a>
            <a href="meu-extrato.html" class="${isPageActive('meu-extrato.html') ? 'active' : ''}" style="${isPageActive('meu-extrato.html') ? 'color: var(--accent-primary) !important; font-weight: 600;' : ''}">📊 Meu Extrato</a>
        `;

        if (user.perfil === 'ADMIN_EMPRESA') {
            html += `
                <p style="color: var(--text-secondary); font-size: 0.8rem; letter-spacing: 1px; margin-top: 15px; margin-bottom: 10px;">ADMINISTRAÇÃO</p>
                <a href="admin-lancamento.html" class="${isPageActive('admin-lancamento.html') ? 'active' : ''}" style="${isPageActive('admin-lancamento.html') ? 'color: var(--accent-primary) !important; font-weight: 600;' : ''}">💎 Lançamento Manual</a>
                <a href="admin-importacao-upload.html" class="${activePage.startsWith('admin-importacao') && !isPageActive('admin-importacao-programavel.html') ? 'active' : ''}" style="${activePage.startsWith('admin-importacao') && !isPageActive('admin-importacao-programavel.html') ? 'color: var(--accent-primary) !important; font-weight: 600;' : ''}">📤 Importação Excel</a>
                <a href="admin-importacao-programavel.html" class="${isPageActive('admin-importacao-programavel.html') ? 'active' : ''}" style="${isPageActive('admin-importacao-programavel.html') ? 'color: var(--accent-primary) !important; font-weight: 600;' : ''}">⚙️ Motor Programável</a>
                <a href="admin-premios.html" class="${isPageActive('admin-premios.html') ? 'active' : ''}" style="${isPageActive('admin-premios.html') ? 'color: var(--accent-primary) !important; font-weight: 600;' : ''}">⚙️ Gerenciar Prêmios</a>
                <a href="admin-usuarios.html" class="${isPageActive('admin-usuarios.html') ? 'active' : ''}" style="${isPageActive('admin-usuarios.html') ? 'color: var(--accent-primary) !important; font-weight: 600;' : ''}">👥 Gestão de Corretores</a>
                <a href="admin-movimentacoes.html" class="${isPageActive('admin-movimentacoes.html') ? 'active' : ''}" style="${isPageActive('admin-movimentacoes.html') ? 'color: var(--accent-primary) !important; font-weight: 600;' : ''}">📈 Movimentações</a>
                <a href="admin-baixas.html" class="${isPageActive('admin-baixas.html') ? 'active' : ''}" style="${isPageActive('admin-baixas.html') ? 'color: var(--accent-primary) !important; font-weight: 600;' : ''}">⚡ Baixa em Lote</a>
                <a href="admin-faturamento.html" class="${isPageActive('admin-faturamento.html') ? 'active' : ''}" style="${isPageActive('admin-faturamento.html') ? 'color: var(--accent-primary) !important; font-weight: 600;' : ''}">💳 Faturamento SaaS</a>
            `;
        }

        html += `
            <p style="color: var(--text-secondary); font-size: 0.8rem; letter-spacing: 1px; margin-top: 15px; margin-bottom: 10px;">PERFIL</p>
            <a href="meu-perfil.html" class="${isPageActive('meu-perfil.html') ? 'active' : ''}" style="${isPageActive('meu-perfil.html') ? 'color: var(--accent-primary) !important; font-weight: 600;' : ''}">👤 Meus Dados</a>
        `;
    }

    nav.innerHTML = html;
};

// Aplica branding personalizado da empresa (Tenant)
window.applyTenantBranding = function(user) {
    if (!user || user.perfil === 'SUPER_ADMIN') return;
    if (user.empresa_cor_primaria) {
        document.documentElement.style.setProperty('--accent-primary', user.empresa_cor_primaria);
        document.documentElement.style.setProperty('--accent-secondary', user.empresa_cor_primaria);
    }
    const logoEl = document.querySelector('.logo');
    if (logoEl && user.empresa_logo_url) {
        logoEl.innerHTML = `<img src="${user.empresa_logo_url}" alt="${user.empresa_nome || 'Logo'}" style="max-width: 100%; max-height: 50px; object-fit: contain;">`;
    }
};

// Controle de Tema Unificado e Automático (Claro/Escuro)
window.addEventListener('DOMContentLoaded', async () => {
    // Renderiza a sidebar automaticamente se o elemento #navLinks existir
    if (window.renderSidebar) {
        window.renderSidebar();
    }

    // A tela de login é sempre forçada a manter o tema escuro premium
    if (window.location.pathname.includes('login') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
        document.body.setAttribute('data-theme', 'dark');
        
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('error') === 'inactive') {
            setTimeout(() => {
                if (window.showToast) {
                    window.showToast('Sua conta foi inativada. Entre em contato com o administrador.', 'error');
                }
            }, 200);
        } else if (urlParams.get('error') === 'expired') {
            setTimeout(() => {
                if (window.showToast) {
                    window.showToast('Sua sessão expirou. Por favor, faça login novamente.', 'error');
                }
            }, 200);
        }
        return;
    }

    // Garante que o usuário está autenticado antes de carregar dados da página protegida
    checkAuth();

    const token = localStorage.getItem('@VTalentos:token');
    let themeToApply = localStorage.getItem('theme') || 'dark';

    // Aplica o branding cacheado imediatamente para evitar flash de cor padrão
    const cachedUserStr = localStorage.getItem('@VTalentos:user');
    if (cachedUserStr) {
        try {
            const cachedUser = JSON.parse(cachedUserStr);
            window.applyTenantBranding(cachedUser);
        } catch (e) {}
    }

    // Se estiver logado, tenta sincronizar e aplicar o tema preferido do banco
    if (token) {
        try {
            const response = await fetch(`${API_URL}/auth/me`, {
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
                        empresa_nome: userData.empresa_nome,
                        empresa_logo_url: userData.empresa_logo_url,
                        empresa_cor_primaria: userData.empresa_cor_primaria,
                        empresa_status: userData.empresa_status,
                        data_expiracao: userData.data_expiracao,
                        liberacao_emergencia: userData.liberacao_emergencia,
                        emergencia_expiracao: userData.emergencia_expiracao
                    };
                    localStorage.setItem('@VTalentos:user', JSON.stringify(updatedUser));
                    window.applyTenantBranding(updatedUser);

                    // Validação proativa de bloqueio de assinatura no page load (Tarefa 15.8)
                    const agoraValidacao = new Date();
                    const expirada = userData.data_expiracao ? new Date(userData.data_expiracao) < agoraValidacao : false;
                    const suspensa = userData.empresa_status === 'SUSPENSO' || expirada;
                    const cortesiaAtiva = userData.liberacao_emergencia &&
                                          userData.emergencia_expiracao &&
                                          new Date(userData.emergencia_expiracao) > agoraValidacao;

                    if (userData.perfil !== 'SUPER_ADMIN') {
                        if (suspensa && !cortesiaAtiva) {
                            if (!window.location.pathname.includes('fatura-vencida') && !window.location.pathname.includes('login')) {
                                window.location.href = 'fatura-vencida.html';
                                return;
                            }
                        } else {
                            if (window.location.pathname.includes('fatura-vencida')) {
                                window.location.href = 'dashboard.html';
                                return;
                            }
                        }
                    }

                    // Injeção Reativa do Banner de Cortesia do SaaS

                    if (userData.liberacao_emergencia && userData.emergencia_expiracao) {
                        const exp = new Date(userData.emergencia_expiracao);
                        const agora = new Date();
                        const diffTime = Math.max(0, exp - agora);
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        
                        let banner = document.getElementById('cortesiaBanner');
                        if (!banner && diffDays > 0) {
                            banner = document.createElement('div');
                            banner.id = 'cortesiaBanner';
                            banner.style.cssText = 'background: rgba(243, 156, 18, 0.12); border: 1px solid rgba(243, 156, 18, 0.25); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); padding: 10px 20px; border-radius: 12px; margin: 15px 0; color: #f39c12; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15); border-left: 4px solid #f39c12; font-weight: 500; gap: 8px; text-align: center;';
                            banner.innerHTML = `⚠️ <span><strong>Acesso de Emergência Concedido:</strong> Regularize a pendência de faturamento de sua empresa nos próximos <strong>${diffDays} dia(s)</strong> para evitar a suspensão da plataforma.</span>`;
                            
                            const headerContainer = document.getElementById('appHeader') || document.querySelector('header.header');
                            if (headerContainer) {
                                headerContainer.parentNode.insertBefore(banner, headerContainer.nextSibling);
                            }
                        }
                    }

                    // Re-renderiza o cabeçalho dinamicamente para aplicar o nome da empresa e saldo atualizados imediatamente
                    if (window.renderHeader) {
                        const headerEl = document.getElementById('appHeader') || document.querySelector('header.header');
                        // Recupera titulo/subtitulo dos data-attributes (salvos pelo renderHeader original da página)
                        const activeTitle = headerEl ? (headerEl.getAttribute('data-titulo') || '') : '';
                        const activeSubtitle = headerEl ? (headerEl.getAttribute('data-subtitulo') || '') : '';
                        window.renderHeader(activeTitle, activeSubtitle);
                    }
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

    // Inicialização automática do Copiloto IA (FASE 18)
    const isImportPage = window.location.pathname.includes('admin-importacao-upload') ||
                         window.location.pathname.includes('admin-importacao-preview') ||
                         window.location.pathname.includes('admin-importacao-programavel');
    if (isImportPage) {
        window.initAiCopilot();
    }
});

// Implementação do Copiloto IA (Strategy/Multi-LLM) - Widget e Gaveta Flutuante
window.initAiCopilot = function() {
    const token = localStorage.getItem('@VTalentos:token');
    if (!token) return;

    // Evita inicialização dupla
    if (document.getElementById('copilotoWidgetContainer')) return;

    // Injeta Estilos Premium (Glassmorphic)
    const styleEl = document.createElement('style');
    styleEl.textContent = `
        .copiloto-widget {
            position: fixed;
            bottom: 30px;
            right: 30px;
            z-index: 10000;
            font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .copiloto-trigger {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--accent-primary, #D4AF37), #9b59b6);
            border: 2px solid rgba(255,255,255,0.15);
            box-shadow: 0 10px 30px rgba(0,0,0,0.35);
            color: white;
            font-size: 1.8rem;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .copiloto-trigger:hover {
            transform: scale(1.1) rotate(5deg);
            box-shadow: 0 15px 35px rgba(0,0,0,0.45);
        }
        .copiloto-drawer {
            position: fixed;
            top: 0;
            right: -420px;
            width: 400px;
            height: 100vh;
            background: rgba(18, 19, 26, 0.92);
            backdrop-filter: blur(25px);
            -webkit-backdrop-filter: blur(25px);
            border-left: 1px solid rgba(255,255,255,0.08);
            box-shadow: -15px 0 45px rgba(0,0,0,0.6);
            transition: right 0.4s cubic-bezier(0.075, 0.82, 0.165, 1);
            z-index: 9999;
            display: flex;
            flex-direction: column;
        }
        .copiloto-drawer.open {
            right: 0;
        }
        .copiloto-header {
            padding: 20px;
            border-bottom: 1px solid rgba(255,255,255,0.08);
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: rgba(0,0,0,0.3);
        }
        .copiloto-header h3 {
            margin: 0;
            font-size: 1.1rem;
            font-weight: 700;
            color: #fff;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .copiloto-close {
            background: none;
            border: none;
            font-size: 1.3rem;
            color: var(--text-secondary, #a9b2c3);
            cursor: pointer;
            transition: color 0.2s;
        }
        .copiloto-close:hover {
            color: #fff;
        }
        .copiloto-messages {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        .copiloto-msg {
            max-width: 85%;
            padding: 12px 16px;
            border-radius: 12px;
            font-size: 0.82rem;
            line-height: 1.5;
            word-break: break-word;
        }
        .copiloto-msg-system {
            align-self: flex-start;
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.08);
            color: #e2e8f0;
            border-top-left-radius: 2px;
        }
        .copiloto-msg-user {
            align-self: flex-end;
            background: linear-gradient(135deg, var(--accent-primary, #D4AF37), #9b59b6);
            color: white;
            border-top-right-radius: 2px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.15);
        }
        .copiloto-msg pre {
            background: rgba(0,0,0,0.4);
            padding: 8px 12px;
            border-radius: 6px;
            overflow-x: auto;
            font-family: monospace;
            font-size: 0.75rem;
            margin-top: 8px;
            border: 1px solid rgba(255,255,255,0.08);
        }
        .copiloto-actions {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-top: 10px;
        }
        .copiloto-btn-action {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            color: #e2e8f0;
            padding: 8px 14px;
            border-radius: 8px;
            font-size: 0.78rem;
            cursor: pointer;
            text-align: left;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .copiloto-btn-action:hover {
            background: rgba(255,255,255,0.1);
            border-color: var(--accent-primary, #D4AF37);
        }
        .copiloto-footer {
            padding: 15px 20px;
            border-top: 1px solid rgba(255,255,255,0.08);
            display: flex;
            gap: 10px;
            background: rgba(0,0,0,0.3);
        }
        .copiloto-input {
            flex: 1;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            color: #fff;
            padding: 10px 15px;
            border-radius: 8px;
            font-size: 0.85rem;
            transition: all 0.2s;
        }
        .copiloto-input:focus {
            border-color: var(--accent-primary, #D4AF37);
            outline: none;
            background: rgba(255,255,255,0.08);
        }
        .copiloto-send {
            background: var(--accent-primary, #D4AF37);
            color: white;
            border: none;
            padding: 0 16px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.2s;
        }
        .copiloto-send:hover {
            filter: brightness(1.1);
            transform: translateY(-1px);
        }
        .one-click-fix-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            margin-top: 10px;
            background: rgba(46, 204, 113, 0.15);
            border: 1px solid rgba(46, 204, 113, 0.35);
            color: #2ecc71;
            font-weight: 700;
            padding: 8px 14px;
            border-radius: 6px;
            font-size: 0.78rem;
            cursor: pointer;
            transition: all 0.2s;
        }
        .one-click-fix-btn:hover {
            background: #2ecc71;
            color: white;
            box-shadow: 0 4px 12px rgba(46, 204, 113, 0.3);
        }
        .copiloto-typing {
            display: flex;
            gap: 4px;
            align-items: center;
            padding: 8px 12px;
            background: rgba(255,255,255,0.02);
            border-radius: 8px;
            width: fit-content;
        }
        .copiloto-dot {
            width: 6px;
            height: 6px;
            background: var(--text-secondary, #a9b2c3);
            border-radius: 50%;
            animation: copilotoBounce 1.4s infinite both;
        }
        .copiloto-dot:nth-child(2) { animation-delay: .2s; }
        .copiloto-dot:nth-child(3) { animation-delay: .4s; }
        @keyframes copilotoBounce {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1); }
        }
    `;
    document.head.appendChild(styleEl);

    // Create container
    const container = document.createElement('div');
    container.id = 'copilotoWidgetContainer';
    container.className = 'copiloto-widget';

    container.innerHTML = `
        <div class="copiloto-trigger" id="copilotoTriggerBtn" title="Abrir Copiloto IA">🤖</div>
        <div class="copiloto-drawer" id="copilotoDrawer">
            <div class="copiloto-header">
                <h3>🤖 Copiloto IA VTalentos</h3>
                <button class="copiloto-close" id="copilotoCloseBtn">×</button>
            </div>
            <div class="copiloto-messages" id="copilotoMessages">
                <!-- Welcome Message -->
            </div>
            <div class="copiloto-footer">
                <input type="text" class="copiloto-input" id="copilotoInput" placeholder="Pergunte algo ou solicite ajuda...">
                <button class="copiloto-send" id="copilotoSendBtn">Enviar</button>
            </div>
        </div>
    `;

    document.body.appendChild(container);

    const triggerBtn = document.getElementById('copilotoTriggerBtn');
    const drawer = document.getElementById('copilotoDrawer');
    const closeBtn = document.getElementById('copilotoCloseBtn');
    const msgContainer = document.getElementById('copilotoMessages');
    const inputField = document.getElementById('copilotoInput');
    const sendBtn = document.getElementById('copilotoSendBtn');

    // Toggle Drawer
    triggerBtn.addEventListener('click', () => {
        drawer.classList.toggle('open');
        triggerBtn.style.display = drawer.classList.contains('open') ? 'none' : 'flex';
    });

    closeBtn.addEventListener('click', () => {
        drawer.classList.remove('open');
        triggerBtn.style.display = 'flex';
    });

    // Helper: Add Message
    function addMessage(content, sender = 'system', customHtml = '') {
        const msg = document.createElement('div');
        msg.className = `copiloto-msg copiloto-msg-${sender}`;
        msg.innerHTML = content + customHtml;
        msgContainer.appendChild(msg);
        msgContainer.scrollTop = msgContainer.scrollHeight;
    }

    // Helper: Show/Hide Typing Indicator
    let typingIndicator = null;
    function showTyping() {
        if (typingIndicator) return;
        typingIndicator = document.createElement('div');
        typingIndicator.className = 'copiloto-msg copiloto-msg-system copiloto-typing';
        typingIndicator.innerHTML = `
            <div class="copiloto-dot"></div>
            <div class="copiloto-dot"></div>
            <div class="copiloto-dot"></div>
        `;
        msgContainer.appendChild(typingIndicator);
        msgContainer.scrollTop = msgContainer.scrollHeight;
    }

    function hideTyping() {
        if (typingIndicator) {
            typingIndicator.remove();
            typingIndicator = null;
        }
    }

    // Helper: Extrapolar colunas
    function obterColunasExcel() {
        let cols = [];
        if (window.flowchartData?.nodes) {
            const node = window.flowchartData.nodes.find(n => n.type === 'excel_input');
            if (node?.data?.columns) {
                cols = node.data.columns.map(c => c.label || c.letter);
            }
        }
        if (cols.length === 0) {
            document.querySelectorAll('table thead th').forEach(th => {
                const text = th.innerText.trim();
                if (text && text !== 'Linha' && text !== 'Ações' && text !== 'Status') {
                    cols.push(text);
                }
            });
        }
        return cols.length > 0 ? cols : ["Nome/Consultor", "Coluna_B", "ValorComissao"];
    }

    // Helper: Contexto do erro
    function obterContextoErroPagina() {
        const terminalEl = document.querySelector('.terminal-console');
        if (terminalEl) {
            const errors = Array.from(terminalEl.querySelectorAll('.terminal-line.error')).map(el => el.innerText).join('\n');
            return errors || terminalEl.innerText;
        }
        const errorLogsEl = document.getElementById('errorLogs') || document.querySelector('.error-logs-container') || document.querySelector('.inconsistencias-wrapper');
        if (errorLogsEl) {
            return errorLogsEl.innerText;
        }
        const alertEl = document.querySelector('.alert-danger, .error-message, .alert-error');
        if (alertEl) {
            return alertEl.innerText;
        }
        return 'Nenhum log de erro visualizado na tela.';
    }

    // Welcome Message & Quick Actions based on page context
    const isProgramavel = window.location.pathname.includes('admin-importacao-programavel');
    const isUpload = window.location.pathname.includes('admin-importacao-upload');
    const isPreview = window.location.pathname.includes('admin-importacao-preview');

    let welcomeText = `Olá! Sou o seu <strong>Copiloto IA do V-Talentos</strong>. Como posso ajudar com sua importação?`;
    let actionsHtml = `<div class="copiloto-actions">`;

    if (isProgramavel) {
        welcomeText = `Olá! Sou o seu <strong>Copiloto do Motor Programável</strong>. Posso te ajudar a gerar configurações, criar funções de sanitização personalizadas ou diagnosticar falhas na simulação.`;
        actionsHtml += `
            <button class="copiloto-btn-action" data-action="gerar">💡 Gerar Configuração por Prompt</button>
            <button class="copiloto-btn-action" data-action="sanitizar">🔤 Sugerir Sanitização de Texto</button>
            <button class="copiloto-btn-action" data-action="diagnosticar">🩺 Diagnosticar Último Erro</button>
        `;
    } else if (isUpload) {
        welcomeText = `Olá! Posso ajudar você a entender as colunas obrigatórias do V-Talentos e como estruturar sua planilha de forma correta.`;
        actionsHtml += `
            <button class="copiloto-btn-action" data-action="ajuda_upload">📋 Como estruturar minha planilha?</button>
            <button class="copiloto-btn-action" data-action="verificar_erros">🔍 Diagnosticar erros de validação</button>
        `;
    } else if (isPreview) {
        welcomeText = `Olá! Estamos na fase de pré-visualização dos dados. Posso ajudar você a identificar o porquê de linhas inválidas ou corretores não encontrados.`;
        actionsHtml += `
            <button class="copiloto-btn-action" data-action="diagnosticar">🩺 Diagnosticar erros de inconsistência</button>
        `;
    }
    actionsHtml += `</div>`;

    addMessage(welcomeText, 'system', actionsHtml);

    // Click Actions Handler
    msgContainer.addEventListener('click', async (e) => {
        const btn = e.target.closest('.copiloto-btn-action');
        if (!btn) return;

        const action = btn.getAttribute('data-action');
        
        if (action === 'gerar') {
            window.showPromptModal(
                'Gerar Configuração por Prompt',
                'Descreva o que o seu motor de importação deve fazer para gerarmos o mapeamento correto.',
                'Ex: Mapeie a coluna A para o nome em maiúsculas e a coluna B para comissões',
                async (promptStr) => {
                    if (!promptStr) return;
                    addMessage('Solicitar geração de configuração: "' + promptStr + '"', 'user');
                    await executarGeracaoFluxo(promptStr);
                }
            );
        } else if (action === 'sanitizar') {
            window.showPromptModal(
                'Sugerir Sanitização de Texto',
                'O que você deseja fazer com a coluna? O copiloto gerará a regra correspondente.',
                'Ex: Remover pontuação do CPF, Formatar e-mail para minúsculas',
                async (objetivo) => {
                    if (!objetivo) return;
                    addMessage('Solicitar sugestão de sanitização: "' + objetivo + '"', 'user');
                    await executarSugestaoSanitizacao(objetivo);
                }
            );
        } else if (action === 'diagnosticar' || action === 'verificar_erros') {
            addMessage('Solicitar diagnóstico de erro', 'user');
            await executarDiagnosticoErro();
        } else if (action === 'ajuda_upload') {
            addMessage('Como estruturar minha planilha?', 'user');
            showTyping();
            setTimeout(() => {
                hideTyping();
                addMessage(`
                    <strong>Estrutura de Planilha Recomendada:</strong><br>
                    1. <strong>Linha de Cabeçalho:</strong> Deve conter títulos claros nas colunas (Ex: Nome, CPF, Comissão).<br>
                    2. <strong>Campos Obrigatórios:</strong> Para importar com sucesso, o sistema exige:<br>
                       - Nome ou CPF do Consultor (para identificação).<br>
                       - Valor (em Reais - será convertido em Talentos usando o fator cadastrado).<br>
                    3. <strong>Fator de Conversão:</strong> Ex: se o fator for 100, uma venda de R$ 1.500 gerará 15 Talentos no extrato.
                `, 'system');
            }, 600);
        }
    });

    // Execute Gerar Fluxo API
    async function executarGeracaoFluxo(promptText) {
        showTyping();
        try {
            const cols = obterColunasExcel();
            const response = await fetch('http://localhost:3001/api/admin/ia/gerar-fluxo', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ promptUsuario: promptText, colunasExcel: cols })
            });

            const data = await response.json();
            hideTyping();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Erro na resposta do Copiloto');
            }

            // Exibe resposta
            const jsonStr = JSON.stringify(data.json, null, 2);
            let applyBtnHtml = '';
            if (isProgramavel && window.editorInstance) {
                applyBtnHtml = `<button class="one-click-fix-btn" id="btnApplyIaJson" data-json='${JSON.stringify(data.json)}'>⚡ Aplicar Configuração no Editor</button>`;
            }

            addMessage(`
                <strong>Configuração Gerada com Sucesso:</strong><br>
                Mapeamento gerado com base nas colunas: <code>${cols.join(', ')}</code>.
                <pre><code>${jsonStr}</code></pre>
            `, 'system', applyBtnHtml);

            // Bind Apply Button
            const applyBtn = document.getElementById('btnApplyIaJson');
            if (applyBtn) {
                applyBtn.addEventListener('click', (ev) => {
                    const targetJson = JSON.parse(ev.currentTarget.getAttribute('data-json'));
                    window.editorInstance.setValue(JSON.stringify(targetJson, null, 2));
                    if (typeof window.parseJSONToFlowchart === 'function') {
                        window.parseJSONToFlowchart();
                    }
                    showToast('Fluxo gerado por IA aplicado no editor!', 'success');
                    ev.currentTarget.remove();
                });
            }

        } catch (err) {
            hideTyping();
            addMessage(`Falha ao gerar fluxo: ${err.message}`, 'system');
        }
    }

    // Execute Sugerir Sanitizacao API
    async function executarSugestaoSanitizacao(objetivo) {
        showTyping();
        try {
            const response = await fetch('http://localhost:3001/api/admin/ia/sugerir-sanitizacao', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ exemploDados: ["amostra"], objetivo })
            });

            const data = await response.json();
            hideTyping();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Erro na resposta do Copiloto');
            }

            let applyBtnHtml = '';
            if (isProgramavel && window.propEditorInstance) {
                applyBtnHtml = `<button class="one-click-fix-btn" id="btnApplyIaScript" data-script="${btoa(unescape(encodeURIComponent(data.script)))}">⚡ Aplicar no Nó Selecionado</button>`;
            }

            addMessage(`
                <strong>Sugestão de Sanitização:</strong><br>
                ${data.explicacao}<br>
                Regra recomendada: <code>${data.regra}</code>
                <pre><code>${data.script}</code></pre>
            `, 'system', applyBtnHtml);

            const applyBtn = document.getElementById('btnApplyIaScript');
            if (applyBtn) {
                applyBtn.addEventListener('click', (ev) => {
                    const scriptCode = decodeURIComponent(escape(atob(ev.currentTarget.getAttribute('data-script'))));
                    window.propEditorInstance.setValue(scriptCode);
                    showToast('Script de sanitização IA aplicado!', 'success');
                    ev.currentTarget.remove();
                });
            }

        } catch (err) {
            hideTyping();
            addMessage(`Falha ao sugerir sanitização: ${err.message}`, 'system');
        }
    }

    // Execute Diagnosticar Erro API
    async function executarDiagnosticoErro(customPrompt = '') {
        showTyping();
        try {
            const lastErrorText = customPrompt || obterContextoErroPagina();
            let schemaAtual = {};
            if (isProgramavel && window.editorInstance) {
                try {
                    schemaAtual = JSON.parse(window.editorInstance.getValue());
                } catch (e) {}
            }

            const response = await fetch('http://localhost:3001/api/admin/ia/diagnosticar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    mensagemErro: lastErrorText,
                    contexto: {
                        pagina: window.location.pathname,
                        schema: schemaAtual,
                        ...(customPrompt && { logsPagina: obterContextoErroPagina() })
                    }
                })
            });

            const data = await response.json();
            hideTyping();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Erro na resposta do Copiloto');
            }

            let scriptText = data.script_corrigido || '';
            if (scriptText && typeof scriptText === 'object') {
                scriptText = JSON.stringify(scriptText, null, 2);
            }

            let applyBtnHtml = '';
            if (data.tipo_correcao === 'script' && scriptText) {
                if (isProgramavel && window.propEditorInstance) {
                    applyBtnHtml = `<button class="one-click-fix-btn" id="btnApplyIaDiagnosticScript" data-script="${btoa(unescape(encodeURIComponent(scriptText)))}">⚡ Aplicar Script</button>`;
                }
            } else if (data.tipo_correcao === 'json' && scriptText) {
                if (isProgramavel && window.editorInstance) {
                    applyBtnHtml = `<button class="one-click-fix-btn" id="btnApplyIaDiagnosticJson" data-json="${btoa(unescape(encodeURIComponent(scriptText)))}">⚡ Aplicar JSON no Editor</button>`;
                }
            }

            addMessage(`
                <strong>Diagnóstico do Copiloto:</strong><br>
                ${data.explicacao}<br><br>
                <strong>Sugestão de Resolução:</strong><br>
                ${data.sugestao_correcao}
                ${scriptText ? `<pre><code>${scriptText}</code></pre>` : ''}
            `, 'system', applyBtnHtml);

            // Bind actions
            const applyScriptBtn = document.getElementById('btnApplyIaDiagnosticScript');
            if (applyScriptBtn) {
                applyScriptBtn.addEventListener('click', (ev) => {
                    const code = decodeURIComponent(escape(atob(ev.currentTarget.getAttribute('data-script'))));
                    window.propEditorInstance.setValue(code);
                    showToast('Script corrigido aplicado no nó!', 'success');
                    ev.currentTarget.remove();
                });
            }

            const applyJsonBtn = document.getElementById('btnApplyIaDiagnosticJson');
            if (applyJsonBtn) {
                applyJsonBtn.addEventListener('click', (ev) => {
                    const code = decodeURIComponent(escape(atob(ev.currentTarget.getAttribute('data-json'))));
                    window.editorInstance.setValue(code);
                    if (typeof window.parseJSONToFlowchart === 'function') {
                        window.parseJSONToFlowchart();
                    }
                    showToast('Configuração JSON corrigida aplicada!', 'success');
                    ev.currentTarget.remove();
                });
            }

        } catch (err) {
            hideTyping();
            addMessage(`Falha ao diagnosticar erros: ${err.message}`, 'system');
        }
    }

    // Chat submit event
    async function handleChatSubmit() {
        const text = inputField.value.trim();
        if (!text) return;

        inputField.value = '';
        addMessage(text, 'user');

        const textLower = text.toLowerCase();

        // Smart dispatcher
        if (textLower.includes('gerar') || textLower.includes('mapear') || textLower.includes('fluxo') || textLower.includes('config')) {
            await executarGeracaoFluxo(text);
        } else if (textLower.includes('sanitizar') || textLower.includes('limpar') || textLower.includes('formatar')) {
            await executarSugestaoSanitizacao(text);
        } else {
            // Generico / Diagnostico / Conversa
            await executarDiagnosticoErro(text);
        }
    }

    sendBtn.addEventListener('click', handleChatSubmit);
    inputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleChatSubmit();
        }
    });
};

