# CONTRATO DE EXECUÇÃO — IA VERSATUS

> 💡 **DICA PARA O USUÁRIO:** Se a IA parecer "esquecida", use o prompt em [specs/05-ONBOARDING-IA-PROMPT.md](file:///c:/Pasta%20de%20Trabalho/Projetos/Analises/Versatus/Versatus.Net8/specs/05-ONBOARDING-IA-PROMPT.md).

Este documento define o protocolo obrigatório para qualquer IA que atue no projeto **Versatus.Net8**. A falha em seguir este protocolo resultará em quebra de arquitetura e integridade do sistema.

---

## 1. O Ritual de Início (Obrigatório)

Antes de escrever qualquer linha de código, a IA **DEVE**:
1. Ler o Indice Geral (`specs/00-INDICE-GERAL.md`).
2. Ler as Regras Anti-Alucinação (`specs/03-REGRAS-ANTI-ALUCINACAO.md`).
3. Ler as Boas Práticas e Decisões de Coleções (`specs/decisoes/DEC-005-COLECOES-E-BOAS-PRATICAS.md`).
4. Ler a Decisão de ORM e Pureza de Domínio (`specs/decisoes/DEC-001-ORM.md`).
5. **Ler o Log de Progresso e Handoff (Seção 5 deste documento)** para saber o ponto exato de parada e evitar trabalho redundante.

---

## 2. Leis Fundamentais de Arquitetura

### A. Pureza de Domínio (Lei nº 1)
As classes na pasta `Domain/` (Entidades, Value Objects) devem ser **POCOs puras**.
- **PROIBIDO**: `using System.ComponentModel.DataAnnotations;`
- **PROIBIDO**: Atributos como `[Table]`, `[Column]`, `[Key]`, `[ForeignKey]`.
- **OBRIGATÓRIO**: Todo o mapeamento do banco de dados deve ser feito via **Fluent API** na camada de `Infrastructure`.

### B. SPEC-First (Lei nº 2)
A IA não "projeta" soluções. A IA **traduz** o legado baseado na SPEC do módulo.
- Se a SPEC diz "Tarefa 1.1", implemente APENAS a Tarefa 1.1.
- Não refatore, não limpe, não melhore o legado além do que a SPEC orienta.
- Em caso de ambiguidade: **PARE E PERGUNTE**.

### C. Git-First (Lei nº 3)
O controle de versão segue o fluxo estrito:
- Branch `main`: Código estável, merge apenas de tags de release.
- Branch `develop`: Integração de funcionalidades.
- Branches `feat/`, `fix/`, `docs/`: Trabalho isolado.
- **Merge**: Use `--no-ff` para manter o histórico de branches visível.

---

## 3. Padrões de Código (C# 12+)

- **Records**: Use `public sealed record` para DTOs, Commands, Queries e Value Objects.
- **Coleções**:
  - Exposição pública: `IReadOnlyList<T>`.
  - Interna de agregado: `List<T>` privada + `AsReadOnly()`.
  - **PROIBIDO**: Classes `*Lista` (legado).
- **Async/Await**: Todo I/O deve ser `async` e propagar o `CancellationToken`.
- **Fluxo de Erro**:
  - Use `Result<T>` e `ValidationResult` para erros de negócio esperados.
  - Exceções (`VersatusException`) somente para falhas críticas de infraestrutura ou invariantes.
  - **PROIBIDO**: Usar `try-catch` para controlar fluxo de negócio normal.

---

## 4. Como Responder ao Usuário

1. **Confirme a Branch**: Indique em qual branch você está operando.
2. **Cite a Task**: Indique qual seção da SPEC você está implementando.
3. **Prove com Código**: Mostre o arquivo criado e seu local.
4. **Resumo Git**: Informe os comandos de commit e merge realizados.
5. **Update do Log (OBRIGATÓRIO)**: Confirme que você detalhou o progresso na Seção 5 deste documento antes de encerrar.

---

**Cumpra estas regras e seremos parceiros. Ignore-as e você quebrará o Versatus.**

---

## 5. Log de Progresso e Handoff (Atualizado: 2026-04-28)

Este log serve para que a próxima instância da IA saiba exatamente onde o trabalho parou. **Ao finalizar sua sessão, atualize esta tabela.**

| Módulo Atual | Fase / Status | Task Atual | Branch Ativa | Observação Crítica |
| :--- | :--- | :--- | :--- | :--- |
| **MOD-01** | ✅ Concluído | 9.2 (Final) | `develop` | Framework Base e Infra base finalizados. |
| **MOD-02** | ✅ Concluído | 8.2 (Final) | `develop` | Domínio, Infra e Testes do AcessoGlobal integrados em develop. |

### Histórico Recente de Decisões:
- **2026-05-05 (Git):** Merge da branch `setup/acesso-global-project` para `develop` após aprovação do usuário.
- **2026-05-05 (AcessoGlobal):** Implementação de testes de integração com SQLite In-Memory para validar mapeamentos Fluent API e relacionamentos 1:1.
- **2026-05-05 (AcessoGlobal):** Criação do projeto de testes `Versatus.AcessoGlobal.Tests` utilizando xUnit, Moq e FluentAssertions.
- **2026-05-05 (AcessoGlobal):** Implementação de repositórios especializados (`Cliente`, `Fornecedor`, etc.) e serviços de validação de endereços.
- **2026-05-05 (AcessoGlobal):** Implementação do `EntidadeService` com lógica de geração de sequencial (via `IGeradorSequencial`) e validação de unicidade de CPF/CNPJ.
- **2026-05-05 (AcessoGlobal):** Finalização das especializações de papéis (Cliente, Fornecedor, Funcionario, Transportadora) com seus respectivos mappings Fluent API e enums originais.
- **2026-05-05 (AcessoGlobal):** Migração do `Cliente` (tabela `GloCliente`) com suporte a enums específicos (`SituacaoClienteSPC`, `TipoImovel`) e relacionamento 1:1 com `Entidade`.
- **2026-05-05 (AcessoGlobal):** Implementação da `Entidade` base preservando o padrão de papéis (roles) via booleano do legado para garantir compatibilidade com a tabela `GloEntidade`.
- **2026-05-05 (AcessoGlobal):** Adição explícita dos pacotes `Microsoft.EntityFrameworkCore` e `Microsoft.EntityFrameworkCore.Relational` ao projeto `Versatus.AcessoGlobal` para suportar mapeamentos Fluent API independentes.
- **2026-04-28 (Global):** Padronização total de nomenclatura para **Inglês** em todas as pastas físicas e namespaces (`Repositories`, `Context`, `Exceptions`). O `Versatus.Framework` foi totalmente refatorado.

### Próxima Ação Pendente:
- Iniciar **Tarefa 6.2 do MOD-02** (Implementar Fornecedor).
