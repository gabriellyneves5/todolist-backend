# Todolist — Vite + JavaScript + Fastify + MySQL

Projeto de lista de tarefas desenvolvido para a disciplina de PW3 (Programação Web). A interface é carregada pelo Vite e usa JavaScript, CSS e manipulação direta do DOM; a API é implementada com Node.js e Fastify, e os dados são guardados no MySQL.

## Funcionalidades

- Criar tarefa com título e data limite (prazo opcional);
- Listar tarefas pendentes e concluídas;
- Buscar tarefas pelo nome em tempo real;
- Filtrar por todas / pendentes / concluídas;
- Marcar tarefa como concluída ou reabri-la;
- Editar o título e o prazo de uma tarefa;
- Excluir tarefas;
- Painel com totais, pendentes e concluídas;
- Barra de progresso das tarefas concluídas;
- Alternar entre tema claro e escuro com preferência salva no navegador;
- Destaque visual para prazos vencidos (atrasadas).

## Regras de negócio

- O título é obrigatório e deve ter, no mínimo, **3 caracteres** (máximo 255);
- A data limite é **opcional**, mas não pode ser **anterior a hoje**;
- As validações valem tanto no frontend quanto no backend;
- Tarefas sem prazo aparecem por último na listagem.

## Tecnologias utilizadas

| Camada | Tecnologia |
|--------|------------|
| Frontend | Vite, JavaScript, CSS |
| Backend | Node.js, Fastify |
| Banco | MySQL |
| Cliente SQL | mysql2 (pool de conexões) |

> O frontend atual não utiliza React. A implementação usa JavaScript vanilla e pode ser executada diretamente pelo Vite.

## Pré-requisitos

- Node.js 20+
- MySQL (ex.: XAMPP, WAMP ou instalado separadamente)
- VS Code (recomendado) com a extensão **REST Client** para testar a API

## Como executar

### 1. Banco de dados

Subindo o MySQL, execute o script `backend/schema.sql` para criar o banco e a tabela:

```sql
mysql -u root -p < schema.sql
```

O backend também cria a tabela automaticamente ao iniciar (caso ainda não exista).

### 2. Backend

```bash
cd backend
npm install
npm run dev
```

A API sobe em `http://localhost:3333`.

Configure as variáveis de ambiente caso necessário (crie/ajuste o arquivo `backend/.env`):

```env
PORT=3333
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=todolist
CORS_ORIGIN=http://localhost:5173
```

O arquivo `.env` contém configuração local e não deve ser publicado.

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

No PowerShell, o comando para copiar o arquivo pode ser substituído por:

```powershell
Copy-Item .env.example .env
```

A interface sobe em `http://localhost:5173`.

A URL base da API pode ser alterada em `frontend/.env` sem modificar o código:

```env
VITE_API_URL=http://localhost:3333
```

Use a URL base da API, sem `/api/tasks` no final. A aplicação usa `http://localhost:3333` como fallback.

## Tema claro/escuro

O botão no canto superior direito alterna o tema. A escolha é salva em `localStorage` com a chave `todolist-tema` e será restaurada ao carregar a página.

## Endpoints da API

| Método | Rota                 | Descrição                              |
|--------|----------------------|----------------------------------------|
| GET    | `/health`            | Verifica se a API está no ar           |
| GET    | `/api/tasks`         | Lista tarefas (`?search=`, `?status=`) |
| POST   | `/api/tasks`         | Cria uma tarefa (`{ title, dueDate? }`)|
| PATCH  | `/api/tasks/:id`     | Atualiza parcialmente (`{ completed?, title?, dueDate? }`) |
| DELETE | `/api/tasks/:id`     | Exclui uma tarefa                      |

### Exemplos

**Criar tarefa**

```http
POST http://localhost:3333/api/tasks
Content-Type: application/json

{
  "title": "Estudar Fastify",
  "dueDate": "2026-12-20"
}
```

**Marcar como concluída**

```http
PATCH http://localhost:3333/api/tasks/1
Content-Type: application/json

{
  "completed": true
}
```

**Excluir tarefa**

```http
DELETE http://localhost:3333/api/tasks/1
```

## Validação

Para gerar o build do frontend:

```bash
cd frontend
npm run build
```

Para verificar a sintaxe do backend:

```bash
cd backend
node --check src/server.js
node --check src/routes/tasks.js
```

Também é importante validar manualmente criação, edição, conclusão, exclusão, pesquisa, filtros, barra de progresso, tema claro/escuro e responsividade.

## Estrutura de pastas

```
todolist/
├── backend/
│   ├── .env                 # configuração local, não versionada
│   ├── rotas.http
│   ├── schema.sql
│   └── src/
│       ├── db.js
│       ├── server.js
│       └── routes/
│           └── tasks.js
├── frontend/
│   ├── .env.example
│   ├── index.html
│   └── src/
│       ├── main.js
│       └── style.css
└── README.md
```
