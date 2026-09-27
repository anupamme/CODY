'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = process.cwd();
const COMMAND_ROOT = path.join(ROOT, 'src', 'Commands');

function walk(dir, depth = 0, maxDepth = 6) {
    if (depth > maxDepth || !fs.existsSync(dir)) return [];
    const out = [];
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
    for (const entry of entries) {
        if (entry.name.startsWith('.') || ['node_modules', 'sessions'].includes(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...walk(full, depth + 1, maxDepth));
        else if (/\.(?:js|mjs|cjs|ts)$/i.test(entry.name)) out.push(full);
    }
    return out;
}

function parseCommandSource(source, file) {
    const name = source.match(/\bname\s*:\s*['"`]([^'"`]+)['"`]/i)?.[1] || path.basename(file).replace(/\.[^.]+$/, '');
    const aliasMatch = source.match(/\balias\s*:\s*\[([\s\S]*?)\]/i)?.[1] || '';
    const aliases = [...aliasMatch.matchAll(/['"`]([^'"`]+)['"`]/g)].map(match => match[1]).slice(0, 30);
    const category = source.match(/\bcategory\s*:\s*['"`]([^'"`]+)['"`]/i)?.[1] || 'Unknown';
    const imports = [...source.matchAll(/require\(['"`]([^'"`]+)['"`]\)|from\s+['"`]([^'"`]+)['"`]/g)].map(match => match[1] || match[2]).slice(0, 80);
    let syntax = true;
    let syntaxError = '';
    try { execFileSync(process.execPath, ['--check', file], { cwd: ROOT, timeout: 15000, stdio: 'pipe' }); }
    catch (error) { syntax = false; syntaxError = String(error.stderr || error.message).slice(0, 1000); }
    const hasModuleExport = /(?:module\.exports|exports\.)/.test(source);
    const broken = !syntax || !hasModuleExport;
    return {
        name,
        aliases,
        category,
        file: path.relative(ROOT, file),
        imports,
        syntax,
        syntaxError,
        broken,
        lastError: syntaxError || (!hasModuleExport ? 'missing module.exports' : '')
    };
}

function buildProjectIndex() {
    const commands = [];
    for (const file of walk(COMMAND_ROOT)) {
        try { commands.push(parseCommandSource(fs.readFileSync(file, 'utf8'), file)); } catch {}
    }
    const byName = new Map();
    for (const command of commands) {
        const key = String(command.name || '').toLowerCase();
        if (!key) continue;
        const matches = byName.get(key) || [];
        matches.push(command.file);
        byName.set(key, matches);
    }
    const duplicates = [];
    for (const [name, files] of byName) {
        if (files.length > 1) duplicates.push({ name, files });
    }
    for (const command of commands) {
        const duplicate = duplicates.find(item => item.name === String(command.name || '').toLowerCase());
        if (duplicate) {
            command.broken = true;
            command.lastError ||= `duplicate command name: ${duplicate.files.join(', ')}`;
        }
    }
    const categories = {};
    for (const command of commands) (categories[command.category] ||= []).push(command.name);
    const index = {
        generatedAt: new Date().toISOString(),
        root: '.',
        commandCount: commands.length,
        syntaxFailures: commands.filter(command => !command.syntax).length,
        brokenCount: commands.filter(command => command.broken).length,
        duplicateNames: duplicates,
        categories,
        commands
    };
    try {
        const target = path.join(ROOT, 'database', 'plogme_index.json');
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, JSON.stringify(index, null, 2));
    } catch {}
    return index;
}

module.exports = { buildProjectIndex };
