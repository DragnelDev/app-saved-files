import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { DisposicionFinal, EstadoExpediente, EstadoPropuesta as EP, ResolucionItem } from '../common/enums/archivo.enums.js';
import { actualizar } from '../common/util/actualizar.js';
import { DbSetupService } from '../database/db-setup.service.js';
import { Expediente } from '../expedientes/expediente.entity.js';
import { CrearPropuestaDto, ResolverPropuestaDto } from './disposicion.dto.js';
import { DetallePropuesta, PropuestaDisposicion } from './disposicion.entities.js';

/** Máquina de estados de la propuesta de disposición final. */
export const TRANSICIONES_PROPUESTA: Record<EP, EP[]> = {
  [EP.BORRADOR]: [EP.EN_COMISION],
  [EP.EN_COMISION]: [EP.APROBADA, EP.RECHAZADA],
  [EP.APROBADA]: [EP.EJECUTADA],
  [EP.RECHAZADA]: [],
  [EP.EJECUTADA]: [],
};

export interface Vencido {
  id: string;
  codigo: string;
  asunto: string;
  fechaFin: string | null;
  disposicionFinal: DisposicionFinal;
  anioCumplimiento: number;
}

@Injectable()
export class DisposicionService {
  constructor(
    @InjectRepository(PropuestaDisposicion) private readonly repo: Repository<PropuestaDisposicion>,
    @InjectRepository(DetallePropuesta) private readonly detalles: Repository<DetallePropuesta>,
    @InjectRepository(Expediente) private readonly expedientes: Repository<Expediente>,
    @InjectDataSource() private readonly ds: DataSource,
    private readonly db: DbSetupService,
  ) {}

  /**
   * Expedientes del Archivo Central cuyo plazo de retención (gestión + central, contado desde el año de
   * la fecha extrema final) ya se cumplió y que no están en otra propuesta en curso.
   */
  vencidos(tipo?: DisposicionFinal, limite = 300, excluirPropuestaId?: string): Promise<Vencido[]> {
    return this.ds.query(
      `SELECT e.id, e.codigo, e.asunto, e.fecha_fin AS "fechaFin", t.disposicion_final AS "disposicionFinal",
              (EXTRACT(YEAR FROM COALESCE(e.fecha_fin, e.fecha_inicio))::int + t.anos_archivo_gestion + t.anos_archivo_central) AS "anioCumplimiento"
         FROM expedientes e
         JOIN tabla_retencion t ON t.nodo_id = e.nodo_id AND t.activo
        WHERE e.activo AND e.estado = 'EN_ARCHIVO_CENTRAL'
          AND EXTRACT(YEAR FROM COALESCE(e.fecha_fin, e.fecha_inicio))::int + t.anos_archivo_gestion + t.anos_archivo_central
              <= EXTRACT(YEAR FROM CURRENT_DATE)
          AND ($1::text IS NULL OR t.disposicion_final::text = $1)
          AND NOT EXISTS (
                SELECT 1 FROM detalle_propuesta_disposicion d
                  JOIN propuestas_disposicion p ON p.id = d.propuesta_id
                 WHERE d.expediente_id = e.id AND d.activo AND p.activo
                   AND p.estado IN ('BORRADOR','EN_COMISION','APROBADA')
                   AND ($3::uuid IS NULL OR p.id <> $3::uuid))
        ORDER BY "anioCumplimiento", e.codigo
        LIMIT $2`,
      [tipo ?? null, limite, excluirPropuestaId ?? null],
    );
  }

  private cambiar(p: PropuestaDisposicion, nuevo: EP) {
    if (!TRANSICIONES_PROPUESTA[p.estado].includes(nuevo)) throw new ConflictException(`Transición no permitida: ${p.estado} → ${nuevo}`);
    p.estado = nuevo;
  }

  private async validarExpedientes(ids: string[], tipo: DisposicionFinal, excluirPropuestaId?: string) {
    const ok = new Set((await this.vencidos(tipo, 5000, excluirPropuestaId)).map((v) => v.id));
    const malos = ids.filter((id) => !ok.has(id));
    if (malos.length) {
      const cods = (await this.expedientes.findBy(malos.map((id) => ({ id })))).map((e) => e.codigo);
      throw new BadRequestException(
        `No pueden incluirse (plazo no cumplido, disposición distinta de ${tipo}, no están en el Archivo Central o ya están en otra propuesta): ${cods.join(', ') || malos.join(', ')}`,
      );
    }
  }

  async listar(estado?: EP) {
    const qb = this.repo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.detalles', 'd', 'd.activo = true')
      .where('p.activo = true')
      .orderBy('p.fechaCreacion', 'DESC');
    if (estado) qb.andWhere('p.estado = :estado', { estado });
    const lista = await qb.getMany();
    return lista.map(({ detalles, ...p }) => ({ ...p, totalExpedientes: detalles?.length ?? 0 }));
  }

  async obtener(id: string): Promise<PropuestaDisposicion> {
    const p = await this.repo.findOne({ where: { id, activo: true }, relations: { detalles: { expediente: true } } });
    if (!p) throw new NotFoundException('Propuesta no encontrada');
    p.detalles = (p.detalles ?? []).filter((d) => d.activo);
    return p;
  }

