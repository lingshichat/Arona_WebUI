const fs = require('fs');

const cssFile = '/home/openclaw-mvp/public/styles.css';
let css = fs.readFileSync(cssFile, 'utf8');

const CLEAN_TH = `
/* Refined Minimalist Table Headers */
table th {
  letter-spacing: 0.5px !important;
  font-weight: 500 !important;
  color: var(--text-secondary) !important;
  text-transform: none !important;
  font-size: 0.85rem !important;
  padding: 16px 20px !important;
  background: rgba(0, 0, 0, 0.15) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
}
`;

if (!css.includes('Refined Minimalist Table Headers')) {
    fs.writeFileSync(cssFile, css + CLEAN_TH);
}
