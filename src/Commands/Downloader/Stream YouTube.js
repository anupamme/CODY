'use strict';

const socialDl = require('../../Plugin/socialDl');
const PREFIX = process.env.PREFIX || '.';

module.exports = {
    name: 'yts',
    alias: ['streamyt', 'ytstream'],
    desc: 'Download YouTube video',
    category: 'downloader',
    usage: `${PREFIX}yts <YouTube URL>`,

    execute: async (sock, m, { args, reply }) => {
        const url = args.join(' ').match(/https?:\/\/(?:www\.|m\.|music\.)?(?:youtube\.com|youtu\.be)\/\S+/i)?.[0]?.replace(/[)\]>.,;!?]+$/, '');
        if (!url) return reply(`𓄄 *Provide a valid YouTube URL!*\n\nExample: ${PREFIX}yts https://youtu.be/xxxx`);
        await reply('✪ _*Downloading YouTube video...*_');
        try {
            const { buffer, mimetype } = await socialDl.downloadYouTube(url);
            await sock.sendMessage(m.chat, {
                video: buffer,
                mimetype,
                caption: '🎬 *YouTube Downloader*'
            }, { quoted: m });
        } catch (error) {
            console.error('[YTS DOWNLOAD]', error.message || error);
            return reply(`✘ YouTube download failed: ${error.message || error}`);
        }
    }
};
