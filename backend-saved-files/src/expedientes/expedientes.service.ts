import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { NodoClasificacion } from '../clasificacion/clasificacion.entities.js';
import { actualizar } from '../common/util/actualizar.js';
import type { UsuarioAutenticado } from '../common/decorators/current-user.decorator.js';
import { paginado } from '../common/dto/paginacion.dto.js';
import { EstadoExpediente, EstadoFoliacion, NivelClasificacion, Sensibilidad } from '../common/enums/archivo.enums.js';
import { Rol } from '../common/enums/rol.enum.js';
import { validarFoliado } from '../common/util/foliado.util.js';
import { ActualizarExpedienteDto, CrearDocumentoDto, CrearExpedienteDto, FiltroExpedientesDto } from './expedientes.dto.js';
import { DocumentoExpediente, Expediente } from './expediente.entity.js';

const esPersonalArchivo = (u: UsuarioAutenticado) => u.rol === Rol.ADMIN || u.rol === Rol.ARCHIVISTA;

@Injectable()
export class ExpedientesService {
  private readonly storageDir: string;

  constructor(
    @InjectRepository(Expediente) private readonly repo: Repository<Expediente>,
    @InjectRepository(DocumentoExpediente) private readonly docs: Repository<DocumentoExpediente>,
    @InjectRepository(NodoClasificacion) private readonly nodos: Repository<NodoClasificacion>,
    @InjectDataSource() private readonly ds: DataSource,
    config: ConfigService,
  ) {
    this.storageDir = config.get<string>('STORAGE_DIR', './storage');
  }

  // ---------- alcance por rol ----------
  private alcance(qb: SelectQueryBuilder<Expediente>, u: UsuarioAutenticado) {
    if (esPersonalArchivo(u)) return;
    if (u.rol === Rol.RESPONSABLE_UNIDAD) qb.andWhere('e.unidadProductoraId = :uu', { uu: u.unidadId });
    else qb.andWhere('e.sensibilidad = :pub', { pub: Sensibilidad.PUBLICO });
  }

  private puedeVer(e: Expediente, u: UsuarioAutenticado): boolean {
    if (esPersonalArchivo(u)) return true;
    if (u.rol === Rol.RESPONSABLE_UNIDAD) return e.unidadProductoraId === u.unidadId;
    return e.sensibilidad === Sensibilidad.PUBLICO;
  }

  private exigirEscritura(e: Expediente, u: UsuarioAutenticado) {
    if (esPersonalArchivo(u)) return;
    if (u.rol !== Rol.RESPONSABLE_UNIDAD || e.unidadProductoraId !== u.unidadId) {
      throw new ForbiddenException('No tienes permiso sobre este expediente');
    }
    if (e.estado !== EstadoExpediente.EN_GESTION) {
      throw new ForbiddenException('El expediente ya no está en archivo de gestión');
    }
  }

  // ---------- consulta ----------
  async listar(f: FiltroExpedientesDto, u: UsuarioAutenticado) {
    const qb = this.repo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.nodo', 'n')
      .leftJoinAndSelect('e.unidadProductora', 'un')
      .leftJoinAndSelect('e.caja', 'c')
      .where('e.activo = true');
    this.alcance(qb, u);
    if (f.q) {
      qb.andWhere(`(e.codigo ILIKE :q OR e.asunto ILIKE :q OR array_to_string(e.palabras_clave, ' ') ILIKE :q)`, { q: `%${f.q}%` });
    }
    if (f.unidadId) qb.andWhere('e.unidadProductoraId = :unidadId', { unidadId: f.unidadId });
    if (f.nodoId) qb.andWhere('e.nodoId = :nodoId', { nodoId: f.nodoId });
    if (f.estado) qb.andWhere('e.estado = :estado', { estado: f.estado });
    if (f.estadoFoliacion) qb.andWhere('e.estadoFoliacion = :ef', { ef: f.estadoFoliacion });
    if (f.fechaDesde) qb.andWhere('COALESCE(e.fechaFin, e.fechaInicio) >= :fd', { fd: f.fechaDesde });
    if (f.fechaHasta) qb.andWhere('e.fechaInicio <= :fh', { fh: f.fechaHasta });
    if (f.codigoTopografico) qb.andWhere('c.codigo ILIKE :ct', { ct: `%${f.codigoTopografico}%` });
    const [items, total] = await qb
      .orderBy('e.fechaCreacion', 'DESC')
      .skip((f.page - 1) * f.limit)
      .take(f.limit)
      .getManyAndCount();
    return paginado(items, total, f);
  }

  async obtener(id: string, u: UsuarioAutenticado): Promise<Expediente> {
    const e = await this.repo.findOne({ where: { id, activo: true }, relations: { nodo: true, unidadProductora: true, caja: true } });
    if (!e || !this.puedeVer(e, u)) throw new NotFoundException('Expediente no encontrado');
    return e;
  }

