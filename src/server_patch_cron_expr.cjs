const fs = require('fs');

const file = '/home/openclaw-mvp/src/server.mjs';
let content = fs.readFileSync(file, 'utf8');

// Inject cronstrue to API
const CRONSTRUE_INJECT = `
import cronstrue from 'cronstrue/i18n.js';
// Add it after node:url
`;
if(!content.includes('cronstrue')) {
  content = content.replace('import { fileURLToPath } from "node:url";', 'import { fileURLToPath } from "node:url";\nimport cronstrue from "cronstrue/i18n.js";');
}

// Modify the list response to inject human readable cron
const OLD_LIST_API = `    if (req.method === "GET" && pathname === "/api/cron/list") {
      const includeDisabled = query.get("includeDisabled") === "true";
      const data = await withGateway((gateway) => gateway.request("cron.list", { includeDisabled }));
      return jsonResponse(res, 200, data);
    }`;

const NEW_LIST_API = `    if (req.method === "GET" && pathname === "/api/cron/list") {
      const includeDisabled = query.get("includeDisabled") === "true";
      const data = await withGateway((gateway) => gateway.request("cron.list", { includeDisabled }));
      
      // Inject human readable descriptions
      if (data && data.jobs) {
        data.jobs = data.jobs.map(job => {
          if (job.schedule && job.schedule.kind === 'cron' && job.schedule.expr) {
             try {
               job.schedule.human = cronstrue.toString(job.schedule.expr, { locale: "zh_CN" });
             } catch(e) {
               // ignore invalid cron
             }
          }
          return job;
        });
      }
      return jsonResponse(res, 200, data);
    }`;

if(!content.includes('cronstrue.toString(')) {
  content = content.replace(OLD_LIST_API, NEW_LIST_API);
}

fs.writeFileSync(file, content);
