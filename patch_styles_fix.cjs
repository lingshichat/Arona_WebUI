const fs = require('fs');

const file = '/home/openclaw-mvp/public/styles.css';
let content = fs.readFileSync(file, 'utf8');

const OLD_CSS_CARDS = `.dashboard-grid .stat-card {
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
  background: linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%) !important;
  border-top: 1px solid rgba(255,255,255,0.1) !important;
  border-right: 1px solid rgba(255,255,255,0.05) !important;
}
.dashboard-grid .stat-card:hover {
  transform: translateY(-8px) scale(1.02) !important;
  box-shadow: 0 15px 30px rgba(0,0,0,0.2) !important;
}
.dashboard-grid .stat-card:hover .stat-icon {
  opacity: 0.35 !important;
  transform: translateY(-50%) scale(1.1) !important;
}`;

const NEW_CSS_CARDS = `.dashboard-grid .stat-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  transition: all 0.3s ease;
}
.dashboard-grid .stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.2);
  background: rgba(30, 60, 114, 0.75);
}`;

content = content.replace(OLD_CSS_CARDS, NEW_CSS_CARDS);
fs.writeFileSync(file, content);
