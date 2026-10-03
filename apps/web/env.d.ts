/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Solo en desarrollo (`pnpm dev`): si vale "true", el guard del router trata la sesión
   * como autenticada con un usuario ficticio y no llama a `/api/me`. Se elimina del build.
   */
  readonly VITE_DEV_BYPASS_AUTH?: string;
  /**
   * `false` desactiva el bloqueo secuencial de módulos y secciones (demos y pruebas). Cualquier
   * otro valor lo deja activo. Ver `BLOQUEO_SECUENCIAL` en src/config.ts.
   */
  readonly VITE_BLOQUEO_SECUENCIAL?: string;
  readonly VITE_MODO_DEMO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
