/**
 * PDF del certificado (equivale a app/services/certificate_pdf.py). Con pdf-lib (JS puro, sin
 * canvas ni fuentes del sistema): el diploma del nivel alcanzado con los datos del estudiante
 * encima. Las posiciones están en píxeles del fondo (2000 px de ancho) y se convierten a puntos.
 */
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, PDFFont, PDFPage, PDFString, rgb } from 'pdf-lib';
import QRCode from 'qrcode';
import { CERT_UTC_OFFSET_HOURS, OVA_TITLE } from '../core/constantes';
import type { Certificado } from './certificado';
import { porcentaje } from './certificado';

// Fuentes y diplomas viven en la app Python (assets de la API); Wrangler los empaqueta como bytes.
import dejaVuSans from '../../../api/app/assets/fonts/DejaVuSans.ttf';
import dejaVuSansBold from '../../../api/app/assets/fonts/DejaVuSans-Bold.ttf';
import dejaVuSerif from '../../../api/app/assets/fonts/DejaVuSerif.ttf';
import dejaVuSerifBold from '../../../api/app/assets/fonts/DejaVuSerif-Bold.ttf';
import diplomaCumplimiento from '../../../api/app/assets/diplomas/diploma_cumplimiento.jpg';
import diplomaExcelencia from '../../../api/app/assets/diplomas/diploma_excelencia.jpg';
import diplomaSatisfactorio from '../../../api/app/assets/diplomas/diploma_satisfactorio.jpg';
import diplomaSobresaliente from '../../../api/app/assets/diplomas/diploma_sobresaliente.jpg';

/** A4 apaisada en puntos (mismos valores que reportlab.lib.pagesizes.landscape(A4)). */
const ANCHO_PAGINA = 841.8897637795275;
const ALTO_PAGINA = 595.2755905511812;
/** Ancho de referencia de los fondos (2000 x 1414 px, proporción A4). */
const FONDO_ANCHO_PX = 2000;

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

const ETIQUETAS_IDENTIFICACION = new Map<string, string>([
  ['CC', 'Cédula de ciudadanía'],
  ['TI', 'Tarjeta de identidad'],
  ['CE', 'Cédula de extranjería'],
  ['PA', 'Pasaporte'],
  ['RC', 'Registro civil'],
  ['PEP', 'Permiso especial de permanencia'],
  ['PPT', 'Permiso por protección temporal'],
]);

interface NivelDiploma {
  clave: string;
  titulo: string;
  minimo: number; // % de las actividades obligatorias desde el que se otorga
  fondo: ArrayBuffer;
}

// Del más alto al más bajo. El fondo ya trae el título y los rótulos; aquí van solo los datos.
const NIVELES: readonly NivelDiploma[] = [
  { clave: 'excelencia', titulo: 'Diploma de Excelencia', minimo: 95, fondo: diplomaExcelencia },
  { clave: 'sobresaliente', titulo: 'Diploma Sobresaliente', minimo: 85, fondo: diplomaSobresaliente },
  { clave: 'satisfactorio', titulo: 'Diploma Satisfactorio', minimo: 70, fondo: diplomaSatisfactorio },
  { clave: 'cumplimiento', titulo: 'Diploma de Cumplimiento', minimo: 60, fondo: diplomaCumplimiento },
];

/** Nivel según el %; sin porcentaje (emitido sin manifiesto), el de cumplimiento. */
function nivelDeDiploma(pct: number | null): NivelDiploma {
  if (pct !== null) {
    const nivel = NIVELES.find((n) => pct >= n.minimo);
    if (nivel) return nivel;
  }
  return NIVELES[NIVELES.length - 1] as NivelDiploma;
}

/** Colores del diploma (#3F3F3F y #6B6B6B). */
const TEXTO_DIPLOMA = rgb(0x3f / 255, 0x3f / 255, 0x3f / 255);
const TEXTO_SUAVE = rgb(0x6b / 255, 0x6b / 255, 0x6b / 255);
const NEGRO = rgb(0, 0, 0);

/** `24 de septiembre de 2026`, en la hora de Colombia (UTC-5, sin horario de verano). */
export function fechaEnEspanol(iso: string): string {
  const local = new Date(new Date(iso).getTime() + CERT_UTC_OFFSET_HOURS * 3_600_000);
  return `${local.getUTCDate()} de ${MESES[local.getUTCMonth()]} de ${local.getUTCFullYear()}`;
}

