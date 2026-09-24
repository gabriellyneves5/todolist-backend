import { pool } from '../db.js';

const TASK_FIELDS = 'id, title, completed, due_date, created_at';

// Data local de hoje no formato YYYY-MM-DD para comparar com as datas limite.
function hojeLocal() {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

// Valida o título e a data limite seguindo as regras de negócio.
function validarTarefa(titulo, dataLimite) {
  if (typeof titulo === 'string') {
    if (!titulo.trim()) {
      return 'O título da tarefa é obrigatório.';
    }
    if (titulo.trim().length < 3) {
      return 'O título da tarefa precisa ter pelo menos 3 caracteres.';
    }
    if (titulo.trim().length > 255) {
      return 'O título da tarefa não pode passar de 255 caracteres.';
    }
  }

  if (dataLimite !== undefined && dataLimite !== null && dataLimite !== '') {
    if (typeof dataLimite !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dataLimite)) {
      return 'A data limite precisa estar no formato YYYY-MM-DD.';
    }
    if (dataLimite < hojeLocal()) {
      return 'A data limite não pode ser anterior a hoje.';
    }
  }

  return null;
}

export default async function tasksRoutes(app) {
  // Listar tarefas, com busca por título e filtro de status opcionais.
  app.get('/api/tasks', async (request, reply) => {
    const search = request.query.search || '';
    const status = request.query.status || 'all';

    let sql = `SELECT ${TASK_FIELDS} FROM tasks WHERE title LIKE ?`;
    const params = [`%${search}%`];

    if (status === 'pending') {
      sql += ' AND completed = 0';
    } else if (status === 'completed') {
      sql += ' AND completed = 1';
    }

    // Sem prazo por último; com prazo, das mais próximas para as mais distantes.
    sql += ' ORDER BY due_date IS NULL, due_date ASC, created_at DESC';

    const [rows] = await pool.query(sql, params);

    const [[totals]] = await pool.query(
      'SELECT COUNT(*) AS total, COALESCE(SUM(completed = 1), 0) AS completed FROM tasks'
    );

    return reply.send({
      tasks: rows,
      total: totals.total,
      completed: Number(totals.completed) || 0
    });
  });

  // Criar uma nova tarefa.
  app.post('/api/tasks', async (request, reply) => {
    const { title, dueDate } = request.body || {};

    if (!title || !title.trim()) {
      return reply.status(400).send({ message: 'O título da tarefa é obrigatório.' });
    }

    const erro = validarTarefa(title, dueDate);
    if (erro) {
      return reply.status(400).send({ message: erro });
    }

    const [result] = await pool.query(
      'INSERT INTO tasks (title, completed, due_date) VALUES (?, 0, ?)',
      [title.trim(), dueDate || null]
    );

    const [[task]] = await pool.query(
      `SELECT ${TASK_FIELDS} FROM tasks WHERE id = ?`,
      [result.insertId]
    );

    return reply.status(201).send(task);
  });

  // Atualizar uma tarefa parcialmente (ex.: marcar como concluída ou editar).
  app.patch('/api/tasks/:id', async (request, reply) => {
    const { id } = request.params;
    const { completed, title, dueDate } = request.body || {};

    const [[existing]] = await pool.query('SELECT id FROM tasks WHERE id = ?', [id]);

    if (!existing) {
      return reply.status(404).send({ message: 'Tarefa não encontrada.' });
    }

    const fields = [];
    const values = [];

    if (typeof completed === 'boolean') {
      fields.push('completed = ?');
      values.push(completed ? 1 : 0);
    }

    if (typeof title === 'string') {
      const erro = validarTarefa(title);
      if (erro) {
        return reply.status(400).send({ message: erro });
      }
      fields.push('title = ?');
      values.push(title.trim());
    }

    if (dueDate !== undefined) {
      const erro = validarTarefa(undefined, dueDate);
      if (erro) {
        return reply.status(400).send({ message: erro });
      }
      fields.push('due_date = ?');
      values.push(dueDate || null);
    }

    if (fields.length === 0) {
      return reply.status(400).send({ message: 'Nada para atualizar.' });
    }

    values.push(id);
    await pool.query(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, values);

    const [[task]] = await pool.query(
      `SELECT ${TASK_FIELDS} FROM tasks WHERE id = ?`,
      [id]
    );

    return reply.send(task);
  });

  // Excluir uma tarefa.
  app.delete('/api/tasks/:id', async (request, reply) => {
    const { id } = request.params;

    const [result] = await pool.query('DELETE FROM tasks WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return reply.status(404).send({ message: 'Tarefa não encontrada.' });
    }

    return reply.status(204).send();
  });
}