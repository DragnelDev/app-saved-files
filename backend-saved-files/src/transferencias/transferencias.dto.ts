import { Type } from 'class-transformer';
import { ArrayMinSize, ArrayUnique, IsArray, IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { EstadoTransferencia } from '../common/enums/archivo.enums.js';

export class CrearTransferenciaDto {
  @IsOptional() @IsUUID() unidadOrigenId?: string;
  @IsOptional() @IsString() observaciones?: string;
  @IsArray() @ArrayMinSize(1) @ArrayUnique() @IsUUID('all', { each: true }) expedienteIds: string[];
}

export class ReemplazarExpedientesDto {
  @IsArray() @ArrayMinSize(1) @ArrayUnique() @IsUUID('all', { each: true }) expedienteIds: string[];
}

export class VerificarItemDto {
  @IsBoolean() recibido: boolean;
  @IsOptional() @IsString() observacion?: string;
  @IsOptional() @IsUUID() cajaId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) carpeta?: number;
}

export class ObservarDto {
  @IsString() @IsNotEmpty() observaciones: string;
}

export class FiltroTransferenciasDto {
  @IsOptional() @IsEnum(EstadoTransferencia) estado?: EstadoTransferencia;
}
