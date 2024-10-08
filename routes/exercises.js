const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middlewares/auth');
const Exercise = require('../models/Exercise'); // Importar o modelo de exercício

// Rota GET para listar todos os exercícios
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    const exercises = await Exercise.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
    res.render('exercises', { exercises });
  } catch (error) {
    console.error('Erro ao carregar os exercícios:', error);
    req.flash('error_msg', 'Erro ao carregar os exercícios.');
    res.redirect('/chat');
  }
});

// Rota GET para visualizar um exercício específico
router.get('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const exercise = await Exercise.findOne({ _id: req.params.id, createdBy: req.user._id });

    if (!exercise) {
      req.flash('error_msg', 'Exercício não encontrado.');
      return res.redirect('/exercises');
    }

    res.render('exercise_view', { exercise });
  } catch (error) {
    console.error('Erro ao carregar o exercício:', error);
    req.flash('error_msg', 'Erro ao carregar o exercício.');
    res.redirect('/exercises');
  }
});

// Rota DELETE para excluir um exercício
router.delete('/:id', ensureAuthenticated, async (req, res) => {
    try {
      const result = await Exercise.deleteOne({ _id: req.params.id, createdBy: req.user._id });
      
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Exercício não encontrado.' });
      }
  
      res.status(200).json({ success: 'Exercício excluído com sucesso.' });
    } catch (error) {
      console.error('Erro ao excluir o exercício:', error);
      res.status(500).json({ error: 'Erro ao excluir o exercício.' });
    }
  });
  

module.exports = router;
