import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { PASSWORD_MENSAJE, PASSWORD_POLITICA } from '../../usuarios/usuarios.dto.js';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  username: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password: string;
}

export class CambiarPasswordPropiaDto {
  @IsString() @IsNotEmpty() @MaxLength(128) actual: string;
  @IsString() @Matches(PASSWORD_POLITICA, { message: PASSWORD_MENSAJE }) nueva: string;
}
