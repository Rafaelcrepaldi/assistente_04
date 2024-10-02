const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middlewares/auth');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Exibir perfil
router.get('/', ensureAuthenticated, (req, res) => {
    res.render('profile', { user: req.user });
});

// Atualizar perfil
router.post('/edit', ensureAuthenticated, async (req, res) => {
    const { name, email, password } = req.body;
    const user = await User.findById(req.user._id);

    // Atualizar nome e email
    user.name = name;
    user.email = email;

    // Se a senha foi fornecida, hasheá-la e salvar
    if (password && password.length > 0) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        user.password = hashedPassword;
    }

    await user.save();
    res.redirect('/profile');
});

module.exports = router;
