# SPEC — Design UI/UX
## Documento: 04-UI-UX-DESIGN.md

---

## 1. Estética e Identidade Visual

O sistema deve transmitir **exclusividade, performance e clareza**.

- **Paleta de Cores (Sugestão):**
    - **Primária:** Azul Profundo ou Grafite (#1A1A2E).
    - **Destaque (Talentos):** Dourado ou Amarelo Vibrante (#F0A500) para remeter a valor e conquista.
    - **Sucesso:** Verde Esmeralda (#2ECC71).
    - **Alerta (Não Compensados):** Laranja Coral (#E67E22).
- **Tipografia:** Moderna e limpa (ex: Inter, Roboto ou Outfit).
- **Estilo:** Glassmorphism sutil, bordas arredondadas, sombras suaves e micro-animações (hover em botões e cards).
- **Temas (Dark/Light):**
    - O sistema deve suportar alternância entre modo claro e escuro.
    - Uso de variáveis CSS para cores de fundo, texto e superfícies.
    - Detecção automática baseada na preferência do sistema operacional.
- **Responsividade Adaptativa:**
    - Mobile-First: Interfaces otimizadas para uso com uma mão.
    - Desktop: Aproveitamento de espaço para tabelas e filtros complexos.

3. **Vitrine de Prêmios (E-commerce)**
- **Grid de Cards:** Layout em grade responsiva com imagens em alta definição e badges de categoria.
- **Visualização Rápida:** Drawer lateral ou Modal com galeria de fotos, descrição completa e contador de estoque.
- **Micro-interação:** Efeito de elevação (shadow) e escala (zoom) ao passar o mouse.

4. **Checkout e Entrega**
- **Modal de Confirmação:** Exibe o impacto no saldo (Antes vs. Depois).
- **Seletor de Entrega:** Toggle interativo entre "Entregar no Endereço" e "Entrega a Combinar".
- **Formulário Dinâmico:** Campos de endereço aparecem apenas se a opção de entrega for selecionada, com suporte a busca por CEP.

## 2. Componentes do Dashboard (Corretor)

1.  **Cards de Resumo (Header):**
    - Grandes e com ícones elegantes.
    - Valor do Saldo Disponível com animação de contador.
2.  **Gráfico de Tendência:**
    - Linha simples mostrando ganho de talentos nos últimos meses.
3.  **Extrato (Data Table):**
    - Linhas limpas.
    - Badges coloridas para status (`Compensado`, `Pendente`, `Atrasado`).
4. **Widget "Próxima Conquista":**
    - Barra de progresso indicando quão perto o corretor está do próximo prêmio desejado.

## 5. Painel Admin

- Foco em **Eficiência e Controle**.
- Tabelas com filtros rápidos.
- Modal de importação com feedback visual de progresso (barra de carregamento).
- Dashboard de gestão com métricas de "Total de Talentos Circulantes".

---

## 4. Responsividade
- Prioridade **Mobile-First** para o Corretor (acesso rápido via smartphone durante o trabalho de rua).
- Versão Desktop focada no Administrador para gestão de planilhas.

## 6. Fluxo de Importação em 3 Etapas (Fase 5)
Para fornecer uma experiência de importação confortável e profissional a grandes volumes de dados imobiliários e de outros segmentos, a interface de importação é dividida em **três etapas (páginas/estados) navegáveis**:

1. **Etapa 1: Carregamento (Upload)**:
   - Contêiner de drag-and-drop proeminente para planilhas (.xlsx, .csv).
   - Gerenciamento simplificado de Perfis de Mapeamento, permitindo criar, editar ou excluir perfis.
   - Opção para acionar a **Sugestão de Mapeamento por IA/Heurística**, onde as colunas são auto-mapeadas com base nos cabeçalhos da planilha e o formulário de mapeamento é preenchido dinamicamente.
   - Suporte para configurar **Identificador Extra** e **Campos Extras** no modal do perfil.

2. **Etapa 2: Visualização Analítica (Preview)**:
   - Apresenta estatísticas rápidas do lote (Total de registros, resolvidos e inconsistências).
   - Lista os primeiros registros em uma tabela detalhada com indicadores coloridos de status de localização e alertas visuais de ambiguidade.
   - Permite a **Resolução Manual de Ambiguidades**: quando um corretor possui nome duplicado no sistema e o identificador extra não resolve a ambiguidade, um dropdown com os candidatos correspondentes é exibido para o administrador decidir a quem atribuir o lançamento antes de prosseguir.
   - Exibição de colunas extras dinâmicas mapeadas em uma aba dedicada ou coluna na listagem.

3. **Etapa 3: Confirmação e Telemetria (Confirm)**:
   - Exibe o resumo final das transações a serem efetuadas.
   - Botão para execução definitiva da importação com processamento transacional.
   - Painel pós-sucesso contendo os resultados e a telemetria do motor (Total de registros importados com sucesso, transações criadas e saldo de corretores atualizados).
