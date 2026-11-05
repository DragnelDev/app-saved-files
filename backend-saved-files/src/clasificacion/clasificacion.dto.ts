import { PartialType, OmitType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { DisposicionFinal, NivelClasificacion } from '../common/enums/archivo.enums.js';

export class CrearNodoDto {
  @IsString() @IsNotEmpty() @MaxLength(40) codigo: string;
  @IsString() @IsNotEmpty() @MaxLength(200) nombre: string;
  @IsEnum(NivelClasificacion) nivel: NivelClasificacion;
  @IsOptional() @IsUUID() padreId?: string;
  @IsOptional() @IsString() descripcion?: string;
}
export class ActualizarNodoDto extends PartialType(OmitType(CrearNodoDto, ['nivel', 'padreId'] as const)) {}

export class TrdDto {
  @Type(() => Number) @IsInt() @Min(0) anosArchivoGestion: number;
  @Type(() => Number) @IsInt() @Min(0) anosArchivoCentral: number;
  @IsEnum(DisposicionFinal) disposicionFinal: DisposicionFinal;
  @IsOptional() @IsString() observaciones?: string;
}

export class CrearActaDto {
  @IsString() @IsNotEmpty() @MaxLength(40) numero: string;
  @IsDateString() fecha: string;
  @IsUUID() nodoId: string;
  @IsEnum(DisposicionFinal) disposicion: DisposicionFinal;
  @IsString() @IsNotEmpty() descripcion: string;
}
