import { HttpException } from '@nestjs/common';
import { LoginLimiter } from './login-limiter.service.js';

describe('LoginLimiter', () => {
  it('bloquea tras 5 fallos y se libera con un acierto', () => {
    const l = new LoginLimiter();
    for (let i = 0; i < 5; i++) { l.verificar('a'); l.fallo('a'); }
    expect(() => l.verificar('a')).toThrow(HttpException);
    l.exito('a');
    expect(() => l.verificar('a')).not.toThrow();
  });
  it('las claves son independientes', () => {
    const l = new LoginLimiter();
    for (let i = 0; i < 5; i++) l.fallo('a');
    expect(() => l.verificar('b')).not.toThrow();
  });
});
