const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
function assets() {
  const source = path.join(hexo.base_dir, 'themes', hexo.config.theme, 'source');
  const names = fs.readdirSync(path.join(source, 'js')).filter(name => /^can-.*\.mjs$/.test(name)).sort().map(name => 'js/' + name);
  names.push('css/calculator.css');
  return names.map(name => [name, fs.readFileSync(path.join(source, name), 'utf8')]);
}
function version(entries) {
  const hash = crypto.createHash('sha256');
  for (const [name, body] of entries) hash.update(name + '\0' + body.replace(/\r\n/g, '\n'));
  return hash.digest('hex').slice(0, 16);
}
function versioned(name, hash) { return name.replace(/(\.[^.]+)$/, '.' + hash + '$1'); }
hexo.extend.helper.register('tool_asset', function (name) {
  return this.url_for('/' + versioned(name, version(assets())));
});
hexo.extend.filter.register('after_generate', function () {
  const entries = assets(), hash = version(entries);
  for (const [name, body] of entries) {
    const output = name.endsWith('.mjs') ? body.replace(/(['"])\.\/(can-[\w-]+)\.mjs\1/g,
      (_, quote, base) => quote + './' + base + '.' + hash + '.mjs' + quote) : body;
    hexo.route.set(versioned(name, hash), output);
  }
});
