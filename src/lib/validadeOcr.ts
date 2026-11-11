/**
 * Interpreta o texto devolvido pelo OCR de uma embalagem e encontra a data de validade.
 *
 * Embalagens costumam trazer duas datas (fabricação e validade) em formatos variados:
 *   "VAL: 12/03/27"  "FAB 10.09.26 VAL 10.03.27"  "VENC 15 JAN 2027"  "VAL 03/2027"  "EXP 2027-03-12"
 * Cada data encontrada vira uma candidata com pontuação: palavras como VAL/VENC/EXP perto da data
 * somam pontos; FAB/PROD/EMB subtraem. A melhor candidata é sugerida e as outras ficam como opção.
 *
 * Este arquivo não importa nada do React Native para poder ser testado com Node puro.
 */

export interface CandidataValidade {
  iso: string;      // AAAA-MM-DD
  trecho: string;   // texto original onde a data foi encontrada
  rotulo: 'validade' | 'fabricacao' | 'indefinido';
  pontos: number;
}

const MESES: Record<string, number> = {
  JAN: 1, FEV: 2, FEB: 2, MAR: 3, ABR: 4, APR: 4, MAI: 5, MAY: 5, JUN: 6, JUL: 7,
  AGO: 8, AUG: 8, SET: 9, SEP: 9, OUT: 10, OCT: 10, NOV: 11, DEZ: 12, DEC: 12,
};
const NOMES_MES = Object.keys(MESES).join('|');

const PALAVRAS_VALIDADE = /\b(VAL(IDADE)?|VENC(IMENTO)?|VCTO|VTO|EXP(IRY|IRA)?|BEST BEFORE|CONSUMIR (ATE|ANTES)|V|BB)\b/g;
const PALAVRAS_FABRICACAO = /\b(FAB(RICACAO|R)?|PROD(UCAO)?|EMB(ALADO|ALAGEM)?|MFG|F|P)\b/g;

/** Posição da última ocorrência da expressão no texto (-1 se não houver). */
function ultimaPosicao(re: RegExp, texto: string) {
  let pos = -1;
  re.lastIndex = 0;
  for (let m = re.exec(texto); m; m = re.exec(texto)) pos = m.index;
  return pos;
}

/** Corrige trocas comuns do OCR dentro de trechos numéricos (O→0, I/l→1, S→5, B→8). */
function corrigirDigitos(texto: string) {
  return texto.replace(/[0-9OIlSB][0-9OIlSB\/.\-]{3,}[0-9OIlSB]/g, (trecho) =>
    /\d/.test(trecho) ? trecho.replace(/O/g, '0').replace(/[Il]/g, '1').replace(/S/g, '5').replace(/B/g, '8') : trecho,
  );
}

