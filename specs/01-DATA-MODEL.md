# SPEC — Modelo de Dados
## Documento: 01-DATA-MODEL.md

---

## 1. Entidades Principais (Padrão SaaS Multi-Tenant)

### 1.0. `GamEmpresa` (Tenant)
Entidade master que isola todos os dados do sistema.
- `id`: UUID (PK)
- `nome`: String (Ex: "Construtora Haja")
- `slug`: String (Identificador único para URL/Login)
- `logo_url`: String
- `cor_primaria`: String (Hexadecimal para personalização do tema)
- `status`: Enum (`ATIVO`, `SUSPENSO`, `CANCELADO`)
- `data_adesao`: DateTime

### 1.1. `GamCorretor` (Vendedores)
- `id`: UUID / INT (PK)
- `empresa_id`: FK -> `GamEmpresa`
- `nome`: String
- `email`: String (Unique)
- `senha_hash`: String
- `cpf`: String
- `equipe`: String (Opcional)
- `saldo_disponivel`: Decimal (Total pronto para resgate)
- `saldo_a_receber`: Decimal (Total de vendas não pagas)
- `data_cadastro`: DateTime

### 1.2. `GamTransacao` (Extrato)
Registro detalhado de cada entrada e saída de talentos.
- `id`: UUID / INT (PK)
- `empresa_id`: FK -> `GamEmpresa`
- `corretor_id`: FK -> `GamCorretor`
- `tipo`: Enum (`CREDITO`, `DEBITO`)
- `valor`: Decimal (Em Talentos)
- `valor_original_rs`: Decimal (Opcional, para rastreabilidade)
- `status`: Enum (`PENDENTE`, `COMPENSADO`, `CANCELADO`, `RESGATADO`)
- `data_vencimento`: DateTime (Essencial para o widget de Futuros Ganhos)
- `empreendimento`: String (Ex: "Park View Residencial")
- `unidade`: String (Ex: "Apto 5 - 12º Piso")
- `contato_cliente`: String (Telefone/E-mail para apoio à cobrança)
- `origem_id`: String (ID da Venda ou Boleto na planilha de origem)
- `descricao`: String (Ex: "Venda Lote 04 - Cliente João")
- `data_movimentacao`: DateTime
- `data_compensacao`: DateTime (Preenchido quando o boleto é pago)

### 1.3. `GamPremio` (Catálogo)
- `id`: UUID / INT (PK)
- `empresa_id`: FK -> `GamEmpresa`
- `nome`: String
- `descricao`: Text
- `valor_talentos`: Decimal
- `categoria`: String (Ex: "Eletrônicos", "Experiências")
- `estoque`: Int
- `imagens`: JSON / String (Array de URLs para suportar múltiplas fotos)
- `tags`: String (Ex: "Destaque", "Novidade")
- `ativo`: Boolean

### 1.4. `GamResgate` (Trocas Realizadas)
- `id`: UUID / INT (PK)
- `empresa_id`: FK -> `GamEmpresa`
- `corretor_id`: FK -> `GamCorretor`
- `premio_id`: FK -> `GamPremio`
- `status`: Enum (`SOLICITADO`, `APROVADO`, `ENTREGUE`, `RECUSADO`, `DISPONIVEL_RETIRADA`)
- `tipo_entrega`: Enum (`ENDERECO`, `A_COMBINAR`)
- `dados_entrega`: Text (Endereço completo ou instruções de contato)
- `data_solicitacao`: DateTime
- `observacoes_admin`: Text

---

## 2. Regras de Integridade
- **RN-D01:** Nenhuma transação pode ser deletada. Para correções, deve-se criar uma transação de estorno (débito/crédito corretivo).
### 1.5. `GamConfigImportacao` (Perfis de Mapeamento)
- `id`: UUID / INT (PK)
- `empresa_id`: UUID (FK -> GamEmpresa)
- `nome_perfil`: String (Ex: "Padrão Park View")
- `mapeamento_json`: Text / JSON (Ex: `{"corretor_id": "Corretor Responsável", "valor": "Valor Pago Atual"}`)
- `separador_multiplo`: String (Ex: "|") - Usado para dividir datas de balões/reforços na mesma célula.
- `linha_cabecalho`: Int (Linha onde estão os títulos das colunas)
- `data_criacao`: DateTime
