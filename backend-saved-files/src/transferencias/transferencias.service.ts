import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { actualizar } from '../common/util/actualizar.js';
import type { UsuarioAutenticado } from '../common/decorators/current-user.decorator.js';
import { EstadoExpediente, EstadoFoliacion, EstadoTransferencia as ET } from '../common/enums/archivo.enums.js';
import { Rol } from '../common/enums/rol.enum.js';
import { DbSetupService } from '../database/db-setup.service.js';
import { Expediente } from '../expedientes/expediente.entity.js';
import { CajaArchivo } from '../ubicaciones/ubicaciones.entities.js';
import { CrearTransferenciaDto, ObservarDto, VerificarItemDto } from './transferencias.dto.js';
import { DetalleTransferencia, Transferencia } from './transferencias.entities.js';

/** Máquina de estados del acta de transferencia. */
export const TRANSICIONES: Record<ET, ET[]> = {
  [ET.BORRADOR]: [ET.ENVIADO],
  [ET.ENVIADO]: [ET.EN_REVISION],
  [ET.EN_REVISION]: [ET.APROBADO_Y_RECIBIDO, ET.OBSERVADO],
  [ET.APROBADO_Y_RECIBIDO]: [],
  [ET.OBSERVADO]: [ET.ENVIADO],
};

const ACTIVOS = [ET.BORRADOR, ET.ENVIADO, ET.EN_REVISION, ET.OBSERVADO];

@Injectable()
export class TransferenciasService {
  constructor(
    @InjectRepository(Transferencia) private readonly repo: Repository<Transferencia>,
    @InjectRepository(DetalleTransferencia) private readonly detalles: Repository<DetalleTransferencia>,
    @InjectRepository(Expediente) private readonly expedientes: Repository<Expediente>,
    @InjectRepository(CajaArchivo) private readonly cajas: Repository<CajaArchivo>,
    @InjectDataSource() private readonly ds: DataSource,
    private readonly db: DbSetupService,
  ) {}

  private cambiar(t: Transferencia, nuevo: ET) {
    if (!TRANSICIONES[t.estado].includes(nuevo)) {
      throw new ConflictException(`Transición no permitida: ${t.estado} → ${nuevo}`);
    }
    t.estado = nuevo;
  }

  private exigirUnidad(t: Transferencia, u: UsuarioAutenticado) {
    if (u.rol === Rol.RESPONSABLE_UNIDAD && t.unidadOrigenId !== u.unidadId) throw new ForbiddenException('No tienes acceso a esta transferencia');
  }

  async listar(u: UsuarioAutenticado, estado?: ET) {
    const qb = this.repo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.unidadOrigen', 'un')
      .leftJoinAndSelect('t.detalles', 'd', 'd.activo = true')
      .where('t.activo = true')
      .orderBy('t.fechaCreacion', 'DESC');
    if (u.rol === Rol.RESPONSABLE_UNIDAD) qb.andWhere('t.unidadOrigenId = :uu', { uu: u.unidadId });
    if (estado) qb.andWhere('t.estado = :estado', { estado });
    const lista = await qb.getMany();
    return lista.map(({ detalles, ...t }) => ({ ...t, totalExpedientes: detalles?.length ?? 0 }));
  }

  async obtener(id: string, u: UsuarioAutenticado): Promise<Transferencia> {
    const t = await this.repo.findOne({
      where: { id, activo: true },
      relations: { unidadOrigen: true, detalles: { expediente: true } },
    });
    if (!t) throw new NotFoundException('Transferencia no encontrada');
    this.exigirUnidad(t, u);
    t.detalles = (t.detalles ?? []).filter((d) => d.activo);
    return t;
  }

