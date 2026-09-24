import mysql from 'mysql2/promise';
import 'dotenv/config';

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

// Pool de conexões: evita abrir uma conexão nova a cada requisição.
export const pool = mysql.createPool({
  host: DB_HOST || 'localhost',
  port: Number(DB_PORT) || 3306,
  user: DB_USER || 'root',
  password: DB_PASSWORD || '',
  database: DB_NAME || 'todolist',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Retorna as colunas de data como string (ex.: '2026-09-20'),
  // o que facilita o envio para o frontend.
  dateStrings: true
});