# Guia de Implantação e Deploy em Produção (SaaS)
## Documento: 15-PRODUCTION-DEPLOYMENT-GUIDE.md

> **Versão:** 1.0 | **Data:** 2026-05-27  
> **Status:** Aprovado  
> **Finalidade:** Fornecer o roteiro operacional definitivo de implantação em servidores de produção reais do ecossistema V-Talentos SaaS, documentando a transição de banco de dados, variáveis de ambiente, servidores proxy e a resolução dinâmica de endpoints.

---

> [!IMPORTANT]
> **REGRA DE GOVERNANÇA E MANUTENÇÃO (IA-GOVERNANCE):**
> Este arquivo é o manual operacional de produção e deploy do ecossistema. Qualquer modificação nas estratégias de infraestrutura, alteração de dependências globais, novos hosts de API ou processos de deploy do V-Talentos **DEVE** obrigatoriamente atualizar este documento `specs/15-PRODUCTION-DEPLOYMENT-GUIDE.md` para preservar a integridade das operações.

---

## 🏢 1. Visão Geral da Arquitetura de Produção
O ecossistema V-Talentos SaaS é estruturado de forma desacoplada em duas camadas independentes:
1. **Frontend (Interface do Usuário):** Composto estritamente por arquivos estáticos limpos (HTML, CSS, JS Vanilla). Pode ser servido de forma extremamente rápida por redes CDN globais.
2. **Backend (API de Microsserviços):** Aplicação executada em Node.js sob Express, que gerencia as regras de negócio, tabelas multi-tenant e integrações com Stripe/Asaas.

---

## 🗄️ 2. Transição do Banco de Dados (SQLite para PostgreSQL)
No desenvolvimento local, a plataforma utiliza **SQLite** (`database.sqlite`) gravado em arquivo local. 
*   **Para Produção:** O recomendado para isolamento multi-tenant robusto e concorrência massiva de conexões é o uso do **PostgreSQL**.
*   **Compatibilidade Knex:** O projeto utiliza o construtor de consultas **Knex.js**, o que significa que o código-fonte e as queries são 100% compatíveis e portáveis entre SQLite e PostgreSQL sem requerer nenhuma refatoração de código!

### Ações para Inicialização do Banco em Produção:
1. Instancie um banco de dados PostgreSQL na nuvem (ex: AWS RDS, Supabase, Neon ou VPS privada).
2. Configure as credenciais de conexão no arquivo `.env` de produção (conforme seção 3).
3. Na raiz do projeto no servidor de produção, execute as migrações para criar toda a estrutura multi-tenant automaticamente:
   ```bash
   npx knex migrate:latest
   ```
4. Em seguida, execute o comando utilitário de inicialização para cadastrar com segurança o primeiro usuário `SUPER_ADMIN` e as configurações gerais de SaaS (sem alterar nenhum dado existente se o banco já estiver povoado):
   ```bash
   npm run db:init-admin
   ```
   **Credenciais Padrão Criadas:**
   * **E-mail:** `super@plataforma.com.br` (configurável pela variável `.env` `INITIAL_SUPER_ADMIN_EMAIL`)
   * **Senha:** `123456` (configurável pela variável `.env` `INITIAL_SUPER_ADMIN_PASSWORD`)

   > [!IMPORTANT]
   > Faça login imediatamente utilizando as credenciais acima e altere a senha na página **Meu Perfil** para garantir a segurança da sua implantação!


---

## 🔑 3. Variáveis de Ambiente do Servidor (`.env`)
No ambiente de produção, configure as variáveis no arquivo `.env` localizado no diretório raiz do backend. **Nunca exponha ou comite estas credenciais:**

```env
# Ambiente Geral
NODE_ENV=production
PORT=8080

# Segurança (Segredo JWT de Alta Entropia)
JWT_SECRET=INSIRA_UM_HASH_DE_ALTA_SEGURANCA_DE_MINIMO_32_CARACTERES

# Conexão PostgreSQL
DB_CLIENT=pg
DB_HOST=seu-banco-pg.rds.amazonaws.com
DB_PORT=5432
DB_USER=usuario_prod
DB_PASSWORD=senha_ultra_segura
DB_NAME=vtalentos_prod
```

