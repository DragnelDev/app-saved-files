import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import PDFDocument from 'pdfkit';
import type { UsuarioAutenticado } from '../common/decorators/current-user.decorator.js';
import { DisposicionService } from '../disposicion/disposicion.service.js';
import { ExpedientesService } from '../expedientes/expedientes.service.js';
import { PrestamosService } from '../prestamos/prestamos.service.js';
import { TransferenciasService } from '../transferencias/transferencias.service.js';
import { UbicacionesService } from '../ubicaciones/ubicaciones.service.js';

type Doc = InstanceType<typeof PDFDocument>;

@Injectable()
export class ReportesService {
  private readonly entidad: string;

  constructor(
    config: ConfigService,
    private readonly expedientes: ExpedientesService,
    private readonly ubicaciones: UbicacionesService,
    private readonly prestamos: PrestamosService,
    private readonly transferencias: TransferenciasService,
    private readonly disposicion: DisposicionService,
  ) {
    this.entidad = config.get<string>('ENTIDAD_NOMBRE', 'GOBIERNO AUTÓNOMO MUNICIPAL');
  }

  private async pdf(opciones: ConstructorParameters<typeof PDFDocument>[0], dibujar: (d: Doc) => void | Promise<void>): Promise<Buffer> {
    const doc = new PDFDocument(opciones);
    const trozos: Buffer[] = [];
    doc.on('data', (t: Buffer) => trozos.push(t));
    const fin = new Promise<Buffer>((ok) => doc.on('end', () => ok(Buffer.concat(trozos))));
    await dibujar(doc);
    doc.end();
    return fin;
  }

  private encabezado(d: Doc, titulo: string, codigo?: string) {
    d.font('Helvetica-Bold').fontSize(11).text(this.entidad, { align: 'center' });
    d.font('Helvetica').fontSize(9).text('ARCHIVO CENTRAL — Formato conforme a lineamientos del ABNB', { align: 'center' });
    d.moveDown(0.8).font('Helvetica-Bold').fontSize(15).text(titulo, { align: 'center' });
    if (codigo) d.font('Helvetica').fontSize(11).text(codigo, { align: 'center' });
    d.moveDown(0.8);
    d.moveTo(d.page.margins.left, d.y).lineTo(d.page.width - d.page.margins.right, d.y).stroke('#94a3b8');
    d.moveDown(0.8);
  }

  private campo(d: Doc, etiqueta: string, valor: string | number | null | undefined) {
    d.font('Helvetica-Bold').fontSize(10).text(`${etiqueta}: `, { continued: true });
    d.font('Helvetica').text(String(valor ?? '—'));
  }

  private firmas(d: Doc, izquierda: string, derecha: string) {
    const y = Math.max(d.y + 60, 650);
    const w = (d.page.width - d.page.margins.left - d.page.margins.right) / 2 - 20;
    d.fontSize(9);
    d.moveTo(d.page.margins.left, y).lineTo(d.page.margins.left + w, y).stroke();
    d.text(izquierda, d.page.margins.left, y + 4, { width: w, align: 'center' });
    const x2 = d.page.margins.left + w + 40;
    d.moveTo(x2, y).lineTo(x2 + w, y).stroke();
    d.text(derecha, x2, y + 4, { width: w, align: 'center' });
  }

