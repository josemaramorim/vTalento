# SPEC — Modelo de Dados
## Documento: 01-DATA-MODEL.md

---

## 1. Entidades Principais (Padrão SaaS Multi-Tenant)

### 1.0. `GamEmpresa` (Tenant)
Entidade master que isola todos os dados do sistema.
- `id`: UUID (PK)
- `nome`: String (Ex: "Construtora Haja")
- `slug`: String (Identificador único para URL/Login)
- `plano`: Enum (`ESSENCIAL`, `PROFISSIONAL`, `ENTERPRISE`)
- `limite_corretores`: Int (Baseado no plano)
- `logo_url`: String
- `cor_primaria`: String (Hexadecimal para personalização do tema)
- `status`: Enum (`ATIVO`, `SUSPENSO`, `CANCELADO`)
- `data_adesao`: DateTime

### 1.1. `GamUsuario` (Usuários / Corretores)
- `id`: UUID (PK)
- `empresa_id`: FK -> `GamEmpresa`
- `nome`: String
- `email`: String (Unique)
- `senha_hash`: String
- `cpf`: String (Opcional)
- `perfil`: Enum (`CORRETOR`, `ADMIN_EMPRESA`, `SUPER_ADMIN`)
- `saldo_disponivel`: Decimal (Total pronto para resgate)
- `saldo_a_receber`: Decimal (Total de vendas não pagas)
- `created_at`: DateTime
- `updated_at`: DateTime

### 1.2. `GamTransacao` (Extrato)
Registro detalhado de cada entrada e saída de talentos.
- `id`: UUID (PK)
- `empresa_id`: FK -> `GamEmpresa`
- `usuario_id`: FK -> `GamUsuario` (O corretor que recebe/debita)
- `admin_id`: FK -> `GamUsuario` (Opcional, admin que realizou lançamento manual)
- `tipo`: Enum (`CREDITO`, `DEBITO`, `ESTORNO`)
- `origem`: Enum (`MANUAL`, `IMPORTACAO`)
- `valor`: Decimal (Em Talentos)
- `valor_original_rs`: Decimal (Opcional, para rastreabilidade)
- `status`: Enum (`PENDENTE`, `COMPENSADO`, `CANCELADO`, `RESGATADO`)
- `data_vencimento`: DateTime (Essencial para o widget de Futuros Ganhos)
- `empreendimento`: String (Ex: "Park View Residencial")
- `unidade`: String (Ex: "Apto 5 - 12º Piso")
- `contato_cliente`: String (Telefone/E-mail para apoio à cobrança)
- `origem_id`: String (ID da Venda ou Boleto na planilha de origem)
- `justificativa`: String / Text (Para lançamentos manuais)
- `created_at`: DateTime
- `data_compensacao`: DateTime (Preenchido quando o boleto é pago)

### 1.3. `GamPremio` (Catálogo)
- `id`: UUID (PK)
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
- `id`: UUID (PK)
- `empresa_id`: FK -> `GamEmpresa`
- `usuario_id`: FK -> `GamUsuario` (O corretor que realiza o resgate)
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
- `id`: UUID (PK)
- `empresa_id`: UUID (FK -> GamEmpresa)
- `nome_perfil`: String (Ex: "Padrão Park View")
- `mapeamento_json`: Text / JSON (Ex: `{"corretor_identificador": "Nome Corretor", "valor_pago": "Valor da Parcela"}`)
- `separador_multiplo`: String (Ex: "|") - Usado para dividir datas de balões/reforços na mesma célula.
- `linha_cabecalho`: Int (Linha onde estão os títulos das colunas)
- `created_at`: DateTime
- `updated_at`: DateTime

---

## 3. Módulo de Vitrine e Prêmios (Tabelas do Banco - Fase 4)

Para manter a conformidade do domínio e isolamento Multi-Tenant rigoroso, as tabelas físicas deste módulo estão especificadas abaixo:

### 3.1. `Premio` (Catálogo de Recompensas)
- `id`: Integer (PK, Auto-incremento)
- `empresa_id`: UUID (FK -> `GamEmpresa.id`, Not Null) — garante o isolamento do tenant
- `titulo`: String (Not Null)
- `descricao`: Text (Nullable)
- `quantidade_disponivel`: Integer (Not Null, Default: 0)
- `custo_pontos`: Integer (Not Null, Default: 0)
- `ativo`: Boolean (Not Null, Default: true)
- `created_at`: DateTime
- `updated_at`: DateTime

### 3.2. `VitrineItem` (Camada de Exibição / Ordem)
- `id`: Integer (PK, Auto-incremento)
- `empresa_id`: UUID (FK -> `GamEmpresa.id`, Not Null) — garante o isolamento do painel e ordenação por tenant
- `premio_id`: Integer (FK -> `Premio.id`, Cascade, Not Null)
- `ordem`: Integer (Not Null, Default: 0)
- `ativo`: Boolean (Not Null, Default: true)

### 3.3. `Resgate` (Histórico de Trocas)
- `id`: Integer (PK, Auto-incremento)
- `usuario_id`: UUID (FK -> `GamUsuario.id`, Not Null)
- `premio_id`: Integer (FK -> `Premio.id`, Set Null)
- `quantidade`: Integer (Not Null, Default: 1)
- `custo_total`: Integer (Not Null, Default: 0)
- `status`: Enum (`pendente`, `confirmado`, `cancelado`, `falha`) (Default: `pendente`)
- `motivo`: Text (Nullable)
- `created_at`: DateTime
- `updated_at`: DateTime
