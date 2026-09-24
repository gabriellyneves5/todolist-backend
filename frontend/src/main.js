const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3333').replace(/\/+$/, '');
const API_URL = `${API_BASE_URL}/api/tasks`;
const THEME_STORAGE_KEY = 'todolist-tema';

const lista = document.getElementById('lista');
const vazio = document.getElementById('vazio');
const erro = document.getElementById('erro');
const formulario = document.getElementById('formulario');
const campoTitulo = document.getElementById('titulo');
const campoPrazo = document.getElementById('prazo');
const campoBusca = document.getElementById('busca');
const botaoTema = document.getElementById('alternar-tema');
const progressoValor = document.getElementById('progresso-valor');
const progressoTrilho = document.getElementById('progresso-trilho');
const progressoBarra = document.getElementById('progresso-barra');

let statusAtual = 'all';
let termoBusca = '';
let timerBusca = null;
let tarefasCarregadas = [];

function hojeLocal() {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

function formatarData(dia) {
  if (!dia) return '';
  const [ano, mes, diaNr] = dia.split('-');
  return `${diaNr}/${mes}/${ano}`;
}

function temaSalvo() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'escuro' ? 'escuro' : 'claro';
  } catch {
    return 'claro';
  }
}

function aplicarTema(tema) {
  const temaEscuro = tema === 'escuro';
  document.documentElement.dataset.theme = temaEscuro ? 'escuro' : 'claro';

  if (!botaoTema) return;

  const rotulo = temaEscuro ? 'Ativar tema claro' : 'Ativar tema escuro';
  botaoTema.setAttribute('aria-pressed', String(temaEscuro));
  botaoTema.setAttribute('aria-label', rotulo);
  botaoTema.title = rotulo;
  botaoTema.querySelector('.icone-tema').textContent = temaEscuro ? '☀' : '☾';
  botaoTema.querySelector('.texto-tema').textContent = temaEscuro ? 'Tema claro' : 'Tema escuro';
}

function alternarTema() {
  const novoTema = document.documentElement.dataset.theme === 'escuro' ? 'claro' : 'escuro';
  aplicarTema(novoTema);

  try {
    localStorage.setItem(THEME_STORAGE_KEY, novoTema);
  } catch {
    // A aplicação continua funcionando mesmo se o navegador bloquear o armazenamento.
  }
}

function mostrarErro(mensagem) {
  erro.textContent = mensagem;
  erro.hidden = false;
}

function esconderErro() {
  erro.hidden = true;
}

async function mensagemDeErro(resposta, mensagemPadrao) {
  const dados = await resposta.json().catch(() => ({}));
  return dados.message || mensagemPadrao;
}

function validarEntrada(titulo, prazo) {
  if (!titulo.trim()) return 'Digite o nome da tarefa primeiro.';
  if (titulo.trim().length < 3) return 'A tarefa precisa ter pelo menos 3 caracteres.';
  if (titulo.trim().length > 255) return 'A tarefa não pode passar de 255 caracteres.';
  if (prazo && prazo < hojeLocal()) return 'A data limite não pode ser anterior a hoje.';
  return null;
}

function atualizarTotais(totais) {
  const total = Number(totais.total) || 0;
  const concluidas = Math.min(Number(totais.completed) || 0, total);
  const percentual = total > 0 ? Math.round((concluidas / total) * 100) : 0;

  document.getElementById('cartao-total').querySelector('strong').textContent = total;
  document.getElementById('cartao-concluidas').querySelector('strong').textContent = concluidas;
  document.getElementById('cartao-pendentes').querySelector('strong').textContent = total - concluidas;

  progressoValor.textContent = `${percentual}%`;
  progressoBarra.style.width = `${percentual}%`;
  progressoTrilho.setAttribute('aria-valuenow', percentual);
  progressoTrilho.setAttribute('aria-valuetext', `${percentual}% concluído`);
}

