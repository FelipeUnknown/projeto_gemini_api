// scheduler.js

require('dotenv').config();
const cron = require('node-cron');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createPost, findPostByTitle, updatePost } = require('./wp-publisher');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');

const geminiApiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(geminiApiKey);

// Função para ler o arquivo CSV e encontrar o prompt do dia da semana
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
async function generateAndPublishPost() {
    console.log('Iniciando o processo de geração e publicação agendada...');

    try {
        const promptContent = await getTodaysPrompt();
        
        // Geração do conteúdo do post
        const prompt = `Crie um artigo de blog com o título e o conteúdo sobre o seguinte tema: "${promptContent}". O texto deve ser formatado em Markdown, com cabeçalhos e parágrafos. Não inclua a imagem no conteúdo, apenas o texto.`;
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Extrai o título e o conteúdo do texto gerado
        const title = text.split('\n')[0].replace(/#+\s*/, '').trim();
        const content = text;
        
        console.log('Verificando se o post já existe...');
        // Procurar por posts com o título
        const existingPost = await findPostByTitle(title);

        if (existingPost) {
            // Se encontrar um post, verificar se o título é uma correspondência exata.
            if (existingPost.title.rendered.toLowerCase() === title.toLowerCase()) {
                console.log(`Post "${title}" já existe. Atualizando...`);
                await updatePost(existingPost.id, content, title);
                console.log('Post atualizado com sucesso!');
            } else {
                // Se a busca retornar um resultado parcial, mas não o post exato, cria um novo
                console.log(`Post com título exato "${title}" não encontrado. Criando um novo...`);
                await createPost({
                    title: title,
                    content: content,
                    status: 'publish', 
                });
                console.log('Novo post publicado com sucesso!');
            }
        } else {
            // Se nenhum post foi encontrado, cria um novo
            console.log(`Post "${title}" não encontrado. Criando um novo...`);
            await createPost({
                title: title,
                content: content,
                status: 'publish', 
            });
            console.log('Novo post publicado com sucesso!');
        }

    } catch (error) {
        console.error('Erro no processo de automação:', error.message);
    }
}

// O agendamento para 4 publicações por minuto
cron.schedule('*/25 * * * * *', () => {
    generateAndPublishPost();
});

console.log('Agendador de posts iniciado. Aguardando a próxima execução.');

// Opcional: para testar a função imediatamente
// generateAndPublishPost();
