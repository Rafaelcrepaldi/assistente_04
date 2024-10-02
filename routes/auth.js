const express = require('express');
const router = express.Router();
const passport = require('passport');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Página de login
router.get('/login', (req, res) => res.render('login'));

// Página de registro (GET)
router.get('/register', (req, res) => {
  res.render('register', { 
    errors: [],   // Array de erros vazio
    name: '',     // Variável 'name' vazia
    email: '',    // Variável 'email' vazia
    password: '', // Variável 'password' vazia
    password2: '' // Variável 'password2' vazia
  });
});

// Processar registro (POST)
router.post('/register', (req, res) => {
  const { name, email, password, password2 } = req.body;
  let errors = [];

  // Verificar se os campos estão preenchidos
  if (!name || !email || !password || !password2) {
    errors.push({ msg: 'Por favor, preencha todos os campos' });
  }

  // Verificar se as senhas coincidem
  if (password !== password2) {
    errors.push({ msg: 'As senhas não coincidem' });
  }

  // Verificar tamanho da senha
  if (password.length < 6) {
    errors.push({ msg: 'A senha deve ter pelo menos 6 caracteres' });
  }

  if (errors.length > 0) {
    res.render('register', { errors, name, email, password, password2 });
  } else {
    // Verificar se o email já está registrado
    User.findOne({ email: email }).then(user => {
      if (user) {
        errors.push({ msg: 'Este email já está registrado' });
        res.render('register', { errors, name, email, password, password2 });
      } else {
        const newUser = new User({ name, email, password });

        // Hash da senha
        bcrypt.genSalt(10, (err, salt) => {
          bcrypt.hash(newUser.password, salt, (err, hash) => {
            if (err) throw err;
            newUser.password = hash;

            // Salvar usuário
            newUser.save()
              .then(user => {
                req.flash('success_msg', 'Você está registrado e pode fazer login');
                res.redirect('/auth/login');
              })
              .catch(err => console.log(err));
          });
        });
      }
    });
  }
});

// Processar login (POST)
router.post('/login', (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: '/dashboard',  // Redireciona para o dashboard em caso de sucesso
    failureRedirect: '/auth/login', // Redireciona para login em caso de falha
    failureFlash: true              // Ativa mensagens flash para erros de login
  })(req, res, next);
});


module.exports = router;
