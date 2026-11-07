/** Certificado de finalización y verificación pública (docs/api-contract.md, F5-05). */
import { Hono } from 'hono';
import { type App, requiereUsuario } from '../core/auth';
import { certificadoNoEmitido, certificadoNoEncontrado } from '../core/errores';
import type { Configuracion } from '../core/entorno';
import { ipCliente, limitar } from '../core/limites';
import {
  buscarPorCodigo,
  certificadoDeUsuario,
  datosVerificacion,
  emitirCertificado,
  estadoCertificado,
  resumen,
} from '../servicios/certificado';
import { renderCertificadoPdf } from '../servicios/certificado_pdf';

export const rutasCertificado = new Hono<App>();

rutasCertificado.get('/certificate/status', requiereUsuario, async (c) => {
  const usuario = c.get('usuario');
  return c.json(await estadoCertificado(c.env.DB, usuario.id, c.get('config')));
});

rutasCertificado.post('/certificate', requiereUsuario, async (c) => {
  const usuario = c.get('usuario');
  const { certificado, nuevo } = await emitirCertificado(c.env.DB, usuario, c.get('config'));
  // 201 al crearlo; 200 si ya existía (la llamada repetida no cambia nada).
  return c.json({ certificado: resumen(certificado), nuevo }, nuevo ? 201 : 200);
});

rutasCertificado.get('/certificate/pdf', requiereUsuario, async (c) => {
  const usuario = c.get('usuario');
  // La generación cuesta CPU: se limita por usuario antes de hacer el trabajo.
  await limitar(c.env.LIMITE_PDF, `user:${usuario.id}`);
  const certificado = await certificadoDeUsuario(c.env.DB, usuario.id);
  if (!certificado) throw certificadoNoEmitido();
  const config: Configuracion = c.get('config');
  const pdf = await renderCertificadoPdf(certificado, config.publicBaseUrl);
  return new Response(pdf, {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="certificado_${certificado.codigo}.pdf"`,
      'cache-control': 'private, no-store',
    },
  });
});

// Público: sin token. El límite va por IP y cuenta aciertos y fallos.
rutasCertificado.get('/verify/:codigo', async (c) => {
  await limitar(c.env.LIMITE_VERIFICAR, ipCliente(c.req.raw));
  const certificado = await buscarPorCodigo(c.env.DB, c.req.param('codigo'));
  if (!certificado) throw certificadoNoEncontrado();
  return c.json({ valido: true, ...datosVerificacion(certificado) });
});
