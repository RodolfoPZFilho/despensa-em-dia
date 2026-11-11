// Testa a orientação de armazenamento e o prazo de aviso por alimento.  Rode: npm test
import { orientar } from '../src/lib/armazenamento.ts';

const casos = [
  // nome, categoria escolhida, local esperado, dias de aviso esperados
  ['Iogurte natural', 'Outros', 'Geladeira', 2],
  ['Leite integral 1L', 'Outros', 'Armário', 5],
  ['Leite Condensado Integral Moça Nestlé', 'Laticínios', 'Armário', 15],
  ['Queijo mussarela fatiado', 'Outros', 'Geladeira', 3],
  ['Carne moída', 'Outros', 'Geladeira', 1],
  ['Peito de frango', 'Outros', 'Geladeira', 1],
  ['Peito de peru', 'Outros', 'Geladeira', 2],
  ['Pão francês', 'Outros', 'Armário', 1],
  ['Pão de forma', 'Outros', 'Armário', 1],
  ['Suco de uva integral', 'Outros', 'Armário', 7],
  ['Arroz branco 5kg', 'Outros', 'Armário', 30],
  ['Feijão carioca', 'Outros', 'Armário', 30],
  ['Macarrão espaguete', 'Outros', 'Armário', 30],
  ['Banana prata', 'Outros', 'Armário', 1],
  ['Alface crespa', 'Outros', 'Geladeira', 1],
  ['Ovos brancos', 'Outros', 'Geladeira', 5],
  ['Sorvete de chocolate', 'Outros', 'Freezer', 15],
  ['Milho verde em lata', 'Outros', 'Armário', 30],
  ['Café torrado', 'Outros', 'Armário', 30],
  ['Molho de tomate', 'Outros', 'Armário', 15],
  ['Iogurte de morango', 'Outros', 'Geladeira', 2],
  ['Bolo de banana', 'Outros', 'Armário', 1],
  ['Tomate italiano', 'Outros', 'Armário', 1],
  ['Produto desconhecido', 'Carnes', 'Geladeira', 1],
  ['', 'Grãos', 'Armário', 30],
];

let ok = 0;
for (const [nome, cat, local, dias] of casos) {
  const o = orientar(nome, cat);
  const passou = o.local === local && o.diasAviso === dias;
  ok += passou;
  console.log(passou ? 'OK   ' : 'FALHA', `${JSON.stringify(nome)} -> ${o.tipo} | ${o.local} | aviso ${o.diasAviso}d`, passou ? '' : `(esperado ${local}, ${dias}d)`);
}
console.log(`${ok}/${casos.length}`);
if (ok !== casos.length) process.exit(1);
