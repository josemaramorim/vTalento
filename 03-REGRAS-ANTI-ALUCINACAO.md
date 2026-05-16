# SPEC — Regras Anti-Alucinação
## Documento: 03-REGRAS-ANTI-ALUCINACAO.md

> **Versão:** 1.0 | **Data:** 2026-04-27  
> **Finalidade:** Conjunto de regras para garantir que a IA não invente nada durante a migração

---

## 1. O Problema

Modelos de linguagem (IA) tendem a:
- **Completar lacunas** com soluções "razoáveis" que podem não ser o que o sistema faz
- **Melhorar** código sem ser pedido, quebrando comportamentos existentes
- **Renomear** entidades ou colunas para seguir "boas práticas" novas
- **Simplificar** lógica de negócio sem entender o porquê ela é complexa
- **Inventar** campos ou métodos que "fazem sentido" mas não existem no legado

No contexto de migração de um ERP com **anos de produção**, qualquer dessas situações
pode causar bugs silenciosos difíceis de rastrear.

---

## 2. As 10 Regras

### REGRA 1 — Nomes de tabelas são sagrados
**Nunca renomear** nomes de tabelas de banco. O atributo `[TableName]` do Gentle.NET
define o nome real da tabela. No EF Core, esse nome deve ser preservado via `[Table("nome")]`
ou na configuração do modelBuilder.

```
❌ Errado:   modelBuilder.Entity<Cliente>().ToTable("Clientes")  // plural inventado
✅ Correto:  modelBuilder.Entity<Cliente>().ToTable("EntCliente")  // nome real do legado
```

### REGRA 2 — Nomes de colunas são sagrados
As propriedades do Gentle.NET mapeiam diretamente para colunas. Preserve os nomes.
Quando houver dúvida sobre o nome de uma coluna, reporte como `DÚVIDA` e não invente.

### REGRA 3 — Não adicionar campos novos sem autorização
Se a entidade `Cliente` no legado tem 30 campos, a entidade nova tem 30 campos.
Não adicionar `CreatedAt`, `UpdatedAt`, `IsDeleted` ou qualquer outro campo de infraestrutura
sem um pedido explícito e uma SPEC atualizada.

### REGRA 4 — Não remover campos sem autorização
Se um campo existe no legado, ele existe no novo — mesmo que pareça obsoleto.
Marcar campos suspeitos com `// LEGADO: verificar se em uso` mas mantê-los.

### REGRA 5 — Não refatorar regras de negócio
Se `DocumentoVendaSituacao.Confirmar()` tem 200 linhas de lógica complexa,
essa lógica deve ser migrada fielmente. Não "limpar", não "separar responsabilidades",
não "aplicar SOLID" sem aprovação explícita.

**Exceção:** Se a lógica usa API removida do .NET Core (ex: `Thread.Abort`), adaptar APENAS
o mínimo necessário e documentar a mudança na SPEC.

### REGRA 6 — Sequencial de IDs não é IDENTITY
O sistema legado usa `GeradorSequencial` para criar IDs por filial.
**Nunca** substituir por `IDENTITY` ou `GUID` sem entender e replicar o mecanismo legado.
Isso pode quebrar a integridade referencial do banco existente.

### REGRA 7 — Quando em dúvida, PARE e PERGUNTE
Se a SPEC não especifica algo, a IA deve:
1. Parar
2. Reportar o que está indefinido
3. Aguardar instrução

Não deve: inventar, assumir, usar "melhor prática" por conta própria.

### REGRA 7.1 — Alterações na SPEC devem ser solicitadas explicitamente
Se a IA identificar a necessidade de uma mudança ou adição na arquitetura/código que não está na SPEC atual:
1. A IA pode **sugerir** a alteração na SPEC
2. Mas **não deve implementar** a mudança até que a SPEC seja atualizada
3. A alteração na SPEC deve ser feita pelo desenvolvedor (que pode usar a IA para isso se desejar)
4. Só então a implementação pode prosseguir baseada na SPEC atualizada

**Exemplo:**
```
IA: "Para implementar este handler, seria necessário adicionar um campo 'Status' na entidade Produto. Sugiro atualizar a SPEC na seção 4.1 para incluir este campo."
[DESENVOLVEDOR decide se atualiza a SPEC ou não]
[Se atualizar, DESENVOLVEDOR instrui IA a implementar baseado na SPEC atualizada]
```

