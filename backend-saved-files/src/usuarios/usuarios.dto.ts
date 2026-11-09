import { PartialType, OmitType } from '@nestjs/mapped-types';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { Rol } from '../common/enums/rol.enum.js';

/** Política de contraseñas: 8 a 128 caracteres, con al menos una letra y un número. */
export const PASSWORD_POLITICA = /^(?=.*[A-Za-z])(?=.*\d).{8,128}$/;
export const PASSWORD_MENSAJE = 'La contraseña debe tener entre 8 y 128 caracteres, con al menos una letra y un número';

export class CrearUsuarioDto {
  @IsString() @Matches(/^[a-zA-Z0-9._-]{3,60}$/, { message: 'username: 3-60 caracteres (letras, números, . _ -)' }) username: string;
  @IsString() @Matches(PASSWORD_POLITICA, { message: PASSWORD_MENSAJE }) password: string;
  @IsString() @IsNotEmpty() @MaxLength(150) nombreCompleto: string;
  @IsOptional() @IsEmail() email?: string;
  @IsEnum(Rol) rol: Rol;
  @IsOptional() @IsUUID() unidadId?: string;
}
export class ActualizarUsuarioDto extends PartialType(OmitType(CrearUsuarioDto, ['username', 'password'] as const)) {}
export class CambiarPasswordDto {
  @IsString() @Matches(PASSWORD_POLITICA, { message: PASSWORD_MENSAJE }) password: string;
}
