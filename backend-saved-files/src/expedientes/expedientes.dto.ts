import { PartialType, OmitType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { EstadoExpediente, EstadoFoliacion, Sensibilidad } from '../common/enums/archivo.enums.js';
import { PaginacionDto } from '../common/dto/paginacion.dto.js';

export class CrearExpedienteDto {
  @IsUUID() nodoId: string;
  @Type(() => Number) @IsInt() @Min(1900) @Max(2200) gestion: number;
  @IsString() @IsNotEmpty() asunto: string;
  /** Opcional para responsables de unidad: se toma la de su usuario. */
  @IsOptional() @IsUUID() unidadProductoraId?: string;
  @IsDateString() fechaInicio: string;
  @IsOptional() @IsDateString() fechaFin?: string;
  @IsOptional() @IsEnum(Sensibilidad) sensibilidad?: Sensibilidad;
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(60, { each: true }) palabrasClave?: string[];
}
export class ActualizarExpedienteDto extends PartialType(OmitType(CrearExpedienteDto, ['nodoId', 'gestion', 'unidadProductoraId'] as const)) {}

export class FiltroExpedientesDto extends PaginacionDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsUUID() unidadId?: string;
  @IsOptional() @IsUUID() nodoId?: string;
  @IsOptional() @IsEnum(EstadoExpediente) estado?: EstadoExpediente;
  @IsOptional() @IsEnum(EstadoFoliacion) estadoFoliacion?: EstadoFoliacion;
  @IsOptional() @IsDateString() fechaDesde?: string;
  @IsOptional() @IsDateString() fechaHasta?: string;
  /** Código de caja (ubicación topográfica). */
  @IsOptional() @IsString() codigoTopografico?: string;
}

export class CrearDocumentoDto {
  @IsString() @IsNotEmpty() @MaxLength(250) titulo: string;
  @IsOptional() @IsString() @MaxLength(80) tipoDocumento?: string;
  @IsOptional() @IsDateString() fechaDocumento?: string;
  @Type(() => Number) @IsInt() @Min(1) fojaInicio: number;
  @Type(() => Number) @IsInt() @Min(1) fojaFin: number;
}
