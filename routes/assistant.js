const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');
const Exercise = require('../models/Exercise'); // Importar o modelo de exercício
const { ensureAuthenticated } = require('../middlewares/auth');

router.get('/', ensureAuthenticated, (req, res) => {
  res.render('chat', { user: req.user });
});
// Instanciar o cliente OpenAI usando a variável de ambiente
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Definir prompts baseados no modelo selecionado
const modelPrompts = {
  professor_programacao: "Você é um professor especializado em programação. Crie exercícios de programação sobre o tema fornecido.",
  professor_ingles: "Você é um professor de inglês. Crie exercícios de inglês sobre o tema fornecido.",
  professor_portugues: "Você é um professor de português. Crie exercícios sobre gramática e redação com base no tema fornecido.",
  professor_matematica: "Você é um professor de matemática e exatas. Crie exercícios matemáticos sobre o tema fornecido.",
  assistente_pessoal: "Você é um assistente pessoal e deve auxiliar na organização e planejamento."
};

// Rota POST para lidar com a criação de exercícios
router.post('/', async (req, res) => {
  let { conversationHistory, model, exerciseTopic } = req.body;

  // Se o histórico de conversa não existir, inicialize como um array vazio
  if (!conversationHistory || !Array.isArray(conversationHistory)) {
    conversationHistory = [];
  }

  // Adiciona o prompt baseado no modelo e no tema fornecido
  if (conversationHistory.length === 0 && modelPrompts[model]) {
    let prompt = modelPrompts[model];
    if (exerciseTopic) {
      prompt += ` Crie exercícios ou uma prova com o tema: "${exerciseTopic}".`;
    }
    conversationHistory.push({ role: 'system', content: prompt });
  }

  try {
    // Faz a chamada à API do OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: conversationHistory,
    });

    const responseMessage = response.choices[0].message.content;

    // Salvar o exercício gerado no banco de dados se o tema for fornecido
    if (exerciseTopic) {
      const newExercise = new Exercise({
        topic: exerciseTopic,
        content: responseMessage,
        createdBy: req.user._id // ID do usuário que solicitou o exercício
      });
      await newExercise.save();
    }

    res.json({ message: responseMessage });
  } catch (error) {
    console.error('Erro ao se comunicar com a API do OpenAI:', error);
    res.status(500).json({ error: 'Erro ao processar a solicitação' });
  }
});

module.exports = router;
