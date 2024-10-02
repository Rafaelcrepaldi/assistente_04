const express = require('express');
const session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash');
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const MongoStore = require('connect-mongo');
const { OpenAI } = require('openai');

// Carregar variáveis de ambiente
dotenv.config();

// Configuração da API OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Conectar ao MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Conectado ao MongoDB'))
.catch(err => console.log('Erro ao conectar ao MongoDB:', err));

const app = express();
const port = process.env.PORT || 3000;

// Configurar EJS como motor de templates
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware para parsing de JSON e dados de formulários
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurar sessão
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
  }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 }, // 1 dia
}));

// Inicializar Passport.js e sessão
require('./config/passport')(passport); // Carregar a configuração do Passport
app.use(passport.initialize());
app.use(passport.session());

// Middleware do Flash
app.use(flash());

// Definir variáveis globais para mensagens flash
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
});

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Configurar rotas
app.use('/auth', require('./routes/auth'));
app.use('/chat', require('./routes/assistant')); // Rota para o chat
app.use('/calendar', require('./routes/calendar'));
app.use('/tasks', require('./routes/tasks'));
app.use('/dashboard', require('./routes/dashboard'));
app.use('/profile', require('./routes/profile'));

// Iniciar o servidor
app.listen(port, () => console.log(`Servidor rodando na porta ${port}`));
