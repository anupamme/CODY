'use strict';

const { request, pickUrl, apiError } = require('../../Plugin/prexzyMedia');

module.exports = {
    name: 'yturld',
    alias: ['ytaudio', 'ytmp3'],
    desc: 'Download YouTube audio as MP3',
    category: 'Download',
    usage: '.yturld <YouTube URL>',
    reactions: { start: '🔍', success: '🎤' },

    execute: async (sock, m, { args, reply }) => {
        const url = args.join(' ').match(/https?:\/\/(?:www\.|m\.|music\.)?(?:youtube\.com|youtu\.be)\/\S+/i)?.[0]?.replace(/[)\]>.,;!?]+$/, '');
        if (!url) return reply('✘ Provide a YouTube URL');

        try {
            await sock.sendPresenceUpdate?.('composing', m.chat);
            const { data, status } = await request('ytmp3', url);
            if (data?.status === false || data?.success === false) throw apiError(data, status);
            const audioUrl = pickUrl(data.download_url, data.download, data.url, data.result?.download_url, data.result?.url);
            if (!audioUrl) throw apiError(data, status, 'no download URL in response');
            const title = (data.info?.title || data.title || data.result?.title || 'youtube_audio').replace(/[^\w\s]/gi, '') || 'youtube_audio';

            await sock.sendMessage(m.chat, {
                audio: { url: audioUrl },
                mimetype: 'audio/mpeg',
                fileName: `${title}.mp3`
            }, { quoted: m });
        } catch (error) {
            console.error('[YTAUDIO ERROR]', error.message || error);
            return reply(`❌ Failed to download YouTube audio: ${error.message || error}`);
        }
    }
};
