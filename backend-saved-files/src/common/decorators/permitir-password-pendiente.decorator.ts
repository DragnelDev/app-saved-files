import { SetMetadata } from '@nestjs/common';

export const PERMITE_PASSWORD_PENDIENTE_KEY = 'permitePasswordPendiente';
/** Rutas que un usuario con "debe cambiar contraseña" sí puede usar (ver su sesión y cambiarla). */
export const PermitirPasswordPendiente = () => SetMetadata(PERMITE_PASSWORD_PENDIENTE_KEY, true);
