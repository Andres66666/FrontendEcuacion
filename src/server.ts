import { AngularAppEngine, createRequestHandler } from '@angular/ssr';
import { getContext } from '@netlify/angular-runtime/context.mjs';

const angularAppEngine = new AngularAppEngine();

/**
 * Manejador principal para Netlify
 */
export async function netlifyAppEngineHandler(request: Request): Promise<Response> {
  const context = getContext();

  // Aquí puedes definir endpoints personalizados si lo deseas
  // const pathname = new URL(request.url).pathname;
  // if (pathname === '/api/hello') {
  //   return Response.json({ message: 'Hola desde la API en Netlify' });
  // }

  const result = await angularAppEngine.handle(request, context);
  return result || new Response('Not found', { status: 404 });
}

/**
 * Request handler usado por Angular CLI (dev-server y durante el build).
 */
export const reqHandler = createRequestHandler(netlifyAppEngineHandler);
