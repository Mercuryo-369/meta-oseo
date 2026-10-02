/** Entrega un `Blob` al usuario como archivo descargado, sin salir de la página. */
export function guardarBlob(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.rel = 'noopener';
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  // Se libera después del clic: algunos navegadores leen la URL de forma asíncrona.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
