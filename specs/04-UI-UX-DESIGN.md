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
