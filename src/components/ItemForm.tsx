import { createElement, useState, type ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CATEGORIAS, LOCAIS, UNIDADES, type ItemEntrada, type OrigemValidade } from '@/db/itens';
import { deISODia, formatarData, paraISODia } from '@/lib/datas';
import { cores, espaco, raio } from '@/lib/theme';
import { avisar } from '@/lib/alertas';
import { buscarProdutoPorCodigo, lerTextoDaFoto } from '@/lib/visao';
import { extrairValidade, type CandidataValidade } from '@/lib/validadeOcr';
import { Botao, Chip } from './ui';
import { CameraVisao, type FotoCapturada, type ModoCamera } from './CameraVisao';

const ATALHOS = [
  { rotulo: '+3 dias', dias: 3 },
  { rotulo: '+1 semana', dias: 7 },
  { rotulo: '+1 mês', dias: 30 },
  { rotulo: '+6 meses', dias: 180 },
];

export function ItemForm({ inicial, tituloBotao, onSalvar, cabecalho }: {
  inicial?: ItemEntrada;
  cabecalho?: ReactNode;
  tituloBotao: string;
  onSalvar: (e: ItemEntrada) => Promise<void>;
}) {
  const [nome, setNome] = useState(inicial?.nome ?? '');
  const [categoria, setCategoria] = useState(inicial?.categoria ?? 'Outros');
  const [quantidade, setQuantidade] = useState(inicial ? String(inicial.quantidade).replace('.', ',') : '1');
  const [unidade, setUnidade] = useState(inicial?.unidade ?? 'un');
  const [local, setLocal] = useState(inicial?.local ?? 'Geladeira');
  const [validade, setValidade] = useState(inicial?.validade ?? paraISODia(somarDias(new Date(), 7)));
  const [observacao, setObservacao] = useState(inicial?.observacao ?? '');
  const [salvando, setSalvando] = useState(false);

  // --- Visão computacional ---
  const db = useSQLiteContext();
  const [codigoBarras, setCodigoBarras] = useState(inicial?.codigo_barras ?? null);
  const [origemValidade, setOrigemValidade] = useState<OrigemValidade>(inicial?.validade_origem ?? 'manual');
  const [textoOcr, setTextoOcr] = useState(inicial?.texto_ocr ?? null);
  const [candidatas, setCandidatas] = useState<CandidataValidade[]>([]);
  const [camera, setCamera] = useState<ModoCamera | null>(null);
  const [processando, setProcessando] = useState<string | null>(null); // mensagem enquanto lê
  const [infoCodigo, setInfoCodigo] = useState<string | null>(null);

  /** Data escolhida à mão (calendário/atalhos): deixa de ser "lida pela câmera". */
  function escolherDataManual(iso: string) {
    setValidade(iso);
    setOrigemValidade('manual');
  }

  async function aoLerCodigo(codigo: string) {
    setCamera(null);
    const limpo = codigo.replace(/\D/g, '');
    if (limpo.length < 6 || limpo.length > 14) return avisar('Código não reconhecido', `Li "${codigo}", que não parece um código de barras de produto.`);
    setCodigoBarras(limpo);
    setProcessando('Buscando o produto…');
    try {
      const p = await buscarProdutoPorCodigo(db, limpo);
      if (!p) {
        setInfoCodigo('Produto não encontrado nas bases. Digite o nome: da próxima vez o app já reconhece este código.');
        return;
      }
      setNome(p.nome);
      setCategoria(p.categoria);
      if (p.unidade) setUnidade(p.unidade);
      if (p.local) setLocal(p.local);
      setInfoCodigo(p.origem === 'despensa' ? 'Reconhecido pelo seu histórico na despensa.' : 'Encontrado na base Open Food Facts. Confira o nome.');
    } finally {
      setProcessando(null);
    }
  }

  async function aoFotografarValidade(foto: FotoCapturada) {
    setCamera(null);
    setProcessando('Lendo a data na foto…');
    try {
      const texto = await lerTextoDaFoto(foto);
      const r = extrairValidade(texto);
      setCandidatas(r.candidatas);
      if (!r.sugestao) {
        avisar('Não encontrei a validade', texto
          ? `Texto lido: "${texto.slice(0, 160)}". Tente aproximar mais a câmera ou escolha a data manualmente.`
          : 'Nenhum texto foi reconhecido. Tente com mais luz e a data bem enquadrada.');
        return;
      }
      setValidade(r.sugestao);
      setOrigemValidade('ocr');
      setTextoOcr(texto.slice(0, 500));
    } catch (e: any) {
      avisar('Não foi possível ler a foto', e?.message ?? String(e));
    } finally {
      setProcessando(null);
    }
  }

  const abrirCalendarioAndroid = () =>
    DateTimePickerAndroid.open({
      value: deISODia(validade),
      mode: 'date',
      onValueChange: (_e, d) => escolherDataManual(paraISODia(d)),
    });

  async function salvar() {
    const qtd = Number(quantidade.replace(',', '.'));
    if (!nome.trim()) return avisar('Informe o nome', 'Diga qual é o alimento (ex.: Leite integral).');
    if (!Number.isFinite(qtd) || qtd <= 0) return avisar('Quantidade inválida', 'Use um número maior que zero.');
    setSalvando(true);
    try {
      await onSalvar({
        nome, categoria, quantidade: qtd, unidade, local, validade, observacao: observacao.trim() || null,
        codigo_barras: codigoBarras,
        validade_origem: origemValidade,
        texto_ocr: origemValidade === 'ocr' ? textoOcr : null,
      });
    } catch (e: any) {
      avisar('Não foi possível salvar', e?.message ?? String(e));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.conteudo} keyboardShouldPersistTaps="handled">
        {cabecalho}
        {processando && (
          <View style={s.processando}>
            <ActivityIndicator color={cores.primaria} />
            <Text style={s.textoProcessando}>{processando}</Text>
          </View>
        )}

        <Rotulo texto="Alimento" />
        <View style={s.linhaCampoBotao}>
          <TextInput style={[s.input, { flex: 1 }]} value={nome} onChangeText={setNome} placeholder="Ex.: Iogurte natural" placeholderTextColor={cores.textoSuave} />
          <BotaoCamera icone="barcode-outline" rotulo="Ler código de barras" onPress={() => setCamera('codigo')} />
        </View>
        {codigoBarras && (
          <View style={s.infoVisao}>
            <Ionicons name="barcode-outline" size={16} color={cores.primaria} />
            <Text style={s.textoInfo}>
              Código {codigoBarras}{infoCodigo ? ` · ${infoCodigo}` : ''}
            </Text>
            <Pressable onPress={() => { setCodigoBarras(null); setInfoCodigo(null); }} hitSlop={8} accessibilityLabel="Remover código">
              <Ionicons name="close-circle" size={18} color={cores.textoSuave} />
            </Pressable>
          </View>
        )}

        <Rotulo texto="Data de validade" />
        <View style={s.linhaData}>
          {Platform.OS === 'web' ? (
            // No navegador usamos o seletor de data nativo do HTML
            createElement('input', {
              type: 'date',
              value: validade,
              onChange: (e: { target: { value: string } }) => e.target.value && escolherDataManual(e.target.value),
              style: { fontSize: 16, padding: 10, borderRadius: raio, border: `1px solid ${cores.borda}`, color: cores.texto, fontFamily: 'inherit' },
            })
          ) : Platform.OS === 'ios' ? (
            <DateTimePicker value={deISODia(validade)} mode="date" display="compact" locale="pt-BR" onValueChange={(_e, d) => escolherDataManual(paraISODia(d))} />
          ) : (
            <Pressable style={[s.input, s.campoData]} onPress={abrirCalendarioAndroid}>
              <Ionicons name="calendar-outline" size={18} color={cores.primaria} />
              <Text style={s.textoData}>{formatarData(validade)}</Text>
            </Pressable>
          )}
          <View style={{ width: espaco.sm }} />
          <BotaoCamera icone="scan-outline" rotulo="Ler validade pela câmera" onPress={() => setCamera('validade')} />
        </View>
        {origemValidade === 'ocr' && (
          <View style={s.infoVisao}>
            <Ionicons name="camera-outline" size={16} color={cores.primaria} />
            <Text style={s.textoInfo}>Data lida da embalagem pela câmera. Confira antes de salvar.</Text>
          </View>
        )}
        {candidatas.length > 1 && (
          <>
            <Text style={s.textoInfo}>Datas encontradas na foto:</Text>
            <View style={s.chips}>
              {candidatas.map((c) => (
                <Chip
                  key={c.iso}
                  rotulo={`${formatarData(c.iso)}${c.rotulo === 'validade' ? ' (validade)' : c.rotulo === 'fabricacao' ? ' (fabricação)' : ''}`}
                  ativo={origemValidade === 'ocr' && validade === c.iso}
                  onPress={() => { setValidade(c.iso); setOrigemValidade('ocr'); }}
                />
              ))}
            </View>
          </>
        )}
        <View style={s.chips}>
          {ATALHOS.map((a) => (
            <Chip key={a.rotulo} rotulo={a.rotulo} ativo={false} onPress={() => escolherDataManual(paraISODia(somarDias(new Date(), a.dias)))} />
          ))}
        </View>

        <Rotulo texto="Quantidade" />
        <View style={s.linhaQtd}>
          <TextInput style={[s.input, { width: 90 }]} value={quantidade} onChangeText={setQuantidade} keyboardType="decimal-pad" />
          <View style={[s.chips, { flex: 1 }]}>
            {UNIDADES.map((u) => <Chip key={u} rotulo={u} ativo={unidade === u} onPress={() => setUnidade(u)} />)}
          </View>
        </View>

        <Rotulo texto="Onde está guardado" />
        <View style={s.chips}>
          {LOCAIS.map((l) => <Chip key={l} rotulo={l} ativo={local === l} onPress={() => setLocal(l)} />)}
        </View>

        <Rotulo texto="Categoria" />
        <View style={s.chips}>
          {CATEGORIAS.map((c) => <Chip key={c} rotulo={c} ativo={categoria === c} onPress={() => setCategoria(c)} />)}
        </View>

        <Rotulo texto="Observação (opcional)" />
        <TextInput
          style={[s.input, { minHeight: 70, textAlignVertical: 'top' }]}
          value={observacao}
          onChangeText={setObservacao}
          placeholder="Ex.: aberto em 28/09, consumir em 5 dias"
          placeholderTextColor={cores.textoSuave}
          multiline
        />

        <Botao titulo={salvando ? 'Salvando…' : tituloBotao} icone="checkmark" onPress={salvar} desabilitado={salvando} estilo={{ marginTop: espaco.xl }} />
      </ScrollView>

      <CameraVisao
        modo={camera ?? 'codigo'}
        visivel={camera !== null}
        onFechar={() => setCamera(null)}
        onCodigo={aoLerCodigo}
        onFoto={aoFotografarValidade}
      />
    </KeyboardAvoidingView>
  );
}

