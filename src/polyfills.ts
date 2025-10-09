/***************************************************************************************************
 * Zone JS is required by default for Angular itself.
 */
import 'zone.js'; // Included with Angular CLI.

/***************************************************************************************************
 * Application imports
 */

// Polyfill para librerías Node (como docx)
(window as any).global = window;
(window as any).process = { browser: true, env: { DEBUG: undefined } };
(window as any).Buffer = (window as any).Buffer || require('buffer').Buffer;
