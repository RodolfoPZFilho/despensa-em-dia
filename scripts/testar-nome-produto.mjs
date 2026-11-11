// Testa o padrão de nome dos produtos lidos pelo código de barras.  Rode: npm test
// Casos reais da Open Food Facts (produtos mais escaneados no Brasil).
import { encurtarNomeProduto } from '../src/lib/nomeProduto.ts';

const casos = [
  // nome na base, marcas, quantidade -> esperado
  ['Leite Condensado Integral moça', 'Nestlé, Moça', '395 g', 'Leite Condensado Integral Moça 395 g'],
  ['BISC RECH PASSATEMPO CHOC 130G NESTLE', 'Nestlé', '130g', 'Biscoito Recheado Passatempo Chocolate Nestlé 130 g'],
  ['Iogurte Integral Natural Nestlé Bandeja 340g 4 Unidades', 'Nestlé', '340g', 'Iogurte Integral Natural Nestlé 340 g'],
  ['Margarina Cremosa Com Sal Qualy Pote 1kg Embalagem Econômica', 'Qualy', '1kg', 'Margarina Cremosa com Sal Qualy 1 kg'],
  ['Refrigerante Coca Cola Garrafa 200ml', 'Coca-Cola', '200ml', 'Refrigerante Coca-Cola 200 ml'],
  ['Isotônico Mix De Frutas Fifa World Cup Qatar 2022 Powerade Squeeze 500ml', 'POWERADE', '500ml', 'Isotônico Mix de Frutas Powerade 500 ml'],
  ['Café Torrado E Moído Tradicional Melitta Caixa 500g', 'Melitta', '500g', 'Café Torrado e Moído Tradicional Melitta 500 g'],
  ['YOKI Batata Palha Tradicional 105 g', 'Yoki', '105 g', 'Batata Palha Tradicional Yoki 105 g'],
  ['Pão de Fôrma Integral - Wickbold - 550g', 'WICKBOLD', '550 g', 'Pão de Fôrma Integral Wickbold 550 g'],
  ['Pão de forma integral (36% Cereais integrais)', 'Visconti', '400g', 'Pão de Forma Integral Visconti 400 g'],
  ['Leite em pó integral instantâneo Ninho', 'Nestlé Ninho', '380g', 'Leite em Pó Integral Instantâneo Ninho 380 g'],
  ['Macarrão Instantâneo Lámen Carne Nissin Miojo Pacote 85g', 'AJINOMOTO', '85g', 'Macarrão Instantâneo Lámen Carne Nissin Miojo 85 g'],
  ['Refresco Adoçado Uva Del Valle Kapo Caixa 200ml', 'DEL VALLE', '200ml', 'Refresco Adoçado Uva Kapo Del Valle 200 ml'],
  ['Oleo De Coco Ex. Virgem 200ML - Copra', 'Copra', '5', 'Oleo de Coco Extra Virgem Copra 200 ml'],
  ['Wafer recheado com cobertura sabor chocolate', 'BIS', '100.8g', 'Wafer Recheado com Cobertura Sabor Chocolate BIS 100,8 g'],
  ['Requeijão Cremoso Tradicional', 'VIGOR', null, 'Requeijão Cremoso Tradicional Vigor'],
  ['Arroz', '', '', 'Arroz'],
];

let ok = 0;
for (const [nome, marcas, qtd, esperado] of casos) {
  const r = encurtarNomeProduto(nome, marcas, qtd);
  const passou = r === esperado;
  ok += passou;
  console.log(passou ? 'OK   ' : 'FALHA', `${JSON.stringify(nome)} -> ${JSON.stringify(r)}`, passou ? '' : `(esperado ${JSON.stringify(esperado)})`);
}
// Nenhum nome passa de 60 caracteres
const longo = encurtarNomeProduto('Pão integral com trigo, aveia, semente de girassol, gergelim e semente de linhaça', 'Nutrella', '550 g');
const curto = longo.length <= 60;
ok += curto;
console.log(curto ? 'OK   ' : 'FALHA', `limite de 60 caracteres -> ${JSON.stringify(longo)} (${longo.length})`);
console.log(`${ok}/${casos.length + 1}`);
if (ok !== casos.length + 1) process.exit(1);
