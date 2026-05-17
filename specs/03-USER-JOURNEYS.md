# SPEC — Jornadas do Usuário
## Documento: 03-USER-JOURNEYS.md

---

## 1. Jornada do Corretor

### 1.1. Login SaaS (Universal)
1. O usuário acessa a página de login única.
2. Insere e-mail e senha.
3. O sistema valida as credenciais e identifica a qual **Empresa** o usuário pertence.
4. Carrega o ambiente (logo, cores, dados) isolado daquela empresa.
5. Se for o primeiro acesso, solicita a troca de senha obrigatória.

### 1.2. Consulta de Saldo e Performance
1. Acessa o Dashboard.
2. Visualiza Cards de Saldo (Disponível, Pendente, Total).
3. Rola para ver o Extrato de movimentações recentes.
4. Filtra transações por período ou status.

### 1.3. Apoio à Cobrança
1. Clica na seção "Pendências / Boletos em Aberto".
2. Visualiza lista de clientes com pagamentos atrasados.
3. Vê quanto em Talentos "liberaria" se aquele pagamento fosse feito.

### 1.4. Resgate de Prêmios (E-commerce Light)
1. **Navegação:** Acessa a "Loja de Prêmios" com vitrine organizada por categorias.
2. **Seleção:** Clica em um prêmio para ver detalhes (descrição completa, fotos extras e estoque).
3. **Checkout:**
   - Clica em "Resgatar".
   - **Opções de Entrega:** Escolhe entre:
     - *Entregar no meu Endereço:* Preenche/confirma endereço completo.
     - *Entrega a Combinar:* Sinaliza que tratará a retirada/recebimento com o RH/Admin.
4. **Confirmação:** Sistema valida o saldo e debita os talentos como "Bloqueados".
5. **Acompanhamento:** Recebe notificações de mudança de status (Solicitado -> Em Separação -> Enviado/Disponível para Retirada).

---

## 2. Jornada do Administrador

### 2.1. Gestão de Usuários
1. Cadastra novos corretores ou importa em lote.
2. Ativa/Desativa acesso de usuários.

### 2.2. Importação de Dados Financeiros (Em Lote)
1. Faz upload de arquivo CSV/Excel de recebíveis.
2. Mapeia colunas (se necessário).
3. Sistema processa e gera créditos/atualizações de status automaticamente.

### 2.3. Lançamento Manual de Talentos
1. Acessa a tela "Lançamento Manual".
2. Busca o Corretor pelo nome, e-mail ou CPF.
3. Insere o valor em Talentos (Positivo para crédito extra, Negativo para estorno/ajuste).
4. Preenche o campo obrigatório "Justificativa" (ex: Bônus por meta, Erro na planilha).
5. Confirma a operação. O saldo "Disponível" do corretor é atualizado imediatamente.

### 2.4. Gestão de Prêmios (Painel E-commerce)
1. **Catálogo:** Cadastra prêmios com múltiplas fotos, categorias e tags (ex: "Destaque").
2. **Estoque:** Gerencia quantidade disponível.
3. **Fila de Pedidos:** 
   - Visualiza solicitações de resgate com a preferência de entrega.
   - Atualiza status e insere informações de rastreio ou instruções para "Entrega a Combinar".

