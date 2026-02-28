const fs = require('fs');
const file = '/home/openclaw-mvp/public/app.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `$("models-result").textContent = JSON.stringify(result, null, 2);`,
  `const resEl = $("models-result");
    resEl.style.display = "block";
    resEl.style.color = "#81c784";
    resEl.innerHTML = '<i class="fa-solid fa-check-circle" style="margin-right:8px;"></i><b>配置已成功保存并下发至 OpenClaw！</b><br><code style="margin-top:10px;display:block;opacity:0.8;">' + escapeHtml(JSON.stringify(result, null, 2)) + '</code>';
    setTimeout(() => { resEl.style.display = "none"; }, 5000);`
);

content = content.replace(
  `$("models-result").textContent = "";`,
  `const resEl2 = $("models-result");
    if (resEl2) resEl2.style.display = "none";`
);

fs.writeFileSync(file, content);
