import bwipjs from 'bwip-js';
import QRCode from 'qrcode';

/** Imagen QR (PNG) con el texto indicado. */
export const qrPng = (texto: string, ancho = 300): Promise<Buffer> => QRCode.toBuffer(texto, { width: ancho, margin: 1 });

/** Código de barras Code 128 (PNG) con el texto legible debajo. */
export const barrasPng = (texto: string): Promise<Buffer> =>
  bwipjs.toBuffer({ bcid: 'code128', text: texto, scale: 3, height: 10, includetext: true, textxalign: 'center', textsize: 9 });
