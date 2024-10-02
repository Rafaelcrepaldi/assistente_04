const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const User = require('../models/User'); // Certifique-se de que o modelo do usuário está correto

module.exports = function(passport) {
  // Definir a estratégia de autenticação local
  passport.use(
    new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
      // Verificar se o usuário existe
      User.findOne({ email: email })
        .then(user => {
          if (!user) {
            return done(null, false, { message: 'Este email não está registrado' });
          }

          // Comparar a senha inserida com o hash armazenado
          bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) throw err;
            if (isMatch) {
              return done(null, user);
            } else {
              return done(null, false, { message: 'Senha incorreta' });
            }
          });
        })
        .catch(err => console.log(err));
    })
  );

  // Serializar o usuário (armazenar apenas o id na sessão)
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserializar o usuário (buscar os detalhes completos a partir do id)
  passport.deserializeUser((id, done) => {
    User.findById(id, (err, user) => {
      done(err, user);
    });
  });
};
