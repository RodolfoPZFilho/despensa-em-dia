// Guarda a sessão do Supabase Auth usando o localStorage implementado pelo expo-sqlite.
import 'expo-sqlite/localStorage/install';
import { AppState } from 'react-native';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const chave = process.env.EXPO_PUBLIC_SUPABASE_KEY;

/** Sem URL/chave no .env o app funciona 100% offline (somente SQLite). */
export const supabaseConfigurado = Boolean(url && chave);

export const supabase: SupabaseClient | null = supabaseConfigurado
  ? createClient(url!, chave!, {
      auth: {
        storage: localStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

// Renova o token só enquanto o app está em primeiro plano (recomendação do Supabase p/ React Native).
if (supabase) {
  AppState.addEventListener('change', (estado) => {
    if (estado === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
