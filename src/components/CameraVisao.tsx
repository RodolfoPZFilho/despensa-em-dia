import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import Ionicons from '@expo/vector-icons/Ionicons';
import { cores, espaco, raio } from '@/lib/theme';
import { Botao } from './ui';

export type ModoCamera = 'codigo' | 'validade';

export interface FotoCapturada { uri: string; width: number; height: number }

/**
 * Câmera em tela cheia usada pelo formulário.
 *  - modo "codigo": detecta códigos de barras (EAN/UPC) em tempo real e devolve o número lido;
 *  - modo "validade": o usuário enquadra a data impressa e tira uma foto, que vai para o OCR.
 */
export function CameraVisao({ modo, visivel, onFechar, onCodigo, onFoto }: {
  modo: ModoCamera;
  visivel: boolean;
  onFechar: () => void;
  onCodigo?: (codigo: string) => void;
  onFoto?: (foto: FotoCapturada) => void;
}) {
  const [permissao, pedirPermissao] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [lanterna, setLanterna] = useState(false);
  const [capturando, setCapturando] = useState(false);
  const jaLeu = useRef(false); // o leitor dispara várias vezes por segundo; usamos só a 1ª leitura

  // Cada vez que a câmera abre, libera uma nova leitura e desliga a lanterna
  useEffect(() => {
    if (visivel) { jaLeu.current = false; setLanterna(false); }
  }, [visivel]);

  function aoLerCodigo(r: BarcodeScanningResult) {
    if (jaLeu.current || !r.data) return;
    jaLeu.current = true;
    onCodigo?.(r.data);
  }

  async function tirarFoto() {
    if (!camera.current || capturando) return;
    setCapturando(true);
    try {
      const foto = await camera.current.takePictureAsync({ quality: 0.8, shutterSound: false });
      if (foto) onFoto?.({ uri: foto.uri, width: foto.width, height: foto.height });
    } finally {
      setCapturando(false);
    }
  }

  const titulo = modo === 'codigo' ? 'Aponte para o código de barras' : 'Enquadre a data de validade';
  const dica = modo === 'codigo'
    ? 'A leitura é automática. Mantenha o código reto e bem iluminado.'
    : 'Deixe só a data dentro do quadro, sem reflexo, e toque no botão.';

  return (
    <Modal visible={visivel} animationType="slide" onRequestClose={onFechar}>
      <View style={s.tela}>
        {!permissao ? (
          <ActivityIndicator style={{ flex: 1 }} color="#fff" />
        ) : !permissao.granted ? (
          <View style={s.semPermissao}>
            <Ionicons name="camera-outline" size={56} color="#fff" />
            <Text style={s.textoPermissao}>O app precisa da câmera para ler o código de barras e a validade da embalagem.</Text>
            {permissao.canAskAgain
              ? <Botao titulo="Permitir câmera" icone="checkmark" onPress={pedirPermissao} />
              : <Text style={s.textoPermissao}>Libere a câmera nas configurações do aparelho.</Text>}
            <Botao titulo="Cancelar" variante="secundario" onPress={onFechar} />
          </View>
        ) : (
          <>
            <CameraView
              ref={camera}
              style={StyleSheet.absoluteFill}
              facing="back"
              enableTorch={lanterna}
              barcodeScannerSettings={modo === 'codigo' ? { barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] } : undefined}
              onBarcodeScanned={modo === 'codigo' ? aoLerCodigo : undefined}
            />
            {/* Moldura que indica onde posicionar o código ou a data */}
            <View style={s.sobreposicao} pointerEvents="box-none">
              <View style={s.topo}>
                <Pressable onPress={onFechar} style={s.botaoRedondo} accessibilityLabel="Fechar câmera">
                  <Ionicons name="close" size={26} color="#fff" />
                </Pressable>
                <Pressable onPress={() => setLanterna((l) => !l)} style={s.botaoRedondo} accessibilityLabel="Lanterna">
                  <Ionicons name={lanterna ? 'flash' : 'flash-off'} size={22} color="#fff" />
                </Pressable>
              </View>
              <View style={s.centro} pointerEvents="none">
                <Text style={s.titulo}>{titulo}</Text>
                <View style={[s.moldura, modo === 'codigo' ? s.molduraCodigo : s.molduraData]} />
                <Text style={s.dica}>{dica}</Text>
              </View>
              <View style={s.rodape}>
                {modo === 'validade' && (
                  <Pressable onPress={tirarFoto} style={s.disparador} disabled={capturando} accessibilityLabel="Tirar foto">
                    {capturando ? <ActivityIndicator color={cores.primaria} /> : <View style={s.disparadorMiolo} />}
                  </Pressable>
                )}
              </View>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  tela: { flex: 1, backgroundColor: '#000' },
  semPermissao: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: espaco.lg, padding: espaco.xl },
  textoPermissao: { color: '#fff', fontSize: 16, textAlign: 'center' },
  sobreposicao: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-between' },
  topo: { flexDirection: 'row', justifyContent: 'space-between', padding: espaco.lg, paddingTop: 48 },
  botaoRedondo: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  centro: { alignItems: 'center', gap: espaco.md, paddingHorizontal: espaco.lg },
  titulo: { color: '#fff', fontSize: 18, fontWeight: '700', textShadowColor: '#000', textShadowRadius: 4 },
  dica: { color: '#fff', fontSize: 14, textAlign: 'center', textShadowColor: '#000', textShadowRadius: 4 },
  moldura: { borderWidth: 3, borderColor: '#fff', borderRadius: raio },
  molduraCodigo: { width: '85%', height: 140 },
  molduraData: { width: '90%', aspectRatio: 1.8 },
  rodape: { alignItems: 'center', paddingBottom: 48, minHeight: 120 },
  disparador: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  disparadorMiolo: { width: 62, height: 62, borderRadius: 31, borderWidth: 3, borderColor: cores.primaria },
});