  async crear(dto: CrearPropuestaDto): Promise<PropuestaDisposicion> {
    await this.validarExpedientes(dto.expedienteIds, dto.tipo);
    const n = await this.db.siguiente('seq_propuesta');
    const id = await this.ds.transaction(async (m) => {
      const p = await m.save(
        m.create(PropuestaDisposicion, { codigo: `PD-${new Date().getFullYear()}-${String(n).padStart(4, '0')}`, tipo: dto.tipo, justificacion: dto.justificacion }),
      );
      for (const expedienteId of dto.expedienteIds) await m.save(m.create(DetallePropuesta, { propuestaId: p.id, expedienteId }));
      return p.id;
    });
    return this.obtener(id);
  }

  async reemplazarExpedientes(id: string, ids: string[]): Promise<PropuestaDisposicion> {
    const p = await this.obtener(id);
    if (p.estado !== EP.BORRADOR) throw new ConflictException('Solo se puede editar una propuesta en BORRADOR');
    await this.validarExpedientes(ids, p.tipo, id);
    await this.ds.transaction(async (m) => {
      await actualizar(m, DetallePropuesta, { propuestaId: id, activo: true }, { activo: false });
      for (const expedienteId of ids) {
        const previo = await m.findOneBy(DetallePropuesta, { propuestaId: id, expedienteId });
        if (previo) await actualizar(m, DetallePropuesta, previo.id, { activo: true, resolucion: null });
        else await m.save(m.create(DetallePropuesta, { propuestaId: id, expedienteId }));
      }
    });
    return this.obtener(id);
  }

  async eliminarBorrador(id: string): Promise<void> {
    const p = await this.obtener(id);
    if (p.estado !== EP.BORRADOR) throw new ConflictException('Solo se puede eliminar un BORRADOR');
    await actualizar(this.repo.manager, PropuestaDisposicion, id, { activo: false });
  }

  async presentar(id: string): Promise<PropuestaDisposicion> {
    const p = await this.obtener(id);
    if (!p.detalles?.length) throw new BadRequestException('La propuesta no tiene expedientes');
    this.cambiar(p, EP.EN_COMISION);
    await actualizar(this.repo.manager, PropuestaDisposicion, id, { estado: p.estado, fechaPresentacion: new Date() });
    return this.obtener(id);
  }

  /** Registra la resolución de la Comisión de Valoración (con los datos de su acta). */
  async resolver(id: string, dto: ResolverPropuestaDto): Promise<PropuestaDisposicion> {
    const p = await this.obtener(id);
    this.cambiar(p, dto.aprobada ? EP.APROBADA : EP.RECHAZADA);
    if (dto.aprobada) {
      if (!dto.actaNumero || !dto.actaFecha) throw new BadRequestException('Para aprobar indica el número y la fecha del acta de la Comisión');
      if (await this.repo.existsBy({ actaNumero: dto.actaNumero })) throw new ConflictException('Ya existe una propuesta con ese número de acta');
    } else if (!dto.observaciones?.trim()) {
      throw new BadRequestException('Indica el motivo del rechazo');
    }
    await actualizar(this.repo.manager, PropuestaDisposicion, id, {
      estado: p.estado,
      actaNumero: dto.aprobada ? dto.actaNumero : null,
      actaFecha: dto.aprobada ? dto.actaFecha : null,
      observacionesComision: dto.observaciones ?? null,
      fechaResolucion: new Date(),
    });
    return this.obtener(id);
  }

  async resolverItem(id: string, detalleId: string, resolucion: ResolucionItem): Promise<PropuestaDisposicion> {
    const p = await this.obtener(id);
    if (p.estado !== EP.APROBADA) throw new ConflictException('La propuesta debe estar APROBADA');
    if (p.tipo !== DisposicionFinal.SELECCION_MUESTREO) throw new BadRequestException('Solo la selección / muestreo se resuelve expediente por expediente');
    if (!p.detalles?.some((d) => d.id === detalleId)) throw new NotFoundException('Detalle no encontrado');
    await actualizar(this.repo.manager, DetallePropuesta, detalleId, { resolucion });
    return this.obtener(id);
  }

  /** Ejecuta la disposición aprobada: da de baja o pasa al Archivo Histórico cada expediente. */
  async ejecutar(id: string): Promise<PropuestaDisposicion> {
    const p = await this.obtener(id);
    this.cambiar(p, EP.EJECUTADA);
    const det = p.detalles ?? [];
    if (p.tipo === DisposicionFinal.SELECCION_MUESTREO) {
      const sin = det.filter((d) => !d.resolucion);
      if (sin.length) throw new BadRequestException(`Define qué se conserva y qué se elimina en ${sin.length} expediente(s) antes de ejecutar`);
    }
    for (const d of det) {
      if (d.expediente?.estado !== EstadoExpediente.EN_ARCHIVO_CENTRAL) {
        throw new ConflictException(`El expediente ${d.expediente?.codigo} ya no está disponible en el Archivo Central (¿préstamo vigente?)`);
      }
    }
    const hoy = new Date().toISOString().slice(0, 10);
    await this.ds.transaction(async (m) => {
      for (const d of det) {
        const eliminar = p.tipo === DisposicionFinal.ELIMINACION || (p.tipo === DisposicionFinal.SELECCION_MUESTREO && d.resolucion === ResolucionItem.ELIMINAR);
        await actualizar(
          m,
          Expediente,
          d.expedienteId,
          eliminar
            ? { estado: EstadoExpediente.ELIMINADO, fechaDisposicion: hoy, cajaId: null, carpeta: null }
            : { estado: EstadoExpediente.HISTORICO, fechaDisposicion: hoy },
        );
      }
      await actualizar(m, PropuestaDisposicion, id, { estado: p.estado, fechaEjecucion: new Date() });
    });
    return this.obtener(id);
  }
}
