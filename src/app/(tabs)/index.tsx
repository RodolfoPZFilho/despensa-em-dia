import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import Ionicons from '@expo/vector-icons/Ionicons';
import { listarAtivos, type FiltroLista, type Item } from '@/db/itens';
import { paraISODia } from '@/lib/datas';
import { cores, espaco, raio } from '@/lib/theme';
import { Chip, Vazio } from '@/components/ui';
import { ItemCard } from '@/components/ItemCard';
import { useSync } from '@/sync/SyncContext';

const FILTROS: { valor: FiltroLista; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'vencendo', rotulo: 'Perto de vencer' },
  { valor: 'vencidos', rotulo: 'Vencidos' },
];

export default function DespensaScreen() {
  const db = useSQLiteContext();
  const { versaoDados, sincronizarAgora, estado } = useSync();
  const [itens, setItens] = useState<Item[]>([]);
  const [filtro, setFiltro] = useState<FiltroLista>('todos');
  const [busca, setBusca] = useState('');
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async () => {
    setItens(await listarAtivos(db, filtro, paraISODia(new Date()), busca));
  }, [db, filtro, busca, versaoDados]); // eslint-disable-line react-hooks/exhaustive-deps

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  async function puxarParaAtualizar() {
    setAtualizando(true);
    await sincronizarAgora();
    await carregar();
    setAtualizando(false);
  }

  return (
    <View style={s.tela}>
      <View style={s.topo}>
        <View style={s.busca}>
          <Ionicons name="search" size={18} color={cores.textoSuave} />
          <TextInput style={s.buscaInput} placeholder="Buscar alimento" placeholderTextColor={cores.textoSuave} value={busca} onChangeText={setBusca} />
        </View>
        <View style={s.filtros}>
          {FILTROS.map((f) => <Chip key={f.valor} rotulo={f.rotulo} ativo={filtro === f.valor} onPress={() => setFiltro(f.valor)} />)}
        </View>
      </View>

      <FlatList
        data={itens}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => <ItemCard item={item} onPress={() => router.push({ pathname: '/item/[id]', params: { id: item.id } })} />}
        contentContainerStyle={s.lista}
        ItemSeparatorComponent={() => <View style={{ height: espaco.sm }} />}
        refreshControl={estado !== 'desativado' ? <RefreshControl refreshing={atualizando} onRefresh={puxarParaAtualizar} tintColor={cores.primaria} /> : undefined}
        ListEmptyComponent={
          filtro === 'todos' && !busca ? (
            <Vazio icone="basket-outline" titulo="Sua despensa está vazia" texto="Toque no + para cadastrar um alimento e a data de validade. Avisaremos o que precisa ser usado primeiro." />
          ) : (
            <Vazio icone="checkmark-circle-outline" titulo="Nada por aqui" texto="Nenhum alimento corresponde a este filtro." />
          )
        }
      />

      <Pressable style={({ pressed }) => [s.fab, pressed && { opacity: 0.8 }]} onPress={() => router.push('/item/novo')} accessibilityLabel="Adicionar alimento">
        <Ionicons name="add" size={30} color="#fff" />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  topo: { paddingHorizontal: espaco.lg, paddingTop: espaco.sm, gap: espaco.md },
  busca: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm, backgroundColor: cores.cartao, borderRadius: raio, borderWidth: 1, borderColor: cores.borda, paddingHorizontal: espaco.md },
  buscaInput: { flex: 1, paddingVertical: 10, fontSize: 16, color: cores.texto, outlineWidth: 0 },
  filtros: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm },
  lista: { padding: espaco.lg, paddingBottom: 110 },
  fab: {
    position: 'absolute', right: espaco.xl, bottom: espaco.xl, width: 60, height: 60, borderRadius: 30,
    backgroundColor: cores.primaria, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 5,
  },
});
