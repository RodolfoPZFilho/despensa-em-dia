import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { cores, espaco, raio } from '@/lib/theme';
import { useSync } from '@/sync/SyncContext';

type Modo = 'entrar' | 'cadastrar';

export default function LoginScreen() {
  const { entrar, cadastrar } = useSync();
  const [modo, setModo] = useState<Modo>('entrar');
  const [identificador, setIdentificador] = useState(''); // login: e-mail ou usuário
  const [usuario, setUsuario] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function trocarModo(m: Modo) {
    setModo(m);
    setErro(null);
    setConfirmacao('');
  }

  async function enviar() {
    setErro(null);
    if (modo === 'entrar') {
      if (!identificador.trim() || !senha) return setErro('Preencha e-mail ou usuário e a senha.');
    } else {
      if (!usuario.trim() || !email.trim() || !senha) return setErro('Preencha usuário, e-mail e senha.');
      if (!USUARIO_VALIDO.test(usuario.trim().toLowerCase())) {
        return setErro('O usuário deve ter de 3 a 20 caracteres: letras, números, ponto ou _ (sem espaços).');
      }
      if (!email.includes('@')) return setErro('Digite um e-mail no formato nome@exemplo.com.');
      if (senha !== confirmacao) return setErro('As senhas não conferem.');
    }
    if (senha.length < 6) return setErro('A senha precisa ter pelo menos 6 caracteres.');

    setOcupado(true);
    try {
      if (modo === 'entrar') {
        await entrar(identificador, senha);
      } else {
        const { precisaConfirmar } = await cadastrar(usuario, email, senha);
        // O Supabase deste projeto está sem confirmação de e-mail: o cadastro já entra direto.
        if (precisaConfirmar) setErro('Conta criada, mas o Supabase pediu confirmação por e-mail. Desative "Confirm email" no painel.');
      }
      // Ao ter sessão, o layout troca sozinho para as abas do app.
    } catch (e: any) {
      setErro(traduzirErro(e?.message));
    } finally {
      setOcupado(false);
    }
  }

  const cadastro = modo === 'cadastrar';

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: cores.fundo }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.conteudo} keyboardShouldPersistTaps="handled">
        <View style={s.marca}>
          <View style={s.logo}>
            <Ionicons name="basket" size={36} color="#fff" />
          </View>
          <Text style={s.nomeApp}>Despensa em Dia</Text>
          <Text style={s.slogan}>Saiba o que vence primeiro e desperdice menos.</Text>
        </View>

        <View style={s.cartao}>
          <View style={s.abas}>
            <Aba rotulo="Entrar" ativo={!cadastro} onPress={() => trocarModo('entrar')} />
            <Aba rotulo="Criar conta" ativo={cadastro} onPress={() => trocarModo('cadastrar')} />
          </View>

          {cadastro ? (
            <>
              <Campo icone="at-outline">
                <TextInput
                  style={s.input}
                  placeholder="Nome de usuário (ex.: maria.silva)"
                  placeholderTextColor={cores.textoSuave}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="username-new"
                  value={usuario}
                  onChangeText={(t) => setUsuario(t.replace(/\s/g, '').toLowerCase())}
                  maxLength={20}
                />
              </Campo>
              <Campo icone="mail-outline">
                <TextInput
                  style={s.input}
                  placeholder="E-mail"
                  placeholderTextColor={cores.textoSuave}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  autoComplete="email"
                  value={email}
                  onChangeText={setEmail}
                />
              </Campo>
            </>
          ) : (
            <Campo icone="person-outline">
              <TextInput
                style={s.input}
                placeholder="E-mail ou usuário"
                placeholderTextColor={cores.textoSuave}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                value={identificador}
                onChangeText={setIdentificador}
              />
            </Campo>
          )}

          <Campo icone="lock-closed-outline">
            <TextInput
              style={s.input}
              placeholder="Senha (mín. 6 caracteres)"
              placeholderTextColor={cores.textoSuave}
              secureTextEntry={!verSenha}
              autoComplete={cadastro ? 'new-password' : 'current-password'}
              value={senha}
              onChangeText={setSenha}
              onSubmitEditing={cadastro ? undefined : enviar}
            />
            <Pressable onPress={() => setVerSenha((v) => !v)} hitSlop={10} accessibilityLabel={verSenha ? 'Ocultar senha' : 'Mostrar senha'}>
              <Ionicons name={verSenha ? 'eye-off-outline' : 'eye-outline'} size={20} color={cores.textoSuave} />
            </Pressable>
          </Campo>

          {cadastro && (
            <Campo icone="lock-closed-outline">
              <TextInput
                style={s.input}
                placeholder="Confirme a senha"
                placeholderTextColor={cores.textoSuave}
                secureTextEntry={!verSenha}
                autoComplete="new-password"
                value={confirmacao}
                onChangeText={setConfirmacao}
                onSubmitEditing={enviar}
              />
            </Campo>
          )}

          {erro && (
            <View style={s.erro}>
              <Ionicons name="alert-circle-outline" size={18} color={cores.vencido} />
              <Text style={s.erroTexto}>{erro}</Text>
            </View>
          )}

          <Pressable style={({ pressed }) => [s.botao, (pressed || ocupado) && { opacity: 0.7 }]} onPress={enviar} disabled={ocupado}>
            {ocupado ? <ActivityIndicator color="#fff" /> : <Text style={s.botaoTexto}>{cadastro ? 'Criar conta e entrar' : 'Entrar'}</Text>}
          </Pressable>

          <Pressable onPress={() => trocarModo(cadastro ? 'entrar' : 'cadastrar')} style={s.trocar}>
            <Text style={s.trocarTexto}>
              {cadastro ? 'Já tem conta? ' : 'Ainda não tem conta? '}
              <Text style={s.link}>{cadastro ? 'Entrar' : 'Criar agora'}</Text>
            </Text>
          </Pressable>
        </View>

        <Text style={s.rodape}>Seus alimentos ficam salvos no aparelho e sincronizados com a sua conta.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const USUARIO_VALIDO = /^[a-z0-9._]{3,20}$/;

