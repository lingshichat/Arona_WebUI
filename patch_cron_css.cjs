const fs = require('fs');

const cssFile = '/home/openclaw-mvp/public/styles.css';
let css = fs.readFileSync(cssFile, 'utf8');

const EXTRA_CSS = `
/* Form Focus States */
input[type="text"]:focus, select:focus, textarea:focus {
  outline: none !important;
  border-color: var(--primary-color) !important;
  background: rgba(0,0,0,0.3) !important;
  box-shadow: 0 0 0 3px rgba(59, 112, 252, 0.2), inset 0 2px 4px rgba(0,0,0,0.1) !important;
}

/* Custom Select Arrow */
select {
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.5)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e") !important;
  background-repeat: no-repeat !important;
  background-position: right 1rem center !important;
  background-size: 1em !important;
}
`;

if (!css.includes('/* Custom Select Arrow */')) {
    fs.writeFileSync(cssFile, css + EXTRA_CSS);
}
