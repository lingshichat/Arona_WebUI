import fs from 'fs';

const file = '/home/openclaw-mvp/src/server.mjs';
let content = fs.readFileSync(file, 'utf8');

// fix the import to match the working node -e output
content = content.replace(
  'import cronstrue from "cronstrue/i18n.js";',
  'import cronstruePlugin from "cronstrue/i18n.js";\nconst cronstrue = cronstruePlugin.default || cronstruePlugin;'
);

fs.writeFileSync(file, content);