function BotaoCamera({ icone, rotulo, onPress }: { icone: keyof typeof Ionicons.glyphMap; rotulo: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      style={({ pressed }) => [s.botaoCamera, pressed && { opacity: 0.6 }]}>
      <Ionicons name={icone} size={22} color={cores.primaria} />
      <Text style={s.textoBotaoCamera}>{rotulo.includes('código') ? 'Código' : 'Ler data'}</Text>
    </Pressable>
  );
}

function Rotulo({ texto }: { texto: string }) {
  return <Text style={s.rotulo}>{texto}</Text>;
}

function somarDias(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

const s = StyleSheet.create({
  conteudo: { padding: espaco.lg, paddingBottom: 48 },
  rotulo: { fontSize: 13, fontWeight: '600', color: cores.textoSuave, marginTop: espaco.lg, marginBottom: espaco.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: cores.cartao, borderWidth: 1, borderColor: cores.borda, borderRadius: raio, paddingHorizontal: espaco.md, paddingVertical: 12, fontSize: 16, color: cores.texto },
  linhaData: { flexDirection: 'row', alignItems: 'center' },
  campoData: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm, flex: 1 },
  textoData: { fontSize: 16, color: cores.texto },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm, marginTop: espaco.sm },
  linhaQtd: { flexDirection: 'row', alignItems: 'flex-start', gap: espaco.md },
  linhaCampoBotao: { flexDirection: 'row', alignItems: 'stretch', gap: espaco.sm },
  botaoCamera: { minWidth: 72, paddingHorizontal: espaco.sm, paddingVertical: 6, borderRadius: raio, backgroundColor: cores.primariaClara, alignItems: 'center', justifyContent: 'center', gap: 2 },
  textoBotaoCamera: { fontSize: 11, fontWeight: '600', color: cores.primaria, textAlign: 'center' },
  infoVisao: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm, marginTop: espaco.sm, backgroundColor: cores.primariaClara, borderRadius: raio, padding: espaco.sm },
  textoInfo: { flex: 1, fontSize: 13, color: cores.textoSuave, marginTop: espaco.xs },
  processando: { flexDirection: 'row', alignItems: 'center', gap: espaco.md, backgroundColor: cores.primariaClara, borderRadius: raio, padding: espaco.md },
  textoProcessando: { fontSize: 15, color: cores.primaria, fontWeight: '600' },
});