  async caratula(expedienteId: string, u: UsuarioAutenticado): Promise<Buffer> {
    const e = await this.expedientes.obtener(expedienteId, u);
    const docs = await this.expedientes.documentos(expedienteId, u);
    const ruta = e.cajaId ? await this.ubicaciones.rutaDe((await this.ubicaciones.detalleCaja(e.cajaId)).baldaId) : null;
    return this.pdf({ size: 'A4', margin: 50 }, (d) => {
      this.encabezado(d, 'CARÁTULA DE EXPEDIENTE', e.codigo);
      this.campo(d, 'Serie documental', `${e.nodo?.codigo} — ${e.nodo?.nombre}`);
      this.campo(d, 'Unidad productora', e.unidadProductora?.nombre);
      this.campo(d, 'Gestión', e.gestion);
      this.campo(d, 'Fechas extremas', `${e.fechaInicio} a ${e.fechaFin ?? 'vigente'}`);
      this.campo(d, 'Foliación', e.fojaFin ? `fojas ${e.fojaInicio} a ${e.fojaFin} (${e.estadoFoliacion})` : 'Sin foliar');
      this.campo(d, 'Ubicación topográfica', e.caja ? `${e.caja.codigo} — ${ruta}${e.carpeta ? ` — carpeta ${e.carpeta}` : ''}` : 'En archivo de gestión');
      this.campo(d, 'Nivel de acceso', e.sensibilidad);
      d.moveDown(0.5).font('Helvetica-Bold').fontSize(10).text('Asunto:').font('Helvetica').text(e.asunto);
      d.moveDown().font('Helvetica-Bold').text('Contenido (documentos y fojas)');
      d.font('Helvetica').fontSize(9);
      if (!docs.length) d.text('Sin documentos registrados.');
      for (const x of docs) d.text(`${x.orden}. ${x.titulo} — fs. ${x.fojaInicio}-${x.fojaFin}`);
      this.firmas(d, 'Responsable de la unidad', 'Archivista');
    });
  }

  async etiquetaCaja(cajaId: string): Promise<Buffer> {
    const caja = await this.ubicaciones.detalleCaja(cajaId);
    const qr = await this.ubicaciones.qrCaja(cajaId);
    return this.pdf({ size: [300, 200], margin: 14 }, (d) => {
      d.font('Helvetica-Bold').fontSize(8).text(this.entidad, { width: 170 });
      d.fontSize(20).text(caja.codigo, 14, 40, { width: 170 });
      d.font('Helvetica').fontSize(9).text(`Ubicación: ${caja.ruta}`, 14, 72, { width: 170 });
      d.text(`Carpetas: ${caja.expedientes.length}`, 14, 100, { width: 170 });
      if (caja.descripcion) d.text(caja.descripcion, 14, 116, { width: 170, height: 60 });
      d.image(qr, 190, 40, { width: 96 });
    });
  }

  async actaPrestamo(id: string, u: UsuarioAutenticado): Promise<Buffer> {
    const p = await this.prestamos.obtener(id, u);
    const items = p.detalles ?? [];
    return this.pdf({ size: 'A4', margin: 50 }, (d) => {
      this.encabezado(d, 'ACTA DE PRÉSTAMO DOCUMENTAL', p.codigo);
      this.campo(d, 'Solicitante', `${p.solicitanteNombre} (${p.tipoSolicitante})${p.unidadSolicitante ? ` — ${p.unidadSolicitante.nombre}` : ''}`);
      this.campo(d, 'Motivo', p.motivo);
      this.campo(d, 'Fecha de solicitud', p.fechaSolicitud);
      this.campo(d, 'Fecha de préstamo', p.fechaPrestamo);
      this.campo(d, 'Devolución prevista', p.fechaDevolucionPrevista);
      this.campo(d, 'Estado', p.estado);
      d.moveDown(0.5).font('Helvetica-Bold').fontSize(10).text(`Expedientes prestados (${items.length})`);
      d.font('Helvetica').fontSize(9);
      items.forEach((it, i) => {
        const e = it.expediente!;
        const fojas = it.fojasEntregadas ?? e.fojaFin;
        d.text(`${i + 1}. ${e.codigo} — ${e.asunto}`, { continued: false });
        d.text(`     Fojas: ${fojas != null ? `1 a ${fojas} (${fojas} fs.)` : 'pendiente de entrega'}${it.fechaDevolucionReal ? ` · devuelto el ${it.fechaDevolucionReal}` : ''}`);
      });
      d.moveDown().font('Helvetica-Bold').fontSize(10).text('Responsabilidad de custodia');
      d.font('Helvetica').fontSize(9).text(
        'El solicitante recibe los expedientes físicos con la cantidad de fojas indicada y asume la custodia temporal, ' +
          'comprometiéndose a conservarlos íntegros, sin extraer, alterar ni foliar nuevamente ninguna foja, y a devolverlos en la fecha prevista. ' +
          'Cualquier pérdida, deterioro o alteración será de su exclusiva responsabilidad, conforme a la Ley N° 1178 (SAFCO).',
        { align: 'justify' },
      );
      this.firmas(d, 'Entregué conforme — Archivista', 'Recibí conforme — Solicitante');
    });
  }

