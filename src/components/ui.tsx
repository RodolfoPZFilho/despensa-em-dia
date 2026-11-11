import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { cores, espaco, raio } from '@/lib/theme';
import { useSync, type EstadoSync } from '@/sync/SyncContext';

export function Chip({ rotulo, ativo, onPress }: { rotulo: string; ativo: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, ativo && s.chipAtivo]} accessibilityRole="button" accessibilityState={{ selected: ativo }}>
      <Text style={[s.chipTexto, ativo && s.chipTextoAtivo]}>{rotulo}</Text>
    </Pressable>
  );
}

type VarianteBotao = 'primario' | 'secundario' | 'perigo';

export function Botao({ titulo, onPress, variante = 'primario', icone, desabilitado, estilo }: {
  titulo: string; onPress: () => void; variante?: VarianteBotao; icone?: keyof typeof Ionicons.glyphMap; desabilitado?: boolean; estilo?: ViewStyle;
}) {
  const cor = variante === 'primario' ? '#fff' : variante === 'perigo' ? cores.vencido : cores.primaria;
  return (
    <Pressable
      onPress={onPress}
      disabled={desabilitado}
      style={({ pressed }) => [s.botao, s[`botao_${variante}`], (pressed || desabilitado) && { opacity: 0.6 }, estilo]}>
      {icone && <Ionicons name={icone} size={18} color={cor} />}
      <Text style={[s.botaoTexto, { color: cor }]}>{titulo}</Text>
    </Pressable>
  );
}

const infoEstado: Record<EstadoSync, { texto: string; icone: keyof typeof Ionicons.glyphMap; cor: string }> = {
  desativado: { texto: 'Somente local', icone: 'phone-portrait-outline', cor: cores.textoSuave },
  deslogado: { texto: 'Salvo no aparelho', icone: 'cloud-offline-outline', cor: cores.textoSuave },
  offline: { texto: 'Sem internet', icone: 'cloud-offline-outline', cor: cores.atencao },
  sincronizando: { texto: 'Sincronizando…', icone: 'sync-outline', cor: cores.primaria },
  erro: { texto: 'Erro na sincronização', icone: 'alert-circle-outline', cor: cores.vencido },
  ocioso: { texto: 'Sincronizado', icone: 'cloud-done-outline', cor: cores.primaria },
};

export function IndicadorSync() {
  const { estado, pendentes } = useSync();
  const info = infoEstado[estado];
  const texto = estado === 'ocioso' && pendentes > 0 ? `${pendentes} pendente(s)` : info.texto;
  return (
    <View style={s.sync}>
      <Ionicons name={info.icone} size={14} color={info.cor} />
      <Text style={[s.syncTexto, { color: info.cor }]}>{texto}</Text>
    </View>
  );
}

export function Vazio({ icone, titulo, texto }: { icone: keyof typeof Ionicons.glyphMap; titulo: string; texto: string }) {
  return (
    <View style={s.vazio}>
      <Ionicons name={icone} size={48} color={cores.borda} />
      <Text style={s.vazioTitulo}>{titulo}</Text>
      <Text style={s.vazioTexto}>{texto}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: cores.borda, backgroundColor: cores.cartao },
  chipAtivo: { backgroundColor: cores.primaria, borderColor: cores.primaria },
  chipTexto: { color: cores.texto, fontSize: 14 },
  chipTextoAtivo: { color: '#fff', fontWeight: '600' },
  botao: { flexDirection: 'row', gap: espaco.sm, alignItems: 'center', justifyContent: 'center', paddingVertical: 13, paddingHorizontal: espaco.lg, borderRadius: raio },
  botao_primario: { backgroundColor: cores.primaria },
  botao_secundario: { backgroundColor: cores.primariaClara },
  botao_perigo: { backgroundColor: cores.vencidoFundo },
  botaoTexto: { fontSize: 16, fontWeight: '600' },
  sync: { flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: espaco.lg },
  syncTexto: { fontSize: 12, fontWeight: '500' },
  vazio: { alignItems: 'center', paddingVertical: 64, paddingHorizontal: espaco.xl, gap: espaco.sm },
  vazioTitulo: { fontSize: 17, fontWeight: '600', color: cores.texto },
  vazioTexto: { fontSize: 14, color: cores.textoSuave, textAlign: 'center' },
});
