'use strict';

const { request, pickUrl, apiError } = require('../../Plugin/prexzyMedia');
const PREFIX = process.env.PREFIX || '.';

module.exports = {
    name: 'yts',
    alias: ['streamyt', 'ytstream'],
    desc: 'Stream YouTube video',
    category: 'downloader',
    usage: `${PREFIX}yts <YouTube URL>`,

    execute: async (sock, m, { args, reply }) => {
        const url = args.join(' ').match(/https?:\/\/(?:www\.|m\.|music\.)?(?:youtube\.com|youtu\.be)\/\S+/i)?.[0]?.replace(/[)\]>.,;!?]+$/, '');
        if (!url) return reply(`𓄄 *Provide a valid YouTube URL!*\n\nExample: ${PREFIX}yts https://youtu.be/xxxx`);

        await reply('✪ _*Downloading YouTube video...*_');
        try {
            const { data, status } = await request('ytmp4', url);
            if (data?.status === false || data?.success === false) throw apiError(data, status);
            const info = data.info || data.result?.info || {};
            const video = pickUrl(data.download_url, data.url, data.result?.download_url, data.result?.url, data.data?.download_url);
            if (!video) throw apiError(data, status, 'no download URL in response');
            const title = info.title || data.title || data.result?.title || 'YouTube Video';
            await sock.sendMessage(m.chat, {
                video: { url: video },
                mimetype: 'video/mp4',
                caption: `🎬 *YouTube Downloader*\n\nTitle: ${title}`,
                fileName: `${title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 60)}.mp4`
            }, { quoted: m });
        } catch (error) {
            console.error('[YTS DOWNLOAD]', error.message || error);
            return reply(`✘ YouTube stream failed: ${error.message || error}`);
        }
    }
};
