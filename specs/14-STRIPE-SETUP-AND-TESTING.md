# Guia Prático: Configuração e Testes do Provedor Stripe
## Documento: 14-STRIPE-SETUP-AND-TESTING.md

> **Versão:** 1.0 | **Data:** 2026-05-27  
> **Status:** Aprovado  
> **Finalidade:** Fornecer um guia operacional passo a passo para configuração de credenciais, registro de webhooks no portal e execução de simulações com o gateway Stripe no ecossistema V-Talentos.

---

> [!IMPORTANT]
> **REGRA DE GOVERNANÇA E MANUTENÇÃO (IA-GOVERNANCE):**
> Este arquivo é um guia operacional e de testes. Qualquer modificação nos fluxos de testes locais, alteração nos endpoints de webhook ou atualização nos procedimentos operacionais da Stripe **DEVE** obrigatoriamente atualizar este documento `specs/14-STRIPE-SETUP-AND-TESTING.md` para preservar a integridade sistêmica.

---

## 🛠️ PARTE 1: Configuração do Provedor no Sistema

### Passo 1: Acessar o Portal como Super-Admin
1. Inicie a aplicação executando `npm run dev` no terminal (caso já não esteja executando).
2. Acesse a aplicação no seu navegador: [http://localhost:3000](http://localhost:3000).
3. Faça login com a conta de **Super Admin**:
   * **E-mail:** `super@plataforma.com.br`
   * **Senha:** `admin123` *(ou a senha padrão do seu banco local)*.

### Passo 2: Cadastrar/Atualizar as credenciais do Stripe
1. No menu lateral, sob a seção **Super Admin**, clique em **💳 Provedores de Pagamento** (ou acesse diretamente em `super-provedores.html`).
2. Localize o card correspondente ao **Stripe** ou clique no botão **"➕ Adicionar Provedor"** se for criar do zero.
3. Preencha os campos com as informações obtidas do painel de desenvolvedor da Stripe:
   * **Tipo de Provedor:** Selecione `STRIPE`.
   * **Chave Pública (`public_key`):** Cole a sua chave pública (começa com `pk_test_...` para Sandbox ou `pk_live_...` para Produção).
   * **Chave Secreta (`secret_key`):** Cole a sua chave secreta (começa com `sk_test_...` para Sandbox ou `sk_live_...` para Produção).
   * **Webhook Secret (`webhook_secret`):** Insira a chave de assinatura de endpoint obtida no painel da Stripe (começa com `whsec_...`). *Se estiver testando inicialmente sem webhook ativo, pode deixar em branco e utilizar a simulação local.*
4. Clique em **Salvar Configurações**. A plataforma gravará os dados de forma segura na tabela `GamSaaSConfig`.

---

## 🔗 PARTE 2: Configuração do Webhook no Painel da Stripe

Para que as baixas de faturas e renovações de assinatura ocorram automaticamente após o pagamento no checkout seguro, você deve registrar o webhook.

> [!NOTE]
> Se você estiver rodando o sistema apenas localmente (`localhost`), o servidor da Stripe não conseguirá alcançar a sua máquina a menos que você utilize uma ferramenta de tunelamento como o **ngrok** (ex: `ngrok http 3001`) ou utilize a ferramenta oficial **Stripe CLI** para repasse local.

1. Acesse o seu painel de desenvolvedor da Stripe em **[https://dashboard.stripe.com](https://dashboard.stripe.com)**.
2. Certifique-se de ativar o botão **"Test Mode"** (Modo de Teste) no canto superior direito para trabalhar em Sandbox.
3. Vá para a aba **Developers** (Desenvolvedores) -> **Webhooks**.
4. Clique em **"Add endpoint"** (Adicionar endpoint) e configure:
   * **Endpoint URL:** `https://<seu-dominio-ou-link-ngrok>/api/webhooks/stripe`
   * **Select events to listen to:** Adicione o evento `checkout.session.completed` e `charge.succeeded`.
5. Clique em **Add endpoint**.
6. Na tela do webhook criado, localize a seção **Signing secret** (Segredo de assinatura) e clique em **Reveal** (Revelar).
7. Copie o token iniciado com `whsec_...` e cole-o no campo **Webhook Secret** no painel de Provedores do V-Talentos (Passo 2).

---

## 🧪 PARTE 3: Como Testar a Integração Localmente (Simulador)

Nós construímos um **simulador nativo de webhook** que permite validar a quitação e a renovação de licenças sem a necessidade de instalar ferramentas externas ou expor túneis públicos.

Siga as instruções passo a passo para testar:

### Passo 1: Localizar o ID de uma Fatura Pendente
1. Acesse o sistema como Administrador da Empresa.
2. Vá em **Faturamento SaaS** e crie uma fatura pendente clicando em **"Comprar +30 Dias"**.
3. Copie o **ID (UUID)** da fatura recém-criada (ex: `a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6`).

### Passo 2: Disparar o Callback Simulado (via Postman ou cURL)
Dispare uma requisição HTTP do tipo `POST` para simular o recebimento do callback de sucesso da Stripe:

*   **URL:** `http://localhost:3001/api/webhooks/stripe`
*   **Método:** `POST`
*   **Headers (Cabeçalhos):**
    *   `Content-Type: application/json`
    *   `x-simulado: true` *(Header obrigatório que ativa o modo de teste simulado sem assinatura real)*
*   **Corpo da Requisição (Body - JSON):**
    ```json
    {
      "type": "checkout.session.completed",
      "data": {
        "object": {
          "id": "cs_test_simulado_999",
          "client_reference_id": "INSIRA_AQUI_O_ID_DA_FATURA_COPIADO"
        }
      }
    }
    ```

### Passo 3: Confirmar o Recebimento e Liberação
Se as credenciais e parâmetros estiverem corretos, a API do backend retornará:
```json
{
  "success": true,
  "message": "Fatura liquidada com sucesso"
}
```

Acesse o portal e valide os seguintes impactos:
1. **Quitação de Fatura:** O status da fatura mudou instantaneamente para `PAGA`.
2. **Prorrogação Cumulativa:** A data de expiração da licença da empresa foi estendida em **+30 dias** com segurança transacional.
3. **Idempotência:** Ao reenviar a mesma requisição, o sistema retornará `{"success": true, "message": "Fatura já estava paga"}` com status `200`, prevenindo fraudes ou duplicidade de ativação.
