# Guia Prático: Configuração e Testes do Provedor Asaas
## Documento: 13-ASAAS-SETUP-AND-TESTING.md

> **Versão:** 1.0 | **Data:** 2026-05-27  
> **Status:** Aprovado  
> **Finalidade:** Fornecer um guia operacional passo a passo para configuração de credenciais, registro de webhooks e execução de simulações com o gateway Asaas no ecossistema V-Talentos.

---

> [!IMPORTANT]
> **REGRA DE GOVERNANÇA E MANUTENÇÃO (IA-GOVERNANCE):**
> Este arquivo é um guia operacional e de testes. Qualquer modificação nos fluxos de testes locais, alteração nos endpoints de webhook ou atualização nos procedimentos operacionais do Asaas **DEVE** obrigatoriamente atualizar este documento `specs/13-ASAAS-SETUP-AND-TESTING.md` para preservar a integridade sistêmica.

---

## 🛠️ PARTE 1: Configuração do Provedor no Sistema

### Passo 1: Acessar o Portal como Super-Admin
1. Inicie a aplicação executando `npm run dev` no terminal (caso já não esteja executando).
2. Acesse a aplicação no seu navegador: [http://localhost:3000](http://localhost:3000).
3. Faça login com a conta de **Super Admin**:
   * **E-mail:** `super@plataforma.com.br`
   * **Senha:** `123456` *(ou a senha padrão do seu banco local)*.

### Passo 2: Cadastrar/Atualizar as credenciais do Asaas
1. No menu lateral, sob a seção **Super Admin**, clique em **💳 Provedores de Pagamento** (ou acesse diretamente em `super-provedores.html`).
2. Localize o card correspondente ao **Asaas** ou clique no botão **"➕ Adicionar Provedor"** se for criar do zero.
3. Preencha os campos com as informações obtidas do painel do Asaas:
   * **Tipo de Provedor:** Selecione `ASAAS`.
   * **Ambiente:** Escolha `sandbox` para testes com dinheiro fictício (ou `producao` para chaves reais).
   * **API Key (`api_key`):** Cole a sua chave gerada no Asaas.
   * **Webhook Secret (`webhook_secret`):** Crie uma palavra-passe/token secreto seguro de sua escolha (ex: `meusegredoasaas123`). Copie este segredo, pois ele será usado para validar os webhooks.
4. Clique em **Salvar Configurações**. A plataforma gravará a chave de forma criptografada e segura no formato JSON da tabela `GamSaaSConfig`.

---

## 🔗 PARTE 2: Configuração do Webhook no Painel do Asaas

Para que as baixas ocorram de forma automática quando um cliente pagar uma fatura (via Pix ou Boleto), o painel do Asaas precisa saber para onde enviar a notificação.

> [!NOTE]
> Se você estiver rodando o sistema apenas em sua máquina local (`localhost`), o Asaas não conseguirá enviar dados diretamente para o seu computador a menos que você utilize uma ferramenta de tunelamento como o **ngrok** para expor a sua porta `3001` publicamente (ex: `ngrok http 3001`).

1. Acesse a sua conta de testes em **[https://sandbox.asaas.com](https://sandbox.asaas.com)**.
2. Vá em **Configurações da Conta** (ou Menu lateral) -> **Integrações** -> **Webhooks**.
3. Ative a fila de Webhook para **Cobranças** e configure:
   * **URL de Envio:** `https://<seu-dominio-ou-link-ngrok>/api/webhooks/asaas`
   * **Versão da API:** `V3`
   * **Token de Autenticação (`asaas-access-token`):** Insira exatamente o mesmo **Webhook Secret** que você configurou no Passo 2 (ex: `meusegredoasaas123`).
   * **Eventos para Envio:** Marque `Criada`, `Aguardando pagamento`, `Recebida` (ou `PAYMENT_RECEIVED`) e `Confirmada` (`PAYMENT_CONFIRMED`).
4. Clique em **Salvar**.

---

## 🧪 PARTE 3: Como Testar a Integração Localmente (Simulador)

Como expor um túnel ngrok pode requerer etapas adicionais, nós construímos uma **rota de simulação nativa** no V-Talentos que permite testar o webhook instantaneamente sem precisar expor portas na internet!

Para simular o pagamento de uma fatura e a prorrogação cumulativa de dias de uma empresa, siga o roteiro de testes abaixo:

### Passo 1: Localizar o ID de uma Fatura Pendente
Abra o banco local `database.sqlite` ou crie uma fatura de teste logado como administrador de uma empresa.
1. Vá para o painel da empresa em **Faturamento SaaS**.
2. Clique em **"Comprar +30 Dias"** para gerar uma fatura pendente.
3. Copie o **ID (UUID)** dessa fatura (você pode visualizá-lo na tabela ou puxando no banco local).
   * Exemplo de ID: `f1a2b3c4-d5e6-f7g8-h9i0-j1k2l3m4n5o6`

### Passo 2: Disparar o Callback Simulado (via Postman, Bruno ou cURL)
Abra uma ferramenta de requisições HTTP (Postman, Insomnia ou execute o comando cURL no terminal) e dispare uma requisição `POST` com a estrutura abaixo:

*   **URL:** `http://localhost:3001/api/webhooks/asaas`
*   **Método:** `POST`
*   **Headers (Cabeçalhos):**
    *   `Content-Type: application/json`
    *   `x-simulado: true` *(Header que ativa o bypass de assinatura criptográfica)*
    *   `asaas-access-token: meusegredoasaas123` *(O segredo que você configurou no provedor)*
*   **Corpo da Requisição (Body - JSON):**
    ```json
    {
      "event": "PAYMENT_CONFIRMED",
      "payment": {
        "id": "pay_asaas_simulado_999",
        "externalReference": "INSIRA_AQUI_O_ID_DA_FATURA"
      }
    }
    ```

### Passo 3: Verificar o Resultado no Painel
Se a requisição for enviada com sucesso, a API retornará:
```json
{
  "success": true,
  "message": "Fatura liquidada com sucesso"
}
```

Acesse o portal como Administrador da Empresa ou Super Admin e confirme os efeitos automáticos:
1. **Fatura Liquidada:** O status da fatura mudou instantaneamente de `PENDENTE` para `PAGA`.
2. **Prorrogação Cumulativa:** A data de expiração da licença da empresa foi estendida em **+30 dias** com precisão atômica.
3. **Desbloqueio reativo:** O status da empresa mudou para `ATIVO` e qualquer bloqueio anterior foi suspenso.

Se enviar a mesma requisição novamente, o sistema responderá `{"success": true, "message": "Fatura já estava paga"}`, comprovando a proteção contra duplicidade (idempotência).
