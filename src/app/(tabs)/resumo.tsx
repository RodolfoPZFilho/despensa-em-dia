import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import Ionicons from '@expo/vector-icons/Ionicons';
import { listarAtivos, obterResumo, type GrupoDetalhe, type Item, type Resumo } from '@/db/itens';
import { paraISODia } from '@/lib/datas';
import { cores, espaco, raio } from '@/lib/theme';
import { ItemCard } from '@/components/ItemCard';
import { useSync } from '@/sync/SyncContext';

export default function ResumoScreen() {
  const db = useSQLiteContext();
  const { versaoDados } = useSync();
  const [r, setR] = useState<Resumo | null>(null);
  const [urgentes, setUrgentes] = useState<Item[]>([]);

  useFocusEffect(
    useCallback(() => {
      const h = paraISODia(new Date());
      obterResumo(db, h).then(setR);
      listarAtivos(db, 'vencendo', h).then((lista) => setUrgentes(lista.slice(0, 3)));
    }, [db, versaoDados]),
  );

  if (!r) return null;
  const finalizados = r.consumidos + r.descartados;
  const aproveitamento = finalizados > 0 ? Math.round((r.consumidos / finalizados) * 100) : null;

  return (
    <ScrollView contentContainerStyle={s.conteudo}>
      <View style={s.grade}>
        <Cartao icone="basket-outline" valor={r.ativos} rotulo="Na despensa" cor={cores.primaria} onPress={() => router.navigate('/')} />
        <Cartao icone="time-outline" valor={r.vencendo} rotulo="Perto de vencer" cor={cores.atencao} onPress={() => abrirDetalhes('vencendo')} />
        <Cartao icone="alert-circle-outline" valor={r.vencidos} rotulo="Vencidos" cor={cores.vencido} onPress={() => abrirDetalhes('vencidos')} />
        <Cartao icone="restaurant-outline" valor={r.consumidos} rotulo="Consumidos" cor={cores.primaria} onPress={() => abrirDetalhes('consumidos')} />
      </View>

      <View style={s.bloco}>
        <Text style={s.titulo}>Aproveitamento</Text>
        {aproveitamento === null ? (
          <Text style={s.suave}>Marque itens como "Consumi" ou "Joguei fora" para acompanhar quanto você aproveita.</Text>
        ) : (
          <>
            <Text style={s.grande}>{aproveitamento}%</Text>
            <View style={s.barra}><View style={[s.barraCheia, { width: `${aproveitamento}%` }]} /></View>
            <Text style={s.suave}>{r.consumidos} consumido(s) · {r.descartados} descartado(s)</Text>
            <Pressable onPress={() => abrirDetalhes('descartados')}><Text style={s.link}>Ver o que foi descartado ›</Text></Pressable>
          </>
        )}
      </View>

      <View style={s.bloco}>
        <Text style={s.titulo}>Use primeiro</Text>
        {urgentes.length === 0 ? (
          <Text style={s.suave}>Nenhum alimento está perto de vencer.</Text>
        ) : (
          <View style={{ gap: espaco.sm }}>
            {urgentes.map((i) => <ItemCard key={i.id} item={i} onPress={() => router.push({ pathname: '/item/[id]', params: { id: i.id } })} />)}
          </View>
        )}
      </View>

      {(r.comCodigo > 0 || r.validadeOcr > 0) && (
        <View style={s.bloco}>
          <Text style={s.titulo}>Cadastro pela câmera</Text>
          <View style={s.linhaLocal}>
            <Text style={s.textoLocal}>Lidos pelo código de barras</Text>
            <Text style={s.textoLocal}>{r.comCodigo}</Text>
          </View>
          <View style={s.linhaLocal}>
            <Text style={s.textoLocal}>Validade lida na embalagem (OCR)</Text>
            <Text style={s.textoLocal}>{r.validadeOcr}</Text>
          </View>
        </View>
      )}

      {r.porLocal.length > 0 && (
        <View style={s.bloco}>
          <Text style={s.titulo}>Por local</Text>
          {r.porLocal.map((p) => (
            <View key={p.local} style={s.linhaLocal}>
              <Text style={s.textoLocal}>{p.local}</Text>
              <Text style={s.textoLocal}>{p.total}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const abrirDetalhes = (grupo: GrupoDetalhe) => router.navigate({ pathname: '/detalhes', params: { grupo } });

function Cartao({ icone, valor, rotulo, cor, onPress }: {
  icone: keyof typeof Ionicons.glyphMap; valor: number; rotulo: string; cor: string; onPress: () => void;
}) {
  return (
    <Pressable style={({ pressed }) => [s.cartao, pressed && { opacity: 0.7 }]} onPress={onPress} accessibilityRole="button">
      <View style={s.cartaoTopo}>
        <Ionicons name={icone} size={22} color={cor} />
        <Ionicons name="chevron-forward" size={18} color={cores.textoSuave} />
      </View>
      <Text style={[s.valor, { color: cor }]}>{valor}</Text>
      <Text style={s.suave}>{rotulo}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  conteudo: { padding: espaco.lg, gap: espaco.lg, paddingBottom: 40 },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.md },
  cartao: { flexBasis: '47%', flexGrow: 1, backgroundColor: cores.cartao, borderRadius: raio, borderWidth: 1, borderColor: cores.borda, padding: espaco.lg, gap: 4 },
  cartaoTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  valor: { fontSize: 28, fontWeight: '700' },
  bloco: { backgroundColor: cores.cartao, borderRadius: raio, borderWidth: 1, borderColor: cores.borda, padding: espaco.lg, gap: espaco.sm },
  titulo: { fontSize: 17, fontWeight: '700', color: cores.texto },
  grande: { fontSize: 34, fontWeight: '700', color: cores.primaria },
  barra: { height: 10, borderRadius: 5, backgroundColor: cores.vencidoFundo, overflow: 'hidden' },
  barraCheia: { height: '100%', backgroundColor: cores.primaria },
  link: { fontSize: 14, color: cores.primaria, fontWeight: '600', marginTop: 4 },
  suave: { fontSize: 13, color: cores.textoSuave },
  linhaLocal: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderTopColor: cores.borda },
  textoLocal: { fontSize: 15, color: cores.texto },
});
