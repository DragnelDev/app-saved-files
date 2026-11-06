import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { EstadoExpediente, TipoUbicacion } from '../common/enums/archivo.enums.js';
import { qrPng } from '../common/util/codigos.js';
import { DbSetupService } from '../database/db-setup.service.js';
import { Expediente } from '../expedientes/expediente.entity.js';
import { CrearCajaDto, CrearUbicacionDto } from './ubicaciones.dto.js';
import { CajaArchivo, Ubicacion } from './ubicaciones.entities.js';

const PADRE_REQUERIDO: Record<TipoUbicacion, TipoUbicacion | null> = {
  [TipoUbicacion.DEPOSITO]: null,
  [TipoUbicacion.ESTANTE]: TipoUbicacion.DEPOSITO,
  [TipoUbicacion.CUERPO]: TipoUbicacion.ESTANTE,
  [TipoUbicacion.BALDA]: TipoUbicacion.CUERPO,
};

export interface UbicacionArbol extends Ubicacion {
  hijos: UbicacionArbol[];
  cajas?: number;
}

@Injectable()
export class UbicacionesService {
  constructor(
    @InjectRepository(Ubicacion) private readonly ubic: Repository<Ubicacion>,
    @InjectRepository(CajaArchivo) private readonly cajas: Repository<CajaArchivo>,
    @InjectRepository(Expediente) private readonly expedientes: Repository<Expediente>,
    private readonly db: DbSetupService,
  ) {}

  async arbol(): Promise<UbicacionArbol[]> {
    const [todas, conteo] = await Promise.all([
      this.ubic.find({ where: { activo: true }, order: { codigo: 'ASC' } }),
      this.cajas
        .createQueryBuilder('c')
        .select('c.balda_id', 'baldaId')
        .addSelect('COUNT(*)', 'n')
        .where('c.activo = true')
        .groupBy('c.balda_id')
        .getRawMany<{ baldaId: string; n: string }>(),
    ]);
    const nCajas = new Map(conteo.map((c) => [c.baldaId, Number(c.n)]));
    const mapa = new Map<string, UbicacionArbol>();
    for (const u of todas) mapa.set(u.id, { ...u, hijos: [], cajas: nCajas.get(u.id) ?? 0 });
    const raices: UbicacionArbol[] = [];
    for (const u of mapa.values()) {
      const p = u.padreId ? mapa.get(u.padreId) : undefined;
      (p ? p.hijos : raices).push(u);
    }
    return raices;
  }

  /** Código topográfico completo: DEP-1/E-2/C-1/B-3 */
  async rutaDe(baldaId: string): Promise<string> {
    const partes: string[] = [];
    let actual: Ubicacion | null = await this.ubic.findOneBy({ id: baldaId });
    while (actual) {
      partes.unshift(actual.codigo);
      actual = actual.padreId ? await this.ubic.findOneBy({ id: actual.padreId }) : null;
    }
    return partes.join('/');
  }

  async crear(dto: CrearUbicacionDto): Promise<Ubicacion> {
    const requerido = PADRE_REQUERIDO[dto.tipo];
    if (requerido === null) {
      if (dto.padreId) throw new BadRequestException('Un depósito no tiene padre');
    } else {
      if (!dto.padreId) throw new BadRequestException(`${dto.tipo} requiere un ${requerido} como padre`);
      const padre = await this.ubic.findOneBy({ id: dto.padreId, activo: true });
      if (!padre) throw new NotFoundException('Ubicación padre no encontrada');
      if (padre.tipo !== requerido) throw new BadRequestException(`El padre de un ${dto.tipo} debe ser ${requerido}`);
    }
    if (dto.tipo === TipoUbicacion.BALDA && !dto.capacidadCajas) {
      throw new BadRequestException('Una balda requiere capacidad de cajas');
    }
    const dup = await this.ubic.findOneBy({ padreId: dto.padreId ?? IsNull(), codigo: dto.codigo, activo: true });
    if (dup) throw new ConflictException('Ya existe una ubicación con ese código en el mismo nivel');
    return this.ubic.save(this.ubic.create({ ...dto, padreId: dto.padreId ?? null, capacidadCajas: dto.capacidadCajas ?? null }));
  }

