const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middlewares/auth');
const Task = require('../models/Task');

// Página para adicionar tarefas
router.get('/add', ensureAuthenticated, (req, res) => {
    res.render('add_task');
});

// Processar o formulário de adicionar tarefa
router.post('/add', ensureAuthenticated, (req, res) => {
    const { title, description } = req.body;
    const newTask = new Task({
        title,
        description,
        user: req.user._id
    });

    newTask.save().then(() => {
        res.redirect('/dashboard');
    }).catch(err => {
        console.error(err);
        res.redirect('/tasks/add');
    });
});

module.exports = router;
