import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NivelClasificacion, ORDEN_NIVELES } from '../common/enums/archivo.enums.js';
import { Expediente } from '../expedientes/expediente.entity.js';
import { ActualizarNodoDto, CrearActaDto, CrearNodoDto, TrdDto } from './clasificacion.dto.js';
import { ActaValoracion, NodoClasificacion, TablaRetencion } from './clasificacion.entities.js';

export interface NodoArbol extends NodoClasificacion {
  hijos: NodoArbol[];
}

@Injectable()
export class ClasificacionService {
  constructor(
    @InjectRepository(NodoClasificacion) private readonly nodos: Repository<NodoClasificacion>,
    @InjectRepository(TablaRetencion) private readonly trds: Repository<TablaRetencion>,
    @InjectRepository(ActaValoracion) private readonly actas: Repository<ActaValoracion>,
    @InjectRepository(Expediente) private readonly expedientes: Repository<Expediente>,
  ) {}

  async arbol(): Promise<NodoArbol[]> {
    const [todos, trds] = await Promise.all([
      this.nodos.find({ where: { activo: true }, order: { codigo: 'ASC' } }),
      this.trds.find({ where: { activo: true } }),
    ]);
    const porNodo = new Map(trds.map((t) => [t.nodoId, t]));
    const mapa = new Map<string, NodoArbol>();
    for (const n of todos) mapa.set(n.id, { ...n, trd: porNodo.get(n.id) ?? null, hijos: [] });
    const raices: NodoArbol[] = [];
    for (const n of mapa.values()) {
      const padre = n.padreId ? mapa.get(n.padreId) : undefined;
      (padre ? padre.hijos : raices).push(n);
    }
    return raices;
  }

  /** Series y subseries (las únicas donde se pueden abrir expedientes), con su TRD. */
  async series() {
    const nodos = await this.nodos
      .createQueryBuilder('n')
      .where('n.activo = true AND n.nivel IN (:...niveles)', { niveles: [NivelClasificacion.SERIE, NivelClasificacion.SUBSERIE] })
      .orderBy('n.codigo')
      .getMany();
    return nodos;
  }

  async crear(dto: CrearNodoDto): Promise<NodoClasificacion> {
    if (await this.nodos.existsBy({ codigo: dto.codigo })) throw new ConflictException('Ya existe un nodo con ese código');
    const idx = ORDEN_NIVELES.indexOf(dto.nivel);
    if (dto.nivel === NivelClasificacion.FONDO) {
      if (dto.padreId) throw new BadRequestException('Un Fondo no puede tener padre');
    } else {
      if (!dto.padreId) throw new BadRequestException(`${dto.nivel} requiere un nodo padre`);
      const padre = await this.nodos.findOneBy({ id: dto.padreId, activo: true });
      if (!padre) throw new NotFoundException('Nodo padre no encontrado');
      if (ORDEN_NIVELES.indexOf(padre.nivel) >= idx) {
        throw new BadRequestException(`Un ${dto.nivel} debe colgar de un nivel superior (${padre.nivel} no es válido)`);
      }
      if (dto.nivel === NivelClasificacion.SUBSERIE && padre.nivel !== NivelClasificacion.SERIE) {
        throw new BadRequestException('Una Subserie debe colgar de una Serie');
      }
    }
    return this.nodos.save(this.nodos.create(dto));
  }

  async actualizar(id: string, dto: ActualizarNodoDto): Promise<NodoClasificacion> {
    const n = await this.nodos.findOneBy({ id, activo: true });
    if (!n) throw new NotFoundException('Nodo no encontrado');
    if (dto.codigo && dto.codigo !== n.codigo && (await this.nodos.existsBy({ codigo: dto.codigo }))) {
      throw new ConflictException('Ya existe un nodo con ese código');
    }
    return this.nodos.save(Object.assign(n, dto));
  }

  async desactivar(id: string): Promise<void> {
    const n = await this.nodos.findOneBy({ id, activo: true });
    if (!n) throw new NotFoundException('Nodo no encontrado');
    if (await this.nodos.existsBy({ padreId: id, activo: true })) throw new ConflictException('El nodo tiene elementos dependientes');
    if (await this.expedientes.existsBy({ nodoId: id, activo: true })) throw new ConflictException('Existen expedientes en esta serie');
    n.activo = false;
    await this.nodos.save(n);
  }

  async definirTrd(nodoId: string, dto: TrdDto): Promise<TablaRetencion> {
    const n = await this.nodos.findOneBy({ id: nodoId, activo: true });
    if (!n) throw new NotFoundException('Nodo no encontrado');
    if (n.nivel !== NivelClasificacion.SERIE && n.nivel !== NivelClasificacion.SUBSERIE) {
      throw new BadRequestException('La TRD solo se define para Series y Subseries');
    }
    const actual = await this.trds.findOneBy({ nodoId });
    return this.trds.save(Object.assign(actual ?? this.trds.create({ nodoId }), dto));
  }

  listarActas() {
    return this.actas.find({ where: { activo: true }, relations: { nodo: true }, order: { fecha: 'DESC' } });
  }

  async crearActa(dto: CrearActaDto): Promise<ActaValoracion> {
    if (await this.actas.existsBy({ numero: dto.numero })) throw new ConflictException('Ya existe un acta con ese número');
    if (!(await this.nodos.existsBy({ id: dto.nodoId, activo: true }))) throw new NotFoundException('Nodo no encontrado');
    return this.actas.save(this.actas.create(dto));
  }
}
