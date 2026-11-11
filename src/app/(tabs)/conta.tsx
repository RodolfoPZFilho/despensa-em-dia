import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { cores, espaco, raio } from '@/lib/theme';
import { avisar, confirmar } from '@/lib/alertas';
import { Botao } from '@/components/ui';
import { BlocoNotificacoes } from '@/components/BlocoNotificacoes';
import { useSync } from '@/sync/SyncContext';

export default function ContaScreen() {
  const { estado, sessao, erro, pendentes, ultimaSync, sincronizarAgora, sair } = useSync();
  const [saindo, setSaindo] = useState(false);

  if (estado === 'desativado') {
    return (
      <ScrollView contentContainerStyle={s.conteudo}>
        <BlocoNotificacoes />
        <View style={s.bloco}>
          <Text style={s.titulo}>Modo somente local</Text>
          <Text style={s.texto}>
            Seus alimentos estão sendo salvos no aparelho (SQLite). Para ativar o login e a sincronização online, preencha
            EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_KEY no arquivo .env e reinicie o Expo.
          </Text>
        </View>
      </ScrollView>
    );
  }

  async function confirmarSaida() {
    const aviso = pendentes > 0
      ? `Ainda há ${pendentes} alteração(ões) sem enviar. Vamos tentar enviar agora; o que não subir será perdido neste aparelho.`
      : 'Seus alimentos continuam salvos na sua conta. Ao entrar de novo, eles voltam.';
    if (!(await confirmar('Sair da conta?', aviso, 'Sair'))) return;
    setSaindo(true);
    try {
      await sair();
    } catch (e: any) {
      avisar('Não foi possível sair', e?.message ?? String(e));
      setSaindo(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={s.conteudo}>
      <View style={[s.bloco, s.perfil]}>
        <View style={s.avatar}>
          <Text style={s.avatarLetra}>{(sessao?.user.user_metadata?.usuario ?? sessao?.user.email ?? '?').charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.titulo}>{sessao?.user.user_metadata?.usuario ? `@${sessao.user.user_metadata.usuario}` : 'Minha conta'}</Text>
          <Text style={s.texto} numberOfLines={1}>{sessao?.user.email}</Text>
        </View>
      </View>

      <View style={s.bloco}>
        <Text style={s.titulo}>Sincronização</Text>
        <Linha rotulo="Situação" valor={rotuloEstado[estado] ?? estado} />
        <Linha rotulo="Alterações pendentes" valor={String(pendentes)} />
        <Linha rotulo="Última sincronização" valor={ultimaSync ? new Date(ultimaSync).toLocaleString('pt-BR') : '—'} />
        {erro && (
          <View style={s.erro}>
            <Ionicons name="alert-circle-outline" size={16} color={cores.vencido} />
            <Text style={[s.texto, { color: cores.vencido, flex: 1 }]}>{erro}</Text>
          </View>
        )}
        <Botao titulo="Sincronizar agora" icone="sync-outline" desabilitado={estado === 'sincronizando' || estado === 'offline'} onPress={sincronizarAgora} />
      </View>

      <BlocoNotificacoes />

      <Botao titulo={saindo ? 'Saindo…' : 'Sair da conta'} variante="perigo" icone="log-out-outline" desabilitado={saindo} onPress={confirmarSaida} />
      <Text style={s.nota}>Ao sair, os alimentos são removidos deste aparelho e continuam guardados na sua conta.</Text>
    </ScrollView>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={s.linha}>
      <Text style={s.texto}>{rotulo}</Text>
      <Text style={[s.texto, { color: cores.texto, fontWeight: '600' }]}>{valor}</Text>
    </View>
  );
}

const rotuloEstado: Record<string, string> = {
  ocioso: 'Em dia', sincronizando: 'Sincronizando…', offline: 'Sem internet', erro: 'Com erro',
};

const s = StyleSheet.create({
  conteudo: { padding: espaco.lg, gap: espaco.lg },
  bloco: { backgroundColor: cores.cartao, borderRadius: raio, borderWidth: 1, borderColor: cores.borda, padding: espaco.lg, gap: espaco.md },
  perfil: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: cores.primaria, alignItems: 'center', justifyContent: 'center' },
  avatarLetra: { color: '#fff', fontSize: 20, fontWeight: '700' },
  titulo: { fontSize: 17, fontWeight: '700', color: cores.texto },
  texto: { fontSize: 14, color: cores.textoSuave, lineHeight: 20 },
  linha: { flexDirection: 'row', justifyContent: 'space-between' },
  erro: { flexDirection: 'row', gap: espaco.sm, alignItems: 'flex-start' },
  nota: { fontSize: 12, color: cores.textoSuave, textAlign: 'center' },
});
