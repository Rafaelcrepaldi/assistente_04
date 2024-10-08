const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const { ensureAuthenticated } = require('../middlewares/auth');

// Rota para listar todas as tarefas (GET)
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    // Buscamos todas as tarefas do usuário logado
    const tasks = await Task.find({ user: req.user.id });
    res.render('tasks', { tasks });  // Renderizamos o arquivo EJS 'tasks.ejs' que criamos anteriormente
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Erro ao carregar as tarefas.');
    res.redirect('/chat');
  }
});

// Rota para adicionar uma nova tarefa (GET)
router.get('/add', ensureAuthenticated, (req, res) => {
  res.render('add_task');  // Renderiza o formulário de adicionar tarefa
});

// Rota para adicionar uma nova tarefa (POST)
router.post('/add', ensureAuthenticated, async (req, res) => {
  const { title, description, date, time } = req.body;

  if (!title || !date || !time) {
    return res.status(400).json({ success: false, message: 'Todos os campos são obrigatórios.' });
  }

  const newTask = new Task({
    user: req.user.id,
    title: title,
    description: description,
    date: new Date(date),
    time: time
  });

  try {
    await newTask.save();
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Erro ao salvar a tarefa:', err);
    res.status(500).json({ success: false, message: 'Erro ao salvar a tarefa.' });
  }
});

// Rota para exibir uma tarefa específica
router.get('/view/:id', ensureAuthenticated, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user.id });
    if (!task) {
      req.flash('error_msg', 'Tarefa não encontrada.');
      return res.redirect('/tasks');
    }
    res.render('task', { task: task });  // Renderiza a página com detalhes da tarefa
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Erro ao carregar a tarefa.');
    res.redirect('/tasks');
  }
});

// Rota para editar uma tarefa (GET)
router.get('/edit/:id', ensureAuthenticated, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user.id });
    if (!task) {
      req.flash('error_msg', 'Tarefa não encontrada.');
      return res.redirect('/tasks');
    }
    res.render('edit_task', { task: task });  // Renderiza a página de edição de tarefa
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Erro ao carregar a tarefa.');
    res.redirect('/tasks');
  }
});

// Rota para editar uma tarefa (POST)
router.post('/edit/:id', ensureAuthenticated, async (req, res) => {
  const { title, description } = req.body;

  try {
    let task = await Task.findOne({ _id: req.params.id, user: req.user.id });
    if (!task) {
      req.flash('error_msg', 'Tarefa não encontrada.');
      return res.redirect('/tasks');
    }

    task.title = title;
    task.description = description;

    await task.save();
    req.flash('success_msg', 'Tarefa atualizada com sucesso.');
    res.redirect('/tasks');  // Redireciona para a lista de tarefas
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Erro ao atualizar a tarefa.');
    res.redirect('/tasks');
  }
});

// Rota para atualizar o status de uma tarefa (POST)
router.post('/update-status/:id', ensureAuthenticated, async (req, res) => {
  const { completed } = req.body;

  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user.id });

    if (!task) {
      return res.json({ success: false, message: 'Tarefa não encontrada.' });
    }

    task.completed = completed;
    await task.save();

    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao atualizar a tarefa:', err);
    res.json({ success: false });
  }
});

// Rota para excluir uma tarefa
router.get('/delete/:id', ensureAuthenticated, async (req, res) => {
  try {
    await Task.deleteOne({ _id: req.params.id, user: req.user.id });
    req.flash('success_msg', 'Tarefa excluída com sucesso.');
    res.redirect('/tasks');  // Redireciona para a lista de tarefas
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Erro ao excluir a tarefa.');
    res.redirect('/tasks');
  }
});

module.exports = router;
