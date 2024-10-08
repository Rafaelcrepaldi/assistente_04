const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middlewares/auth');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Exibir perfil
router.get('/', ensureAuthenticated, (req, res) => {
    res.render('profile', { user: req.user });
});
// Rota para exibir o formulário de edição de perfil
router.get('/edit', ensureAuthenticated, (req, res) => {
    res.render('edit_profile', { user: req.user });
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


// Rota para processar as alterações de perfil
router.post('/edit', ensureAuthenticated, async (req, res) => {
    const { name, email, password, confirm_password } = req.body;
    let errors = [];

    // Verificar se as senhas coincidem
    if (password && password !== confirm_password) {
        errors.push({ msg: 'As senhas não coincidem' });
    }

    // Re-renderizar a página com mensagens de erro se houver
    if (errors.length > 0) {
        return res.render('edit_profile', {
            user: req.user,
            errors
        });
    }

    try {
        const user = await User.findById(req.user.id);

        // Atualiza nome e e-mail
        user.name = name;
        user.email = email;

        // Se a senha foi fornecida, criptografe e salve
        if (password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }

        await user.save(); // Salva as alterações no banco de dados
        req.flash('success_msg', 'Perfil atualizado com sucesso!');
        res.redirect('/profile'); // Redireciona de volta ao perfil
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Erro ao atualizar o perfil.');
        res.redirect('/profile/edit');
    }
});


module.exports = router;
