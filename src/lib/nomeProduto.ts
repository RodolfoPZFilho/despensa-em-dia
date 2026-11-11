/**
 * Encurta o nome que vem da Open Food Facts para um padrão fixo:
 *
 *     Produto + tipo/sabor   ·   Marca   ·   Quantidade
 *     "Leite Condensado Integral Moça 395 g"
 *     "Biscoito Recheado Passatempo Chocolate Nestlé 130 g"
 *
 * Os nomes da base costumam vir no formato de prateleira de mercado, com embalagem, marca no meio,
 * peso repetido, abreviações e frases de marketing ("Pacote", "Embalagem Econômica", "High Protein"...).
 */

const MAX_PALAVRAS = 6; // palavras "de verdade" na descrição (conectivos como "de", "com" não contam)
const MAX_CARACTERES = 60;

const CONECTIVOS = new Set(['de', 'da', 'do', 'das', 'dos', 'com', 'sem', 'e', 'em', 'para', 'a', 'o', 'ao', 'na', 'no', '&']);

// Palavras de embalagem/apresentação que não ajudam a identificar o alimento
const EMBALAGEM = new Set([
  'caixa', 'cx', 'pacote', 'pct', 'pote', 'lata', 'garrafa', 'frasco', 'tubo', 'bandeja', 'copo', 'sache', 'sachet', 'saco',
  'squeeze', 'embalagem', 'pack', 'refil', 'display', 'pet', 'unidade', 'unidades', 'und', 'un',
]);

// Abreviações comuns em nomes de nota fiscal/etiqueta
const ABREVIACOES: Record<string, string> = {
  bisc: 'biscoito', rech: 'recheado', choc: 'chocolate', trad: 'tradicional', min: 'mineral', ext: 'extra',
  integ: 'integral', ex: 'extra', desc: 'desnatado', refrig: 'refrigerante', achoc: 'achocolatado', marg: 'margarina',
  's/gas': 'sem gás', 'c/gas': 'com gás', 's/': 'sem', 'c/': 'com', 's/sal': 'sem sal', 'c/sal': 'com sal',
};

const SIGLAS = new Set(['uht', 'dha', 'pet']);

// Frases de marketing removidas antes de tudo
const MARKETING = [
  /\bhigh protein\b/gi,
  /\bfifa\b.*?\b\d{4}\b/gi,
  /\bedi[cç][aã]o (limitada|especial)\b/gi,
  /\bembalagem econ[oô]mica\b/gi,
  /\bleve \d+ pague \d+\b/gi,
  /\bpromo[cç][aã]o\b/gi,
  /\bgr[aã]tis\b/gi,
];

const RE_QTD = /(\d+(?:[.,]\d+)?)\s*(kg|mg|g|ml|lt|l|litros?)(?![a-z])/gi;
const RE_MULTI = /\b\d+\s*x\s*/gi; // "6 x 21 g"
const RE_UNIDADES = /\b\d+\s*(unidades?|und|un)\b/gi;

