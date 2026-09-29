'use strict';

const socialDl = require('../../Plugin/socialDl');

module.exports = {
    name: 'yturld',
    alias: ['ytaudio', 'ytmp3'],
    desc: 'Download YouTube audio',
    category: 'Download',
    usage: '.yturld <YouTube URL>',
    reactions: { start: '🔍', success: '🎤' },

    execute: async (sock, m, { args, reply }) => {
        const url = args.join(' ').match(/https?:\/\/(?:www\.|m\.|music\.)?(?:youtube\.com|youtu\.be)\/\S+/i)?.[0]?.replace(/[)\]>.,;!?]+$/, '');
        if (!url) return reply('✘ Provide a YouTube URL');

        try {
            await sock.sendPresenceUpdate?.('composing', m.chat);
            const { buffer } = await socialDl.downloadYouTube(url, { audioOnly: true });
            await sock.sendMessage(m.chat, {
                audio: buffer,
                mimetype: 'audio/mp4',
                fileName: 'youtube_audio.m4a'
            }, { quoted: m });
        } catch (error) {
            console.error('[YTAUDIO ERROR]', error.message || error);
            return reply(`❌ Failed to download YouTube audio: ${error.message || error}`);
        }
    }
};
