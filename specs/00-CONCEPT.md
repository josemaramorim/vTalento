# SPEC — Conceito e Visão Geral
## Documento: 00-CONCEPT.md

---

## 1. O Produto
O **V-Talentos** é uma plataforma de gamificação voltada para a força de vendas, inicialmente focado no nicho de construtoras e imobiliárias. A ideia central é transformar o sucesso financeiro (vendas recebidas) em uma experiência de jogo onde corretores acumulam pontos para troca por prêmios.

## 2. Termos do Ecossistema

- **Empresa (Tenant):** Cada cliente (Construtora, Imobiliária, etc.) possui seu próprio ecossistema isolado. Dados, corretores e prêmios nunca se misturam.
- **Identificação SaaS (Login Universal):** O sistema identifica a Empresa à qual o usuário pertence no momento da autenticação.
- **Talento (V-Talento):** A unidade de valor. 1 Talento é gerado a partir de uma regra de conversão sobre o valor recebido em R$.
- **Vendedor / Corretor:** O usuário final que acumula talentos.
- **Resgate:** O ato de "comprar" um prêmio utilizando o saldo de talentos.
- **Movimentação:** Qualquer registro de entrada (crédito) ou saída (débito) de talentos.

## 3. Estados do Saldo

Para garantir transparência e incentivar a cobrança, o saldo é dividido em:
1. **Disponível:** Créditos provenientes de pagamentos já compensados pelo financeiro.
2. **A Receber:** Créditos vinculados a vendas realizadas, mas cujos boletos/parcelas ainda não venceram ou não foram pagos.
3. **Não Compensado:** Sub-estado do "A Receber" para boletos que já venceram e não foram pagos. O corretor visualiza isso para ajudar na cobrança.
4. **Resgatado:** Talentos que já foram utilizados em trocas.

## 4. Diferenciais de Valor
- **Fidelização:** O corretor se sente parte de um ecossistema de recompensas.
- **Redução de Inadimplência:** O corretor atua proativamente na cobrança para "liberar" seus talentos pendentes.
- **Gestão Centralizada:** O Admin tem visão total de quem são os melhores vendedores e o engajamento com os prêmios.
