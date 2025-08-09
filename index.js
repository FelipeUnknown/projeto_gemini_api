// index.js

// Carrega as variáveis de ambiente do arquivo .env
require('dotenv').config();

const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = 3000;

// Configura o middleware para processar requisições JSON
app.use(express.json());

// Acessa sua chave da API de forma segura
const apiKey = process.env.API_KEY;
if (!apiKey) {
  throw new Error("API_KEY não encontrada no arquivo .env");
}

// Inicializa a API do Google Gemini
const genAI = new GoogleGenerativeAI(apiKey);

// --- Rota de Verificação (Health Check) ---
app.get('/', (req, res) => {
  res.send('Servidor Gemini está rodando!');
});

// --- Rota para Geração de Texto ---
// Esta rota vai receber um prompt e retornar o texto gerado.
app.post('/generate-text', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'O prompt é obrigatório para a geração de texto.' });
    }

    // Seleciona o modelo a ser usado para a geração de conteúdo.
    // 'gemini-1.5-flash' é um modelo rápido e eficiente.
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Chama a API para gerar conteúdo com base no prompt
    const result = await model.generateContent(prompt);

    // Extrai o objeto de resposta da API
    const response = await result.response;

    // Extrai o texto gerado da resposta
    const text = response.text();

    // Envia o texto gerado de volta para o cliente
    res.status(200).json({ generatedText: text });

  } catch (error) {
    console.error('Erro ao interagir com a API do Gemini:', error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
  }
});

// --- Rota para o Chat (para manter seu exemplo anterior) ---
app.post('/chat', async (req, res) => {
  // Código da rota de chat que já estava funcionando
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'O prompt é obrigatório.' });
    }
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    res.status(200).json({ response: text });
  } catch (error) {
    console.error('Erro ao interagir com a API do Gemini:', error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
  }
});


// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});