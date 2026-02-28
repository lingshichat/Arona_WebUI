const fs = require('fs');
const file = '/home/openclaw-mvp/public/app.js';
let js = fs.readFileSync(file, 'utf8');

js = js.replace(`title: "🧩 技能名称"`, `title: "技能名称"`);
js = js.replace(`title: "📝 功能描述"`, `title: "功能描述"`);
js = js.replace(`title: "📦 来源位置"`, `title: "来源位置"`);
js = js.replace(`title: "🟢 启用状态"`, `title: "启用状态"`);
js = js.replace(`title: "✅ 可用性 (Eligible)"`, `title: "可用性"`);
js = js.replace(`title: "Actions"`, `title: "操作"`);

fs.writeFileSync(file, js);
