/* Regenerates app/js/cloud-sql.js from supabase/setup.sql, so the \"Copy SQL\" button always copies the same SQL. Run: npm run sql */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const sql = fs.readFileSync(path.join(root, 'supabase', 'setup.sql'), 'utf8');
fs.writeFileSync(path.join(root, 'app', 'js', 'cloud-sql.js'), '/* GENERATED from supabase/setup.sql by scripts/make-sql-js.js. Do not edit; run `npm run sql`. */\nwindow.TRADELY_SQL = ' + JSON.stringify(sql) + ';\n');
console.log('cloud-sql.js written (' + sql.length + ' chars)');
