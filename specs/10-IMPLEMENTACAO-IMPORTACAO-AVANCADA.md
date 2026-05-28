# SPEC — Implementação Importação Avançada (Campos Customizáveis, Identificador Extra e Redesign UI)

## 1. Contexto e Justificativa

A plataforma SaaS precisa suportar importação de planilhas para múltiplos segmentos, com flexibilidade para campos customizáveis, identificadores únicos de usuário e experiência de importação moderna, clara e escalável.

---

## 2. Requisitos Funcionais

### 2.1. Identificador Extra para Usuário (Corretor)
- Permitir mapear um campo extra (ex: CRECI, CPF, matrícula) além do nome do corretor.
- O campo extra é opcional, mas se mapeado, a busca do corretor será feita por Nome + Identificador.
- O campo extra é configurável por perfil de importação.
- Retrocompatibilidade: perfis antigos continuam funcionando apenas com nome.

### 2.2. Campos Customizáveis (Extras)
- Permitir que o admin adicione/remova campos extras no perfil de importação.
- Cada campo extra pode ser mapeado para uma coluna da planilha.
- Os dados dos campos extras serão armazenados em um campo JSON (ex: `dados_extras`) no lançamento/importação.
- APIs e frontend devem exibir e permitir consulta/exportação desses campos extras.

### 2.3. Redesign do Motor de Importação (UI/UX)
- Separar o fluxo de importação em 3 páginas independentes:
  1. Upload de Arquivo
  2. Preview dos Dados
  3. Confirmar Importação
- Cada página deve ser clara, confortável e com responsabilidade única.
- Permitir navegação entre etapas sem perda de dados (ex: localStorage, contexto).
- Usar modais/componentes para gerenciamento de perfis, mapeamento e campos extras.
- Layout responsivo, acessível e com feedback visual premium.

---

## 3. Requisitos Não Funcionais
- Manter retrocompatibilidade com perfis e importações antigas.
- Não quebrar integrações existentes.
- Seguir governança: toda alteração deve ser precedida de SPEC e tasks aprovadas.

---

## 4. Plano de Implementação

### 4.1. Atualizar Especificações
- [x] Detalhar campos extras e identificador em `specs/07-INTEGRATION-IMPORT.md` e `specs/01-DATA-MODEL.md`.
- [x] Adicionar wireframes/descrição do novo fluxo em `specs/04-UI-UX-DESIGN.md`.

### 4.2. Atualizar Plano de Tarefas
- [/] Criar tasks em `specs/08-IMPLEMENTATION-TASKS.md` para:
    - Adicionar campo identificador extra no perfil de importação.
    - Permitir configuração de campos extras customizáveis.
    - Refatorar backend para armazenar/expor campos extras.
    - Refatorar frontend em 3 páginas independentes.
    - Testes para todos os cenários (com/sem campo extra, campos customizados, navegação entre etapas).

### 4.3. Implementação
- [ ] Criar branch específica para cada macro-feature (ex: `feature/import-campos-extras`, `feature/import-ui-redesign`).
- [ ] Implementar backend e frontend conforme tasks aprovadas.
- [ ] Garantir cobertura de testes e documentação.

---

## 5. Observações Finais
- Toda evolução deve ser registrada nas SPECs antes de qualquer alteração de código.
- O fluxo de importação deve ser flexível, escalável e confortável para qualquer segmento de negócio.
- O sistema deve permitir evolução futura sem refatorações disruptivas.
