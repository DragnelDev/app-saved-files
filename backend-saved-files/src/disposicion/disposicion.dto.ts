import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { DisposicionFinal, EstadoPropuesta, ResolucionItem } from '../common/enums/archivo.enums.js';

export class CrearPropuestaDto {
  @IsEnum(DisposicionFinal) tipo: DisposicionFinal;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(500) @ArrayUnique() @IsUUID('all', { each: true }) expedienteIds: string[];
  @IsString() @IsNotEmpty() justificacion: string;
}

export class ReemplazarExpedientesPropuestaDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(500) @ArrayUnique() @IsUUID('all', { each: true }) expedienteIds: string[];
}

export class ResolverPropuestaDto {
  @IsBoolean() aprobada: boolean;
  @IsOptional() @IsString() @MaxLength(40) actaNumero?: string;
  @IsOptional() @IsDateString() actaFecha?: string;
  @IsOptional() @IsString() observaciones?: string;
}

export class ResolverItemDto {
  @IsEnum(ResolucionItem) resolucion: ResolucionItem;
}

export class FiltroPropuestasDto {
  @IsOptional() @IsEnum(EstadoPropuesta) estado?: EstadoPropuesta;
}

export class FiltroVencidosDto {
  @IsOptional() @IsEnum(DisposicionFinal) tipo?: DisposicionFinal;
}
