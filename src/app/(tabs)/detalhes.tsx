import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { listarGrupo, obterResumo, type GrupoDetalhe, type Item, type Resumo } from '@/db/itens';
import { DIAS_ALERTA, paraISODia } from '@/lib/datas';
import { cores, espaco } from '@/lib/theme';
import { Chip, Vazio } from '@/components/ui';
import { ItemCard } from '@/components/ItemCard';
import { useSync } from '@/sync/SyncContext';

const GRUPOS: { valor: GrupoDetalhe; rotulo: string; chave: keyof Resumo }[] = [
  { valor: 'vencendo', rotulo: 'A vencer', chave: 'vencendo' },
  { valor: 'vencidos', rotulo: 'Vencidos', chave: 'vencidos' },
  { valor: 'consumidos', rotulo: 'Consumidos', chave: 'consumidos' },
  { valor: 'descartados', rotulo: 'Descartados', chave: 'descartados' },
];

const DESCRICAO: Record<GrupoDetalhe, string> = {
  vencendo: `Alimentos que vencem hoje ou nos próximos ${DIAS_ALERTA} dias. Use estes primeiro.`,
  vencidos: 'Alimentos que já passaram da validade. Toque para marcar como consumido ou descartado.',
  consumidos: 'Histórico do que foi aproveitado, do mais recente para o mais antigo.',
  descartados: 'Histórico do que foi jogado fora, para entender onde há desperdício.',
};

const VAZIO: Record<GrupoDetalhe, string> = {
  vencendo: `Nenhum alimento vence nos próximos ${DIAS_ALERTA} dias.`,
  vencidos: 'Nenhum alimento vencido. Muito bem!',
  consumidos: 'Quando você marcar "Consumi" em um alimento, ele aparece aqui.',
  descartados: 'Quando você marcar "Joguei fora" em um alimento, ele aparece aqui.',
};

export default function DetalhesScreen() {
  const db = useSQLiteContext();
  const { versaoDados } = useSync();
  const params = useLocalSearchParams<{ grupo?: GrupoDetalhe }>();
  const [grupo, setGrupo] = useState<GrupoDetalhe>(params.grupo ?? 'vencendo');
  const [itens, setItens] = useState<Item[]>([]);
  const [resumo, setResumo] = useState<Resumo | null>(null);

  // Quando o Resumo abre esta aba já com um grupo escolhido
  useEffect(() => {
    if (params.grupo) setGrupo(params.grupo);
  }, [params.grupo]);

  const carregar = useCallback(async () => {
    const hoje = new Date();
    const limite = new Date(hoje);
    limite.setDate(limite.getDate() + DIAS_ALERTA);
    const h = paraISODia(hoje), l = paraISODia(limite);
    const [lista, r] = await Promise.all([listarGrupo(db, grupo, h, l), obterResumo(db, h, l)]);
    setItens(lista);
    setResumo(r);
  }, [db, grupo, versaoDados]); // eslint-disable-line react-hooks/exhaustive-deps

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  function escolher(g: GrupoDetalhe) {
    setGrupo(g);
    router.setParams({ grupo: g });
  }

  return (
    <View style={s.tela}>
      <View style={s.topo}>
        <View style={s.chips}>
          {GRUPOS.map((g) => (
            <Chip
              key={g.valor}
              rotulo={`${g.rotulo}${resumo ? ` (${resumo[g.chave] as number})` : ''}`}
              ativo={grupo === g.valor}
              onPress={() => escolher(g.valor)}
            />
          ))}
        </View>
        <Text style={s.descricao}>{DESCRICAO[grupo]}</Text>
        {itens.length > 0 && (
          <Text style={s.total}>
            {itens.length} {itens.length === 1 ? 'alimento' : 'alimentos'}
          </Text>
        )}
      </View>

      <FlatList
        data={itens}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => <ItemCard item={item} onPress={() => router.push({ pathname: '/item/[id]', params: { id: item.id } })} />}
        contentContainerStyle={s.lista}
        ItemSeparatorComponent={() => <View style={{ height: espaco.sm }} />}
        ListEmptyComponent={<Vazio icone="checkmark-circle-outline" titulo="Nada por aqui" texto={VAZIO[grupo]} />}
      />
    </View>
  );
}

const s = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  topo: { paddingTop: espaco.sm, gap: espaco.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm, paddingHorizontal: espaco.lg },
  descricao: { fontSize: 13, color: cores.textoSuave, paddingHorizontal: espaco.lg, lineHeight: 18 },
  total: { fontSize: 13, fontWeight: '600', color: cores.texto, paddingHorizontal: espaco.lg },
  lista: { padding: espaco.lg, paddingBottom: 40 },
});
