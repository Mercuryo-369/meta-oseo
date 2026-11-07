// Módulos que Wrangler empaqueta como texto o bytes (reglas `rules` de wrangler.json).
declare module '*.jsonl' {
  const contenido: string;
  export default contenido;
}
declare module '*.md' {
  const contenido: string;
  export default contenido;
}
declare module '*.ttf' {
  const bytes: ArrayBuffer;
  export default bytes;
}