function Aba({ rotulo, ativo, onPress }: { rotulo: string; ativo: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.aba, ativo && s.abaAtiva]} accessibilityRole="tab" accessibilityState={{ selected: ativo }}>
      <Text style={[s.abaTexto, ativo && s.abaTextoAtivo]}>{rotulo}</Text>
    </Pressable>
  );
}

function Campo({ icone, children }: { icone: keyof typeof Ionicons.glyphMap; children: React.ReactNode }) {
  return (
    <View style={s.campo}>
      <Ionicons name={icone} size={20} color={cores.textoSuave} />
      {children}
    </View>
  );
}

function traduzirErro(msg?: string) {
  if (!msg) return 'Algo deu errado. Tente novamente.';
  if (msg.includes('Invalid login credentials')) return 'Usuário, e-mail ou senha incorretos.';
  if (msg.includes('Database error saving new user')) return 'Este nome de usuário já está em uso.';
  if (msg.includes('User already registered')) return 'Este e-mail já tem conta. Use "Entrar".';
  if (msg.toLowerCase().includes('email') && msg.toLowerCase().includes('invalid')) return 'Digite um e-mail no formato nome@exemplo.com.';
  if (msg.toLowerCase().includes('password')) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch')) return 'Sem conexão com a internet. Tente de novo.';
  return msg;
}

const s = StyleSheet.create({
  conteudo: { flexGrow: 1, justifyContent: 'center', padding: espaco.xl, gap: espaco.xl },
  marca: { alignItems: 'center', gap: espaco.sm },
  logo: { width: 72, height: 72, borderRadius: 20, backgroundColor: cores.primaria, alignItems: 'center', justifyContent: 'center', marginBottom: espaco.sm },
  nomeApp: { fontSize: 26, fontWeight: '700', color: cores.texto },
  slogan: { fontSize: 15, color: cores.textoSuave, textAlign: 'center' },
  cartao: { backgroundColor: cores.cartao, borderRadius: 16, borderWidth: 1, borderColor: cores.borda, padding: espaco.lg, gap: espaco.md },
  abas: { flexDirection: 'row', backgroundColor: cores.neutroFundo, borderRadius: raio, padding: 4, marginBottom: espaco.xs },
  aba: { flex: 1, paddingVertical: 10, borderRadius: raio - 3, alignItems: 'center' },
  abaAtiva: { backgroundColor: cores.cartao, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  abaTexto: { fontSize: 15, color: cores.textoSuave, fontWeight: '500' },
  abaTextoAtivo: { color: cores.texto, fontWeight: '700' },
  campo: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm, borderWidth: 1, borderColor: cores.borda, borderRadius: raio, paddingHorizontal: espaco.md, backgroundColor: cores.fundo },
  input: { flex: 1, paddingVertical: 13, fontSize: 16, color: cores.texto, outlineWidth: 0 },
  erro: { flexDirection: 'row', alignItems: 'flex-start', gap: espaco.sm, backgroundColor: cores.vencidoFundo, borderRadius: raio, padding: espaco.md },
  erroTexto: { flex: 1, color: cores.vencido, fontSize: 14, lineHeight: 19 },
  botao: { backgroundColor: cores.primaria, borderRadius: raio, paddingVertical: 15, alignItems: 'center', marginTop: espaco.xs },
  botaoTexto: { color: '#fff', fontSize: 16, fontWeight: '700' },
  trocar: { alignItems: 'center', paddingVertical: espaco.xs },
  trocarTexto: { fontSize: 14, color: cores.textoSuave },
  link: { color: cores.primaria, fontWeight: '700' },
  rodape: { fontSize: 12, color: cores.textoSuave, textAlign: 'center' },
});