### REGRA 7.2 — Confirme as tarefas do módulo antes de começar
Antes de iniciar um módulo, revise a SPEC completa do módulo e confirme que todas as tarefas, itens de implementação e dependências estão descritos.
- Se algo estiver faltando, atualize a SPEC primeiro
- Se a SPEC não cobrir o necessário, não execute o trabalho até que ela seja ajustada
- Esse processo deve ser aplicado a todos os módulos, sempre

### REGRA 7.3 — Use Git para versionar SPECs e código
O projeto é controlado por Git. Todas as alterações de SPEC e código devem ser feitas em branches claras e revisadas antes de integrar.

O projeto é controlado por Git. Todas as alterações de SPEC e código devem ser feitas em branches claras e revisadas antes de integrar.

- Crie branches por módulo/tarefa e use nomes descritivos
- Faça commits pequenos e focados, com mensagens que expliquem o porquê da mudança
- Atualize a SPEC antes de implementar o código quando a alteração for necessária
- Commitar a SPEC atualizada primeiro, depois o código que segue a SPEC
- Use Pull Request/Merge Request para revisão e auditoria
- Adote um fluxo com `develop` para integração contínua e `release/*` para estabilização
- Só integre em `main` através de um merge de `release/*` aprovado
- Mantenha `.gitignore` atualizado para arquivos de build, binários e configurações locais

Isso garante que o histórico do Git reflita tanto a evolução da SPEC quanto a implementação do código.

### REGRA 8 — Uma SPEC, um pedido
Nunca pedir à IA "migre tudo isso". Sempre um item de cada vez. Sessões grandes
aumentam a chance de a IA perder o fio condutor e começar a inventar.

### REGRA 9 — Código gerado deve citar sua origem
Todo código gerado pela IA deve incluir um comentário indicando de onde veio:

```csharp
// Origem: servidor/objeto de negócio/acesso.global/Cliente.cs (legado)
// Tabela: EntCliente
public class Cliente { ... }
```

Isso permite rastrear e auditar facilmente.

### REGRA 10 — Testes de paridade antes de desligar o legado
Antes de desligar um módulo legado, executar testes que comparam a saída do novo sistema
com a saída do legado para os mesmos inputs. Só desligar o legado quando a paridade
estiver em 100% nos cenários críticos.

### REGRA 11 — Nunca criar classes `*Lista` — usar coleções nativas do .NET
As classes `[Entidade]Lista` do legado existiam apenas para o .NET Remoting com `ArrayList`
não-genérico. **Não têm equivalente no novo sistema.**

```csharp
// ❌ PROIBIDO — nunca replicar o padrão legado
public class ClienteLista : ListBase { ... }

// ✅ CORRETO — usar coleções nativas
private readonly List<Cliente> _clientes = [];        // interna (mutável)
public IReadOnlyList<Cliente> Clientes => _clientes.AsReadOnly(); // exposta (imutável)

> Em .NET Core use coleções genéricas do .NET em vez do legado. `IList<T>` ou `List<T>` são
> aceitáveis internamente, mas a exposição pública deve preferir `IReadOnlyList<T>`.
> Jamais usar `IList` sem tipo genérico, `ArrayList` ou `ListBase`.
```

**Regra completa:** Ver `decisoes/DEC-005-COLECOES-E-BOAS-PRATICAS.md`

### REGRA 12 — Boas práticas de C# são obrigatórias, não opcionais
Todo código gerado deve seguir as boas práticas definidas em `DEC-005`:
- DTOs e Value Objects como `record`
- Todo I/O `async` com `CancellationToken`
- Injeção via construtor
- `Nullable` habilitado (`<Nullable>enable</Nullable>`)
- Guard clauses no início dos métodos (`ArgumentNullException.ThrowIfNull`)
- Enums com valores inteiros preservados do banco (compatibilidade)
- `ILogger<T>` com log estruturado — sem concatenação de strings
- Exceções da hierarquia `VersatusException`, nunca `Exception` genérica
- Validations esperadas devem retornar `Result`/`ValidationResult`, não usar exceções como controle de fluxo
- Expressões modernas de C# 12 (collection expressions, primary constructors, switch expressions)

