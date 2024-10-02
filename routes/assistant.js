// routes/assistant.js

const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');

// Configuração da API OpenAI (já foi configurada no seu arquivo principal, então podemos reutilizar)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Rota para interagir com a assistente virtual
router.post('/', async (req, res) => {
  const { conversationHistory } = req.body;

  console.log('Requisição recebida em /chat');
  console.log('Histórico de conversa:', conversationHistory);

  if (!conversationHistory || !Array.isArray(conversationHistory)) {
    console.error('Histórico de conversa inválido.');
    return res.status(400).json({ error: 'Histórico de conversa inválido.' });
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // Use 'gpt-3.5-turbo' se não tiver acesso ao GPT-4
      messages: conversationHistory,
    });

    const responseMessage = response.choices[0].message.content;
    res.json({ message: responseMessage });
  } catch (error) {
    console.error('Erro ao se comunicar com a API do OpenAI:', error);
    res.status(500).json({ error: 'Erro ao processar a solicitação' });
  }
});

module.exports = router;
