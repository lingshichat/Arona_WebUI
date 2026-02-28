const fs = require('fs');

const jsFile = '/home/openclaw-mvp/public/app.js';
let js = fs.readFileSync(jsFile, 'utf8');

const OLD_LOAD_CRON = `async function loadCron() {
  const target = $("cron-list");
  const formWrap = $("cron-form-wrap");
  if (formWrap) formWrap.style.opacity = '0.5'; // dim while loading
  
  target.innerHTML = renderSkeleton(4);

  if (!$("cron-job-json").value.trim()) {
    $("cron-job-json").value = JSON.stringify(cronTemplate(), null, 2);
  }

  try {
    const data = await api("/api/cron/list?includeDisabled=true");
    if (formWrap) {
      formWrap.style.opacity = '1';
      formWrap.style.transition = 'opacity 0.3s ease';
    }`;

const NEW_LOAD_CRON = `async function loadCron() {
  const target = $("cron-list");
  const formWrap = $("cron-form-wrap");
  
  // 完全隐藏表单，直到数据加载完毕再连同骨架屏一起展示
  if (formWrap) {
    formWrap.style.display = 'none';
    formWrap.style.opacity = '0';
  }
  
  target.innerHTML = renderSkeleton(4);

  if (!$("cron-job-json").value.trim()) {
    $("cron-job-json").value = JSON.stringify(cronTemplate(), null, 2);
  }

  try {
    const data = await api("/api/cron/list?includeDisabled=true");
    
    // 数据拉取成功后，开始展示动画
    if (formWrap) {
      formWrap.style.display = 'block';
      // 给一点极小的延迟让 display:block 渲染，从而触发 opacity 过渡
      setTimeout(() => {
        formWrap.style.transition = 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        formWrap.style.opacity = '1';
        formWrap.style.transform = 'translateY(0)';
      }, 50);
    }`;

js = js.replace(OLD_LOAD_CRON, NEW_LOAD_CRON);
fs.writeFileSync(jsFile, js);

const cssFile = '/home/openclaw-mvp/public/styles.css';
let css = fs.readFileSync(cssFile, 'utf8');
const HIDDEN_CSS = `
/* 确保初始状态有位移用于展示入场动画 */
#cron-form-wrap {
  transform: translateY(15px);
}
`;
if (!css.includes('#cron-form-wrap {')) {
  fs.writeFileSync(cssFile, css + HIDDEN_CSS);
}