### REGRA 13 — Não usar exceções para validação esperada
Validações de entrada e regras de negócio esperadas devem ser retornadas como resultados de validação estruturados.
Exceções devem ser reservadas para falhas inesperadas ou violações de invariantes.

```csharp
// ✅ use retorno estruturado para validação
public record ValidationError(string Campo, string Mensagem);
public record ValidationResult(bool IsValid, IReadOnlyList<ValidationError> Errors);

public async Task<Result<DocumentoResponse>> Handle(DocumentoCommand command, CancellationToken ct)
{
    var validation = _validator.Validate(command);
    if (!validation.IsValid)
        return Result<DocumentoResponse>.Fail(validation.Errors);

    var documento = await _service.CriarDocumentoAsync(command, ct);
    return Result<DocumentoResponse>.Ok(documento);
}
```

> Taxa de exceção alta torna a aplicação lenta e dificulta análise. Use erros estruturados para regras de negócio comuns.

### REGRA 14 — Persistência do Log de Progresso (Handoff)
Toda sessão de trabalho deve **obrigatoriamente** encerrar com a atualização da Seção 5 do `specs/04-CONTRATO-DA-IA.md`.
- A IA deve registrar o que foi feito, qual a branch atual e qual o próximo passo.
- Isso previne que a próxima instância da IA reinicie tarefas já concluídas ou ignore decisões arquiteturais tomadas durante a sessão.

### REGRA 15 — Commits e Branches Atômicos
A IA deve seguir rigorosamente o fluxo de trabalho atômico:
1.  **Uma Tarefa, Uma Branch:** Para cada nova tarefa ou fase da SPEC, uma nova branch deve ser criada a partir de `develop` (ex: `feat/mod-02-repositories`). Nunca trabalhe diretamente em `develop` ou misture tarefas em uma mesma branch.
2.  **Mudança Pequena = Commit Imediato:** Nunca acumule grandes volumes de código alterado sem um commit lógico. Commite ao finalizar cada item de implementação.
3.  **Aprovação para Merge:** Ao concluir o trabalho em uma branch, a IA **DEVE PERGUNTAR** ao usuário se pode realizar o merge para a branch `develop`. Nunca faça merge automático.
4.  **Handoff e Sincronização:** Atualize o `task.md`, `walkthrough.md` e o Log de Progresso no `04-CONTRATO-DA-IA.md` a cada tarefa concluída. Esses arquivos devem ser commitados junto com o código.
5.  **Troca de IA:** Se houver troca de assistente, a nova IA deve ler o último Handoff e verificar a branch atual antes de qualquer ação.

---

## 3. Checklist de Revisão de Código Gerado por IA

Antes de aceitar qualquer código gerado pela IA, verificar:

- [ ] Todos os nomes de tabelas batem com o legado?
- [ ] Nenhum campo novo foi adicionado sem estar na SPEC?
- [ ] Nenhum campo do legado foi removido?
- [ ] A lógica de negócio espelha o que estava no legado?
- [ ] O código tem comentários de rastreabilidade (origem)?
- [ ] O gerador de sequencial foi respeitado (sem IDENTITY)?
- [ ] A convenção de nomenclatura do legado foi mantida?
- [ ] Fluxo de validação usa `Result<T>` / `ValidationResult`, não exceções para erros esperados?
- [ ] Exceções são usadas somente para falhas inesperadas/invariantes?
- [ ] Não há "melhorias" não solicitadas?
- [ ] **Não existe nenhuma classe `*Lista` criada?** (usar `IReadOnlyList<T>`)
- [ ] **Coleções de agregado são `List<T>` privada + `IReadOnlyList<T>` público?**
- [ ] **DTOs e Value Objects são `record`?**
- [ ] **Métodos de I/O são `async` com `CancellationToken`?**
- [ ] **Não há `.Result` ou `.Wait()` em cima de métodos async?**
- [ ] **Enums foram usados no lugar de constantes inteiras?**
- [ ] **`ILogger<T>` com log estruturado (sem concatenação)?**
- [ ] **Exceções são da hierarquia `VersatusException`?**
- [ ] **Alterações sugeridas pela IA foram implementadas APENAS após atualização da SPEC?**
- [ ] **O Log de Progresso (Handoff) na Seção 5 do Contrato da IA foi atualizado?**

