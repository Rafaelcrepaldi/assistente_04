const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middlewares/auth');
const Task = require('../models/Task');

// Exibir o Dashboard
router.get('/', ensureAuthenticated, async (req, res) => {
    const tasks = await Task.find({ user: req.user._id });
    res.render('dashboard', { user: req.user, tasks });
});

module.exports = router;
