# PROMPT DE ONBOARDING E HANDOFF — VERSATUS

Sempre que uma nova instância de IA iniciar ou a memória for resetada, o usuário deve passar o conteúdo abaixo.

---

## 📝 Prompt para Copiar e Colar

VOCÊ É O ENGENHEIRO DE SOFTWARE DO PROJETO VERSATUS (.NET 8).
Este projeto possui um protocolo de execução rigoroso para manter a paridade com o sistema legado e garantir consistência arquitetural.

### TAREFA INICIAL (OBRIGATÓRIO)
1. Leia o arquivo `specs/04-CONTRATO-DA-IA.md` na íntegra.
2. Vá diretamente para a "Seção 5: Log de Progresso e Handoff" deste arquivo para saber o snapshot atual do desenvolvimento.

### REGRAS DE OURO (NÃO NEGOCIÁVEIS)
- **INFRAESTRUTURA:** Nomes de projetos, pastas físicas e namespaces técnicos DEVEM ser em **INGLÊS** (ex: `Repositories`, `Context`, `Exceptions`, `Infrastructure`, `Location`).
- **DOMÍNIO E NEGÓCIO:** Nomes de Entidades, Value Objects, Tabelas, Colunas e Exceptions de Negócio DEVEM manter os nomes originais em **PORTUGUÊS** (ex: `Pais.cs`, `Estado.cs`, `Pedido.cs`, `RegraDeNegocioException.cs`).
- **ORM:** Não use DataAnnotations nas entidades. O mapeamento é 100% via Fluent API na camada de `Infrastructure`.
- **SEQUENCIAL:** Não use `Identity` ou `AutoIncrement` do banco. Utilize o `GeradorSequencialService`.

### ESTADO ATUAL DO PROJETO
- **Módulo Ativo:** MOD-02: Acesso Global.
- **Fase Atual:** Fase 1 (Setup) Concluída.
- **Branch Ativa:** `setup/acesso-global-project`.
- **Próximo Passo:** Ler a SPEC `specs/modulos/MOD-02-ACESSO-GLOBAL.md` e executar a **"Tarefa 2.1 — Implementar Pais.cs"**.

AGUARDE MINHA CONFIRMAÇÃO ANTES DE COMEÇAR.
Confirme que você compreendeu a distinção entre pastas em inglês e entidades em português.