---

## 4. Como Reportar Problemas Detectados

Quando a IA alucinação for detectada, documente no arquivo `decisoes/ALUCINACOES-DETECTADAS.md`:

```markdown
## [DATA] — [Módulo] — [Descrição]

**O que a IA fez:** ...
**O que deveria ter feito:** ...
**Como foi corrigido:** ...
**Regra violada:** REGRA X
```

Este registro ajuda a calibrar os prompts futuros.

---

## 5. Prompt Padrão de Segurança (copie sempre)

```
=== MODO SPEC-FIRST VERSATUS ===
Projeto: Migração Versatus .NET Framework → .NET Core 8
Regras obrigatórias:
- Implemente EXATAMENTE o que está na SPEC indicada
- Preserve nomes de tabelas e colunas do legado
- Não adicione nem remova campos sem autorização
- Não refatore lógica de negócio
- Se houver dúvida, escreva "DÚPVIDA: [descrição]" e pare
- Cite a origem legada de cada classe gerada nos comentários
- Não use IDENTITY — o sistema usa sequencial customizado
- Se precisar de mudança na SPEC, sugira primeiro — não implemente até a SPEC ser atualizada

BOAS PRÁTICAS OBRIGATÓRIAS (DEC-005):
- NUNCA criar classe [Entidade]Lista — usar IReadOnlyList<T>
- Coleção interna de agregado: List<T> privado + IReadOnlyList<T> público
- NUNCA usar ArrayList — sempre coleções genéricas tipadas
- Todos os métodos de I/O devem ser async com CancellationToken
- DTOs e Value Objects devem ser records
- Nullable Reference Types habilitado (<Nullable>enable</Nullable>)
- Guard clauses no início dos métodos (ArgumentNullException.ThrowIfNull)
- Enums para situações/tipos (preservar valores inteiros do banco)
- ILogger<T> com log estruturado — NUNCA concatenar strings no log
- Exceções da hierarquia VersatusException — NUNCA Exception genérica
- Usar expressões modernas C# 12 (records, switch expressions, collection expressions)
=== FIM DAS REGRAS ===

SPEC de referência: [cole o conteúdo da seção relevante aqui]

PEDIDO: [descreva o que quer que seja implementado]
```

---

## 6. Glossário de Termos do Legado

Para evitar que a IA (ou você) se confunda, aqui estão os termos do legado e seus significados:

| Termo Legado | Significado | Equivalente Novo |
|---|---|---|
| `Ambiente` / `IAmbiente` | Contexto de execução (usuário, filial, transação) | `IContexto` injetado via DI |
| `ObjectBase` | Classe base de todos os objetos de negócio | **Removida** (era para Remoting) |
| `ListBase` | Coleção tipada de objetos de negócio | **Removida** — usar `IReadOnlyList<T>` |
| `[Entidade]Lista` | Classe de coleção no padrão legado | **Eliminada** — sem equivalente |
| `ArrayList` | Coleção não-genérica do legado | **Proibida** — usar `List<T>` |
| `[TableName]` | Atributo ORM Gentle — nome da tabela | `[Table]` do EF Core |
| `Transacao` | Gerenciador de transação do banco | `IDbContextTransaction` |
| `Situacao` | Classe que executa operações de estado no documento | Handler / UseCase |
| `Distribuicao` | Classe base para documentos com distribuição por filial | `DocumentoBase` com IdDistribuicao |
| `AutoSequencial` | Atributo de geração de ID por filial | `GeradorSequencialService` |
| `Gentle.Framework` | ORM legado | Entity Framework Core |
| `MarshalByRefObject` | Habilitador do .NET Remoting | **Removido** totalmente |
| `IAmbiente.Assimilar` | Propagar contexto filho→pai | **Removido** — DI cuida disso |
| `Lookup` | Busca rápida cacheada | `IMemoryCache` ou repositório com cache |
| `DataPatch` | Script de migração de dados em formato legado | Migration do EF Core |

---

*Documento criado em: 2026-04-27*