  /** Valida que los expedientes puedan incluirse en una transferencia de la unidad indicada. */
  private async validarExpedientes(ids: string[], unidadId: string, excluirTransferenciaId?: string) {
    const lista = await this.expedientes.findBy({ id: In(ids), activo: true });
    if (lista.length !== ids.length) throw new BadRequestException('Algún expediente no existe');
    for (const e of lista) {
      if (e.unidadProductoraId !== unidadId) throw new BadRequestException(`El expediente ${e.codigo} no pertenece a la unidad de origen`);
      if (e.estado !== EstadoExpediente.EN_GESTION) throw new BadRequestException(`El expediente ${e.codigo} no está en archivo de gestión`);
    }
    const qb = this.detalles
      .createQueryBuilder('d')
      .innerJoin('d.transferencia', 't')
      .innerJoinAndSelect('d.expediente', 'e')
      .where('d.activo = true AND t.activo = true AND d.expedienteId IN (:...ids) AND t.estado IN (:...activos)', { ids, activos: ACTIVOS });
    if (excluirTransferenciaId) qb.andWhere('t.id <> :tid', { tid: excluirTransferenciaId });
    const ocupados = await qb.getMany();
    if (ocupados.length) throw new ConflictException(`Ya están en otra transferencia en curso: ${ocupados.map((d) => d.expediente?.codigo).join(', ')}`);
  }

  async crear(dto: CrearTransferenciaDto, u: UsuarioAutenticado): Promise<Transferencia> {
    const unidadId = u.rol === Rol.RESPONSABLE_UNIDAD ? u.unidadId : dto.unidadOrigenId;
    if (!unidadId) throw new BadRequestException('Indica la unidad de origen');
    await this.validarExpedientes(dto.expedienteIds, unidadId);
    const n = await this.db.siguiente('seq_transferencia');
    const id = await this.ds.transaction(async (m) => {
      const t = await m.save(
        m.create(Transferencia, {
          codigo: `TR-${new Date().getFullYear()}-${String(n).padStart(4, '0')}`,
          unidadOrigenId: unidadId,
          observaciones: dto.observaciones ?? null,
        }),
      );
      for (const expedienteId of dto.expedienteIds) {
        await m.save(m.create(DetalleTransferencia, { transferenciaId: t.id, expedienteId }));
      }
      return t.id;
    });
    return this.obtener(id, u);
  }

  async reemplazarExpedientes(id: string, ids: string[], u: UsuarioAutenticado): Promise<Transferencia> {
    const t = await this.obtener(id, u);
    if (t.estado !== ET.BORRADOR && t.estado !== ET.OBSERVADO) throw new ConflictException('Solo se puede editar en BORRADOR u OBSERVADO');
    await this.validarExpedientes(ids, t.unidadOrigenId, id);
    await this.ds.transaction(async (m) => {
      await actualizar(m, DetalleTransferencia, { transferenciaId: id, activo: true }, { activo: false });
      for (const expedienteId of ids) {
        const previo = await m.findOneBy(DetalleTransferencia, { transferenciaId: id, expedienteId });
        if (previo) await actualizar(m, DetalleTransferencia, previo.id, { activo: true, recibido: null, observacion: null, cajaId: null, carpeta: null });
        else await m.save(m.create(DetalleTransferencia, { transferenciaId: id, expedienteId }));
      }
    });
    return this.obtener(id, u);
  }

  async eliminarBorrador(id: string, u: UsuarioAutenticado): Promise<void> {
    const t = await this.obtener(id, u);
    if (t.estado !== ET.BORRADOR) throw new ConflictException('Solo se puede eliminar un BORRADOR');
    await actualizar(this.repo.manager, Transferencia, id, { activo: false });
  }

  async enviar(id: string, u: UsuarioAutenticado): Promise<Transferencia> {
    const t = await this.obtener(id, u);
    if (!t.detalles?.length) throw new BadRequestException('La transferencia no tiene expedientes');
    this.cambiar(t, ET.ENVIADO);
    await this.ds.transaction(async (m) => {
      await actualizar(m, Expediente, { id: In(t.detalles!.map((d) => d.expedienteId)) }, { estado: EstadoExpediente.EN_TRANSFERENCIA });
      await actualizar(m, DetalleTransferencia, { transferenciaId: id }, { recibido: null, observacion: null, cajaId: null, carpeta: null });
      await actualizar(m, Transferencia, id, { estado: t.estado, fechaEnvio: new Date() });
    });
    return this.obtener(id, u);
  }

