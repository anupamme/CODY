'use strict';

const { downloadUniversal } = require('../../Plugin/socialDl');

function extractUrl(text) {
    return String(text || '').match(/https?:\/\/\S+/i)?.[0]?.replace(/[)\]>.,;!?]+$/, '') || null;
}

function normalizeResult(data) {
    const root = data?.result || data?.data || {};
    const raw = Array.isArray(root.fb_bos) ? root.fb_bos : [];
    const media = raw.map(item => ({
        kind: String(item.type || '').startsWith('m4') ? 'audio' : 'video',
        url: item.original_url || item.url
    })).filter(item => item.url);
    return {
        video: media.find(item => item.kind === 'video')?.url || null,
        audio: media.find(item => item.kind === 'audio')?.url || null,
        images: [], media,
        platform: data?.platform || root.platform || 'Media',
        author: root.author || root.username || root.uploader || data?.creator || '',
        title: String(root.desc || root.description || root.title || data?.message || '').trim(),
        duration: Number(root.duration || root.duration_seconds) || 0,
        thumbnail: null
    };
}

function buildCaption(media) {
    const parts = [`🌐 ${media.platform}`];
    if (media.author) parts.push(`👤 ${media.author}`);
    if (media.duration) parts.push(`⏱️ ${media.duration}s`);
    return media.title ? `${parts.join(' · ')}\n\n${media.title}` : parts.join(' · ');
}

module.exports = {
    name: 'unidownload',
    alias: ['unid', 'udl', 'downloadall'],
    desc: 'Download media from supported social platforms',
    category: 'Search',
    usage: '.unidownload <url>',
    reactions: { start: '📥', success: '❤️‍🩹', error: '❔' },

    execute: async (sock, m, { args, reply }) => {
        const url = extractUrl(args.join(' ').trim());
        if (!url) return reply('Usage: .unidownload <url>');
        await sock.sendMessage(m.chat, { react: { text: '📥', key: m.key } });
        try {
            const { buffer, mimetype } = await downloadUniversal(url);
            await sock.sendMessage(m.chat, {
                video: buffer,
                mimetype,
                caption: '🌐 *Social Downloader*'
            }, { quoted: m });
            await sock.sendMessage(m.chat, { react: { text: '❤️‍🩹', key: m.key } });
        } catch (error) {
            console.error('[UNIDOWNLOAD ERROR]', error.message || error);
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } }).catch(() => {});
            return reply(`✘ Universal download failed: ${error.message || error}`);
        }
    }
};

module.exports.extractUrl = extractUrl;
module.exports.normalizeResult = normalizeResult;
module.exports.buildCaption = buildCaption;
