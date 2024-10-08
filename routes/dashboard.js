const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middlewares/auth');

// Rota para exibir o Dashboard
router.get('/', ensureAuthenticated, (req, res) => {
    // Removemos as tarefas daqui, já que elas serão manipuladas em `/tasks`
    res.render('dashboard', { user: req.user });
});

module.exports = router;
