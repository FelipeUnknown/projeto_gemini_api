// wp-publisher.js

const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

const WP_API_URL = process.env.WP_API_URL;
const WP_API_TOKEN = process.env.WP_API_TOKEN;

const headers = {
    'Authorization': `Bearer ${WP_API_TOKEN}`,
};

async function createPost({ title, content, status = 'draft' }) {
    try {
        // As linhas abaixo foram comentadas para desabilitar o upload de mídia e o uso da imagem no post.
        // Isso permite que você continue os testes do resto da automação.
        // console.log('Iniciando upload de mídia...');
        // const mediaId = await uploadMedia(imagePath);

        console.log('Criando novo post...');
        const postData = {
            title: title,
            content: content,
            status: status,
            // A linha 'featured_media' foi comentada.
            // featured_media: mediaId,
        };
        const response = await axios.post(`${WP_API_URL}/posts`, postData, { headers });
        return response.data;
    } catch (error) {
        console.error('Erro ao criar o post:', error.response ? error.response.data : error.message);
        throw error;
    }
}

// A função `uploadMedia` foi completamente comentada.
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

// NOVA FUNÇÃO: Encontrar um post pelo título
async function findPostByTitle(title) {
    try {
        const response = await axios.get(`${WP_API_URL}/posts`, {
            params: {
                search: title,
            },
            headers: headers
        });
        // Retorna o primeiro post encontrado, se houver
        return response.data.length > 0 ? response.data[0] : null;
    } catch (error) {
        console.error('Erro ao procurar o post:', error.response ? error.response.data : error.message);
        return null;
    }
}

// NOVA FUNÇÃO: Atualizar um post
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

// O módulo de exportação foi atualizado para não exportar a função `uploadMedia`.
module.exports = { createPost, findPostByTitle, updatePost };
