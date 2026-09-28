'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const axios = require('axios');
const unid = require('../src/Commands/Downloader/unid');
const facebook = require('../src/Commands/Downloader/Facebook');
const instagram = require('../src/Commands/Downloader/Instagram');
const youtube = require('../src/Commands/Downloader/ytd');
const youtubeStream = require('../src/Commands/Downloader/Stream YouTube');
const youtubeAudio = require('../src/Commands/Downloader/Yturl');

const originalGet = axios.get;

test.after(() => { axios.get = originalGet; });

test('universal parser reads Facebook fb_bos audio/video entries', () => {
    const data = {
        platform: 'Facebook',
        result: {
            fb_bos: [
                { type: 'm4a', url: 'https://api.example/audio-token', original_url: 'https://cdn.example/audio.m4a' },
                { type: 'mp4', url: 'https://api.example/video-token', original_url: 'https://cdn.example/video.mp4' },
                { type: 'mp4', url: 'https://cdn.example/video-sd.mp4' }
            ]
        }
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

test('YouTube hosted path uses ytmp4 and sends the returned download URL', async () => {
    const calls = [];
    axios.get = async (url) => {
        calls.push(url);
        return { data: { status: true, info: { title: 'Test video', quality: '1080p' }, download_url: 'https://cdn.example/video.mp4' } };
    };
    const sent = [];
    const sock = { sendMessage: async (...args) => { sent.push(args); } };
    const ok = await youtube.sendFromApi(sock, { chat: 'x', key: {} }, 'https://youtu.be/abc');
    assert.equal(ok, true);
    assert.match(calls[0], /prexzyapis\.com\/download\/ytmp4\?url=/);
    assert.equal(sent[0][1].video.url, 'https://cdn.example/video.mp4');
});

test('YouTube audio hosted path uses ytmp3', async () => {
    const calls = [];
    axios.get = async (url) => {
        calls.push(url);
        return { data: { status: true, info: { title: 'Test audio' }, download_url: 'https://cdn.example/audio.mp3' } };
    };
    const sent = [];
    const sock = { sendMessage: async (...args) => { sent.push(args); } };
    await youtube.sendFromApi(sock, { chat: 'x', key: {} }, 'https://youtu.be/abc', true);
    assert.match(calls[0], /prexzyapis\.com\/download\/ytmp3\?url=/);
    assert.equal(sent[0][1].audio.url, 'https://cdn.example/audio.mp3');
});

test('separate YouTube stream command uses ytmp4', async () => {
    const calls = [];
    axios.get = async (url) => {
        calls.push(url);
        return { data: { status: true, info: { title: 'Stream video' }, download_url: 'https://cdn.example/stream.mp4' } };
    };
    const sent = [];
    const sock = { sendMessage: async (...args) => { sent.push(args); } };
    await youtubeStream.execute(sock, { chat: 'x', key: {} }, { args: ['https://youtu.be/abc'], reply: async () => {} });
    assert.match(calls[0], /prexzyapis\.com\/download\/ytmp4\?url=/);
    assert.equal(sent[0][1].video.url, 'https://cdn.example/stream.mp4');
});

test('separate YouTube audio command uses ytmp3', async () => {
    const calls = [];
    axios.get = async (url) => {
        calls.push(url);
        return { data: { status: true, info: { title: 'Audio track' }, download_url: 'https://cdn.example/track.mp3' } };
    };
    const sent = [];
    const sock = { sendPresenceUpdate: async () => {}, sendMessage: async (...args) => { sent.push(args); } };
    await youtubeAudio.execute(sock, { chat: 'x', key: {} }, { args: ['https://youtu.be/abc'], reply: async () => {} });
    assert.match(calls[0], /prexzyapis\.com\/download\/ytmp3\?url=/);
    assert.equal(sent[0][1].audio.url, 'https://cdn.example/track.mp3');
});
