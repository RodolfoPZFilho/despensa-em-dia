import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useSQLiteContext } from 'expo-sqlite';
import type { Session } from '@supabase/supabase-js';
import { supabase, supabaseConfigurado } from '@/lib/supabase';
import { contarPendentes, lerMeta } from '@/db/itens';
import { sincronizar } from './sincronizar';

export type EstadoSync = 'desativado' | 'deslogado' | 'offline' | 'ocioso' | 'sincronizando' | 'erro';

interface SyncValor {
  sessao: Session | null;
  /** true depois de ler a sessão salva (evita piscar a tela de login). */
  pronto: boolean;
  estado: EstadoSync;
  erro: string | null;
  pendentes: number;
  ultimaSync: string | null;
  /** Muda sempre que os dados locais mudam — as telas usam para recarregar. */
  versaoDados: number;
  notificarAlteracao: () => void;
  sincronizarAgora: () => Promise<void>;
  /** `identificador` pode ser o e-mail ou o nome de usuário. */
  entrar: (identificador: string, senha: string) => Promise<void>;
  cadastrar: (usuario: string, email: string, senha: string) => Promise<{ precisaConfirmar: boolean }>;
  sair: () => Promise<void>;
}

const SyncCtx = createContext<SyncValor | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [sessao, setSessao] = useState<Session | null>(null);
  const [pronto, setPronto] = useState(!supabaseConfigurado);
  const [online, setOnline] = useState(true);
  const [rodando, setRodando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendentes, setPendentes] = useState(0);
  const [ultimaSync, setUltimaSync] = useState<string | null>(null);
  const [versaoDados, setVersaoDados] = useState(0);
  const emAndamento = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const atualizarContadores = useCallback(async () => {
    setPendentes(await contarPendentes(db));
    setUltimaSync(await lerMeta(db, 'ultima_sync'));
  }, [db]);

  const sincronizarAgora = useCallback(async () => {
    const userId = sessao?.user.id;
    if (!supabase || !userId || !online || emAndamento.current) return;
    emAndamento.current = true;
    setRodando(true);
    try {
      const { recebidos } = await sincronizar(db, userId);
      setErro(null);
      if (recebidos > 0) setVersaoDados((v) => v + 1);
    } catch (e: any) {
      setErro(e?.message ?? 'Falha ao sincronizar');
    } finally {
      emAndamento.current = false;
      setRodando(false);
      await atualizarContadores();
    }
  }, [db, sessao?.user.id, online, atualizarContadores]);

  // Sessão do Supabase Auth
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session);
      setPronto(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSessao(s));
    return () => data.subscription.unsubscribe();
  }, []);

  // Conectividade
  useEffect(() => NetInfo.addEventListener((s) => setOnline(s.isConnected !== false && s.isInternetReachable !== false)), []);

  // Sincroniza ao logar, ao voltar a ficar online e ao reabrir o app
  useEffect(() => {
    atualizarContadores();
    sincronizarAgora();
  }, [sessao?.user.id, online]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && sincronizarAgora());
    return () => sub.remove();
  }, [sincronizarAgora]);

  const notificarAlteracao = useCallback(() => {
    setVersaoDados((v) => v + 1);
    atualizarContadores();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => sincronizarAgora(), 1500); // agrupa várias edições seguidas
  }, [atualizarContadores, sincronizarAgora]);

  const entrar = useCallback(async (identificador: string, senha: string) => {
    if (!supabase) throw new Error('Supabase não configurado');
    let email = identificador.trim();
    // Sem "@" = nome de usuário: busca o e-mail da conta (função email_do_usuario no Supabase)
    if (!email.includes('@')) {
      const { data, error } = await supabase.rpc('email_do_usuario', { p_usuario: email.toLowerCase() });
      if (error) throw new Error(erroDeFuncao(error.message));
      if (!data) throw new Error('Usuário não encontrado.');
      email = data as string;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) throw error;
  }, []);

  const cadastrar = useCallback(async (usuario: string, email: string, senha: string) => {
    if (!supabase) throw new Error('Supabase não configurado');
    const nome = usuario.trim().toLowerCase();
    const { data: livre, error: erroLivre } = await supabase.rpc('usuario_disponivel', { p_usuario: nome });
    if (erroLivre) throw new Error(erroDeFuncao(erroLivre.message));
    if (livre === false) throw new Error('Este nome de usuário já está em uso.');
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      options: { data: { usuario: nome } }, // o gatilho no Supabase grava o usuário na tabela perfis
    });
    if (error) throw error;
    return { precisaConfirmar: !data.session };
  }, []);

  const sair = useCallback(async () => {
    // Envia o que falta antes de sair e limpa o aparelho,
    // para a próxima pessoa que entrar não ver (nem herdar) os alimentos desta conta.
    await sincronizarAgora();
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM itens');
      await db.runAsync("DELETE FROM meta WHERE chave LIKE 'ultimo_pull:%' OR chave = 'ultima_sync'");
    });
    await supabase?.auth.signOut();
    setVersaoDados((v) => v + 1);
    await atualizarContadores();
  }, [db, sincronizarAgora, atualizarContadores]);

  let estado: EstadoSync;
  if (!supabaseConfigurado) estado = 'desativado';
  else if (!sessao) estado = 'deslogado';
  else if (!online) estado = 'offline';
  else if (rodando) estado = 'sincronizando';
  else if (erro) estado = 'erro';
  else estado = 'ocioso';

  return (
    <SyncCtx.Provider
      value={{ sessao, pronto, estado, erro, pendentes, ultimaSync, versaoDados, notificarAlteracao, sincronizarAgora, entrar, cadastrar, sair }}>
      {children}
    </SyncCtx.Provider>
  );
}

/** Mensagem clara quando o script supabase/usuarios.sql ainda não foi executado. */
function erroDeFuncao(msg: string) {
  if (/could not find the function|does not exist|schema cache/i.test(msg)) {
    return 'Login por usuário ainda não está ativo: rode o script supabase/usuarios.sql no Supabase.';
  }
  return msg;
}

export function useSync() {
  const v = useContext(SyncCtx);
  if (!v) throw new Error('useSync deve ser usado dentro de <SyncProvider>');
  return v;
}