---

## ⚙️ 4. Deploy e Hospedagem do Backend (API Node.js)
A API Node.js deve rodar em um servidor estável (ex: VPS Linux Ubuntu na DigitalOcean, Linode ou AWS EC2).

### A. Gerenciador de Processos (PM2)
Utilize o **PM2** para manter o serviço da API rodando de forma ininterrupta, garantindo reinicialização em caso de falhas ou reboot do servidor:
```bash
# Instalação Global do PM2
npm install -g pm2

# Inicialização da API Backend
pm2 start src/backend/app.js --name "vtalentos-api"

# Configuração para salvar estado e rodar no boot do sistema
pm2 save
pm2 startup
```

### B. Proxy Reverso (Nginx) + SSL (HTTPS)
Os webhooks de produção da Stripe e do Asaas exigem tráfego sob HTTPS seguro. Configure o **Nginx** como proxy reverso para receber as conexões externas na porta 80/443 e redirecioná-las internamente para a porta do Node.js (ex: `8080`):

1. **Estrutura básica de configuração do Nginx (`/etc/nginx/sites-available/vtalentos`):**
   ```nginx
   server {
       listen 80;
       server_name api.seudominio.com;

       location / {
           proxy_pass http://localhost:8080;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
2. **Criptografia SSL (Let's Encrypt):**
   Gere certificados SSL gratuitos em menos de 1 minuto usando o **Certbot**:
   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   sudo certbot --nginx -d api.seudominio.com
   ```

---

## 🌐 5. Deploy do Frontend & Resolução Dinâmica de Host
Por ser composto de arquivos estáticos, o frontend pode ser hospedado em CDNs modernas (Netlify, Vercel, Cloudflare Pages ou AWS S3).

### A. Zero Configuração de API (O Interceptor Global)
Anteriormente, as páginas HTML faziam requisições estáticas para `http://localhost:3001/api`. Para resolver isso de forma robusta e transparente sem precisar reescrever as páginas, implementamos um **Interceptor Global de API** em [auth.js](file:///c:/Pasta%20de%20Trabalho/Projetos/Node/Premios/src/frontend/assets/js/auth.js):

*   **Comportamento Dinâmico:** O script detecta automaticamente se o usuário está rodando em `localhost` (ativando o backend local na porta `3001`).
*   **Redirecionamento em Produção:** Se a aplicação for servida em qualquer outro host público (ex: `https://app.vtalentos.com`), o interceptor reescreve automaticamente e em tempo de execução todas as URLs de requisição estáticas para apontar para a rota de produção `/api` relativa ao próprio host (ex: `https://app.vtalentos.com/api`).
*   **Sem Ação Requerida:** Você não precisa alterar nenhuma das chamadas `fetch` dentro das páginas HTML individuais. O deploy é imediato e ajusta-se de forma 100% reativa e automática!

---

## 💳 6. Transição dos Gateways em Produção (Stripe & Asaas)
Uma vez que o backend e frontend públicos estejam rodando seguros sob HTTPS:

1. **Credenciais Reais:** Faça login como Super-Admin em `super-provedores.html` e insira as chaves reais de Produção/Live obtidas nos painéis oficiais dos gateways (Stripe `sk_live_...` e Asaas `api_key` de produção).
2. **Endpoints de Produção:** No painel da Stripe e do Asaas, configure as URLs dos webhooks de produção reais:
   * **Stripe:** `https://api.seudominio.com/api/webhooks/stripe`
   * **Asaas:** `https://api.seudominio.com/api/webhooks/asaas`
3. **Webhook Secrets:** Atualize os respectivos segredos de assinatura (`webhook_secret`) de produção no painel do Super Admin para validar a integridade dos callbacks em produção.
