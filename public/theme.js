const themes = {
  dark: {
    '--primary-color': '#3b70fc',
    '--primary-gradient': 'linear-gradient(135deg, #3b70fc 0%, #667eea 100%)',
    '--primary-glow': 'rgba(59, 112, 252, 0.5)',
    '--glass-bg': 'rgba(30, 60, 114, 0.65)',
    '--glass-border': 'rgba(255, 255, 255, 0.18)',
    '--text-primary': '#ffffff',
    '--text-secondary': 'rgba(255, 255, 255, 0.7)',
    '--text-muted': 'rgba(255, 255, 255, 0.4)',
    '--bg-image': "url('https://lingshichat.s3.bitiful.net/img/blog/bg.jpg')"
  },
  light: {
    '--primary-color': '#00a3ff',
    '--primary-gradient': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    '--primary-glow': 'rgba(0, 163, 255, 0.5)',
    '--glass-bg': 'rgba(255, 255, 255, 0.85)',
    '--glass-border': 'rgba(255, 255, 255, 0.5)',
    '--text-primary': '#1a202c',
    '--text-secondary': '#4a5568',
    '--text-muted': '#a0aec0',
    '--bg-image': "url('https://img.lingshichat.top/img/gallery/%E4%BA%8C%E6%AC%A1%E5%85%83/1772174165487_bocl57.jpg')"
  }
};

function applyTheme(themeName) {
  const theme = themes[themeName];
  if (!theme) return;
  
  for (const [key, value] of Object.entries(theme)) {
    document.documentElement.style.setProperty(key, value);
  }
  
  // 更新背景伪元素颜色以匹配明暗
  if (themeName === 'light') {
    document.body.style.setProperty('--backdrop-color', 'rgba(255, 255, 255, 0.4)');
  } else {
    document.body.style.setProperty('--backdrop-color', 'rgba(0, 10, 30, 0.6)');
  }
  
  localStorage.setItem('openclaw-theme', themeName);
}

// 初始化主题
const savedTheme = localStorage.getItem('openclaw-theme') || 'dark';
applyTheme(savedTheme);

// 添加主题切换按钮
window.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.querySelector('.admin-sidebar');
  if (sidebar) {
    const themeBtn = document.createElement('button');
    themeBtn.className = 'theme-switch-btn';
    themeBtn.innerHTML = '<i class="fa-solid fa-palette"></i> 切换主题';
    themeBtn.style.cssText = 'margin: 15px; padding: 10px; border-radius: 8px; border: 1px solid var(--glass-border); background: var(--glass-bg); color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: bold; transition: all 0.3s ease; width: calc(100% - 30px);';
    
    themeBtn.addEventListener('click', () => {
      const current = localStorage.getItem('openclaw-theme') || 'dark';
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
    
    // 将按钮放在导航菜单下方
    const nav = document.querySelector('.nav-menu');
    nav.parentNode.insertBefore(themeBtn, nav.nextSibling);
  }
});