  async inventarioTransferencia(id: string, u: UsuarioAutenticado): Promise<Buffer> {
    const t = await this.transferencias.obtener(id, u);
    return this.pdf({ size: 'A4', margin: 40, layout: 'landscape' }, (d) => {
      this.encabezado(d, 'ACTA E INVENTARIO DE TRANSFERENCIA DOCUMENTAL', t.codigo);
      this.campo(d, 'Unidad de origen', t.unidadOrigen?.nombre);
      this.campo(d, 'Estado', t.estado);
      this.campo(d, 'Fecha de envío', t.fechaEnvio?.toISOString().slice(0, 10));
      this.campo(d, 'Fecha de recepción', t.fechaRecepcion?.toISOString().slice(0, 10));
      d.moveDown(0.5);
      const col = [30, 150, 250, 110, 60, 110, 70];
      const cab = ['N°', 'Código', 'Asunto', 'Fechas extremas', 'Fojas', 'Caja / carpeta', 'Recepción'];
      const fila = (celdas: string[], negrita = false) => {
        const y = d.y;
        let x = d.page.margins.left;
        d.font(negrita ? 'Helvetica-Bold' : 'Helvetica').fontSize(8);
        celdas.forEach((c, i) => { d.text(c, x, y, { width: col[i] - 4, height: 22, ellipsis: true }); x += col[i]; });
        d.y = y + 24;
      };
      fila(cab, true);
      (t.detalles ?? []).forEach((det, i) => {
        if (d.y > d.page.height - 90) d.addPage();
        const e = det.expediente!;
        fila([
          String(i + 1), e.codigo, e.asunto, `${e.fechaInicio} / ${e.fechaFin ?? '—'}`,
          e.fojaFin ? `1-${e.fojaFin}` : '—', det.cajaId ? `${det.cajaId.slice(0, 8)} / ${det.carpeta ?? '—'}` : '—',
          det.recibido === null ? 'Pendiente' : det.recibido ? 'Recibido' : 'No recibido',
        ]);
      });
      if (t.observaciones) { d.moveDown().font('Helvetica').fontSize(9).text(`Observaciones: ${t.observaciones}`); }
      this.firmas(d, 'Responsable de la unidad (entrega)', 'Archivista (recibe)');
    });
  }

  async actaDisposicion(id: string): Promise<Buffer> {
    const p = await this.disposicion.obtener(id);
    return this.pdf({ size: 'A4', margin: 40 }, (d) => {
      this.encabezado(d, 'PROPUESTA / ACTA DE DISPOSICIÓN FINAL', p.codigo);
      this.campo(d, 'Disposición', p.tipo.replaceAll('_', ' '));
      this.campo(d, 'Estado', p.estado);
      this.campo(d, 'Acta de la Comisión de Valoración', p.actaNumero ? `${p.actaNumero} del ${p.actaFecha}` : 'pendiente');
      this.campo(d, 'Presentada', p.fechaPresentacion?.toISOString().slice(0, 10));
      this.campo(d, 'Ejecutada', p.fechaEjecucion?.toISOString().slice(0, 10));
      d.moveDown(0.5).font('Helvetica-Bold').fontSize(10).text('Justificación').font('Helvetica').text(p.justificacion, { align: 'justify' });
      if (p.observacionesComision) d.moveDown(0.5).font('Helvetica-Bold').text('Observaciones de la Comisión').font('Helvetica').text(p.observacionesComision);
      d.moveDown().font('Helvetica-Bold').fontSize(10).text(`Expedientes (${p.detalles?.length ?? 0})`);
      d.font('Helvetica').fontSize(8.5);
      (p.detalles ?? []).forEach((x, i) => {
        if (d.y > d.page.height - 120) d.addPage();
        const e = x.expediente!;
        d.text(`${i + 1}. ${e.codigo} — ${e.asunto} (${e.fechaInicio} / ${e.fechaFin ?? '—'})${x.resolucion ? ` → ${x.resolucion}` : ''}`);
      });
      this.firmas(d, 'Archivista', 'Presidente de la Comisión de Valoración');
    });
  }
}