export function urlVerificacion(publicBaseUrl: string, codigo: string): string {
  return `${publicBaseUrl.replace(/\/+$/, '')}/verify/${codigo}`;
}

/** Corta el texto en líneas que quepan en `anchoMax` (palabra a palabra, como simpleSplit). */
function partirEnLineas(texto: string, fuente: PDFFont, tamano: number, anchoMax: number): string[] {
  const lineas: string[] = [];
  let actual = '';
  for (const palabra of texto.split(/\s+/).filter((p) => p !== '')) {
    const candidata = actual === '' ? palabra : `${actual} ${palabra}`;
    if (actual === '' || fuente.widthOfTextAtSize(candidata, tamano) <= anchoMax) {
      actual = candidata;
    } else {
      lineas.push(actual);
      actual = palabra;
    }
  }
  if (actual !== '') lineas.push(actual);
  return lineas.length > 0 ? lineas : [''];
}

/** Mayor tamaño (de `inicio` a `minimo`) con que el texto cabe en `maxLineas`. */
function ajustarTexto(
  texto: string,
  fuente: PDFFont,
  anchoMax: number,
  inicio: number,
  minimo: number,
  maxLineas: number,
): { tamano: number; lineas: string[] } {
  for (let tamano = inicio; tamano >= minimo; tamano--) {
    const lineas = partirEnLineas(texto, fuente, tamano, anchoMax);
    if (lineas.length <= maxLineas) return { tamano, lineas };
  }
  return { tamano: minimo, lineas: partirEnLineas(texto, fuente, minimo, anchoMax) };
}

function centrado(
  pagina: PDFPage,
  texto: string,
  x: number,
  y: number,
  fuente: PDFFont,
  tamano: number,
  color: ReturnType<typeof rgb>,
): void {
  const ancho = fuente.widthOfTextAtSize(texto, tamano);
  pagina.drawText(texto, { x: x - ancho / 2, y, font: fuente, size: tamano, color });
}

/** Dibuja el QR como rectángulos (sin canvas): una barra horizontal por cada tramo de módulos oscuros. */
function dibujarQr(pagina: PDFPage, url: string, x: number, y: number, tamano: number): void {
  const qr = QRCode.create(url, { errorCorrectionLevel: 'M' });
  const n = qr.modules.size;
  const celda = tamano / n;
  for (let fila = 0; fila < n; fila++) {
    // La fila 0 del QR es la superior: en PDF el eje Y crece hacia arriba.
    const yFila = y + (n - 1 - fila) * celda;
    let columna = 0;
    while (columna < n) {
      if (!qr.modules.get(columna, fila)) {
        columna++;
        continue;
      }
      const inicio = columna;
      while (columna < n && qr.modules.get(columna, fila)) columna++;
      pagina.drawRectangle({
        x: x + inicio * celda,
        y: yFila,
        width: (columna - inicio) * celda,
        height: celda,
        color: NEGRO,
      });
    }
  }
}

/** Enlace clicable sobre un rectángulo de la página (anotación Link con acción URI). */
function enlazar(
  documento: PDFDocument,
  pagina: PDFPage,
  url: string,
  rect: [number, number, number, number],
): void {
  const anotacion = documento.context.register(
    documento.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: rect,
      Border: [0, 0, 0],
      A: { Type: 'Action', S: 'URI', URI: PDFString.of(url) },
    }),
  );
  pagina.node.addAnnot(anotacion);
}

