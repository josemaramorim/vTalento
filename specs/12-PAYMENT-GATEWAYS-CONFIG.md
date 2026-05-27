# SPEC — Configuração e Integração de Provedores de Pagamento (Stripe & Asaas)
## Documento: 12-PAYMENT-GATEWAYS-CONFIG.md

> **Versão:** 1.0 | **Data:** 2026-05-27  
> **Status:** Aprovado  
> **Finalidade:** Definir contratos, credenciais, configurações e fluxos operacionais dos gateways Stripe e Asaas no ecossistema SaaS V-Talentos.

---

> [!IMPORTANT]
> **REGRA DE GOVERNANÇA E MANUTENÇÃO (IA-GOVERNANCE):**
> Este arquivo é uma especificação de governança e configuração de alto nível. Qualquer modificação, refatoração, inclusão de novos provedores ou alteração nas credenciais e lógica de comunicação com Stripe e Asaas **DEVE** obrigatoriamente atualizar este documento `specs/12-PAYMENT-GATEWAYS-CONFIG.md` antes de qualquer alteração de código fonte, em conformidade com as regras de SPEC-First de `specs/06-IA-GOVERNANCE.md`.

---

## 1. Gateway 1: Stripe API
A Stripe é o principal provedor de pagamentos globais para faturamento por cartões de crédito e assinaturas recorrentes de forma síncrona/assíncrona.

### A. Credenciais e Chaves de Acesso
A autenticação do backend com a API da Stripe é realizada via cabeçalho HTTP de token portador:
`Authorization: Bearer <SECRET_KEY>`

*   **`secret_key` (Chave Secreta):** Começa com `sk_test_...` (Sandbox) ou `sk_live_...` (Produção). Utilizada exclusivamente no backend para instanciar a SDK e gerar sessões de checkout seguros. **Nunca deve ser exposta no frontend.**
*   **`public_key` (Chave Pública):** Começa com `pk_test_...` (Sandbox) ou `pk_live_...` (Produção). Utilizada no frontend para carregar os componentes seguros de checkout (Stripe Elements).
*   **`webhook_secret` (Segredo de Assinatura):** Começa com `whsec_...`. Gerado ao criar um webhook no painel da Stripe. Utilizado pelo backend no processamento de callbacks para validar a assinatura criptográfica e integridade dos dados enviados.

### B. Mapeamento de Ambientes (Sandbox vs Produção)
*   **Sandbox (Modo de Testes):** Ativado automaticamente pelo uso de chaves iniciadas com `sk_test_` e `pk_test_`. Permite transacionar utilizando cartões falsos de teste padrão (ex: `4242 4242 4242 4242`).
*   **Produção (Modo Real):** Ativado automaticamente pelo uso de chaves com prefixo `sk_live_` e `pk_live_`.

### C. Segurança de Webhooks (Signature Verification)
O endpoint de callback da Stripe (`POST /api/webhooks/stripe`) processa eventos do tipo `checkout.session.completed` ou `charge.succeeded`.
*   O backend lê a assinatura enviada no header `stripe-signature`.
*   A validação é feita via SDK da Stripe reconstruindo o body bruto (`req.rawBody`) com a assinatura e o `webhook_secret`.
*   **Bypass Sandbox:** Caso o segredo não esteja configurado e o header `x-simulado === 'true'` seja enviado, o backend aceita o callback sem assinatura para facilitar testes locais rápidos.

---

## 2. Gateway 2: Asaas API
O Asaas é uma fintech brasileira focada na simplificação de cobranças locais, oferecendo suporte nativo para **Pix** e **Boleto Bancário**.

### A. Credenciais e Chaves de Acesso
A autenticação com o Asaas utiliza cabeçalhos de requisição customizados:
`access_token: <API_KEY>`

*   **`api_key` (Access Token API):** Token gerado nas configurações da conta no painel do Asaas. **Nunca deve ser exposto no frontend.**
*   **`webhook_secret` (Token do Webhook):** String customizada e secreta definida por você nas configurações de integração de webhook do Asaas e comparada no backend do V-Talentos.
*   **`ambiente` (Host Endpoint):** Parâmetro arbitrário de controle de ambiente do adaptador:
    *   `sandbox` (Ambiente de Testes): Aponta para `https://sandbox.asaas.com/api/v3`
    *   `producao` (Ambiente Real): Aponta para `https://api.asaas.com/v3`

### B. Mapeamento de Ambientes (Sandbox vs Produção)
*   Diferente da Stripe, o Asaas possui painéis corporativos e credenciais 100% isolados entre os dois ambientes:
    *   **Contas Sandbox:** Acessadas por `https://sandbox.asaas.com`
    *   **Contas Produção:** Acessadas por `https://app.asaas.com`
*   O `AsaasAdapter.js` mapeia automaticamente a URL base da requisição de acordo com o valor da chave `ambiente` configurada.

### C. Segurança de Webhooks (Access Token Check)
O endpoint de callback do Asaas (`POST /api/webhooks/asaas`) escuta eventos do tipo `PAYMENT_RECEIVED` ou `PAYMENT_CONFIRMED`.
*   A segurança é verificada comparando o token estático enviado no cabeçalho `asaas-access-token` contra o `webhook_secret` cadastrado no banco.
*   **Bypass Sandbox:** Da mesma forma, aceita o header de simulação local `x-simulado === 'true'` se o segredo estiver omitido.

---

## 3. Comparativo de Integração Técnico

| Característica | Stripe | Asaas |
| :--- | :--- | :--- |
| **Principal Método** | Cartão de Crédito | Pix e Boleto Bancário |
| **Padrão de Autenticação** | Bearer Token (`Authorization`) | Token Customizado (`access_token`) |
| **Ambiente de Teste** | Sandbox integrado na mesma conta | Painéis e Contas 100% Separados |
| **Verificação do Webhook** | Assinatura Criptográfica via Header | Token Estático Simples via Header |
| **Moeda Nativa** | Multicurrency (Global) | Real Brasileiro (BRL) |

---

## 4. Estrutura do Banco de Dados SaaS (GamSaaSConfig)
As configurações de credenciais de todos os provedores da plataforma são centralizadas no banco de dados na tabela `GamSaaSConfig` sob a chave `provedores_pagamento_json` no seguinte contrato estrutural JSON:

```json
[
  {
    "id": "stripe-uuid",
    "tipo": "STRIPE",
    "status": "ATIVO",
    "configuracoes": {
      "public_key": "pk_test_...",
      "secret_key": "sk_test_...",
      "webhook_secret": "whsec_..."
    }
  },
  {
    "id": "asaas-uuid",
    "tipo": "ASAAS",
    "status": "ATIVO",
    "configuracoes": {
      "api_key": "...",
      "webhook_secret": "...",
      "ambiente": "sandbox"
    }
  }
]
```

Administradores Super-Admin gerenciam estes dados no painel `super-provedores.html` e a classe `PaymentFactory.js` carrega dinamicamente os adaptadores de acordo com a configuração atual.
