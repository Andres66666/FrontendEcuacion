import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  EquipoHerramienta,
  GastoOperacion,
  GastosGenerales,
  ManoDeObra,
  Materiales,
  Modulo,
  Proyecto,
} from '../models/modelosProyectos';
import { BehaviorSubject, forkJoin, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ServiciosProyectos {
  /*   private apiUrl = 'http://localhost:8000/api/'; */
  private apiUrl = 'https://backendecuacion.onrender.com/api/';

  totalManoObraActual = 0; // o private _totalManoObra: number

  constructor(private http: HttpClient) {}
  // ← HACER PÚBLICO: Método para obtener el ID del usuario logueado
  getUsuarioId(): number {
    const usuario = localStorage.getItem('usuarioLogueado');
    if (usuario) {
      const parsed = JSON.parse(usuario);
      return parsed.id || 0;
    }
    return 0;
  }
  getUsuarioLogueado(): any {
    const usuario = localStorage.getItem('usuarioLogueado');
    return usuario ? JSON.parse(usuario) : null;
  }

  getProyecto(): Observable<Proyecto[]> {
    let params = new HttpParams();
    const usuarioId = this.getUsuarioId();
    if (usuarioId) {
      params = params.set('usuario_id', usuarioId.toString());
    }
    return this.http.get<Proyecto[]>(`${this.apiUrl}IdGeneral/`, { params });
  }

  getProyectoID(id: number): Observable<Proyecto> {
    let params = new HttpParams();
    const usuarioId = this.getUsuarioId();
    if (usuarioId) {
      params = params.set('usuario_id', usuarioId.toString());
    }
    return this.http.get<Proyecto>(`${this.apiUrl}IdGeneral/${id}/`, {
      params,
    });
  }

  getProyectoCompleto(idProyecto: number): Observable<{
    modulos: Modulo[];
    gastos: GastoOperacion[];
    totales: { [id: string]: number };
  }> {
    return forkJoin({
      modulos: this.getModulosPorProyecto(idProyecto),
      gastos: this.getGastoOperacionID(idProyecto),
      totales: this.getGastosGeneralesPorProyecto(idProyecto),
    });
  }
  createProyecto(gasto: Partial<Proyecto>): Observable<Proyecto> {
    return this.http.post<Proyecto>(`${this.apiUrl}IdGeneral/`, gasto);
  }
  updateProyecto(identificador: Proyecto): Observable<Proyecto> {
    return this.http.put<Proyecto>(
      `${this.apiUrl}IdGeneral/${identificador.id_proyecto}/`,
      identificador
    );
  }
  deleteProyecto(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}IdGeneral/${id}/`);
  }

  // --- Módulos ---
  getModulosPorProyecto(idProyecto: number): Observable<Modulo[]> {
    return this.http.get<Modulo[]>(
      `${this.apiUrl}modulos/?proyecto=${idProyecto}`
    );
  }
  getModulosID(id: number): Observable<Modulo> {
    return this.http.get<Modulo>(`${this.apiUrl}modulos/${id}/`);
  }
  createModulo(modulo: Partial<Modulo>): Observable<Modulo> {
    return this.http.post<Modulo>(`${this.apiUrl}modulos/`, modulo);
  }

  updateModulo(id: number, modulo: Partial<Modulo>): Observable<Modulo> {
    return this.http.put<Modulo>(`${this.apiUrl}modulos/${id}/`, modulo); // Agrega / al final para consistencia
  }

  deleteModulo(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}modulos/${id}/`);
  }

  // --- Gastos de Operación ---
  getGastosOperacion(): Observable<GastoOperacion[]> {
    return this.http.get<GastoOperacion[]>(`${this.apiUrl}GastosOperaciones/`);
  }

  getGastoOperacionID(id: number): Observable<GastoOperacion[]> {
    return this.http.get<GastoOperacion[]>(
      `${this.apiUrl}GastosOperaciones/?identificador=${id}`
    );
  }

  getUnidadesGastoOperacion(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}GastosOperaciones/unidades/`);
  }
  getGastosGeneralesPorProyectoFull(idProyecto: number) {
    return this.http.get<GastosGenerales[]>(
      `${this.apiUrl}gastos_generales/?proyecto=${idProyecto}`
    );
  }

  deleteGastoOperacion(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}GastosOperaciones/${id}/`);
  }

  moverGastoAModulo(
    gastoId: number,
    moduloId: number | null
  ): Observable<GastoOperacion> {
    const payload = { modulo_id: moduloId };
    return this.http.patch<GastoOperacion>(
      `${this.apiUrl}GastosOperaciones/${gastoId}/`,
      payload
    );
  }
  createGastoOperacion(gastos: any[]): Observable<any> {
    return this.http.post(`${this.apiUrl}GastosOperaciones/`, gastos);
  }

  updateGastoOperacion(gasto: any): Observable<any> {
    return this.http.put(`${this.apiUrl}GastosOperaciones/${gasto.id}/`, gasto);
  }

  // ==================
  // === Materiales ===
  // ==================

  getMateriales(): Observable<Materiales[]> {
    return this.http.get<Materiales[]>(`${this.apiUrl}materiales/`);
  }
  getMaterialesID(id: number): Observable<Materiales> {
    return this.http.get<Materiales>(`${this.apiUrl}materiales/${id}/`);
  }
  getMaterialesIDGasto(id_gasto_operacion: number): Observable<Materiales[]> {
    return this.http.get<Materiales[]>(
      `${this.apiUrl}materiales/?id_gasto_operacion=${id_gasto_operacion}`
    );
  }
  getUnidadesMateriales(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}materiales/unidades/`);
  }
  actualizarPrecioDescripcion(
    id_gasto_operacion: number,
    descripcion: string,
    precio_unitario: number
  ): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}materiales/actualizar_precio_descripcion/`,
      { id_gasto_operacion, descripcion, precio_unitario }
    );
  }
  createMaterial(m: Materiales): Observable<Materiales> {
    return this.http.post<Materiales>(`${this.apiUrl}materiales/`, m);
  }
  updateMaterial(m: Materiales): Observable<Materiales> {
    return this.http.put<Materiales>(`${this.apiUrl}materiales/${m.id}/`, m);
  }
  deleteMaterial(id: number): Observable<Materiales> {
    return this.http.delete<Materiales>(`${this.apiUrl}materiales/${id}/`);
  }

  getCatalogoMaterialesPorProyecto(
    id_gasto_operacion: number
  ): Observable<Materiales[]> {
    return this.http.get<Materiales[]>(
      `${this.apiUrl}materiales/ultimos_precios/?proyecto=${id_gasto_operacion}`
    );
  }
  updatePrecioUnitarioProyecto(
    id_proyecto: number,
    descripcion: string,
    precio_unitario: number
  ) {
    return this.http.put(`/api/materiales/precio-proyecto`, {
      id_proyecto,
      descripcion,
      precio_unitario,
    });
  }

  // ====================
  // === Mano de Obra ===
  // ====================
  getManoDeObra(): Observable<ManoDeObra[]> {
    return this.http.get<ManoDeObra[]>(`${this.apiUrl}mano_de_obra/`);
  }
  getManoDeObraID(id: number): Observable<ManoDeObra> {
    return this.http.get<ManoDeObra>(`${this.apiUrl}mano_de_obra/${id}/`);
  }
  getManoDeObraIDGasto(id_gasto_operacion: number): Observable<ManoDeObra[]> {
    return this.http.get<ManoDeObra[]>(
      `${this.apiUrl}mano_de_obra/?id_gasto_operacion=${id_gasto_operacion}`
    );
  }
  getUnidadesManoDeObra(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}mano_de_obra/unidades/`);
  }

  actualizarPrecioDescripcionManoDeObra(
    id_gasto_operacion: number,
    descripcion: string,
    precio_unitario: number
  ): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}mano_de_obra/actualizar_precio_descripcion/`,
      { id_gasto_operacion, descripcion, precio_unitario }
    );
  }
  createManoDeObra(m: ManoDeObra): Observable<ManoDeObra> {
    return this.http.post<ManoDeObra>(`${this.apiUrl}mano_de_obra/`, m);
  }
  updateManoDeObra(m: ManoDeObra): Observable<ManoDeObra> {
    return this.http.put<ManoDeObra>(`${this.apiUrl}mano_de_obra/${m.id}/`, m);
  }
  deleteManoDeObra(id: number): Observable<ManoDeObra> {
    return this.http.delete<ManoDeObra>(`${this.apiUrl}mano_de_obra/${id}/`);
  }
  // servicios-proyectos.ts (cambio en el método getCatalogoManoDeObraPorProyecto)
  getCatalogoManoDeObraPorProyecto(
    id_proyecto: number
  ): Observable<ManoDeObra[]> {
    return this.http.get<ManoDeObra[]>(
      `${this.apiUrl}mano_de_obra/ultimos_precios/?proyecto=${id_proyecto}`
    );
  }
  // ==========================
  // === Equipo Herramienta ===
  // ==========================
  getEquiposHerramientas(): Observable<EquipoHerramienta[]> {
    return this.http.get<EquipoHerramienta[]>(
      `${this.apiUrl}equipo_herramienta/`
    );
  }
  getEquipoHerramientaID(id: number): Observable<EquipoHerramienta> {
    return this.http.get<EquipoHerramienta>(
      `${this.apiUrl}equipo_herramienta/${id}/`
    );
  }

  getEquipoHerramientas(
    id_gasto_operacion: number
  ): Observable<EquipoHerramienta[]> {
    return this.http.get<EquipoHerramienta[]>(
      `${this.apiUrl}equipo_herramienta/?id_gasto_operacion=${id_gasto_operacion}`
    );
  }
  getUnidadesEquipoHerramienta(): Observable<string[]> {
    return this.http.get<string[]>(
      `${this.apiUrl}equipo_herramienta/unidades/`
    );
  }

  actualizarPrecioDescripcionEquipoHerramienta(
    id_gasto_operacion: number,
    descripcion: string,
    precio_unitario: number
  ): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}equipo_herramienta/actualizar_precio_descripcion/`,
      { id_gasto_operacion, descripcion, precio_unitario }
    );
  }
  createEquipoHerramienta(e: EquipoHerramienta): Observable<EquipoHerramienta> {
    return this.http.post<EquipoHerramienta>(
      `${this.apiUrl}equipo_herramienta/`,
      e
    );
  }
  updateEquipoHerramienta(e: EquipoHerramienta): Observable<EquipoHerramienta> {
    return this.http.put<EquipoHerramienta>(
      `${this.apiUrl}equipo_herramienta/${e.id}/`,
      e
    );
  }
  deleteEquipoHerramienta(id: number): Observable<EquipoHerramienta> {
    return this.http.delete<EquipoHerramienta>(
      `${this.apiUrl}equipo_herramienta/${id}/`
    );
  }
  // servicios-proyectos.ts (cambios en el método getCatalogoEquipoHerramientaPorProyecto)
  getCatalogoEquipoHerramientaPorProyecto(
    id_proyecto: number
  ): Observable<EquipoHerramienta[]> {
    return this.http.get<EquipoHerramienta[]>(
      `${this.apiUrl}equipo_herramienta/ultimos_precios/?proyecto=${id_proyecto}`
    );
  }

  // === Gastos Generales y Administrativos === suma de 1+2+3 * 0.12 %
  getGastos(): Observable<GastosGenerales[]> {
    return this.http.get<GastosGenerales[]>(`${this.apiUrl}gastos_generales/`);
  }
  getGastosGenerales(
    id_gasto_operacion: number
  ): Observable<GastosGenerales[]> {
    return this.http.get<GastosGenerales[]>(
      `${this.apiUrl}gastos_generales/?id_gasto_operacion=${id_gasto_operacion}`
    );
  }
  getGastosGeneralesPorProyecto(
    idProyecto: number
  ): Observable<{ [id: string]: number }> {
    return this.http.get<{ [id: string]: number }>(
      `${this.apiUrl}gastos_generales/totals_por_proyecto/?proyecto=${idProyecto}`
    );
  }

  createGasto(g: GastosGenerales): Observable<GastosGenerales> {
    return this.http.post<GastosGenerales>(
      `${this.apiUrl}gastos_generales/`,
      g
    );
  }

  updateGasto(g: GastosGenerales): Observable<GastosGenerales> {
    return this.http.put<GastosGenerales>(
      `${this.apiUrl}gastos_generales/${g.id}/`,
      g
    );
  }

  //  =========== seccion 4 Mandar Totales   ==============
  private totalMaterialesSubject = new BehaviorSubject<number>(0);
  totalMateriales$ = this.totalMaterialesSubject.asObservable();

  private totalManoObraSubject = new BehaviorSubject<number>(0);
  totalManoObra$ = this.totalManoObraSubject.asObservable();

  private totalEquiposSubject = new BehaviorSubject<number>(0);
  totalEquipos$ = this.totalEquiposSubject.asObservable();
  // === Materiales ===
  setTotalMateriales(total: number) {
    this.totalMaterialesSubject.next(total);
  }
  // === Mano de Obra ===
  setTotalManoObra(total: number) {
    this.totalManoObraSubject.next(total);
  }
  // === Equipos y Herramientas ===
  setTotalEquipos(total: number) {
    this.totalEquiposSubject.next(total);
  }
}
