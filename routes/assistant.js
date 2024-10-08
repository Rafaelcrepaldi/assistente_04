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

  if (!conversationHistory || !Array.isArray(conversationHistory)) {
    conversationHistory = [];
  }

  if (conversationHistory.length === 0 && modelPrompts[model]) {
    let prompt = modelPrompts[model];
    if (exerciseTopic) {
      prompt += ` Crie um exercício com o tema: "${exerciseTopic}" e forneça uma resposta correta clara. Por favor, formate a resposta como "Resposta:" logo após o exercício.`;
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

    // Aqui estamos assumindo que a resposta correta virá precedida por "Resposta:".
    const answerIndex = responseMessage.indexOf('Resposta:');

    if (answerIndex === -1) {
      // Se não houver "Resposta:" no texto retornado, podemos retornar um erro
      return res.status(400).json({ error: 'Não foi possível identificar a resposta correta no texto gerado. Por favor, revise o prompt ou tente novamente.' });
    }

    // Separar o exercício da resposta correta
    const exerciseContent = responseMessage.slice(0, answerIndex).trim();
    const exerciseAnswer = responseMessage.slice(answerIndex + 9).trim(); // Pega o texto após "Resposta:"

    if (!exerciseAnswer) {
      return res.status(400).json({ error: 'A resposta correta não foi fornecida corretamente.' });
    }

    // Salvar o exercício gerado no banco de dados
    if (exerciseTopic) {
      const newExercise = new Exercise({
        topic: exerciseTopic,
        content: exerciseContent, // conteúdo do exercício
        answer: exerciseAnswer,   // resposta correta extraída
        createdBy: req.user._id    // ID do usuário que solicitou o exercício
      });
      await newExercise.save();
    }

    res.json({ message: responseMessage });
  } catch (error) {
    console.error('Erro ao se comunicar com a API do OpenAI:', error);
    res.status(500).json({ error: 'Erro ao processar a solicitação' });
  }
});

router.post('/submit/:id', ensureAuthenticated, async (req, res) => {
  const userAnswer = req.body.userAnswer.trim().toLowerCase(); // Resposta do usuário
  try {
    // Busca o exercício no banco de dados
    const exercise = await Exercise.findOne({ _id: req.params.id, createdBy: req.user._id });

    if (!exercise) {
      req.flash('error_msg', 'Exercício não encontrado.');
      return res.redirect('/exercises');
    }

    // Comparar a resposta do usuário com a resposta correta
    const correctAnswer = exercise.answer.trim().toLowerCase(); // Resposta correta

    // Verifica se a resposta está correta
    const isCorrect = userAnswer === correctAnswer;

    // Redireciona com feedback para o usuário
    if (isCorrect) {
      req.flash('success_msg', 'Resposta correta! Parabéns!');
    } else {
      req.flash('error_msg', 'Resposta incorreta. Tente novamente.');
    }

    res.redirect(`/exercises/${req.params.id}`);
  } catch (error) {
    console.error('Erro ao processar a resposta:', error);
    req.flash('error_msg', 'Erro ao processar a resposta.');
    res.redirect('/exercises');
  }
});

// Rota para verificar a resposta correta
router.get('/check-answer/:id', ensureAuthenticated, async (req, res) => {
  try {
    // Busca o exercício no banco de dados
    const exercise = await Exercise.findOne({ _id: req.params.id, createdBy: req.user._id });

    if (!exercise) {
      return res.status(404).json({ success: false, message: 'Exercício não encontrado.' });
    }

    // Retorna a resposta correta
    res.status(200).json({ success: true, answer: exercise.answer });
  } catch (error) {
    console.error('Erro ao buscar a resposta correta:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar a resposta correta.' });
  }
});

router.post('/submit/:id', ensureAuthenticated, async (req, res) => {
  const userAnswer = req.body.userAnswer.trim(); // Resposta do usuário
  try {
    // Busca o exercício no banco de dados
    const exercise = await Exercise.findOne({ _id: req.params.id, createdBy: req.user._id });

    if (!exercise) {
      req.flash('error_msg', 'Exercício não encontrado.');
      return res.redirect('/exercises');
    }

    const correctAnswer = exercise.answer.trim(); // Resposta correta

    // Enviar para a IA a comparação entre a resposta do usuário e a resposta correta
    const prompt = `
    Você é um avaliador de respostas de exercícios. O objetivo é comparar duas respostas e determinar quão parecidas elas são. Diga se a resposta do usuário é correta com base na resposta correta fornecida. Se forem muito parecidas, considere a resposta correta.

    Resposta do usuário: ${userAnswer}
    Resposta correta: ${correctAnswer}

    Avalie se a resposta do usuário é correta ou incorreta com base na similaridade entre as duas respostas. Responda apenas com "Correto" ou "Incorreto" e, se possível, explique brevemente.`;

    // Use a função correta para completar
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
      temperature: 0.5,
    });

    const aiEvaluation = response.choices[0].message.content.trim();

    // Verifique se a IA considerou a resposta correta ou incorreta
    const isCorrect = aiEvaluation.toLowerCase().includes('correto');

    // Feedback ao usuário
    if (isCorrect) {
      req.flash('success_msg', 'Resposta correta! Parabéns!');
    } else {
      req.flash('error_msg', 'Resposta incorreta. Tente novamente.');
    }

    // Armazenar a avaliação da IA para referência futura (opcional)
    await exercise.updateOne({ $set: { lastEvaluation: aiEvaluation } });

    res.redirect(`/exercises/${req.params.id}`);
  } catch (error) {
    console.error('Erro ao processar a resposta:', error);
    req.flash('error_msg', 'Erro ao processar a resposta.');
    res.redirect('/exercises');
  }
});




module.exports = router;