  async iniciarRevision(id: string, u: UsuarioAutenticado): Promise<Transferencia> {
    const t = await this.obtener(id, u);
    this.cambiar(t, ET.EN_REVISION);
    await actualizar(this.repo.manager, Transferencia, id, { estado: t.estado });
    return this.obtener(id, u);
  }

  async verificarItem(id: string, detalleId: string, dto: VerificarItemDto, u: UsuarioAutenticado): Promise<DetalleTransferencia> {
    const t = await this.obtener(id, u);
    if (t.estado !== ET.EN_REVISION) throw new ConflictException('La transferencia no está en revisión');
    const d = t.detalles?.find((x) => x.id === detalleId);
    if (!d) throw new NotFoundException('Detalle no encontrado');
    if (dto.cajaId && !(await this.cajas.existsBy({ id: dto.cajaId, activo: true }))) throw new BadRequestException('Caja inexistente');
    await actualizar(this.detalles.manager, DetalleTransferencia, detalleId, {
      recibido: dto.recibido,
      observacion: dto.observacion ?? null,
      cajaId: dto.recibido ? dto.cajaId ?? null : null,
      carpeta: dto.recibido ? dto.carpeta ?? null : null,
    });
    return this.detalles.findOneByOrFail({ id: detalleId });
  }

  async aprobar(id: string, u: UsuarioAutenticado): Promise<Transferencia> {
    const t = await this.obtener(id, u);
    this.cambiar(t, ET.APROBADO_Y_RECIBIDO);
    const det = t.detalles ?? [];
    const pendientes = det.filter((d) => d.recibido !== true);
    if (pendientes.length) throw new BadRequestException(`Faltan ${pendientes.length} expediente(s) por confirmar como recibidos físicamente`);
    const sinCaja = det.filter((d) => !d.cajaId);
    if (sinCaja.length) throw new BadRequestException('Asigna caja (ubicación topográfica) a todos los expedientes recibidos');
    const sinFoliar = det.filter((d) => d.expediente?.estadoFoliacion !== EstadoFoliacion.FOLIADO);
    if (sinFoliar.length) {
      throw new BadRequestException(`Foliación definitiva pendiente: ${sinFoliar.map((d) => d.expediente?.codigo).join(', ')}`);
    }
    // capacidad de carpetas por caja
    const porCaja = new Map<string, number>();
    for (const d of det) porCaja.set(d.cajaId!, (porCaja.get(d.cajaId!) ?? 0) + 1);
    for (const [cajaId, nuevas] of porCaja) {
      const caja = await this.cajas.findOneByOrFail({ id: cajaId });
      const ocupadas = await this.expedientes.countBy({ cajaId, activo: true });
      if (ocupadas + nuevas > caja.capacidadCarpetas) throw new ConflictException(`La caja ${caja.codigo} no tiene espacio para ${nuevas} carpeta(s)`);
    }
    const hoy = new Date().toISOString().slice(0, 10);
    await this.ds.transaction(async (m) => {
      for (const d of det) {
        await actualizar(m, Expediente, d.expedienteId, { estado: EstadoExpediente.EN_ARCHIVO_CENTRAL, cajaId: d.cajaId, carpeta: d.carpeta, fechaIngresoArchivo: hoy });
      }
      await actualizar(m, Transferencia, id, { estado: t.estado, fechaRecepcion: new Date() });
    });
    return this.obtener(id, u);
  }

  async observar(id: string, dto: ObservarDto, u: UsuarioAutenticado): Promise<Transferencia> {
    const t = await this.obtener(id, u);
    this.cambiar(t, ET.OBSERVADO);
    await this.ds.transaction(async (m) => {
      await actualizar(m, Expediente, { id: In((t.detalles ?? []).map((d) => d.expedienteId)) }, { estado: EstadoExpediente.EN_GESTION });
      await actualizar(m, Transferencia, id, { estado: t.estado, observaciones: dto.observaciones });
    });
    return this.obtener(id, u);
  }
}