function montarItem(tarefa) {
  const espaco = document.createElement('li');
  espaco.className = 'item';
  espaco.dataset.id = tarefa.id;

  const concluida = Number(tarefa.completed) === 1;
  if (concluida) {
    espaco.classList.add('concluida');
  }

  const vencida = !concluida && tarefa.due_date && tarefa.due_date < hojeLocal();

  const prazo = tarefa.due_date
    ? `Vence em ${formatarData(tarefa.due_date)}`
    : 'Sem prazo';

  espaco.innerHTML = `
    <label class="caixa" title="Marcar como concluída">
      <input type="checkbox" data-acao="toggle" ${concluida ? 'checked' : ''} />
      <span></span>
    </label>
    <div class="conteudo">
      <span class="titulo">${escapeHtml(tarefa.title)}</span>
      <span class="prazo${vencida ? ' atrasada' : ''}">${vencida ? 'Atrasada · ' : ''}${prazo}</span>
    </div>
    <div class="acoes">
      <button type="button" class="acao" data-acao="editar">Editar</button>
      <button type="button" class="acao perigo" data-acao="excluir">Excluir</button>
    </div>
  `;

  return espaco;
}

function escapeHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

function montarEditor(tarefa) {
  const espaco = document.createElement('li');
  espaco.className = 'item editando';
  espaco.dataset.id = tarefa.id;
  espaco.innerHTML = `
    <input type="text" class="editar-titulo" maxlength="255" value="${escapeHtml(tarefa.title)}" />
    <input type="date" class="editar-prazo" min="${hojeLocal()}" value="${tarefa.due_date || ''}" />
    <button type="button" class="acao" data-acao="salvar">Salvar</button>
    <button type="button" class="acao" data-acao="cancelar">Cancelar</button>
  `;
  return espaco;
}

function renderizar(tarefas, totais) {
  tarefasCarregadas = tarefas;
  atualizarTotais(totais);
  lista.innerHTML = '';

  if (tarefas.length === 0) {
    vazio.hidden = false;
    vazio.textContent = statusAtual === 'all' && !termoBusca
      ? 'Nenhuma tarefa por aqui. Que tal adicionar uma?'
      : 'Nada encontrado para esses filtros.';
    return;
  }

  vazio.hidden = true;
  tarefas.forEach((tarefa) => lista.appendChild(montarItem(tarefa)));
}

async function carregarTarefas() {
  esconderErro();
  const params = new URLSearchParams({ status: statusAtual });
  if (termoBusca) params.set('search', termoBusca);

  try {
    const resposta = await fetch(`${API_URL}?${params}`);
    if (!resposta.ok) throw new Error('Falha ao buscar as tarefas.');
    const dados = await resposta.json();
    renderizar(dados.tasks, dados);
  } catch {
    mostrarErro('Não consegui falar com o servidor. Verifique se a API está rodando.');
    lista.innerHTML = '';
    vazio.hidden = true;
  }
}

async function criarTarefa(titulo, prazo) {
  const erro = validarEntrada(titulo, prazo);
  if (erro) {
    mostrarErro(erro);
    return;
  }
  esconderErro();
  try {
    const resposta = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: titulo, dueDate: prazo || null })
    });

    if (!resposta.ok) {
      throw new Error(await mensagemDeErro(resposta, 'Não foi possível adicionar.'));
    }

    campoTitulo.value = '';
    campoPrazo.value = '';
    await carregarTarefas();
  } catch (err) {
    mostrarErro(err.message || 'Não foi possível adicionar.');
  }
}

