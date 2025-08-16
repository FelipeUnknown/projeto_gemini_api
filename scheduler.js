// scheduler.js

require('dotenv').config();
const cron = require('node-cron');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createPost } = require('./wp-publisher');
const path = require('path');

const geminiApiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(geminiApiKey);

// Função que orquestra a geração e publicação
async function generateAndPublishPost() {
    console.log('Iniciando o processo de geração e publicação agendada...');
    try {
        const prompt = "Crie um artigo inspirador de 300 palavras sobre a importância da tecnologia para a educação. O título deve ser separado do corpo do texto.";
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const generatedText = response.text();

        const [title, ...contentLines] = generatedText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        const content = contentLines.join('\n\n');

        if (!title || !content) {
            console.error('Conteúdo gerado está incompleto. Título ou corpo ausente.');
            return;
        }

        // Caminho para uma imagem local opcional
        const imagePath = path.join(__dirname, 'images', 'foto.png'); 

        await createPost({
            title: title,
            content: content,
            imagePath: imagePath,
            status: 'publish', 
        });

    } catch (error) {
        console.error('Erro no processo de automação:', error);
    }
}

// Agende a tarefa. A expressão abaixo roda a cada 5 segundos para teste.
// Mude para '0 8 * * *' para rodar todos os dias às 8 da manhã.
cron.schedule('0 */30 * * * *', () => {
    generateAndPublishPost();
});

console.log('Agendador de posts iniciado. Aguardando a próxima execução.');