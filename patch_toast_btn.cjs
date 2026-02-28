const fs = require('fs');
const file = '/home/openclaw-mvp/public/app.js';
let content = fs.readFileSync(file, 'utf8');

const OLD_SAVE = `    const result = await api("/api/models/save", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    showToast("配置已成功保存并下发至 OpenClaw！", "success");`;

const NEW_SAVE = `    const btn = $("models-save");
    if (btn) {
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 保存中...';
      btn.disabled = true;
    }

    const result = await api("/api/models/save", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    if (btn) {
      btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> 保存并应用配置';
      btn.disabled = false;
    }
    
    showToast("配置已成功保存并下发至 OpenClaw！", "success");`;

content = content.replace(OLD_SAVE, NEW_SAVE);

fs.writeFileSync(file, content);
