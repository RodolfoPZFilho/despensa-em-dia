// Configuração do Metro para o expo-sqlite funcionar também no navegador (web)
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// O SQLite na web roda em WebAssembly
config.resolver.assetExts.push('wasm');

// SharedArrayBuffer (usado pelo SQLite web) exige estes cabeçalhos
config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  middleware(req, res, next);
};

module.exports = config;