  // ---------- alta / edición ----------
  async crear(dto: CrearExpedienteDto, u: UsuarioAutenticado): Promise<Expediente> {
    const unidadId = u.rol === Rol.RESPONSABLE_UNIDAD ? u.unidadId : dto.unidadProductoraId;
    if (!unidadId) throw new BadRequestException('Indica la unidad productora');
    if (u.rol === Rol.RESPONSABLE_UNIDAD && dto.unidadProductoraId && dto.unidadProductoraId !== u.unidadId) {
      throw new ForbiddenException('Solo puedes crear expedientes de tu unidad');
    }
    if (dto.fechaFin && dto.fechaFin < dto.fechaInicio) throw new BadRequestException('La fecha fin no puede ser anterior a la fecha inicio');
    const nodo = await this.nodos.findOneBy({ id: dto.nodoId, activo: true });
    if (!nodo || (nodo.nivel !== NivelClasificacion.SERIE && nodo.nivel !== NivelClasificacion.SUBSERIE)) {
      throw new BadRequestException('El expediente debe pertenecer a una Serie o Subserie');
    }
    return this.ds.transaction(async (m) => {
      await m.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`${dto.nodoId}:${dto.gestion}`]);
      const r = await m.query('SELECT COALESCE(MAX(correlativo),0)+1 AS n FROM expedientes WHERE nodo_id=$1 AND gestion=$2', [dto.nodoId, dto.gestion]);
      const correlativo = Number(r[0].n);
      return m.save(
        m.create(Expediente, {
          codigo: `${nodo.codigo}/${dto.gestion}/${String(correlativo).padStart(4, '0')}`,
          nodoId: dto.nodoId,
          gestion: dto.gestion,
          correlativo,
          asunto: dto.asunto,
          unidadProductoraId: unidadId,
          fechaInicio: dto.fechaInicio,
          fechaFin: dto.fechaFin ?? null,
          sensibilidad: dto.sensibilidad ?? Sensibilidad.PUBLICO,
          palabrasClave: dto.palabrasClave ?? [],
        }),
      );
    });
  }

  async actualizar(id: string, dto: ActualizarExpedienteDto, u: UsuarioAutenticado): Promise<Expediente> {
    const e = await this.obtener(id, u);
    this.exigirEscritura(e, u);
    const inicio = dto.fechaInicio ?? e.fechaInicio;
    const fin = dto.fechaFin ?? e.fechaFin;
    if (fin && fin < inicio) throw new BadRequestException('La fecha fin no puede ser anterior a la fecha inicio');
    delete e.nodo; delete e.unidadProductora; delete e.caja;
    return this.repo.save(Object.assign(e, dto));
  }

  async desactivar(id: string, u: UsuarioAutenticado): Promise<void> {
    const e = await this.obtener(id, u);
    if (e.estado !== EstadoExpediente.EN_GESTION) throw new ConflictException('Solo se pueden dar de baja expedientes en archivo de gestión');
    await actualizar(this.repo.manager, Expediente, id, { activo: false });
  }

  // ---------- documentos ----------
  async documentos(expedienteId: string, u: UsuarioAutenticado) {
    await this.obtener(expedienteId, u);
    return this.docs.find({ where: { expedienteId, activo: true }, order: { orden: 'ASC' } });
  }

  async agregarDocumento(expedienteId: string, dto: CrearDocumentoDto, file: Express.Multer.File | undefined, u: UsuarioAutenticado) {
    const e = await this.obtener(expedienteId, u);
    this.exigirEscritura(e, u);
    if (e.estadoFoliacion === EstadoFoliacion.FOLIADO) {
      throw new ConflictException('El expediente está foliado; el archivista debe reabrir la foliación para agregar documentos');
    }
    if (!file) throw new BadRequestException('Adjunta el PDF en el campo "archivo"');
    if (file.buffer.subarray(0, 5).toString('latin1') !== '%PDF-') throw new BadRequestException('El archivo no es un PDF válido');
    if (dto.fojaFin < dto.fojaInicio) throw new BadRequestException('La foja fin no puede ser menor que la foja inicio');

    const existentes = await this.docs.find({ where: { expedienteId, activo: true }, order: { orden: 'ASC' } });
    const v = validarFoliado([...existentes.map((d) => ({ inicio: d.fojaInicio, fin: d.fojaFin })), { inicio: dto.fojaInicio, fin: dto.fojaFin }]);
    if (!v.ok) throw new BadRequestException(v.errores.join('. '));

    const hash = createHash('sha256').update(file.buffer).digest('hex');
    const relativa = join('expedientes', expedienteId, `${hash}.pdf`);
    await mkdir(join(this.storageDir, 'expedientes', expedienteId), { recursive: true });
    await writeFile(join(this.storageDir, relativa), file.buffer);

    return this.ds.transaction(async (m) => {
      const doc = await m.save(
        m.create(DocumentoExpediente, {
          expedienteId,
          titulo: dto.titulo,
          tipoDocumento: dto.tipoDocumento ?? null,
          fechaDocumento: dto.fechaDocumento ?? null,
          orden: existentes.length + 1,
          fojaInicio: dto.fojaInicio,
          fojaFin: dto.fojaFin,
          archivoPath: relativa,
          nombreOriginal: file.originalname,
          tamano: file.size,
          hashSha256: hash,
        }),
      );
      await actualizar(m, Expediente, expedienteId, { fojaInicio: 1, fojaFin: dto.fojaFin, estadoFoliacion: EstadoFoliacion.EN_PROCESO });
      return doc;
    });
  }

  /** Solo se puede retirar el último documento (para no dejar vacíos en la foliación). */
  async eliminarUltimoDocumento(expedienteId: string, u: UsuarioAutenticado): Promise<void> {
    const e = await this.obtener(expedienteId, u);
    this.exigirEscritura(e, u);
    if (e.estadoFoliacion === EstadoFoliacion.FOLIADO) throw new ConflictException('Expediente foliado: reabre la foliación primero');
    const lista = await this.docs.find({ where: { expedienteId, activo: true }, order: { orden: 'DESC' }, take: 2 });
    if (!lista.length) throw new NotFoundException('El expediente no tiene documentos');
    await this.ds.transaction(async (m) => {
      await actualizar(m, DocumentoExpediente, lista[0].id, { activo: false });
      const previo = lista[1];
      await actualizar(m, Expediente, expedienteId, previo
        ? { fojaFin: previo.fojaFin }
        : { fojaInicio: null, fojaFin: null, estadoFoliacion: EstadoFoliacion.SIN_FOLIAR });
    });
  }

  private async documentoVisible(docId: string, u: UsuarioAutenticado): Promise<DocumentoExpediente> {
    const d = await this.docs.findOneBy({ id: docId, activo: true });
    if (!d) throw new NotFoundException('Documento no encontrado');
    await this.obtener(d.expedienteId, u); // valida alcance
    return d;
  }

  async leerArchivo(docId: string, u: UsuarioAutenticado) {
    const d = await this.documentoVisible(docId, u);
    try {
      return { buffer: await readFile(join(this.storageDir, d.archivoPath)), nombre: d.nombreOriginal };
    } catch {
      throw new NotFoundException('El archivo digital no se encuentra en el almacenamiento');
    }
  }

  /** Recalcula el SHA-256 del PDF almacenado y lo compara con el registrado al cargarlo. */
  async verificarIntegridad(docId: string, u: UsuarioAutenticado) {
    const d = await this.documentoVisible(docId, u);
    let actual: string | null = null;
    try {
      actual = createHash('sha256').update(await readFile(join(this.storageDir, d.archivoPath))).digest('hex');
    } catch { /* archivo ausente */ }
    return {
      documentoId: d.id,
      integro: actual === d.hashSha256,
      hashRegistrado: d.hashSha256,
      hashActual: actual,
      verificadoEn: new Date().toISOString(),
    };
  }

  // ---------- foliación ----------
  async validarFoliacion(id: string, u: UsuarioAutenticado) {
    await this.obtener(id, u);
    const lista = await this.docs.find({ where: { expedienteId: id, activo: true } });
    return { documentos: lista.length, ...validarFoliado(lista.map((d) => ({ inicio: d.fojaInicio, fin: d.fojaFin }))) };
  }

  async foliar(id: string, u: UsuarioAutenticado): Promise<Expediente> {
    const e = await this.obtener(id, u);
    const v = await this.validarFoliacion(id, u);
    if (!v.documentos) throw new BadRequestException('El expediente no tiene documentos para foliar');
    if (!v.ok) throw new BadRequestException(v.errores.join('. '));
    e.estadoFoliacion = EstadoFoliacion.FOLIADO;
    delete e.nodo; delete e.unidadProductora; delete e.caja;
    return this.repo.save(e);
  }

  async reabrirFoliacion(id: string, u: UsuarioAutenticado): Promise<Expediente> {
    const e = await this.obtener(id, u);
    e.estadoFoliacion = EstadoFoliacion.EN_PROCESO;
    delete e.nodo; delete e.unidadProductora; delete e.caja;
    return this.repo.save(e);
  }

  /** Re-foliación: renumera todos los documentos de forma continua desde la foja 1. */
  async refoliar(id: string, u: UsuarioAutenticado): Promise<Expediente> {
    await this.obtener(id, u);
    const lista = await this.docs.find({ where: { expedienteId: id, activo: true }, order: { orden: 'ASC' } });
    if (!lista.length) throw new BadRequestException('El expediente no tiene documentos');
    await this.ds.transaction(async (m) => {
      let foja = 1;
      for (const d of lista) {
        const paginas = d.fojaFin - d.fojaInicio + 1;
        await actualizar(m, DocumentoExpediente, d.id, { fojaInicio: foja, fojaFin: foja + paginas - 1 });
        foja += paginas;
      }
      await actualizar(m, Expediente, id, { fojaInicio: 1, fojaFin: foja - 1, estadoFoliacion: EstadoFoliacion.FOLIADO });
    });
    return this.obtener(id, u);
  }

  async limpiarAlmacenamiento(expedienteId: string) {
    await rm(join(this.storageDir, 'expedientes', expedienteId), { recursive: true, force: true });
  }
}
