const fs = require('fs');

// Render YAML
const renderYaml = `services:
  - type: web
    name: cody-whatsapp-bot
    runtime: node
    plan: free
    buildCommand: npm install
    startCommand: node index.js
    envVars:
      - key: NODE_VERSION
        value: 18
      - key: OWNER_NUMBER
        sync: false
      - key: OWNER_NAME
        sync: false
      - key: BOT_NAME
        sync: false
      - key: SESSION_ID
        sync: false
`;

// app.json for Heroku
const appJson = `{
  "name": "CODY WhatsApp Bot",
  "description": "WhatsApp self-bot with AI, media editing, group management",
  "repository": "https://github.com/crysnovax/CODY.git",
  "logo": "https://cdn.crysnovax.link/files/1778715435891-e17143f2-a3fa-4d16-b1b7-740d8e4fb7fb.jpeg",
  "keywords": ["whatsapp", "bot", "ai", "baileys"],
  "env": {
    "OWNER_NUMBER": {
      "description": "Your WhatsApp number (without +, e.g. 2348077528901)",
      "required": true
    },
    "OWNER_NAME": {
      "description": "Your name or nickname",
      "required": true
    },
    "BOT_NAME": {
      "description": "Display name for the bot",
      "value": "CODY AI"
    },
    "SESSION_ID": {
      "description": "Session ID from pairing page (https://cody-pair.onrender.com/)",
      "required": true
    }
  },
  "formation": {
    "web": {
      "quantity": 1,
      "size": "free"
    }
  },
  "buildpacks": [
    {
      "url": "heroku/nodejs"
    }
  ],
  "stack": "heroku-22"
}`;

// Procfile
const procfile = "web: node index.js\n";

// vercel.json
const vercelJson = `{
  "builds": [
    {
      "src": "index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "index.js"
    }
  ],
  "env": {
    "OWNER_NUMBER": "@owner_number",
    "OWNER_NAME": "@owner_name",
    "BOT_NAME": "@bot_name",
    "SESSION_ID": "@session_id"
  }
}`;

fs.writeFileSync('render.yaml', renderYaml);
fs.writeFileSync('app.json', appJson);
fs.writeFileSync('Procfile', procfile);
fs.writeFileSync('vercel.json', vercelJson);
console.log('✅ Deployment files created: render.yaml, app.json, Procfile, vercel.json');
