// wp-publisher.js

const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

const token = process.env.WP_API_TOKEN;
const apiUrl = process.env.WP_API_URL;

/**
 * Faz o upload de uma imagem para a biblioteca de mídia do WordPress.
 * @param {string} imagePath O caminho local da imagem.
 * @returns {Promise<number|null>} O ID da mídia ou null em caso de erro.
 */
async function uploadMedia(imagePath) {
    if (!fs.existsSync(imagePath)) {
        console.error('Erro: Arquivo de imagem não encontrado no caminho:', imagePath);
        return null;
    }
    
    try {
        const formData = new FormData();
        const imageName = path.basename(imagePath);
        formData.append('file', fs.createReadStream(imagePath), imageName);
        formData.append('title', imageName);

        const response = await axios.post(`${apiUrl}/media`, formData, {
            headers: {
                'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log(`Upload de mídia "${imageName}" bem-sucedido! ID: ${response.data.id}`);
        return response.data.id;
    } catch (error) {
        console.error('Erro ao fazer upload da imagem:', error.response ? error.response.data.message : error.message);
        return null;
    }
}

/**
 * Cria um novo post no WordPress.
 * @param {object} postData Os dados do post (título, conteúdo, etc.).
 * @returns {Promise<object|null>} O post criado ou null em caso de erro.
 */
async function createPost({ title, content, imagePath, status = 'publish' }) {
    try {
        let featuredMediaId = null;
        if (imagePath) {
            featuredMediaId = await uploadMedia(imagePath);
        }

        const postData = {
            title: title,
            content: content,
            status: status,
            featured_media: featuredMediaId,
        };

        const response = await axios.post(`${apiUrl}/posts`, postData, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        console.log(`Post "${title}" publicado com sucesso!`);
        return response.data;
    } catch (error) {
        console.error('Erro ao criar o post:', error.response ? error.response.data.message : error.message);
        return null;
    }
}

module.exports = { createPost };