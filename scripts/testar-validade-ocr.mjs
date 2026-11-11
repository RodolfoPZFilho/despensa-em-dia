// Testa a leitura da data de validade a partir de textos de OCR.  Rode: npm run test:ocr
import { extrairValidade } from '../src/lib/validadeOcr.ts';
const hoje = new Date(2026, 10, 11);
const casos = [
  ['VAL: 12/03/27', '2027-03-12'],
  ['FAB 10.09.26 VAL 10.03.27 L:2345', '2027-03-10'],
  ['VAL 10.03.27 FAB 10.09.26', '2027-03-10'],
  ['VENC 15 JAN 2027', '2027-01-15'],
  ['VALIDADE (DIA/MES/ANO): 05/06/2027 LOTE 123', '2027-06-05'],
  ['VAL 03/2027', '2027-03-31'],
  ['EXP 2027-03-12', '2027-03-12'],
  ['F: 01/10/26\nV: 01/O4/27', '2027-04-01'],
  ['VAL 120327 L0TE A1', '2027-03-12'],
  ['Fabricação 02/11/2026 Validade 02/05/2027', '2027-05-02'],
  ['10/09/26 10/03/27', '2027-03-10'],
  ['LEITE INTEGRAL 1L', null],
  ['SAC 0800 123 4567 VAL 31/02/27 15/02/27', '2027-02-15'],
  ['CONSUMIR ATE MAI/27', '2027-05-31'],
];
let ok = 0;
for (const [t, esp] of casos) { const r = extrairValidade(t, hoje); const pass = r.sugestao === esp; ok += pass;
  console.log(pass ? 'OK  ' : 'FALHA', JSON.stringify(t), '->', r.sugestao, pass ? '' : 'esperado ' + esp, r.candidatas.map(c=>c.iso+':'+c.rotulo).join(' ')); }
console.log(ok + '/' + casos.length);
if (ok !== casos.length) process.exit(1);
