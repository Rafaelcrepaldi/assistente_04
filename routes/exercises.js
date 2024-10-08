const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middlewares/auth');
const Exercise = require('../models/Exercise'); // Importar o modelo de exercício
const { OpenAI } = require('openai');

// Configurar a API OpenAI corretamente
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Rota GET para listar todos os exercícios
// Rota GET para listar todos os exercícios
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    // Busca os exercícios no banco de dados para o usuário logado
    const exercises = await Exercise.find({ createdBy: req.user._id }).sort({ createdAt: -1 });

    // Passa a variável exercises para o template EJS
    res.render('exercises', { exercises });
  } catch (error) {
    console.error('Erro ao carregar os exercícios:', error);
    req.flash('error_msg', 'Erro ao carregar os exercícios.');
    res.redirect('/chat');
  }
});

// Rota GET para visualizar um exercício específico
router.get('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const exercise = await Exercise.findOne({ _id: req.params.id, createdBy: req.user._id });

    if (!exercise) {
      req.flash('error_msg', 'Exercício não encontrado.');
      return res.redirect('/exercises');
    }

    res.render('exercise_view', { exercise });
  } catch (error) {
    console.error('Erro ao carregar o exercício:', error);
    req.flash('error_msg', 'Erro ao carregar o exercício.');
    res.redirect('/exercises');
  }
});

// Rota DELETE para excluir um exercício
router.delete('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const result = await Exercise.deleteOne({ _id: req.params.id, createdBy: req.user._id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Exercício não encontrado.' });
    }

    res.status(200).json({ success: 'Exercício excluído com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir o exercício:', error);
    res.status(500).json({ error: 'Erro ao excluir o exercício.' });
  }
});

// Rota POST para submeter a resposta do usuário e comparar com a resposta correta usando a IA
router.post('/submit/:id', ensureAuthenticated, async (req, res) => {
  const userAnswer = req.body.userAnswer.trim(); // Resposta do usuário
  try {
    // Busca o exercício no banco de dados
    const exercise = await Exercise.findOne({ _id: req.params.id, createdBy: req.user._id });

    if (!exercise) {
      req.flash('error_msg', 'Exercício não encontrado.');
      return res.redirect('/exercises');
    }

    // Verificar se o exercício já foi completado
    if (exercise.completed) {
      req.flash('error_msg', 'Este exercício já foi completado.');
      return res.redirect(`/exercises/${req.params.id}`);
    }

    // Verificar se o usuário já fez 3 tentativas
    if (exercise.attempts >= 3) {
      req.flash('error_msg', 'Você atingiu o limite de tentativas para este exercício.');
      await Exercise.deleteOne({ _id: req.params.id }); // Excluir o exercício após falhar
      return res.redirect('/exercises');
    }

    const correctAnswer = exercise.answer.trim(); // Resposta correta

    // Enviar para a IA a comparação entre a resposta do usuário e a resposta correta
    const prompt = `
    Você é um avaliador de respostas de exercícios. O objetivo é comparar duas respostas e determinar quão parecidas elas são. Diga se a resposta do usuário é correta com base na resposta correta fornecida. Se forem muito parecidas, considere a resposta correta.

    Resposta do usuário: ${userAnswer}
    Resposta correta: ${correctAnswer}

    Avalie se a resposta do usuário é correta ou incorreta com base na similaridade entre as duas respostas. Responda apenas com "Correto" ou "Incorreto" e, se possível, explique brevemente.`;

    let isCorrect = false;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
        temperature: 0.5,
      });
      const aiEvaluation = response.choices[0].message.content.trim();

      // Verifique se a IA considerou a resposta correta ou incorreta
      isCorrect = aiEvaluation.toLowerCase().includes('correto');
    } catch (error) {
      console.error('Erro ao comunicar-se com a API OpenAI:', error);
      req.flash('error_msg', 'Erro ao comunicar-se com a IA. Tente novamente.');
      return res.redirect(`/exercises/${req.params.id}`);
    }

    if (isCorrect) {
      req.flash('success_msg', 'Resposta correta! Parabéns!');

      // Atualizar os pontos do usuário
      req.user.points += 10; // Adiciona 10 pontos, você pode modificar esse valor
      await req.user.save(); // Salva os pontos atualizados no banco de dados

      // Excluir o exercício após completá-lo com sucesso
      await Exercise.deleteOne({ _id: req.params.id });

      // Criar um novo exercício automaticamente (opcional)
      const newExercisePrompt = `
      Crie um novo exercício no formato de pergunta para o usuário aprender mais sobre o tema: "${exercise.topic}".`;
      
      try {
        const newExerciseResponse = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: newExercisePrompt }],
          max_tokens: 200,
          temperature: 0.7,
        });

        const newExerciseContent = newExerciseResponse.choices[0].message.content.trim();

        // Criar o novo exercício no banco de dados
        const newExercise = new Exercise({
          topic: exercise.topic, // Mantém o mesmo tema
          content: newExerciseContent, // Conteúdo gerado pelo GPT-4
          answer: "Resposta correta gerada pela IA", // Assumimos que você extrairá a resposta correta
          createdBy: req.user._id, // ID do usuário
        });

        await newExercise.save(); // Salva o novo exercício no banco de dados
        req.flash('success_msg', 'Novo exercício gerado! Você ganhou 10 pontos!');
      } catch (error) {
        console.error('Erro ao gerar novo exercício com a IA:', error);
        req.flash('error_msg', 'Erro ao gerar novo exercício.');
      }
    } else {
      req.flash('error_msg', 'Resposta incorreta. Tente novamente.');

      // Incrementar o número de tentativas
      exercise.attempts += 1;

      // Se o número de tentativas atingir 3, marcar o exercício como completado e excluí-lo
      if (exercise.attempts >= 3) {
        req.flash('error_msg', 'Você atingiu o limite de tentativas. O exercício está fechado.');
        await Exercise.deleteOne({ _id: req.params.id }); // Excluir o exercício após falhar
      } else {
        await exercise.save(); // Salva o número de tentativas
      }
    }

    res.redirect(`/exercises`);
  } catch (error) {
    console.error('Erro ao processar a resposta:', error);
    req.flash('error_msg', 'Erro ao processar a resposta.');
    res.redirect('/exercises');
  }
});

// Rota para verificar a resposta correta
// Rota para verificar a resposta correta e excluir o exercício após a visualização
router.get('/check-answer/:id', ensureAuthenticated, async (req, res) => {
  try {
    // Busca o exercício no banco de dados
    const exercise = await Exercise.findOne({ _id: req.params.id, createdBy: req.user._id });

    if (!exercise) {
      return res.status(404).json({ success: false, message: 'Exercício não encontrado.' });
    }

    // Retorna a resposta correta
    const answer = exercise.answer;

    // Excluir o exercício após o usuário visualizar a resposta
    await Exercise.deleteOne({ _id: req.params.id });

    // Enviar a resposta correta ao usuário e uma mensagem informando que o exercício foi excluído
    return res.status(200).json({
      success: true,
      message: 'Exercício fechado após a visualização da resposta.',
      answer: answer
    });
  } catch (error) {
    console.error('Erro ao buscar a resposta correta:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar a resposta correta.' });
  }
});

module.exports = router;
