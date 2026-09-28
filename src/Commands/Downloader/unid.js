'use strict';

const { request, collectMedia } = require('../../Plugin/prexzyMedia');

function normalizeResult(data) {
    const root = data?.result || data?.data || {};
    const media = collectMedia(data);
    const video = media.find(item => item.kind === 'video')?.url || null;
    const audio = media.find(item => item.kind === 'audio')?.url || null;
    const images = media.filter(item => item.kind === 'image').map(item => item.url);
    return {
        video,
        audio,
        images,
        media,
        platform: data?.platform || root.platform || 'Media',
        author: root.author || root.username || root.uploader || data?.creator || '',
        title: String(root.desc || root.description || root.title || data?.message || '').trim(),
        duration: Number(root.duration || root.duration_seconds) || 0,
        thumbnail: media.find(item => item.thumbnail)?.thumbnail || null
    };
}

function buildCaption(media) {
    const parts = [`🌐 ${media.platform}`];
    if (media.author) parts.push(`👤 ${media.author}`);
    if (media.duration) parts.push(`⏱️ ${media.duration}s`);
    let caption = parts.join(' · ');
    if (media.title) caption += `\n\n${media.title.length > 220 ? `${media.title.slice(0, 220)}...` : media.title}`;
    return caption;
}

module.exports = {
    name: 'unidownload',
    alias: ['unid', 'udl', 'downloadall'],
    desc: 'Download media from supported social platforms',
    category: 'Search',
    usage: '.unidownload <url>',
    reactions: { start: '📥', success: '❤️‍🩹', error: '❔' },

    execute: async (sock, m, { args, reply }) => {
        const url = args.join(' ').trim();
        if (!url) return reply('Usage: .unidownload <url>');
        await sock.sendMessage(m.chat, { react: { text: '📥', key: m.key } });

        try {
            const { data } = await request('aiov2', url);
            if (data?.status === false || data?.success === false) throw new Error(data?.message || data?.msg || 'No media returned');
            const media = normalizeResult(data);
            const caption = buildCaption(media);
            if (!media.media.length) throw new Error('No downloadable media found');

            for (const [index, item] of media.media.slice(0, 10).entries()) {
                const itemCaption = index === 0 ? caption : '';
                if (item.kind === 'audio') {
                    await sock.sendMessage(m.chat, { audio: { url: item.url }, mimetype: 'audio/mp4', caption: itemCaption }, { quoted: m });
                } else if (item.kind === 'image') {
                    await sock.sendMessage(m.chat, { image: { url: item.url }, caption: itemCaption }, { quoted: m });
                } else {
                    await sock.sendMessage(m.chat, { video: { url: item.url }, mimetype: 'video/mp4', caption: itemCaption }, { quoted: m });
                }
            }
            await sock.sendMessage(m.chat, { react: { text: '❤️‍🩹', key: m.key } });
        } catch (error) {
            console.error('[UNIDOWNLOAD ERROR]', error.message || error);
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } }).catch(() => {});
            return reply(`✘ Universal download failed: ${error.message || error}`);
        }
    }
};

module.exports.normalizeResult = normalizeResult;
module.exports.buildCaption = buildCaption;
