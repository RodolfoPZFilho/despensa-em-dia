import { createElement, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CATEGORIAS, LOCAIS, UNIDADES, type ItemEntrada } from '@/db/itens';
import { deISODia, formatarData, paraISODia } from '@/lib/datas';
import { cores, espaco, raio } from '@/lib/theme';
import { avisar } from '@/lib/alertas';
import { Botao, Chip } from './ui';

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

  const abrirCalendarioAndroid = () =>
    DateTimePickerAndroid.open({
      value: deISODia(validade),
      mode: 'date',
      onValueChange: (_e, d) => setValidade(paraISODia(d)),
    });

  async function salvar() {
    const qtd = Number(quantidade.replace(',', '.'));
    if (!nome.trim()) return avisar('Informe o nome', 'Diga qual é o alimento (ex.: Leite integral).');
    if (!Number.isFinite(qtd) || qtd <= 0) return avisar('Quantidade inválida', 'Use um número maior que zero.');
    setSalvando(true);
    try {
      await onSalvar({ nome, categoria, quantidade: qtd, unidade, local, validade, observacao: observacao.trim() || null });
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
        <Rotulo texto="Alimento" />
        <TextInput style={s.input} value={nome} onChangeText={setNome} placeholder="Ex.: Iogurte natural" placeholderTextColor={cores.textoSuave} autoFocus={!inicial} />

        <Rotulo texto="Data de validade" />
        <View style={s.linhaData}>
          {Platform.OS === 'web' ? (
            // No navegador usamos o seletor de data nativo do HTML
            createElement('input', {
              type: 'date',
              value: validade,
              onChange: (e: { target: { value: string } }) => e.target.value && setValidade(e.target.value),
              style: { fontSize: 16, padding: 10, borderRadius: raio, border: `1px solid ${cores.borda}`, color: cores.texto, fontFamily: 'inherit' },
            })
          ) : Platform.OS === 'ios' ? (
            <DateTimePicker value={deISODia(validade)} mode="date" display="compact" locale="pt-BR" onValueChange={(_e, d) => setValidade(paraISODia(d))} />
          ) : (
            <Pressable style={[s.input, s.campoData]} onPress={abrirCalendarioAndroid}>
              <Ionicons name="calendar-outline" size={18} color={cores.primaria} />
              <Text style={s.textoData}>{formatarData(validade)}</Text>
            </Pressable>
          )}
        </View>
        <View style={s.chips}>
          {ATALHOS.map((a) => (
            <Chip key={a.rotulo} rotulo={a.rotulo} ativo={false} onPress={() => setValidade(paraISODia(somarDias(new Date(), a.dias)))} />
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
    </KeyboardAvoidingView>
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
});
