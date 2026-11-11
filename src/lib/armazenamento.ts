/**
 * Orientações por tipo de alimento: onde guardar, dica breve de conservação e
 * com quantos dias de antecedência o app avisa sobre o vencimento.
 *
 * Primeiro procura palavras do nome (ex.: "iogurte", "frango"); se nada bater,
 * usa o padrão da categoria. A ordem importa: regras mais específicas vêm antes
 * ("leite condensado" antes de "leite").
 *
 * Os prazos seguem a lógica: quanto mais perecível, menos dias de aviso (a validade
 * já é curta); quanto mais durável, mais cedo o aviso, para dar tempo de usar.
 *
 * Sem imports do React Native para poder ser testado com Node puro.
 */

export type Local = 'Geladeira' | 'Freezer' | 'Armário';

export interface Orientacao {
  tipo: string;        // nome amigável do tipo reconhecido (ex.: "Iogurte")
  categoria: string;
  local: Local;
  diasAviso: number;   // avisar N dias antes do vencimento
  dica: string;
  porNome: boolean;    // true = reconhecido pelo nome; false = padrão da categoria
}

type Regra = Omit<Orientacao, 'porNome'> & { palavras: RegExp };

const REGRAS: Regra[] = [
  // Laticínios e ovos
  { palavras: /\b(leite condensado|creme de leite|doce de leite)\b/, tipo: 'Leite condensado / creme de leite', categoria: 'Laticínios', local: 'Armário', diasAviso: 15,
    dica: 'Fechado, no armário. Aberto: passe para um pote com tampa na geladeira e use em até 3 dias.' },
  { palavras: /\b(iogurte|coalhada|kefir|bebida lactea)\b/, tipo: 'Iogurte', categoria: 'Laticínios', local: 'Geladeira', diasAviso: 2,
    dica: 'Geladeira, na prateleira do meio (não na porta). Aberto: consumir em até 3 dias.' },
  { palavras: /\b(requeijao|cream cheese|ricota)\b/, tipo: 'Requeijão', categoria: 'Laticínios', local: 'Geladeira', diasAviso: 3,
    dica: 'Geladeira, bem tampado. Use sempre colher limpa; aberto dura cerca de 5 dias.' },
  { palavras: /\b(queijo|mussarela|mucarela|parmesao|provolone)\b/, tipo: 'Queijo', categoria: 'Laticínios', local: 'Geladeira', diasAviso: 3,
    dica: 'Geladeira, embrulhado em papel-manteiga ou em pote fechado para não ressecar.' },
  { palavras: /\b(manteiga|margarina)\b/, tipo: 'Manteiga / margarina', categoria: 'Laticínios', local: 'Geladeira', diasAviso: 7,
    dica: 'Geladeira, bem fechada para não pegar cheiro de outros alimentos.' },
  { palavras: /\bleite\b/, tipo: 'Leite', categoria: 'Laticínios', local: 'Armário', diasAviso: 5,
    dica: 'Caixinha fechada pode ficar no armário. Aberto: geladeira e consumir em até 3 dias.' },
  { palavras: /\bovos?\b/, tipo: 'Ovos', categoria: 'Outros', local: 'Geladeira', diasAviso: 5,
    dica: 'Geladeira, na embalagem e fora da porta. Não lave antes de guardar.' },

  // Carnes
  { palavras: /\b(presunto|mortadela|salame|peito de peru|apresuntado|blanquet)\b/, tipo: 'Frios', categoria: 'Carnes', local: 'Geladeira', diasAviso: 2,
    dica: 'Geladeira, em pote fechado. Fatiado dura cerca de 3 dias.' },
  { palavras: /\b(salsicha|linguica|bacon|calabresa)\b/, tipo: 'Embutidos', categoria: 'Carnes', local: 'Geladeira', diasAviso: 2,
    dica: 'Geladeira, bem fechado. Para guardar por mais tempo, congele.' },
  { palavras: /\b(frango|peito|coxa|sobrecoxa|asa|file de frango)\b/, tipo: 'Frango', categoria: 'Carnes', local: 'Geladeira', diasAviso: 1,
    dica: 'Parte mais fria da geladeira, até 2 dias. Para mais tempo, congele em porções.' },
  { palavras: /\b(peixe|tilapia|salmao|merluza|camarao|pescada)\b/, tipo: 'Peixe', categoria: 'Carnes', local: 'Geladeira', diasAviso: 1,
    dica: 'Parte mais fria da geladeira e consumir em até 1 dia, ou congelar.' },
  { palavras: /\b(atum|sardinha)\b/, tipo: 'Peixe em lata', categoria: 'Outros', local: 'Armário', diasAviso: 30,
    dica: 'Armário. Aberto: passe para um pote na geladeira (nunca guarde na lata).' },
  { palavras: /\b(carne|bife|patinho|alcatra|picanha|acem|costela|moida|porco|lombo|hamburguer)\b/, tipo: 'Carne', categoria: 'Carnes', local: 'Geladeira', diasAviso: 1,
    dica: 'Parte mais fria da geladeira, até 2 dias. Para mais tempo, congele em porções.' },

  // Padaria
  { palavras: /\b(pao|paes|bisnaguinha|baguete|croissant)\b/, tipo: 'Pão', categoria: 'Padaria', local: 'Armário', diasAviso: 1,
    dica: 'Armário, em saco bem fechado. Para durar mais, congele fatiado.' },
  { palavras: /\b(bolo|torta|sonho)\b/, tipo: 'Bolo', categoria: 'Padaria', local: 'Armário', diasAviso: 1,
    dica: 'Pote fechado no armário; com recheio ou cobertura, na geladeira.' },
  { palavras: /\b(biscoito|bolacha|torrada|cookie|wafer)\b/, tipo: 'Biscoito', categoria: 'Padaria', local: 'Armário', diasAviso: 15,
    dica: 'Armário. Depois de aberto, feche bem o pacote ou use um pote para não murchar.' },

  // Grãos e mercearia
  { palavras: /\b(arroz|feijao|lentilha|grao de bico|ervilha seca|milho de pipoca|quinoa)\b/, tipo: 'Grãos', categoria: 'Grãos', local: 'Armário', diasAviso: 30,
    dica: 'Pote bem fechado, em local seco e arejado, longe do fogão.' },
  { palavras: /\b(macarrao|massa|espaguete|lasanha seca|miojo)\b/, tipo: 'Massas', categoria: 'Grãos', local: 'Armário', diasAviso: 30,
    dica: 'Armário, na embalagem fechada ou em pote, longe da umidade.' },
  { palavras: /\b(farinha|fuba|aveia|acucar|sal|amido|polvilho|granola|cereal)\b/, tipo: 'Farinhas e cereais', categoria: 'Grãos', local: 'Armário', diasAviso: 30,
    dica: 'Pote bem fechado para evitar umidade e insetos.' },
  { palavras: /\b(cafe)\b/, tipo: 'Café', categoria: 'Bebidas', local: 'Armário', diasAviso: 30,
    dica: 'Pote bem fechado, longe da luz e do calor.' },
  { palavras: /\b(oleo|azeite|vinagre)\b/, tipo: 'Óleos', categoria: 'Outros', local: 'Armário', diasAviso: 30,
    dica: 'Armário, longe do fogão e da luz.' },
  { palavras: /\b(molho de tomate|extrato de tomate|maionese|ketchup|mostarda)\b/, tipo: 'Molhos', categoria: 'Outros', local: 'Armário', diasAviso: 15,
    dica: 'Fechado, no armário. Aberto: geladeira e usar em até 5 dias (maionese, até 3).' },
  { palavras: /\b(milho|ervilha|seleta|palmito|azeitona|conserva|enlatado)\b/, tipo: 'Enlatados e conservas', categoria: 'Outros', local: 'Armário', diasAviso: 30,
    dica: 'Armário. Aberto: passe para um pote de vidro ou plástico na geladeira.' },

  // Bebidas
  { palavras: /\b(suco|nectar)\b/, tipo: 'Suco', categoria: 'Bebidas', local: 'Armário', diasAviso: 7,
    dica: 'Caixinha fechada no armário. Aberto (ou natural): geladeira e consumir em até 3 dias.' },
  { palavras: /\b(refrigerante|refri|cerveja|agua tonica)\b/, tipo: 'Refrigerante', categoria: 'Bebidas', local: 'Armário', diasAviso: 15,
    dica: 'Armário, longe do sol. Aberto: geladeira bem tampado, até 2 dias.' },
  { palavras: /\b(achocolatado|toddy|nescau)\b/, tipo: 'Achocolatado', categoria: 'Bebidas', local: 'Armário', diasAviso: 15,
    dica: 'Pote bem fechado, em local seco.' },

  // Congelados
  { palavras: /\b(sorvete|picole|acai)\b/, tipo: 'Sorvete', categoria: 'Congelados', local: 'Freezer', diasAviso: 15,
    dica: 'No fundo do freezer (não na porta). Não recongele depois de derreter.' },
  { palavras: /\b(congelad[oa]|pizza|nuggets|empanado|lasanha|polpa)\b/, tipo: 'Congelados', categoria: 'Congelados', local: 'Freezer', diasAviso: 15,
    dica: 'Freezer a -18 °C. Depois de descongelar, não congele de novo.' },
  // Hortifrúti por último: nomes de frutas aparecem em outros produtos (suco de uva, molho de tomate)
  { palavras: /\b(banana)\b/, tipo: 'Banana', categoria: 'Hortifrúti', local: 'Armário', diasAviso: 1,
    dica: 'Fora da geladeira, separada das outras frutas (ela acelera o amadurecimento).' },
  { palavras: /\b(tomate|abacate|manga|mamao)\b/, tipo: 'Fruta para amadurecer', categoria: 'Hortifrúti', local: 'Armário', diasAviso: 1,
    dica: 'Fora da geladeira até amadurecer; maduro, vai para a gaveta da geladeira.' },
  { palavras: /\b(batata|cebola|alho|mandioca|inhame|abobora)\b/, tipo: 'Raízes e bulbos', categoria: 'Hortifrúti', local: 'Armário', diasAviso: 3,
    dica: 'Local seco, escuro e arejado, fora da geladeira. Batata longe da cebola.' },
  { palavras: /\b(alface|couve|rucula|espinafre|agriao|cheiro verde|salsinha|cebolinha|coentro|repolho|brocolis)\b/, tipo: 'Folhas e verduras', categoria: 'Hortifrúti', local: 'Geladeira', diasAviso: 1,
    dica: 'Gaveta da geladeira, bem secas, em pote ou saco com papel-toalha.' },
  { palavras: /\b(maca|pera|laranja|limao|uva|morango|melao|melancia|abacaxi|kiwi|cenoura|pepino|pimentao|abobrinha|beterraba|chuchu)\b/, tipo: 'Frutas e legumes', categoria: 'Hortifrúti', local: 'Geladeira', diasAviso: 2,
    dica: 'Gaveta da geladeira. Lave só na hora de consumir.' },
];

