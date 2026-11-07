/**
 * JWT HS256 con WebCrypto (equivale a app/core/security.py con PyJWT). Sin contraseñas en esta
 * etapa: el token se emite al registrarse o ingresar con tipo y número de identificación.
 */

const codificador = new TextEncoder();

function base64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binario = '';
  for (const b of arr) binario += String.fromCharCode(b);
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function desdeBase64url(texto: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(texto)) return null;
  const relleno = texto.length % 4 === 0 ? '' : '='.repeat(4 - (texto.length % 4));
  try {
    const binario = atob(texto.replace(/-/g, '+').replace(/_/g, '/') + relleno);
    return Uint8Array.from(binario, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

async function clave(secreto: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    codificador.encode(secreto),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

/** Firma un JWT con `sub` = id de usuario, `iat` y `exp` (segundos). */
export async function crearToken(
  userId: number,
  secreto: string,
  vidaSegundos: number,
  ahoraMs: number = Date.now(),
): Promise<string> {
  const iat = Math.floor(ahoraMs / 1000);
  const cabecera = base64url(codificador.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const cuerpo = base64url(
    codificador.encode(JSON.stringify({ sub: String(userId), iat, exp: iat + vidaSegundos })),
  );
  const firma = await crypto.subtle.sign('HMAC', await clave(secreto), codificador.encode(`${cabecera}.${cuerpo}`));
  return `${cabecera}.${cuerpo}.${base64url(firma)}`;
}

/** Id de usuario del token, o `null` si no verifica, expiró o está mal formado. */
export async function decodificarToken(
  token: string,
  secreto: string,
  ahoraMs: number = Date.now(),
): Promise<number | null> {
  const partes = token.split('.');
  if (partes.length !== 3) return null;
  const [cabecera, cuerpo, firma] = partes as [string, string, string];
  const firmaBytes = desdeBase64url(firma);
  const cabeceraBytes = desdeBase64url(cabecera);
  const cuerpoBytes = desdeBase64url(cuerpo);
  if (!firmaBytes || !cabeceraBytes || !cuerpoBytes) return null;
  try {
    // Lista cerrada de algoritmos: rechaza `alg: none` y cualquier otro.
    const alg = JSON.parse(new TextDecoder().decode(cabeceraBytes)) as { alg?: unknown };
    if (alg.alg !== 'HS256') return null;
    const valida = await crypto.subtle.verify(
      'HMAC',
      await clave(secreto),
      firmaBytes,
      codificador.encode(`${cabecera}.${cuerpo}`),
    );
    if (!valida) return null;
    const claims = JSON.parse(new TextDecoder().decode(cuerpoBytes)) as {
      sub?: unknown;
      exp?: unknown;
    };
    if (typeof claims.exp !== 'number' || typeof claims.sub !== 'string') return null;
    if (claims.exp <= Math.floor(ahoraMs / 1000)) return null;
    const id = Number(claims.sub);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}
