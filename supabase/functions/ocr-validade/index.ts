// Supabase Edge Function "ocr-validade"
// Recebe a foto da embalagem (base64) enviada pelo app e devolve o texto encontrado (OCR).
// O reconhecimento é feito pela API OCR.space; a chave fica guardada aqui no servidor
// (secret OCR_SPACE_API_KEY) e nunca vai para dentro do app.
//
// Publicar: Supabase > Edge Functions > Deploy a new function > Via Editor > nome "ocr-validade" > colar este arquivo.
// Chave:    Edge Functions > Secrets > OCR_SPACE_API_KEY = <chave grátis de https://ocr.space/ocrapi>
//           (sem a secret a função usa a chave de demonstração "helloworld", bem limitada).

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function responder(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return responder({ erro: 'Use POST' }, 405);

  let imagem: string | undefined;
  try {
    ({ imagem } = await req.json());
  } catch {
    return responder({ erro: 'Corpo inválido: envie {"imagem": "<base64>"}' }, 400);
  }
  if (!imagem || typeof imagem !== 'string') return responder({ erro: 'Campo "imagem" é obrigatório' }, 400);
  if (imagem.length > 1_400_000) return responder({ erro: 'Imagem muito grande (máx. ~1 MB)' }, 413);

  const form = new FormData();
  form.append('base64Image', `data:image/jpeg;base64,${imagem}`);
  form.append('language', 'por');
  form.append('OCREngine', '2');        // motor 2: melhor para números e texto impresso em embalagens
  form.append('scale', 'true');
  form.append('detectOrientation', 'true');

  try {
    const resp = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: { apikey: Deno.env.get('OCR_SPACE_API_KEY') ?? 'helloworld' },
      body: form,
    });
    const json = await resp.json();
    if (!resp.ok || json.IsErroredOnProcessing) {
      const msg = Array.isArray(json.ErrorMessage) ? json.ErrorMessage.join(' ') : json.ErrorMessage;
      return responder({ erro: `Falha no OCR: ${msg ?? resp.statusText}` }, 502);
    }
    const texto = (json.ParsedResults ?? []).map((r: { ParsedText?: string }) => r.ParsedText ?? '').join('\n').trim();
    return responder({ texto });
  } catch (e) {
    return responder({ erro: `Serviço de OCR indisponível: ${e instanceof Error ? e.message : String(e)}` }, 502);
  }
});
