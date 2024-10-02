// Importações necessárias
const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const OpenAI = require('openai'); // Importação correta

// Carregar variáveis de ambiente
dotenv.config();

// Configurar a API OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY // Certifique-se de que a variável de ambiente está configurada
});

const app = express();
const port = process.env.PORT || 3000;

// Middleware para permitir o uso de JSON
app.use(express.json());

// Rota principal da assistente
app.post('/assistente', async (req, res) => {
  const userPrompt = req.body.prompt; // Prompt vindo da requisição do usuário

  try {
    // Fazer requisição para a API da OpenAI usando GPT-4 com streaming
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: userPrompt }],
      stream: true,
    });

    // Configurar o cabeçalho da resposta para indicar que é um stream
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Manter a conexão aberta
    res.flushHeaders();

    // Tratamento do streaming de dados
    for await (const part of response) {
      const content = part.choices[0]?.delta?.content || '';
      process.stdout.write(content); // Saída no console
      res.write(content); // Enviar chunk para o cliente
    }

    // Terminar a resposta
    res.end();

  } catch (error) {
    console.error(
      'Erro ao acessar a API OpenAI:',
      error.response ? error.response.data : error.message
    );
    // Certifique-se de que a resposta não foi enviada ainda
    if (!res.headersSent) {
      res.status(500).json({ error: 'Erro ao processar a solicitação da assistente' });
    } else {
      res.end();
    }
  }
});

// Iniciar o servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