function montarISO(ano: number, mes: number, dia: number): string | null {
  if (ano < 100) ano += 2000;
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  const d = new Date(ano, mes - 1, dia);
  if (d.getFullYear() !== ano || d.getMonth() !== mes - 1 || d.getDate() !== dia) return null; // ex.: 31/02
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

const ultimoDia = (ano: number, mes: number) => new Date(ano < 100 ? ano + 2000 : ano, mes, 0).getDate();

export function extrairValidade(textoOcr: string, hoje = new Date()): { sugestao: string | null; candidatas: CandidataValidade[] } {
  const texto = corrigirDigitos(textoOcr.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' '));
  const usados: [number, number][] = []; // trechos já reconhecidos (evita ler "12/03/27" também como "03/27")
  const brutas: { iso: string; ini: number; fim: number }[] = [];
  const livre = (ini: number, fim: number) => usados.every(([a, b]) => fim <= a || ini >= b);

  /** `pular` = quantos caracteres do início do trecho são prefixo (ex.: "VAL ") e não fazem parte da data. */
  function procurar(re: RegExp, converter: (m: RegExpExecArray) => string | null, pular = (_m: RegExpExecArray) => 0) {
    for (let m = re.exec(texto); m; m = re.exec(texto)) {
      const ini = m.index + pular(m), fim = m.index + m[0].length;
      if (!livre(ini, fim)) continue;
      const iso = converter(m);
      if (iso) {
        brutas.push({ iso, ini, fim });
        usados.push([ini, fim]);
      }
    }
  }

  const sep = String.raw`\s?[\/.\-]\s?`;
  // AAAA-MM-DD
  procurar(new RegExp(String.raw`\b(20\d{2})${sep}(\d{1,2})${sep}(\d{1,2})\b`, 'g'), (m) => montarISO(+m[1], +m[2], +m[3]));
  // DD/MM/AAAA e DD/MM/AA
  procurar(new RegExp(String.raw`\b(\d{1,2})${sep}(\d{1,2})${sep}(\d{4}|\d{2})\b`, 'g'), (m) => montarISO(+m[3], +m[2], +m[1]));
  // DD JAN 2027 / 15-JAN-27 / 15JAN27
  procurar(new RegExp(String.raw`\b(\d{1,2})\s?[\/.\-]?\s?(${NOMES_MES})[A-Z]*\s?[\/.\-]?\s?(\d{4}|\d{2})\b`, 'g'), (m) => montarISO(+m[3], MESES[m[2]], +m[1]));
  // DDMMAA colado (comum em impressão a jato: "VAL 120327")
  procurar(/\b(?:VAL|VENC|EXP|V)\W{0,3}(\d{2})(\d{2})(\d{2})\b/g, (m) => montarISO(+m[3], +m[2], +m[1]), (m) => m[0].length - 6);
  // MM/AAAA (vale até o último dia do mês)
  procurar(new RegExp(String.raw`\b(\d{1,2})${sep}(20\d{2}|\d{2})\b`, 'g'), (m) => {
    const mes = +m[1], ano = +m[2];
    return mes >= 1 && mes <= 12 ? montarISO(ano, mes, ultimoDia(ano, mes)) : null;
  });
  // JAN/2027 ou JAN 27
  procurar(new RegExp(String.raw`\b(${NOMES_MES})[A-Z]*\s?[\/.\-]?\s?(20\d{2}|\d{2})\b`, 'g'), (m) => {
    const mes = MESES[m[1]], ano = +m[2];
    return montarISO(ano, mes, ultimoDia(ano, mes));
  });

  // Descarta anos absurdos (OCR costuma inventar números)
  const anoAtual = hoje.getFullYear();
  const plausiveis = brutas.filter((b) => {
    const ano = +b.iso.slice(0, 4);
    return ano >= anoAtual - 3 && ano <= anoAtual + 10;
  });

  const candidatas: CandidataValidade[] = plausiveis.map((b) => {
    // Olha até 30 caracteres antes da data; vale a palavra-chave mais próxima dela
    const antes = texto.slice(Math.max(0, b.ini - 30), b.ini);
    const pVal = ultimaPosicao(PALAVRAS_VALIDADE, antes);
    const pFab = ultimaPosicao(PALAVRAS_FABRICACAO, antes);
    let rotulo: CandidataValidade['rotulo'] = 'indefinido';
    let pontos = 0;
    if (pVal >= 0 && pVal > pFab) { rotulo = 'validade'; pontos += 10; }
    else if (pFab >= 0) { rotulo = 'fabricacao'; pontos -= 10; }
    return { iso: b.iso, trecho: texto.slice(b.ini, b.fim), rotulo, pontos };
  });

  // Sem palavra-chave, a data mais distante tende a ser a validade (fabricação vem antes)
  const maior = candidatas.reduce<string | null>((acc, c) => (!acc || c.iso > acc ? c.iso : acc), null);
  for (const c of candidatas) if (c.iso === maior && candidatas.length > 1) c.pontos += 1;

  // Ordena pela pontuação e remove datas repetidas
  candidatas.sort((a, b) => b.pontos - a.pontos || b.iso.localeCompare(a.iso));
  const unicas = candidatas.filter((c, i) => candidatas.findIndex((o) => o.iso === c.iso) === i);
  const sugestao = unicas.find((c) => c.rotulo !== 'fabricacao')?.iso ?? null;
  return { sugestao, candidatas: unicas };
}
