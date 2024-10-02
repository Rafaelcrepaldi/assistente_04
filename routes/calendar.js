const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middlewares/auth');

// Exemplo de rota de calendário
router.get('/', ensureAuthenticated, (req, res) => {
    res.json({ message: 'Calendário para o usuário' });
});

module.exports = router;