async function alternarConclusao(tarefa) {
  try {
    const concluida = Number(tarefa.completed) === 1;
    const resposta = await fetch(`${API_URL}/${tarefa.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !concluida })
    });

    if (!resposta.ok) {
      throw new Error(await mensagemDeErro(resposta, 'Não foi possível atualizar a tarefa.'));
    }

    await carregarTarefas();
  } catch (err) {
    mostrarErro(err.message || 'Erro ao atualizar a tarefa.');
  }
}

async function salvarEdicao(tarefa, titulo, prazo) {
  const erro = validarEntrada(titulo, prazo);
  if (erro) {
    mostrarErro(erro);
    return;
  }
  esconderErro();
  try {
    const resposta = await fetch(`${API_URL}/${tarefa.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: titulo, dueDate: prazo || null })
    });
    if (!resposta.ok) {
      throw new Error(await mensagemDeErro(resposta, 'Não foi possível salvar a edição.'));
    }
    await carregarTarefas();
  } catch (err) {
    mostrarErro(err.message || 'Não foi possível salvar a edição.');
  }
}

async function excluirTarefa(tarefa) {
  if (!window.confirm(`Excluir a tarefa "${tarefa.title}"?`)) return;

  try {
    const resposta = await fetch(`${API_URL}/${tarefa.id}`, { method: 'DELETE' });

    if (!resposta.ok) {
      throw new Error(await mensagemDeErro(resposta, 'Não foi possível excluir a tarefa.'));
    }

    await carregarTarefas();
  } catch (err) {
    mostrarErro(err.message || 'Erro ao excluir a tarefa.');
  }
}

function abrirEditor(tarefa) {
  const item = lista.querySelector(`[data-id="${tarefa.id}"]`);
  item.replaceWith(montarEditor(tarefa));
  const campo = lista.querySelector('.editando .editar-titulo');
  if (campo) {
    campo.focus();
    campo.setSelectionRange(campo.value.length, campo.value.length);
  }
}

formulario.addEventListener('submit', (evento) => {
  evento.preventDefault();
  const titulo = campoTitulo.value.trim();
  const prazo = campoPrazo.value;
  const erro = validarEntrada(titulo, prazo);
  if (erro) {
    mostrarErro(erro);
    campoTitulo.focus();
    return;
  }
  criarTarefa(titulo, prazo);
});

lista.addEventListener('click', (evento) => {
  const botao = evento.target.closest('[data-acao]');
  if (!botao) return;

  const item = botao.closest('.item');
  const id = Number(item.dataset.id);
  const tarefa = buscaLocal(id);
  if (!tarefa) return;

  switch (botao.dataset.acao) {
    case 'toggle':
      alternarConclusao(tarefa);
      break;
    case 'editar':
      abrirEditor(tarefa);
      break;
    case 'excluir':
      excluirTarefa(tarefa);
      break;
    case 'salvar': {
      const titulo = item.querySelector('.editar-titulo').value.trim();
      const prazo = item.querySelector('.editar-prazo').value;
      salvarEdicao(tarefa, titulo, prazo);
      break;
    }
    case 'cancelar':
      carregarTarefas();
      break;
  }
});

lista.addEventListener('keydown', (evento) => {
  if (evento.key !== 'Enter' && evento.key !== 'Escape') return;
  if (evento.key === 'Enter' && !evento.target.matches('button')) {
    evento.preventDefault();
    const item = evento.target.closest('.editando');
    const salvar = item && item.querySelector('[data-acao="salvar"]');
    if (salvar) salvar.click();
  }
  if (evento.key === 'Escape') {
    const item = evento.target.closest('.editando');
    if (item) carregarTarefas();
  }
});

function buscaLocal(id) {
  return tarefasCarregadas.find((tarefa) => tarefa.id === id);
}

document.querySelectorAll('.filtro').forEach((botao) => {
  botao.addEventListener('click', () => {
    document.querySelectorAll('.filtro').forEach((b) => b.classList.remove('ativo'));
    botao.classList.add('ativo');
    statusAtual = botao.dataset.status;
    carregarTarefas();
  });
});

campoBusca.addEventListener('input', () => {
  clearTimeout(timerBusca);
  const valor = campoBusca.value.trim();
  timerBusca = setTimeout(() => {
    termoBusca = valor;
    carregarTarefas();
  }, 300);
});

campoPrazo.min = hojeLocal();

aplicarTema(temaSalvo());
if (botaoTema) botaoTema.addEventListener('click', alternarTema);

carregarTarefas();