/** Bytes del PDF del certificado. Sin fecha de creación en los metadatos: mismos bytes cada vez. */
export async function renderCertificadoPdf(certificado: Certificado, publicBaseUrl: string): Promise<Uint8Array> {
  const documento = await PDFDocument.create({ updateMetadata: false });
  documento.registerFontkit(fontkit);

  const fuentes = {
    sans: await documento.embedFont(dejaVuSans, { subset: true }),
    sansBold: await documento.embedFont(dejaVuSansBold, { subset: true }),
    serif: await documento.embedFont(dejaVuSerif, { subset: true }),
    serifBold: await documento.embedFont(dejaVuSerifBold, { subset: true }),
  };

  const pct =
    certificado.puntaje_obligatorias !== null && certificado.puntaje_maximo
      ? porcentaje(certificado.puntaje_obligatorias, certificado.puntaje_maximo)
      : null;
  const nivel = nivelDeDiploma(pct);
  const escala = ANCHO_PAGINA / FONDO_ANCHO_PX;
  const xPx = (px: number): number => px * escala;
  const yPx = (px: number): number => ALTO_PAGINA - px * escala;

  const nombreCompleto = `${certificado.nombre} ${certificado.apellido}`.trim();
  const url = urlVerificacion(publicBaseUrl, certificado.codigo);
  documento.setTitle(`${nivel.titulo} - ${nombreCompleto}`);
  documento.setAuthor('OVA Metabolismo óseo');
  documento.setSubject(OVA_TITLE);
  documento.setCreator('OVA Metabolismo óseo (API)');

  const pagina = documento.addPage([ANCHO_PAGINA, ALTO_PAGINA]);
  const fondo = await documento.embedJpg(nivel.fondo);
  pagina.drawImage(fondo, { x: 0, y: 0, width: ANCHO_PAGINA, height: ALTO_PAGINA });

  // Capa de texto invisible con lo que el fondo dice en imagen: se puede buscar y copiar del PDF.
  const lineasOcultas = [
    nivel.titulo,
    `Por obtener un puntaje superior al ${nivel.minimo} % en el OVA`,
    `«${OVA_TITLE}»`,
    'Se otorga a:',
  ];
  lineasOcultas.forEach((linea, i) => {
    pagina.drawText(linea, {
      x: xPx(1000), // alineado a la izquierda, como textLine en reportlab
      y: yPx(700) - i * 12,
      font: fuentes.serifBold,
      size: 10,
      color: NEGRO,
      opacity: 0,
    });
  });

  // Nombre sobre la línea larga (y = 995 px, de x = 420 a 1580 px).
  const nombre = ajustarTexto(nombreCompleto, fuentes.serifBold, xPx(1100), 30, 12, 2);
  let yNombre = yPx(972) + (nombre.lineas.length - 1) * nombre.tamano * 1.12;
  for (const linea of nombre.lineas) {
    centrado(pagina, linea, xPx(1000), yNombre, fuentes.serifBold, nombre.tamano, TEXTO_DIPLOMA);
    yNombre -= nombre.tamano * 1.12;
  }

  const etiquetaTipo = ETIQUETAS_IDENTIFICACION.get(certificado.tipo_identificacion) ?? certificado.tipo_identificacion;
  centrado(
    pagina,
    `identificado(a) con ${etiquetaTipo}, n.º ${certificado.numero_identificacion}`,
    xPx(1000),
    yPx(1040),
    fuentes.sans,
    9.5,
    TEXTO_SUAVE,
  );
  if (pct !== null) {
    const detalle = `Puntaje en las actividades obligatorias: ${pct.toFixed(1)} %`.replace('.', ',');
    centrado(pagina, detalle, xPx(1000), yPx(1080), fuentes.sans, 9, TEXTO_SUAVE);
  }

  // Fecha sobre la línea corta bajo el rótulo «Fecha» (y = 1305 px).
  centrado(pagina, fechaEnEspanol(certificado.created_at), xPx(995), yPx(1288), fuentes.serifBold, 12.5, TEXTO_DIPLOMA);

  // Código de verificación a la izquierda de la fecha y QR a la derecha, entre los cráneos.
  const xCodigo = xPx(600);
  centrado(pagina, 'CÓDIGO DE VERIFICACIÓN', xCodigo, yPx(1200), fuentes.sansBold, 7, TEXTO_SUAVE);
  centrado(pagina, certificado.codigo, xCodigo, yPx(1240), fuentes.serifBold, 13, TEXTO_DIPLOMA);
  centrado(pagina, 'Comprueba su autenticidad en:', xCodigo, yPx(1272), fuentes.sans, 6.5, TEXTO_SUAVE);
  // La URL en dos líneas (sitio y ruta) para no invadir la fecha; todo el bloque es un enlace.
  const corte = url.indexOf('/verify/');
  const partes = [url.slice(0, corte), url.slice(corte)];
  partes.forEach((parte, fila) => {
    centrado(pagina, parte, xCodigo, yPx(1296 + fila * 22), fuentes.sans, 6.5, TEXTO_DIPLOMA);
  });
  const anchoUrl = Math.max(...partes.map((p) => fuentes.sans.widthOfTextAtSize(p, 6.5)));
  enlazar(documento, pagina, url, [
    xCodigo - anchoUrl / 2,
    yPx(1318) - 2,
    xCodigo + anchoUrl / 2,
    yPx(1296) + 8,
  ]);

  dibujarQr(pagina, url, xPx(1330), yPx(1312), 54);

  return documento.save();
}
