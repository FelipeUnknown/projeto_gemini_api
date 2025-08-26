// wp-publisher.js

const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

// Carrega as variáveis de ambiente (URL da API e token) do arquivo .env
const WP_API_URL = process.env.WP_API_URL;
const WP_API_TOKEN = process.env.WP_API_TOKEN;

// Configura os cabeçalhos de autorização que serão usados em todas as requisições
const headers = {
    'Authorization': `Bearer ${WP_API_TOKEN}`,
};

// A função createPost é responsável por criar uma nova postagem no WordPress.
// Ela recebe o título, conteúdo e status, e envia esses dados para a API.
async function createPost({ title, content, status = 'draft' }) {
    try {
        console.log('Criando novo post...');
        const postData = {
            title: title,
            content: content,
            status: status,
        };
        const response = await axios.post(`${WP_API_URL}/posts`, postData, { headers });
        // ** ID da Postagem **
        // A API do WordPress retorna um objeto JSON com os detalhes do novo post,
        // incluindo um ID único e exclusivo. Este ID é crucial para identificar
        // o post e permitir futuras atualizações ou exclusões.
        console.log(`Novo post criado com sucesso! ID da postagem: ${response.data.id}`);
        return response.data;
    } catch (error) {
        console.error('Erro ao criar o post:', error.response ? error.response.data : error.message);
        throw error;
    }
}

// A função uploadMedia foi completamente comentada, pois a funcionalidade
// de upload de imagens está desativada para evitar erros.
/*
async function uploadMedia(imagePath) {
    try {
        const image = fs.createReadStream(imagePath);
        const form = new FormData();
        form.append('file', image, 'image.png');

        const mediaHeaders = {
            'Authorization': `Bearer ${WP_API_TOKEN}`,
            ...form.getHeaders()
        };

        const response = await axios.post(`${WP_API_URL}/media`, form, { headers: mediaHeaders });
        console.log('Imagem enviada com sucesso. ID da mídia:', response.data.id);
        return response.data.id;
    } catch (error) {
        console.error('Erro ao fazer upload da imagem:', error.response ? error.response.data : error.message);
        throw error;
    }
}
*/

// A função findPostByTitle busca por uma postagem existente usando o título.
// Ela usa o parâmetro 'search' da API do WordPress para encontrar posts
// que contêm o título especificado.
async function findPostByTitle(title) {
    try {
        const response = await axios.get(`${WP_API_URL}/posts`, {
            params: {
                search: title,
            },
            headers: headers
        });
        // Retorna o primeiro post encontrado, ou null se nenhum for encontrado.
        return response.data.length > 0 ? response.data[0] : null;
    } catch (error) {
        console.error('Erro ao procurar o post:', error.response ? error.response.data : error.message);
        return null;
    }
}

// A função updatePost é usada para atualizar o conteúdo e/ou o título
// de um post existente, usando o ID único da postagem.
async function updatePost(postId, newContent, newTitle) {
    try {
        const data = {
            title: newTitle,
            content: newContent,
        };
        const response = await axios.post(`${WP_API_URL}/posts/${postId}`, data, { headers });
        console.log(`Post ID ${postId} atualizado com sucesso!`);
        return response.data;
    } catch (error) {
        console.error('Erro ao atualizar o post:', error.response ? error.response.data : error.message);
        throw error;
    }
}

// Exporta as funções para que possam ser utilizadas por outros arquivos (como o scheduler.js)
module.exports = { createPost, findPostByTitle, updatePost };
