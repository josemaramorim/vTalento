# Especificações Técnicas - V-Talentos

## 1. Visão Geral
Aplicação de gamificação para incentivar a performance de vendas. O sistema converte vendas realizadas e confirmadas em "Talentos" (nome substituto para moedas), que podem ser trocados por prêmios. A aplicação foca inicialmente em construtoras, mas é adaptável a outros nichos.

## 2. Terminologia
- **Talentos (V-Talentos):** Unidade de medida da gamificação (antigamente referida como moedas).
- **Saldo Disponível:** Talentos que já podem ser trocados por prêmios (vendas pagas).
- **Saldo a Receber:** Talentos vinculados a vendas realizadas, mas cujos pagamentos (boletos) ainda não foram compensados.
- **Talentos Não Compensados:** Talentos de vendas com boletos atrasados ou não pagos, servindo como alerta para o corretor atuar na cobrança.
- **Resgate (Saque):** Ação de trocar Talentos por prêmios.

## 3. Papéis do Usuário

### 3.1. Corretor (Usuário Final)
- **Login:** Acesso via CPF/E-mail e senha.
- **Dashboard:** Visão geral do saldo (Disponível, Recebido, A Receber).
- **Extrato:** Lista detalhada de movimentações (vendas que geraram talentos, resgates realizados).
- **Área de Cobrança (Não Compensados):** Visualização de boletos pendentes de seus clientes para auxílio na cobrança.
- **Catálogo de Prêmios:** Visualização e solicitação de troca de talentos.

### 3.2. Administrador (Gestor)
- **Gestão de Usuários:** Cadastro, edição e bloqueio de corretores.
- **Gestão de Movimentações:** Auditoria de créditos e débitos de talentos.
- **Importação de Dados:** Interface para upload/integração com a planilha de recebíveis.
- **Gestão de Prêmios:** Cadastro de prêmios e aprovação de resgates.

## 4. Funcionalidades Principais

### 4.1. Dashboard do Corretor
- Gráficos/Cards com saldos.
- Extrato tipo bancário.
- Alertas de boletos não pagos (Talentos não compensados).

### 4.2. Integração de Vendas
- O sistema processará uma fonte de dados (ex: planilha de recebíveis).
- Cada linha de pagamento confirmado gera um crédito proporcional em Talentos.
- Pagamentos pendentes geram saldo "A Receber".

### 4.3. Painel Administrativo
- Controle total sobre o ecossistema.
- Relatórios de performance por corretor/equipe.

## 5. Requisitos Técnicos Iniciais
- **Frontend:** Interface moderna, responsiva e com estética "premium".
- **Backend:** Node.js para processamento das regras de negócio e integrações.
- **Banco de Dados:** Relacional (PostgreSQL ou MySQL) para garantir a integridade dos extratos.
- **Segurança:** Autenticação JWT e criptografia de senhas.

## 6. Fluxo de Gamificação
1. **Venda Realizada:** O sistema registra a venda e o valor "A Receber".
2. **Pagamento Confirmado:** O valor migra para "Saldo Disponível".
3. **Boleto Atrasado:** O valor aparece como "Não Compensado".
4. **Troca:** O corretor solicita um prêmio; o Admin aprova; o saldo é debitado.
