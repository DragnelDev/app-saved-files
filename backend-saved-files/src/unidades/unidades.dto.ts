import { PartialType } from '@nestjs/mapped-types';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CrearUnidadDto {
  @IsString() @IsNotEmpty() @MaxLength(30) codigo: string;
  @IsString() @IsNotEmpty() @MaxLength(150) nombre: string;
  @IsOptional() @IsString() @MaxLength(20) sigla?: string;
}
export class ActualizarUnidadDto extends PartialType(CrearUnidadDto) {}
