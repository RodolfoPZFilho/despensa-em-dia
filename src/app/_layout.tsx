import { ActivityIndicator, Platform, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { migrarBanco } from '@/db/schema';
import { SyncProvider, useSync } from '@/sync/SyncContext';
import { supabaseConfigurado } from '@/lib/supabase';
import { cores } from '@/lib/theme';

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="despensa.db" onInit={migrarBanco}>
      <SyncProvider>
        <StatusBar style="dark" />
        {/* No navegador o app fica com largura de celular, centralizado */}
        <View style={Platform.OS === 'web' ? { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center', borderLeftWidth: 1, borderRightWidth: 1, borderColor: cores.borda } : { flex: 1 }}>
          <Navegacao />
        </View>
      </SyncProvider>
    </SQLiteProvider>
  );
}

function Navegacao() {
  const { sessao, pronto } = useSync();

  // Espera ler a sessão salva para não piscar a tela de login
  if (!pronto) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.fundo }}>
        <ActivityIndicator color={cores.primaria} />
      </View>
    );
  }

  // Sem Supabase configurado o app roda só local e não exige login
  const logado = !supabaseConfigurado || Boolean(sessao);

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: cores.fundo },
        headerTintColor: cores.primaria,
        headerTitleStyle: { color: cores.texto },
        contentStyle: { backgroundColor: cores.fundo },
        headerBackTitle: 'Voltar',
      }}>
      <Stack.Protected guard={logado}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="item/novo" options={{ title: 'Novo alimento', presentation: 'modal' }} />
        <Stack.Screen name="item/[id]" options={{ title: 'Alimento' }} />
      </Stack.Protected>
      <Stack.Protected guard={!logado}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}
