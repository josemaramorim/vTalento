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
        if (data.error === 'USER_INACTIVE') {
            localStorage.removeItem('@VTalentos:token');
            localStorage.removeItem('@VTalentos:user');
            if (!window.location.pathname.includes('login.html')) {
                window.location.href = 'login.html?error=inactive';
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
                    if (!window.location.pathname.includes('fatura-vencida.html')) {
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

// Função global para Modal de Confirmação Premium Glassmorphism (Tarefa 17.6 / specs/06-IA-GOVERNANCE)
window.showConfirmModal = function(title, message, onConfirm, onCancel = null) {
    // Evita modais duplicados
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
                <a href="admin-importacao-upload.html" class="${activePage.startsWith('admin-importacao') ? 'active' : ''}" style="${activePage.startsWith('admin-importacao') ? 'color: var(--accent-primary) !important; font-weight: 600;' : ''}">📤 Importação Excel</a>
                <a href="admin-premios.html" class="${isPageActive('admin-premios.html') ? 'active' : ''}" style="${isPageActive('admin-premios.html') ? 'color: var(--accent-primary) !important; font-weight: 600;' : ''}">⚙️ Gerenciar Prêmios</a>
                <a href="admin-usuarios.html" class="${isPageActive('admin-usuarios.html') ? 'active' : ''}" style="${isPageActive('admin-usuarios.html') ? 'color: var(--accent-primary) !important; font-weight: 600;' : ''}">👥 Gestão de Corretores</a>
                <a href="admin-movimentacoes.html" class="${isPageActive('admin-movimentacoes.html') ? 'active' : ''}" style="${isPageActive('admin-movimentacoes.html') ? 'color: var(--accent-primary) !important; font-weight: 600;' : ''}">📈 Movimentações</a>
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
    if (window.location.pathname.includes('login.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
        document.body.setAttribute('data-theme', 'dark');
        
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('error') === 'inactive') {
            setTimeout(() => {
                if (window.showToast) {
                    window.showToast('Sua conta foi inativada. Entre em contato com o administrador.', 'error');
                }
            }, 200);
        }
        return;
    }

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
                            if (!window.location.pathname.includes('fatura-vencida.html') && !window.location.pathname.includes('login.html')) {
                                window.location.href = 'fatura-vencida.html';
                                return;
                            }
                        } else {
                            if (window.location.pathname.includes('fatura-vencida.html')) {
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
                        const titleEl = document.getElementById('welcomeText');
                        const subtitleEl = document.getElementById('dashboardSub');
                        const activeTitle = titleEl ? titleEl.innerText : '';
                        const activeSubtitle = subtitleEl ? subtitleEl.innerText : '';
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