/** Padrão por categoria, quando o nome não é reconhecido. */
const PADRAO_CATEGORIA: Record<string, Omit<Orientacao, 'categoria' | 'porNome'>> = {
  'Laticínios': { tipo: 'Laticínio', local: 'Geladeira', diasAviso: 3, dica: 'Geladeira, fora da porta. Depois de aberto, consumir em poucos dias.' },
  'Carnes': { tipo: 'Carne', local: 'Geladeira', diasAviso: 1, dica: 'Parte mais fria da geladeira, até 2 dias, ou congele em porções.' },
  'Hortifrúti': { tipo: 'Hortifrúti', local: 'Geladeira', diasAviso: 1, dica: 'Gaveta da geladeira. Lave só na hora de consumir.' },
  'Padaria': { tipo: 'Padaria', local: 'Armário', diasAviso: 1, dica: 'Armário, em saco bem fechado. Congele para durar mais.' },
  'Grãos': { tipo: 'Grãos', local: 'Armário', diasAviso: 30, dica: 'Pote fechado, em local seco e arejado.' },
  'Bebidas': { tipo: 'Bebida', local: 'Armário', diasAviso: 7, dica: 'Armário, longe do sol. Depois de aberta, geladeira.' },
  'Congelados': { tipo: 'Congelado', local: 'Freezer', diasAviso: 15, dica: 'Freezer a -18 °C. Não recongele o que descongelou.' },
  'Outros': { tipo: 'Alimento', local: 'Armário', diasAviso: 3, dica: 'Siga a orientação da embalagem. Depois de aberto, prefira a geladeira.' },
};

const normalizar = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function orientar(nome: string, categoria: string): Orientacao {
  const n = normalizar(nome);
  if (n.trim()) {
    const r = REGRAS.find((x) => x.palavras.test(n));
    if (r) {
      const { palavras: _p, ...resto } = r;
      return { ...resto, porNome: true };
    }
  }
  const p = PADRAO_CATEGORIA[categoria] ?? PADRAO_CATEGORIA['Outros'];
  return { ...p, categoria, porNome: false };
}

/** Atalho usado pelo banco: dias de antecedência do aviso para um item. */
export const diasDeAviso = (nome: string, categoria: string) => orientar(nome, categoria).diasAviso;
