import { PartialType, OmitType } from '@nestjs/mapped-types';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';
import { Rol } from '../common/enums/rol.enum.js';

export class CrearUsuarioDto {
  @IsString() @Matches(/^[a-zA-Z0-9._-]{3,60}$/, { message: 'username: 3-60 caracteres (letras, números, . _ -)' }) username: string;
  @IsString() @MinLength(8) @MaxLength(128) password: string;
  @IsString() @IsNotEmpty() @MaxLength(150) nombreCompleto: string;
  @IsOptional() @IsEmail() email?: string;
  @IsEnum(Rol) rol: Rol;
  @IsOptional() @IsUUID() unidadId?: string;
}
export class ActualizarUsuarioDto extends PartialType(OmitType(CrearUsuarioDto, ['username', 'password'] as const)) {}
export class CambiarPasswordDto {
  @IsString() @MinLength(8) @MaxLength(128) password: string;
}
