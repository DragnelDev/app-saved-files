import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { EstadoPrestamo, TipoSolicitante } from '../common/enums/archivo.enums.js';

export class SolicitarPrestamoDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50) @ArrayUnique() @IsUUID('all', { each: true }) expedienteIds: string[];
  @IsEnum(TipoSolicitante) tipoSolicitante: TipoSolicitante;
  @IsOptional() @IsString() @MaxLength(150) solicitanteNombre?: string;
  @IsOptional() @IsUUID() unidadSolicitanteId?: string;
  @IsString() @IsNotEmpty() motivo: string;
}

export class EntregarPrestamoDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(90) diasPrestamo?: number;
  @IsOptional() @IsString() observaciones?: string;
}

export class DevolverPrestamoDto {
  /** Si se omite, se devuelven todos los expedientes pendientes del acta. */
  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayUnique() @IsUUID('all', { each: true }) detalleIds?: string[];
  @IsOptional() @IsString() observaciones?: string;
}

export class RechazarPrestamoDto {
  @IsString() @IsNotEmpty() motivo: string;
}

export class FiltroPrestamosDto {
  @IsOptional() @IsEnum(EstadoPrestamo) estado?: EstadoPrestamo;
}
