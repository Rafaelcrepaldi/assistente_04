// routes/tasks.js

const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const { ensureAuthenticated } = require('../middlewares/auth');

// Rota para adicionar uma nova tarefa (GET)
router.get('/add', ensureAuthenticated, (req, res) => {
  res.render('add_task');
});

// Rota para adicionar uma nova tarefa (POST)
router.post('/add', ensureAuthenticated, async (req, res) => {
  const { title, description } = req.body;

  let errors = [];

  if (!title) {
    errors.push({ msg: 'Por favor, preencha o título da tarefa.' });
  }

  if (errors.length > 0) {
    res.render('add_task', {
      errors,
      title,
      description,
    });
  } else {
    const newTask = new Task({
      user: req.user.id,
      title: title,
      description: description,
    });

    try {
      await newTask.save();
      req.flash('success_msg', 'Tarefa adicionada com sucesso.');
      res.redirect('/dashboard');
    } catch (err) {
      console.error(err);
      req.flash('error_msg', 'Erro ao salvar a tarefa.');
      res.redirect('/dashboard');
    }
  }
});

// Rota para exibir uma tarefa específica
router.get('/view/:id', ensureAuthenticated, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user.id });
    if (!task) {
      req.flash('error_msg', 'Tarefa não encontrada.');
      return res.redirect('/dashboard');
    }
    res.render('task', { task: task });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Erro ao carregar a tarefa.');
    res.redirect('/dashboard');
  }
});

// Rota para editar uma tarefa (GET)
router.get('/edit/:id', ensureAuthenticated, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user.id });
    if (!task) {
      req.flash('error_msg', 'Tarefa não encontrada.');
      return res.redirect('/dashboard');
    }
    res.render('edit_task', { task: task });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Erro ao carregar a tarefa.');
    res.redirect('/dashboard');
  }
});

// Rota para editar uma tarefa (POST)
router.post('/edit/:id', ensureAuthenticated, async (req, res) => {
  const { title, description } = req.body;

  try {
    let task = await Task.findOne({ _id: req.params.id, user: req.user.id });
    if (!task) {
      req.flash('error_msg', 'Tarefa não encontrada.');
      return res.redirect('/dashboard');
    }

    task.title = title;
    task.description = description;

    await task.save();
    req.flash('success_msg', 'Tarefa atualizada com sucesso.');
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Erro ao atualizar a tarefa.');
    res.redirect('/dashboard');
  }
});

// Rota para atualizar o status de uma tarefa
router.post('/update-status/:id', ensureAuthenticated, async (req, res) => {
  const taskId = req.params.id;
  const { completed } = req.body;

  try {
    const task = await Task.findOne({ _id: taskId, user: req.user.id });
    if (!task) {
      return res.json({ success: false });
    }

    task.completed = completed;
    await task.save();

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
});

// Rota para excluir uma tarefa
router.get('/delete/:id', ensureAuthenticated, async (req, res) => {
  try {
    await Task.deleteOne({ _id: req.params.id, user: req.user.id });
    req.flash('success_msg', 'Tarefa excluída com sucesso.');
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Erro ao excluir a tarefa.');
    res.redirect('/dashboard');
  }
});

module.exports = router;
