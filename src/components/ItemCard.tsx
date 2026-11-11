import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Item } from '@/db/itens';
import { corSituacao, formatarData, textoSituacao } from '@/lib/datas';
import { cores, espaco, raio } from '@/lib/theme';

const iconeLocal: Record<string, keyof typeof Ionicons.glyphMap> = {
  Geladeira: 'thermometer-outline',
  Freezer: 'snow-outline',
  Armário: 'file-tray-stacked-outline',
};

export function ItemCard({ item, onPress }: { item: Item; onPress: () => void }) {
  const finalizado = item.status !== 'ativo';
  const { cor, fundo } = finalizado
    ? item.status === 'consumido'
      ? { cor: cores.primaria, fundo: cores.primariaClara }
      : { cor: cores.vencido, fundo: cores.vencidoFundo }
    : corSituacao(item.validade, item.dias_aviso);
  const selo = finalizado
    ? `${item.status === 'consumido' ? 'Consumido' : 'Descartado'} em ${new Date(item.atualizado_em).toLocaleDateString('pt-BR')}`
    : textoSituacao(item.validade);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.card, pressed && { opacity: 0.7 }]}>
      <View style={[s.faixa, { backgroundColor: cor }]} />
      <View style={s.corpo}>
        <View style={s.linha}>
          <Text style={s.nome} numberOfLines={1}>{item.nome}</Text>
          <Text style={s.qtd}>{formatarQtd(item.quantidade)} {item.unidade}</Text>
        </View>
        <View style={s.linha}>
          <View style={s.meta}>
            <Ionicons name={iconeLocal[item.local] ?? 'cube-outline'} size={14} color={cores.textoSuave} />
            <Text style={s.metaTexto}>{item.local} · {item.categoria}</Text>
          </View>
          <View style={[s.badge, { backgroundColor: fundo }]}>
            <Text style={[s.badgeTexto, { color: cor }]}>{selo}</Text>
          </View>
        </View>
        <Text style={s.data}>Validade: {formatarData(item.validade)}</Text>
      </View>
    </Pressable>
  );
}

export const formatarQtd = (n: number) => (Number.isInteger(n) ? String(n) : n.toLocaleString('pt-BR'));

const s = StyleSheet.create({
  card: { flexDirection: 'row', backgroundColor: cores.cartao, borderRadius: raio, overflow: 'hidden', borderWidth: 1, borderColor: cores.borda },
  faixa: { width: 5 },
  corpo: { flex: 1, padding: espaco.md, gap: 6 },
  linha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espaco.sm },
  nome: { flex: 1, fontSize: 16, fontWeight: '600', color: cores.texto },
  qtd: { fontSize: 14, color: cores.textoSuave },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  metaTexto: { fontSize: 13, color: cores.textoSuave },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeTexto: { fontSize: 12, fontWeight: '600' },
  data: { fontSize: 12, color: cores.textoSuave },
});
