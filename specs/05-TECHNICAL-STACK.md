# SPEC — Stack Técnico e Arquitetura
## Documento: 05-TECHNICAL-STACK.md

---

## 1. Tecnologias Core

- **Backend:** Node.js (Runtime) com Express.js (Framework).
- **Banco de Dados:** SQLite (Fase MVP) ou PostgreSQL (Produção).
- **Frontend:** HTML5, CSS3 (Vanilla ou Tailwind) e Javascript (Vanilla/ES6).
- **Autenticação:** JSON Web Tokens (JWT).
- **Processamento de Arquivos:** bibliotecas `xlsx` ou `csv-parser`.

## 2. Estrutura de Pastas (Padrão de Infraestrutura)

Seguindo a regra de **Inglês para Infraestrutura**:

```
/v-talentos
  ├── /src
  │   ├── /backend
  │   │   ├── /controllers
  │   │   ├── /models (Entidades de Negócio em PT)
  │   │   ├── /repositories
  │   │   ├── /services (Regras de Gamificação)
  │   │   ├── /middleware
  │   │   └── server.js
  │   ├── /frontend
  │   │   ├── /assets (css, images)
  │   │   ├── /components
  │   │   └── index.html
  ├── /database (migrations e seeds)
  ├── /specs (Spec Kit)
  ├── package.json
  └── .env
```

## 3. Padrões de Código

- **I/O Assíncrono:** Uso obrigatório de `async/await`.
- **Tratamento de Erros:** Middleware global para captura de exceções.
- **Segurança:** Senhas armazenadas com `bcrypt`.
- **Variáveis de Ambiente:** Gestão via `.env` (credenciais de banco, segredos JWT).

---

## 4. Estratégia de Deploy
- Containerização via **Docker** para garantir paridade de ambiente.
- CI/CD básico via GitHub Actions ou similar (Opcional para MVP).
