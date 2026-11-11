import { useCallback, useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  enviarNotificacaoTeste, lerConfigNotificacoes, notificacoesDisponiveis, pedirPermissaoNotificacoes,
  reagendarNotificacoes, salvarConfigNotificacoes, type ConfigNotificacoes,
} from '@/lib/notificacoes';
import { avisar } from '@/lib/alertas';
import { cores, espaco, raio } from '@/lib/theme';
import { Botao } from './ui';

const EXEMPLOS = 'Carnes, peixes, pão e verduras: 1 dia antes · Iogurte: 2 · Queijo: 3 · Leite: 5 · Suco: 7 · Arroz, feijão e enlatados: 30';

/** Configuração das notificações de vencimento (aba Conta). */
export function BlocoNotificacoes() {
  const db = useSQLiteContext();
  const [cfg, setCfg] = useState<ConfigNotificacoes | null>(null);
  const [proximo, setProximo] = useState<Date | null>(null);

  useFocusEffect(useCallback(() => {
    lerConfigNotificacoes(db).then(setCfg);
    reagendarNotificacoes(db).then(setProximo).catch(() => {});
  }, [db]));

  async function aplicar(nova: ConfigNotificacoes) {
    setCfg(nova);
    await salvarConfigNotificacoes(db, nova);
    setProximo(await reagendarNotificacoes(db));
  }

  async function alternar(ligar: boolean) {
    if (!cfg) return;
    if (ligar && !(await pedirPermissaoNotificacoes())) {
      avisar('Permissão negada', 'Libere as notificações do app (ou do Expo Go) nas configurações do celular.');
      return;
    }
    await aplicar({ ...cfg, ativas: ligar });
  }

  function escolherHorario(d?: Date) {
    if (cfg && d) aplicar({ ...cfg, hora: d.getHours(), minuto: d.getMinutes() });
  }

  const horarioComoData = () => {
    const d = new Date();
    d.setHours(cfg?.hora ?? 9, cfg?.minuto ?? 0, 0, 0);
    return d;
  };
  const textoHorario = cfg ? `${String(cfg.hora).padStart(2, '0')}:${String(cfg.minuto).padStart(2, '0')}` : '--:--';

  return (
    <View style={s.bloco}>
      <Text style={s.titulo}>Avisos de vencimento</Text>
      {!notificacoesDisponiveis ? (
        <Text style={s.texto}>As notificações funcionam no app do celular. No navegador, acompanhe pelo filtro "Perto de vencer".</Text>
      ) : !cfg ? null : (
        <>
          <View style={s.linha}>
            <Text style={[s.texto, s.forte, { flex: 1 }]}>Receber notificações</Text>
            <Switch value={cfg.ativas} onValueChange={alternar} trackColor={{ true: cores.primaria }} />
          </View>

          {cfg.ativas && (
            <>
              <View style={s.linha}>
                <Text style={[s.texto, s.forte, { flex: 1 }]}>Horário do aviso</Text>
                {Platform.OS === 'ios' ? (
                  <DateTimePicker value={horarioComoData()} mode="time" display="compact" locale="pt-BR" onValueChange={(_e, d) => escolherHorario(d)} />
                ) : (
                  <Pressable
                    style={s.horario}
                    accessibilityRole="button"
                    onPress={() => DateTimePickerAndroid.open({ value: horarioComoData(), mode: 'time', is24Hour: true, onValueChange: (_e, d) => escolherHorario(d) })}>
                    <Ionicons name="time-outline" size={18} color={cores.primaria} />
                    <Text style={s.textoHorario}>{textoHorario}</Text>
                  </Pressable>
                )}
              </View>
              <Text style={s.texto}>
                {proximo
                  ? `Próximo aviso: ${proximo.toLocaleDateString('pt-BR')} às ${textoHorario}.`
                  : 'Nenhum aviso agendado no momento.'}
              </Text>
              <Botao titulo="Testar notificação" icone="notifications-outline" variante="secundario"
                onPress={() => enviarNotificacaoTeste().then(() => avisar('Teste agendado', 'A notificação chega em 5 segundos. Pode sair do app para ver.'))} />
            </>
          )}

          <Text style={s.nota}>O aviso chega com antecedência conforme o tipo de alimento. {EXEMPLOS}. No dia do vencimento chega mais um lembrete.</Text>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  bloco: { backgroundColor: cores.cartao, borderRadius: raio, borderWidth: 1, borderColor: cores.borda, padding: espaco.lg, gap: espaco.md },
  titulo: { fontSize: 17, fontWeight: '700', color: cores.texto },
  texto: { fontSize: 14, color: cores.textoSuave, lineHeight: 20 },
  forte: { color: cores.texto, fontWeight: '600' },
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.md },
  horario: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm, backgroundColor: cores.primariaClara, borderRadius: raio, paddingHorizontal: espaco.md, paddingVertical: 8 },
  textoHorario: { fontSize: 16, fontWeight: '700', color: cores.primaria },
  nota: { fontSize: 12, color: cores.textoSuave, lineHeight: 17 },
});
