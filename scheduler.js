// scheduler.js

// Carrega variáveis de ambiente do arquivo .env
require('dotenv').config();
const cron = require('node-cron');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios'); // Importa a biblioteca axios para fazer requisições HTTP.
// Importa as funções do nosso módulo wp-publisher.js
const { createPost, findPostByTitle, updatePost } = require('./wp-publisher');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');

const geminiApiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(geminiApiKey);

// Carrega as variáveis de ambiente do WordPress.
const WP_API_URL = process.env.WP_API_URL;
const WP_API_TOKEN = process.env.WP_API_TOKEN;

// Configura os cabeçalhos de autorização que serão usados nas requisições.
const headers = {
    'Authorization': `Bearer ${WP_API_TOKEN}`,
};

// ID do post que será atualizado diariamente.
// O valor foi alterado para '1' para que o script sempre tente
// atualizar o post com este ID.
const POST_ID_TO_UPDATE = 1;

// Função para ler o arquivo CSV e encontrar o prompt do dia da semana
// Esta função é responsável por encontrar qual o conteúdo agendado para o dia atual
// com base nos dados do seu arquivo 'schedule.csv'.
async function getTodaysPrompt() {
    const today = new Date();
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todaysDay = daysOfWeek[today.getDay()];

    return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(path.join(__dirname, 'schedule.csv'))
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => {
                const todaysRow = results.find(row => row.Day === todaysDay);
                if (todaysRow) {
                    resolve(todaysRow['Blog Content']);
                } else {
                    reject('Não há conteúdo agendado para o dia de hoje.');
                }
            })
            .on('error', (error) => {
                reject('Erro ao ler o arquivo CSV: ' + error.message);
            });
    });
}

// A função principal que gera e publica/atualiza o post
// Esta é a função mais importante, onde a lógica de automação acontece.
async function generateAndPublishPost() {
    console.log('Iniciando o processo de geração e publicação agendada...');

    try {
        const promptContent = await getTodaysPrompt();
        
        // Geração do conteúdo do post
        // Acessa a API do Gemini com o conteúdo do CSV para gerar o texto do blog.
        const prompt = `Crie um artigo de blog com o título e o conteúdo sobre o seguinte tema: "${promptContent}". O texto deve ser formatado em Markdown, com cabeçalhos e parágrafos. Não inclua a imagem no conteúdo, apenas o texto.`;
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Extrai o título e o conteúdo do texto gerado
        const title = text.split('\n')[0].replace(/#+\s*/, '').trim();
        const content = text;
        
        try {
            // Tenta obter o post com o ID fixo para verificar o conteúdo antes de atualizar.
            const existingPostResponse = await axios.get(`${WP_API_URL}/posts/${POST_ID_TO_UPDATE}`, { headers });
            const existingPost = existingPostResponse.data;

            // Compara o conteúdo do post existente com o conteúdo gerado.
            // A função .trim() é usada para remover espaços em branco e garantir uma comparação precisa.
            if (existingPost.content.rendered.trim() === content.trim()) {
                console.log(`Post com ID ${POST_ID_TO_UPDATE} já tem o conteúdo do dia. Nenhuma atualização necessária.`);
            } else {
                // Se o conteúdo for diferente, atualiza o post.
                console.log(`Tentando atualizar o post com ID ${POST_ID_TO_UPDATE} com novo conteúdo.`);
                await updatePost(POST_ID_TO_UPDATE, content, title);
                console.log(`Post ID ${POST_ID_TO_UPDATE} atualizado com sucesso.`);
            }

        } catch (error) {
            // Se o post não for encontrado (status 404), ele não existe e precisa ser criado.
            if (error.response && error.response.status === 404) {
                console.log(`Post com ID ${POST_ID_TO_UPDATE} não encontrado. Criando um novo post...`);
                const newPost = await createPost({
                    title: title,
                    content: content,
                    status: 'publish', 
                });
                console.log(`Novo post criado com sucesso! Por favor, atualize o valor de POST_ID_TO_UPDATE no código com o novo ID: ${newPost.id}`);
            } else {
                // Se for outro tipo de erro, lança-o.
                throw error;
            }
        }

    } catch (error) {
        console.error('Erro no processo de automação:', error.message);
    }
}

// Configura o agendamento com a biblioteca node-cron
// A expressão '*/25 * * * * *' significa que a função será executada
// a cada 25 segundos.
cron.schedule('*/25 * * * * *', () => {
    generateAndPublishPost();
});

console.log('Agendador de posts iniciado. Aguardando a próxima execução.');
