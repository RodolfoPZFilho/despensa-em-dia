import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { atualizarItem, buscarItem, excluirItem, mudarStatus, type Item, type StatusItem } from '@/db/itens';
import { corSituacao, formatarData, textoSituacao } from '@/lib/datas';
import { cores, espaco, raio } from '@/lib/theme';
import { confirmar } from '@/lib/alertas';
import { ItemForm } from '@/components/ItemForm';
import { Botao } from '@/components/ui';
import { useSync } from '@/sync/SyncContext';

export default function DetalheItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const { notificarAlteracao } = useSync();
  const [item, setItem] = useState<Item | null | undefined>(undefined);

  useEffect(() => {
    buscarItem(db, id).then(setItem);
  }, [db, id]);

  if (item === undefined) return <ActivityIndicator style={{ marginTop: 40 }} color={cores.primaria} />;
  if (item === null) return <Text style={{ padding: espaco.lg }}>Alimento não encontrado.</Text>;

  const { cor, fundo } = corSituacao(item.validade);

  async function finalizar(status: StatusItem) {
    await mudarStatus(db, item!.id, status);
    notificarAlteracao();
    router.back();
  }

  async function confirmarExclusao() {
    const ok = await confirmar('Excluir alimento?', `"${item!.nome}" será removido da lista e do histórico.`, 'Excluir');
    if (!ok) return;
    await excluirItem(db, item!.id);
    notificarAlteracao();
    router.back();
  }

  const cabecalho = (
    <View style={s.cabecalho}>
      <View style={[s.situacao, { backgroundColor: fundo }]}>
        <Text style={[s.situacaoTexto, { color: cor }]}>{textoSituacao(item.validade)}</Text>
        <Text style={[s.situacaoData, { color: cor }]}>Validade {formatarData(item.validade)}</Text>
      </View>
      {item.status === 'ativo' ? (
        <View style={s.acoes}>
          <Botao titulo="Consumi" icone="restaurant-outline" variante="secundario" onPress={() => finalizar('consumido')} estilo={{ flex: 1 }} />
          <Botao titulo="Joguei fora" icone="trash-bin-outline" variante="perigo" onPress={() => finalizar('descartado')} estilo={{ flex: 1 }} />
        </View>
      ) : (
        <View style={{ gap: espaco.sm }}>
          <Text style={s.finalizado}>
            {item.status === 'consumido' ? 'Consumido' : 'Descartado'} em {new Date(item.atualizado_em).toLocaleDateString('pt-BR')}.
          </Text>
          <Botao titulo="Voltar para a despensa" icone="arrow-undo-outline" variante="secundario" onPress={() => finalizar('ativo')} />
        </View>
      )}
      {(item.codigo_barras || item.validade_origem === 'ocr') && (
        <View style={s.visao}>
          <Text style={s.visaoTitulo}>Lido pela câmera</Text>
          {item.codigo_barras && (
            <View style={s.visaoLinha}>
              <Ionicons name="barcode-outline" size={16} color={cores.primaria} />
              <Text style={s.visaoTexto}>Código de barras {item.codigo_barras}</Text>
            </View>
          )}
          {item.validade_origem === 'ocr' && (
            <View style={s.visaoLinha}>
              <Ionicons name="scan-outline" size={16} color={cores.primaria} />
              <Text style={s.visaoTexto}>Validade reconhecida na embalagem (OCR)</Text>
            </View>
          )}
          {item.texto_ocr && <Text style={s.visaoOcr} numberOfLines={4}>"{item.texto_ocr.replace(/\s+/g, ' ')}"</Text>}
        </View>
      )}
      <Botao titulo="Excluir registro" icone="close-circle-outline" variante="secundario" onPress={confirmarExclusao} />
      <Text style={s.secao}>Editar informações</Text>
    </View>
  );

  return (
    <ItemForm
      inicial={item}
      cabecalho={cabecalho}
      tituloBotao="Salvar alterações"
      onSalvar={async (dados) => {
        await atualizarItem(db, item.id, dados);
        notificarAlteracao();
        router.back();
      }}
    />
  );
}

const s = StyleSheet.create({
  cabecalho: { gap: espaco.md },
  situacao: { borderRadius: raio, padding: espaco.lg, alignItems: 'center', gap: 2 },
  situacaoTexto: { fontSize: 22, fontWeight: '700' },
  situacaoData: { fontSize: 14 },
  acoes: { flexDirection: 'row', gap: espaco.sm },
  finalizado: { textAlign: 'center', color: cores.textoSuave },
  visao: { backgroundColor: cores.cartao, borderWidth: 1, borderColor: cores.borda, borderRadius: raio, padding: espaco.md, gap: espaco.xs },
  visaoTitulo: { fontSize: 13, fontWeight: '600', color: cores.textoSuave, textTransform: 'uppercase', letterSpacing: 0.5 },
  visaoLinha: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
  visaoTexto: { fontSize: 14, color: cores.texto },
  visaoOcr: { fontSize: 12, color: cores.textoSuave, fontStyle: 'italic', marginTop: 2 },
  secao: { fontSize: 17, fontWeight: '700', color: cores.texto, marginTop: espaco.lg },
});