/** minúsculo, sem acento e sem apóstrofo/hífen: para comparar palavras. */
function chave(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/['’`]/g, '').toLowerCase().replace(/[.,;:!]+$/, '');
}

function formatarQtd(numero: string, unidade: string) {
  const u = unidade.toLowerCase();
  const un = u === 'kg' ? 'kg' : u === 'mg' ? 'mg' : u === 'g' ? 'g' : u === 'ml' ? 'ml' : 'L';
  return `${numero.replace('.', ',')} ${un}`;
}

/** Primeira quantidade com unidade dentro de um texto ("395g", "1,5 L"). */
function lerQtd(texto: string | undefined | null): string | null {
  if (!texto) return null;
  const m = new RegExp(RE_QTD.source, 'i').exec(String(texto));
  return m ? formatarQtd(m[1], m[2]) : null;
}

function capitalizar(palavra: string, primeira: boolean) {
  const k = chave(palavra);
  if (!primeira && CONECTIVOS.has(k)) return palavra.toLowerCase();
  if (SIGLAS.has(k)) return palavra.toUpperCase();
  // Mantém grafias com maiúscula no meio ("YoPRO", "McDonald's")
  if (/[a-zà-ú]/.test(palavra) && /[A-ZÀ-Ú]/.test(palavra.slice(1))) return palavra;
  const min = palavra.toLocaleLowerCase('pt-BR');
  return min.charAt(0).toLocaleUpperCase('pt-BR') + min.slice(1);
}

/**
 * Marca: mantém a grafia original ("YoPRO", "Coca-Cola", "BIS"), mas
 * CAIXA ALTA longa vira Título (WICKBOLD -> Wickbold, DEL VALLE -> Del Valle) e tudo minúsculo ganha inicial.
 */
function formatarMarca(marca: string) {
  const temLetra = /[A-Za-zÀ-ú]/.test(marca);
  const tudoMaiusculo = temLetra && marca === marca.toUpperCase();
  const tudoMinusculo = temLetra && marca === marca.toLowerCase();
  if ((tudoMaiusculo && marca.replace(/[^A-Za-zÀ-ú]/g, '').length > 3) || tudoMinusculo) {
    return marca.split(/\s+/).map((p) => capitalizar(p, true)).join(' ');
  }
  return marca;
}

export function encurtarNomeProduto(nomeBruto: string, marcas?: string | null, quantidade?: string | null): string {
  let texto = String(nomeBruto ?? '').trim();
  if (!texto) return '';

  // 1. Tira trechos entre parênteses, separadores e marketing
  texto = texto.replace(/\([^)]*\)/g, ' ').replace(/\s[-–|]\s/g, ' ');
  for (const re of MARKETING) texto = texto.replace(re, ' ');

  // 2. Quantidade: a do nome tem prioridade; depois a do campo "quantity".
  //    Nome com peso embutido = título de prateleira ("... Marca Pacote 85g"), que já traz a marca certa.
  const qtdNoNome = lerQtd(texto);
  const qtd = qtdNoNome ?? lerQtd(quantidade);
  texto = texto.replace(RE_MULTI, ' ').replace(RE_QTD, ' ').replace(RE_UNIDADES, ' ');

  // 3. Palavras: expande abreviações e descarta embalagem
  let palavras = texto
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((p) => {
      const exp = ABREVIACOES[chave(p)];
      return exp ? exp.split(' ') : [p];
    })
    .filter((p) => !EMBALAGEM.has(chave(p)) && chave(p) !== '');

  // 4. Marca: usa a que aparece no nome (mais específica, ex.: "Moça" em vez de "Nestlé"); senão a primeira da lista
  const lista = String(marcas ?? '')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);
  let marca: string | null = null;
  for (const m of lista) {
    const tokens = m.replace(/-/g, ' ').split(/\s+/).map(chave);
    let achou = false;
    const restantes: string[] = [];
    for (let i = 0; i < palavras.length; i++) {
      const bate = tokens.every((t, j) => chave(palavras[i + j] ?? '') === t);
      if (bate) {
        marca = m; // grafia do cadastro da marca (ex.: "Coca-Cola", "Nestlé")
        achou = true;
        i += tokens.length - 1;
      } else restantes.push(palavras[i]);
    }
    if (achou) {
      palavras = restantes;
      break;
    }
  }
  // Marca não encontrada por inteiro: se parte dela já aparece no nome ("Nestlé Ninho" -> "Ninho",
  // "Pira Kids" -> "Pirakids", "Rap 10" -> "Rap10"), ela já está visível e não é repetida.
  const jaVisivel = lista.some((m) => {
    const tokens = m.replace(/-/g, ' ').split(/\s+/).map(chave).filter((t) => t.length >= 4);
    const junto = chave(m.replace(/[\s-]/g, ''));
    return palavras.some((p) => {
      const k = chave(p);
      return k === junto || tokens.some((t) => k === t || k.startsWith(t));
    });
  });
  if (!marca && lista.length && !jaVisivel && !qtdNoNome) marca = lista[0];

  // 5. Capitaliza e limita o tamanho da descrição
  palavras = palavras.map((p, i) => capitalizar(p, i === 0));
  const curta: string[] = [];
  let significativas = 0;
  for (const p of palavras) {
    if (!CONECTIVOS.has(chave(p))) {
      if (significativas === MAX_PALAVRAS) break;
      significativas++;
    }
    if (curta.length && chave(curta[curta.length - 1]) === chave(p)) continue; // palavra repetida
    curta.push(p);
  }
  // 6. Monta: Produto · Marca · Quantidade (se passar do limite, corta palavras da descrição, nunca marca/peso)
  const fim = [marca ? formatarMarca(marca) : '', qtd ?? ''].filter(Boolean).join(' ');
  const limpar = () => {
    while (curta.length > 1 && CONECTIVOS.has(chave(curta[curta.length - 1]))) curta.pop();
    return curta.join(' ').replace(/[,;:&\s]+$/, '');
  };
  let descricao = limpar();
  while (curta.length > 2 && `${descricao} ${fim}`.trim().length > MAX_CARACTERES) {
    curta.pop();
    descricao = limpar();
  }
  const nome = [descricao, fim].filter(Boolean).join(' ');
  return nome || String(nomeBruto).trim().slice(0, MAX_CARACTERES);
}
