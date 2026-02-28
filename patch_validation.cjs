const fs = require('fs');
const file = '/home/openclaw-mvp/public/app.js';
let content = fs.readFileSync(file, 'utf8');

const OLD_SAVE = `async function saveModels() {
  try {
    const defaultModel = $("models-default").value.trim();
    const aliases = collectAliases();

    const payload = {`;

const NEW_SAVE = `async function saveModels() {
  try {
    const defaultModel = $("models-default").value.trim();
    const aliases = collectAliases();
    
    // UI Validation Check
    if (!defaultModel && Object.keys(aliases).length === 0) {
      showToast("没有配置任何内容呢...老师起码设置个默认模型或别名吧！(>_<)", "error");
      return;
    }

    const payload = {`;

content = content.replace(OLD_SAVE, NEW_SAVE);
fs.writeFileSync(file, content);
