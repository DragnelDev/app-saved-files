import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { TipoUbicacion } from '../common/enums/archivo.enums.js';

export class CrearUbicacionDto {
  @IsEnum(TipoUbicacion) tipo: TipoUbicacion;
  @IsString() @IsNotEmpty() @MaxLength(20) codigo: string;
  @IsString() @IsNotEmpty() @MaxLength(120) nombre: string;
  @IsOptional() @IsUUID() padreId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) capacidadCajas?: number;
}
export class ActualizarUbicacionDto extends PartialType(CrearUbicacionDto) {}

export class CrearCajaDto {
  @IsUUID() baldaId: string;
  @IsOptional() @IsString() @MaxLength(200) descripcion?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) capacidadCarpetas?: number;
}
