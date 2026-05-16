# SPEC — Regras de Gamificação
## Documento: 02-GAMIFICATION-RULES.md

---

## 1. Motor de Conversão (R$ -> Talentos)

A aplicação deve permitir a configuração da taxa de conversão.
- **Regra Padrão:** R$ 1.000,00 em vendas = 10 Talentos (Configurável por Admin).
- **Arredondamento:** Sempre arredondar para baixo (Floor) para evitar frações de talentos, a menos que especificado o contrário.

## 2. Ciclo de Vida do Talento

1. **Geração (Status: PENDENTE):**
   - Ocorre no momento da importação da planilha com a venda realizada.
   - O valor entra no saldo "A Receber".
   
2. **Compensação (Status: COMPENSADO):**
   - Ocorre quando o sistema detecta (via nova importação ou atualização) que o boleto/parcela foi pago.
   - O valor migra do saldo "A Receber" para o "Disponível".

3. **Inadimplência (Alerta: NÃO COMPENSADO):**
   - Se a `data_vencimento` do boleto < `data_atual` e o status continua `PENDENTE`.
   - O sistema deve destacar este registro visualmente no Dashboard do Corretor.

4. **Estorno (Status: CANCELADO):**
   - Se a venda for cancelada no financeiro, a transação correspondente é marcada como `CANCELADO` e os saldos são recalculados.

## 3. Regras de Resgate

- O corretor só pode solicitar prêmios cujo `valor_talentos` <= `saldo_disponivel`.
- Ao solicitar, o saldo disponível é "bloqueado" (débito preventivo) até que o Admin aprove ou recuse.
- Se recusado, o valor volta ao saldo disponível.
