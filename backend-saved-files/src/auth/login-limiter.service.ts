import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

const MAX_FALLOS = 5;
const VENTANA_MS = 15 * 60 * 1000;

/** Limita los intentos fallidos por clave (IP + usuario) para frenar la adivinación de contraseñas. */
@Injectable()
export class LoginLimiter {
  private readonly fallos = new Map<string, { n: number; desde: number }>();

  /** Lanza 429 si la clave ya agotó sus intentos dentro de la ventana. */
  verificar(clave: string): void {
    const e = this.fallos.get(clave);
    if (!e) return;
    const restante = e.desde + VENTANA_MS - Date.now();
    if (restante <= 0) { this.fallos.delete(clave); return; }
    if (e.n >= MAX_FALLOS) {
      throw new HttpException(`Demasiados intentos fallidos. Intenta de nuevo en ${Math.ceil(restante / 60000)} minuto(s).`, HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  fallo(clave: string): void {
    const e = this.fallos.get(clave);
    if (!e || Date.now() - e.desde > VENTANA_MS) this.fallos.set(clave, { n: 1, desde: Date.now() });
    else e.n++;
    if (this.fallos.size > 5000) for (const [k, v] of this.fallos) if (Date.now() - v.desde > VENTANA_MS) this.fallos.delete(k);
  }

  exito(clave: string): void { this.fallos.delete(clave); }
}
