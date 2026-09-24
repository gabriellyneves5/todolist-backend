import Fastify from 'fastify';
import cors from '@fastify/cors';
import 'dotenv/config';
import tasksRoutes from './routes/tasks.js';
import { pool } from './db.js';

const app = Fastify({ logger: true });

// O navegador roda em uma porta diferente (5173) e por isso precisamos
// liberar o acesso de outra origem aqui no servidor.
await app.register(cors, {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE', 'OPTIONS']
});

// Ping rápido para saber se a API está no ar.
app.get('/health', async () => ({ status: 'ok' }));

await app.register(tasksRoutes);

// Garante que a tabela existe antes de abrir a porta.
async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      completed BOOLEAN NOT NULL DEFAULT FALSE,
      due_date DATE NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
}

try {
  await ensureSchema();
  await app.listen({ port: Number(process.env.PORT) || 3333 });
  console.log('API do Todolist rodando em http://localhost:3333');
} catch (err) {
  app.log.error(err);
  process.exit(1);
}