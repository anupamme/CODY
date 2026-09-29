'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const socialDl = require('../src/Plugin/socialDl');
const unid = require('../src/Commands/Downloader/unid');
const facebook = require('../src/Commands/Downloader/Facebook');
const instagram = require('../src/Commands/Downloader/Instagram');
const youtube = require('../src/Commands/Downloader/ytd');
const youtubeStream = require('../src/Commands/Downloader/Stream YouTube');
const youtubeAudio = require('../src/Commands/Downloader/Yturl');

test('universal parser reads Facebook fb_bos audio/video entries', () => {
    const data = {
        platform: 'Facebook',
        result: { fb_bos: [
            { type: 'm4a', url: 'https://api.example/audio-token', original_url: 'https://cdn.example/audio.m4a' },
            { type: 'mp4', url: 'https://api.example/video-token', original_url: 'https://cdn.example/video.mp4' },
            { type: 'mp4', url: 'https://cdn.example/video-sd.mp4' }
        ] }
    };
    const parsed = unid.normalizeResult(data);
    assert.equal(parsed.platform, 'Facebook');
    assert.equal(parsed.audio, 'https://cdn.example/audio.m4a');
    assert.equal(parsed.video, 'https://cdn.example/video.mp4');
    assert.equal(parsed.media.length, 3);
});

test('Facebook and Instagram commands expose clean URL extraction', () => {
    assert.equal(facebook.findUrl('try https://www.facebook.com/share/r/abc/'), 'https://www.facebook.com/share/r/abc/');
    assert.equal(instagram.findUrl('try https://www.instagram.com/reel/abc/'), 'https://www.instagram.com/reel/abc/');
});

test('YouTube commands send buffers returned by social-dl', async () => {
    const original = socialDl.downloadYouTube;
    const calls = [];
    socialDl.downloadYouTube = async (url, options = {}) => {
        calls.push({ url, options });
        return { buffer: Buffer.from(options.audioOnly ? 'audio' : 'video'), mimetype: options.audioOnly ? 'audio/mp4' : 'video/mp4' };
    };
    try {
        const sentVideo = [];
        await youtube.sendFromSocialDl({ sendMessage: async (...args) => sentVideo.push(args) }, { chat: 'x' }, 'https://youtu.be/abc12345678');
        assert.deepEqual(sentVideo[0][1].video, Buffer.from('video'));

        const sentAudio = [];
        await youtube.sendFromSocialDl({ sendMessage: async (...args) => sentAudio.push(args) }, { chat: 'x' }, 'https://youtu.be/abc12345678', true);
        assert.deepEqual(sentAudio[0][1].audio, Buffer.from('audio'));

        const sentStream = [];
        await youtubeStream.execute({ sendMessage: async (...args) => sentStream.push(args) }, { chat: 'x', key: {} }, { args: ['https://youtu.be/abc12345678'], reply: async () => {} });
        assert.deepEqual(sentStream[0][1].video, Buffer.from('video'));

        const sentYtAudio = [];
        await youtubeAudio.execute({ sendPresenceUpdate: async () => {}, sendMessage: async (...args) => sentYtAudio.push(args) }, { chat: 'x', key: {} }, { args: ['https://youtu.be/abc12345678'], reply: async () => {} });
        assert.deepEqual(sentYtAudio[0][1].audio, Buffer.from('audio'));
        assert.equal(calls.length, 4);
    } finally {
        socialDl.downloadYouTube = original;
    }
});


test('TikTok commands send the buffer returned by social-dl', async () => {
    const tiktok = require('../src/Commands/Downloader/Tikd');
    const ttld = require('../src/Commands/Downloader/ttld');
    const original = socialDl.downloadTikTok;
    const calls = [];
    socialDl.downloadTikTok = async url => {
        calls.push(url);
        return { buffer: Buffer.from('tiktok-video'), mimetype: 'video/mp4' };
    };
    try {
        const sent = [];
        const sock = {
            sendMessage: async (...args) => {
                sent.push(args);
                return { key: { id: 'progress' } };
            }
        };
        await tiktok.execute(sock, { chat: 'x', key: {} }, { args: ['https://www.tiktok.com/@user/video/123456789'], reply: async () => {} });
        await ttld.execute(sock, { chat: 'x', key: {} }, { args: ['https://www.tiktok.com/@user/video/123456789'], prefix: '.', reply: async () => {} });
        assert.equal(calls.length, 2);
        assert.equal(sent.filter(args => args[1]?.video).length, 2);
        assert.deepEqual(sent.find(args => args[1]?.video)[1].video, Buffer.from('tiktok-video'));
    } finally {
        socialDl.downloadTikTok = original;
    }
});
