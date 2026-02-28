const fs = require('fs');

const jsFile = '/home/openclaw-mvp/public/app.js';
let js = fs.readFileSync(jsFile, 'utf8');

const OLD_JS = `    // Setup Cron Form Type interaction
  const kindSelect = $("cron-form-kind");
  const valLabel = $("cron-form-value-label");
  const valInput = $("cron-form-value");`;

const NEW_JS = `    // Setup Cron Form Type interaction
  const kindSelect = $("cron-form-kind");
  const valLabel = $("cron-form-value-label");
  const valInput = $("cron-form-value");

  // Sync Form Toggle Switches (since they use custom CSS)
  const syncToggle = (id) => {
    const el = $(id);
    if (!el) return;
    el.addEventListener('change', function() {
      const slider = this.nextElementSibling;
      const knob = slider.querySelector('.knob');
      if (this.checked) {
        slider.style.background = 'var(--primary-color)';
        slider.style.borderColor = 'transparent';
        knob.style.left = '18px';
      } else {
        slider.style.background = 'rgba(255,255,255,0.15)';
        slider.style.borderColor = 'rgba(255,255,255,0.1)';
        knob.style.left = '2px';
      }
    });
  };
  syncToggle("cron-form-isolated");
  syncToggle("cron-form-enabled");`;

js = js.replace(OLD_JS, NEW_JS);

fs.writeFileSync(jsFile, js);
