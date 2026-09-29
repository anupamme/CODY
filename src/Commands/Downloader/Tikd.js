'use strict';

const socialDl = require('../../Plugin/socialDl');

function findUrl(text) {
    return String(text || '').match(/https?:\/\/(?:www\.|vm\.|vt\.)?tiktok\.com\/\S+/i)?.[0]?.replace(/[)\]>.,;!?]+$/, '') || null;
}

module.exports = {
    name: 'tiktok',
    alias: ['tt', 'tiktokdl', 'ttdl'],
    desc: 'Download TikTok video without watermark',
    category: 'downloader',
    usage: '.tt <TikTok URL>',
    owner: false,
    reactions: { start: '🎵', success: '🔖', error: '❔' },

    execute: async (sock, m, { args, reply, quoted }) => {
        let url = findUrl(args.join(' '));
        if (!url) {
            const target = m.quoted || quoted;
            url = findUrl(target?.text || target?.body || target?.message?.conversation || target?.message?.extendedTextMessage?.text);
        }
        if (!url) return reply('𓄄 *Provide a valid TikTok URL!*\n\nExample: `.tt https://www.tiktok.com/@user/video/123456789`');

        await sock.sendMessage(m.chat, { react: { text: '🎵', key: m.key } });
        const progressMsg = await sock.sendMessage(m.chat, { text: '🎵 *Fetching TikTok...*\n\n🔍 Resolving URL...' });
        const updateProgress = async (percent, phase) => {
            const filled = Math.round(percent / 10);
            const bar = '▰'.repeat(filled) + '▱'.repeat(10 - filled);
            await sock.sendMessage(m.chat, { text: `🎵 *Fetching TikTok...*\n\n${bar} ${percent}%\n\n🔍 ${phase}`, edit: progressMsg.key });
        };

        try {
            await updateProgress(25, 'Downloading with social-dl...');
            const { buffer, mimetype } = await socialDl.downloadTikTok(url);
            await updateProgress(90, 'Processing video...');
            await updateProgress(100, 'Done!');
            await sock.sendMessage(m.chat, { delete: progressMsg.key });
            await sock.sendMessage(m.chat, {
                video: buffer,
                mimetype,
                caption: '🎵 *TikTok Downloader*\n\nDownloaded by CODY',
                fileName: 'tiktok-video.mp4'
            }, { quoted: m });
            await sock.sendMessage(m.chat, { react: { text: '✨', key: m.key } });
        } catch (error) {
            console.error('[TIKTOK SOCIAL-DL]', error.message || error);
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
            await sock.sendMessage(m.chat, { text: `🏗️ TikTok download failed: ${error.message || error}`, edit: progressMsg.key });
        }
    }
};

module.exports.findUrl = findUrl;