  async desactivar(id: string): Promise<void> {
    const u = await this.ubic.findOneBy({ id, activo: true });
    if (!u) throw new NotFoundException('Ubicación no encontrada');
    if (await this.ubic.existsBy({ padreId: id, activo: true })) throw new ConflictException('Tiene ubicaciones dependientes');
    if (await this.cajas.existsBy({ baldaId: id, activo: true })) throw new ConflictException('Tiene cajas asignadas');
    u.activo = false;
    await this.ubic.save(u);
  }

  async crearCaja(dto: CrearCajaDto): Promise<CajaArchivo> {
    const balda = await this.ubic.findOneBy({ id: dto.baldaId, activo: true });
    if (!balda || balda.tipo !== TipoUbicacion.BALDA) throw new BadRequestException('La caja debe asignarse a una balda');
    const ocupadas = await this.cajas.countBy({ baldaId: balda.id, activo: true });
    if (ocupadas >= (balda.capacidadCajas ?? 0)) throw new ConflictException('La balda no tiene capacidad disponible');
    const n = await this.db.siguiente('seq_caja');
    return this.cajas.save(
      this.cajas.create({
        codigo: `CAJ-${String(n).padStart(6, '0')}`,
        baldaId: balda.id,
        descripcion: dto.descripcion ?? null,
        capacidadCarpetas: dto.capacidadCarpetas ?? 20,
      }),
    );
  }

  async listarCajas(baldaId?: string) {
    const qb = this.cajas
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.balda', 'b')
      .where('c.activo = true')
      .orderBy('c.codigo');
    if (baldaId) qb.andWhere('c.balda_id = :baldaId', { baldaId });
    const lista = await qb.getMany();
    const conteos = await this.expedientes
      .createQueryBuilder('e')
      .select('e.caja_id', 'cajaId')
      .addSelect('COUNT(*)', 'n')
      .where('e.activo = true AND e.caja_id IS NOT NULL')
      .groupBy('e.caja_id')
      .getRawMany<{ cajaId: string; n: string }>();
    const mapa = new Map(conteos.map((c) => [c.cajaId, Number(c.n)]));
    return Promise.all(
      lista.map(async (c) => ({ ...c, ruta: await this.rutaDe(c.baldaId), carpetas: mapa.get(c.id) ?? 0 })),
    );
  }

  async detalleCaja(id: string) {
    const c = await this.cajas.findOne({ where: { id, activo: true }, relations: { balda: true } });
    if (!c) throw new NotFoundException('Caja no encontrada');
    const expedientes = await this.expedientes.find({
      where: { cajaId: id, activo: true },
      order: { carpeta: 'ASC' },
      select: { id: true, codigo: true, asunto: true, carpeta: true, estado: true, fojaInicio: true, fojaFin: true },
    });
    return { ...c, ruta: await this.rutaDe(c.baldaId), expedientes };
  }

  /** Imagen QR (PNG) con el código de caja y su ubicación. */
  async qrCaja(id: string): Promise<Buffer> {
    const c = await this.cajas.findOneBy({ id, activo: true });
    if (!c) throw new NotFoundException('Caja no encontrada');
    return qrPng(`CAJA:${c.codigo}|${await this.rutaDe(c.baldaId)}`);
  }

  /** Ocupación global del depósito (para el dashboard). */
  async ocupacion() {
    const cap = await this.ubic
      .createQueryBuilder('u')
      .select('COALESCE(SUM(u.capacidad_cajas),0)', 'n')
      .where('u.activo = true AND u.tipo = :t', { t: TipoUbicacion.BALDA })
      .getRawOne<{ n: string }>();
    const usadas = await this.cajas.countBy({ activo: true });
    const capacidad = Number(cap?.n ?? 0);
    const carpetas = await this.expedientes.countBy({ activo: true, estado: EstadoExpediente.EN_ARCHIVO_CENTRAL });
    return { capacidadCajas: capacidad, cajasUsadas: usadas, porcentaje: capacidad ? Math.round((usadas / capacidad) * 100) : 0, expedientesEnArchivo: carpetas };
  }
}
