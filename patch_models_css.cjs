const fs = require('fs');

const file = '/home/openclaw-mvp/public/styles.css';
let content = fs.readFileSync(file, 'utf8');

const NEW_CSS = `
/* Models View Enhancements */
.config-form {
  padding: 30px !important;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 0 0 16px 16px;
}

.config-row {
  margin-bottom: 25px !important;
}

.config-row label {
  font-size: 0.95rem;
  font-weight: 500;
  color: #fff;
  margin-bottom: 12px;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.model-select-wrap input {
  background: rgba(0, 0, 0, 0.25) !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  border-radius: 10px !important;
  padding: 12px 16px !important;
  font-size: 15px !important;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.1) !important;
  width: 100%;
}
.model-select-wrap input:focus {
  border-color: var(--primary-color) !important;
  box-shadow: 0 0 0 3px rgba(59, 112, 252, 0.2), inset 0 2px 4px rgba(0,0,0,0.2) !important;
}

.alias-row {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  align-items: center;
}
.alias-row input {
  background: rgba(0, 0, 0, 0.25) !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  border-radius: 8px !important;
  padding: 10px 14px !important;
  flex: 1;
}
.alias-row input:focus {
  border-color: var(--primary-color) !important;
}
.alias-remove {
  background: rgba(239, 68, 68, 0.1) !important;
  color: #ef4444 !important;
  border: 1px solid rgba(239, 68, 68, 0.3) !important;
  padding: 10px 16px !important;
  border-radius: 8px !important;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}
.alias-remove:hover {
  background: rgba(239, 68, 68, 0.2) !important;
  border-color: rgba(239, 68, 68, 0.5) !important;
}

.provider-chip {
  background: rgba(59, 112, 252, 0.15);
  border: 1px solid rgba(59, 112, 252, 0.3);
  color: #a3c2ff;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
  display: inline-block;
  margin-right: 8px;
  margin-bottom: 8px;
}

.panel-action-btn {
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
  color: #fff;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}
.panel-action-btn:hover {
  background: rgba(255,255,255,0.15);
  transform: translateY(-1px);
}

.btn-primary {
  background: linear-gradient(135deg, #3b70fc 0%, #667eea 100%);
  border: none;
  border-radius: 8px;
  color: white;
  padding: 12px 24px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 15px rgba(59, 112, 252, 0.3);
}
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(59, 112, 252, 0.4);
}
.form-hint {
  display: block;
  margin-top: 8px;
  color: var(--text-muted);
  font-size: 0.85rem;
}
`;

content += NEW_CSS;
fs.writeFileSync(file, content);
