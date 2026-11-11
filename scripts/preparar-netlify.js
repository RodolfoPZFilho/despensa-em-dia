// O Netlify descarta no deploy algumas pastas geradas pelo Expo
// (ex.: "node_modules", pastas com "@", ".../build/vendor/...").
// Sem elas o banco SQLite (.wasm) e a fonte dos ícones não carregam.
// Solução: mover cada pasta de dist/assets para um nome curto e plano (dist/assets/a1, a2, ...)
// e trocar os caminhos nos arquivos gerados.
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
const assets = path.join(dist, 'assets');
if (!fs.existsSync(assets)) {
  console.log('dist/assets não existe; rode "npx expo export --platform web" antes.');
  process.exit(1);
}

// 1. Descobre todas as pastas que têm arquivos
const pastas = [];
(function varrer(dir) {
  const itens = fs.readdirSync(dir, { withFileTypes: true });
  if (itens.some((i) => i.isFile())) pastas.push(dir);
  for (const i of itens) if (i.isDirectory()) varrer(path.join(dir, i.name));
})(assets);

// 2. Move os arquivos de cada pasta para assets/aN
const trocas = [];
const temp = path.join(dist, '__assets_planos');
fs.mkdirSync(temp);
pastas.forEach((dir, n) => {
  const antigo = path.relative(assets, dir).split(path.sep).join('/');
  const novo = `a${n + 1}`;
  if (antigo === novo) return;
  const destino = path.join(temp, novo);
  fs.mkdirSync(destino);
  for (const i of fs.readdirSync(dir, { withFileTypes: true })) {
    if (i.isFile()) fs.renameSync(path.join(dir, i.name), path.join(destino, i.name));
  }
  trocas.push([`/assets/${antigo}`, `/assets/${novo}`]);
});
fs.rmSync(assets, { recursive: true, force: true });
fs.renameSync(temp, assets);

// 3. Troca os caminhos nos .js/.html/.json (o mais longo primeiro, para não trocar só o começo)
trocas.sort((a, b) => b[0].length - a[0].length);
const fim = /["'/?]/; // o caminho precisa acabar em aspas, "/" ou "?"
(function corrigir(dir) {
  for (const nome of fs.readdirSync(dir)) {
    const p = path.join(dir, nome);
    if (fs.statSync(p).isDirectory()) { corrigir(p); continue; }
    if (!/\.(js|html|json|css)$/.test(nome)) continue;
    let txt = fs.readFileSync(p, 'utf8');
    const antes = txt;
    for (const [de, para] of trocas) {
      let i = txt.indexOf(de);
      while (i !== -1) {
        const prox = txt.charAt(i + de.length);
        if (fim.test(prox)) txt = txt.slice(0, i) + para + txt.slice(i + de.length);
        i = txt.indexOf(de, i + 1);
      }
    }
    if (txt !== antes) fs.writeFileSync(p, txt);
  }
})(dist);

console.log('dist/ pronta para o Netlify:');
for (const [de, para] of trocas) console.log(`  ${para}  <-  ${de}`);
