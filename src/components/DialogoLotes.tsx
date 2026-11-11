import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Item } from '@/db/itens';
import { corGradiente, formatarData, textoSituacao } from '@/lib/datas';
import { cores, espaco, raio } from '@/lib/theme';
import { Botao } from './ui';
import { formatarQtd } from './ItemCard';

export type LoteResumo = Pick<Item, 'id' | 'nome' | 'validade' | 'quantidade' | 'unidade' | 'local'>;

/**
 * Aparece quando o código de barras lido já pertence a alimentos ATIVOS na despensa.
 * Em vez de afirmar o que fazer, pergunta: cadastrar um novo lote, somar a um lote existente
 * (mesma validade) ou desistir.
 */
export function DialogoLotes({ lotes, quantidade, diasAviso, onNovoLote, onSomar, onDesistir }: {
  lotes: LoteResumo[] | null;
  quantidade: string;
  diasAviso: number;
  onNovoLote: () => void;
  onSomar: (id: string) => void;
  onDesistir: () => void;
}) {
  const n = lotes?.length ?? 0;
  const total = lotes?.reduce((acc, l) => acc + l.quantidade, 0) ?? 0;
  return (
    <Modal visible={n > 0} transparent animationType="fade" onRequestClose={onNovoLote}>
      <View style={s.fundo}>
        <View style={s.caixa}>
          <View style={s.cabecalho}>
            <Ionicons name="help-circle-outline" size={28} color={cores.atencao} />
            <Text style={s.titulo}>Tem certeza?</Text>
          </View>
          <Text style={s.texto}>
            Você já tem <Text style={s.forte}>{n === 1 ? '1 lote ativo' : `${n} lotes ativos`}</Text> de{' '}
            <Text style={s.forte}>{lotes?.[0]?.nome}</Text> na despensa ({formatarQtd(total)} {lotes?.[0]?.unidade} no total):
          </Text>

          <ScrollView style={{ maxHeight: 220 }} contentContainerStyle={{ gap: espaco.sm }}>
            {lotes?.map((l, i) => (
              <View key={l.id} style={s.lote}>
                <View style={[s.faixa, { backgroundColor: corGradiente(l.validade, diasAviso) }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.loteTitulo}>Lote {i + 1} · {formatarQtd(l.quantidade)} {l.unidade} · {l.local}</Text>
                  <Text style={s.loteData}>Validade {formatarData(l.validade)} · {textoSituacao(l.validade)}</Text>
                </View>
                <Pressable onPress={() => onSomar(l.id)} style={s.somar} accessibilityLabel={`Somar ao lote ${i + 1}`}>
                  <Text style={s.somarTexto}>+{quantidade.replace('.', ',')}</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>

          <Text style={s.dica}>
            Mesma validade de um lote acima? Toque em <Text style={s.forte}>+</Text> para somar a quantidade. Validade diferente? Cadastre um novo lote.
          </Text>

          <Botao titulo="Cadastrar novo lote" icone="layers-outline" onPress={onNovoLote} />
          <Botao titulo="Não cadastrar" variante="secundario" onPress={onDesistir} />
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: espaco.lg },
  caixa: { backgroundColor: cores.cartao, borderRadius: raio, padding: espaco.lg, gap: espaco.md, maxWidth: 480, width: '100%', alignSelf: 'center' },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
  titulo: { fontSize: 20, fontWeight: '700', color: cores.texto },
  texto: { fontSize: 15, color: cores.texto, lineHeight: 21 },
  forte: { fontWeight: '700' },
  lote: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm, borderWidth: 1, borderColor: cores.borda, borderRadius: raio, overflow: 'hidden', paddingRight: espaco.sm },
  faixa: { width: 6, alignSelf: 'stretch' },
  loteTitulo: { fontSize: 14, fontWeight: '600', color: cores.texto, paddingTop: espaco.sm },
  loteData: { fontSize: 12, color: cores.textoSuave, paddingBottom: espaco.sm },
  somar: { backgroundColor: cores.primariaClara, borderRadius: raio, paddingHorizontal: espaco.md, paddingVertical: 8 },
  somarTexto: { fontSize: 15, fontWeight: '700', color: cores.primaria },
  dica: { fontSize: 12, color: cores.textoSuave, lineHeight: 17 },
});
