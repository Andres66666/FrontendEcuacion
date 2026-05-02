import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject, throwError } from 'rxjs';
import { tap } from 'rxjs/operators';
import {
  EquipoHerramienta,
  GastoOperacion,
  GastosGenerales,
  ManoDeObra,
  Materiales,
  Modulo,
  Proyecto,
} from '../models/modelosProyectos';
export type MaterialPayload = Omit<Materiales, 'id' | 'total'> & {
  id?: number;
};

@Injectable({
  providedIn: 'root',
})
export class ServiciosProyectos {
  /* private apiUrl = 'http://localhost:8000/api/'; */
  private apiUrl = 'https://backendecuacion.onrender.com/api/';

  private dataChanged = new BehaviorSubject<void>(undefined);
  dataChanged$ = this.dataChanged.asObservable();

  modulosCambiados = new Subject<void>();
  modulosChanged = new BehaviorSubject<void>(undefined);

  private totalMaterialesSubject = new BehaviorSubject<number>(0);
  totalMateriales$ = this.totalMaterialesSubject.asObservable();

  private totalManoObraSubject = new BehaviorSubject<number>(0);
  totalManoObra$ = this.totalManoObraSubject.asObservable();

  private totalEquiposSubject = new BehaviorSubject<number>(0);
  totalEquipos$ = this.totalEquiposSubject.asObservable();

  constructor(private http: HttpClient) {}

  notifyDataChanged(): void {
    this.dataChanged.next();
  }

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

  private buildUsuarioParams(): HttpParams {
    let params = new HttpParams();
    const usuarioId = this.getUsuarioId();
    if (usuarioId) params = params.set('usuario_id', String(usuarioId));
    return params;
  }

  // =============================
  // ========= PROYECTO ==========
  // =============================

  getProyecto(): Observable<Proyecto[]> {
    const params = this.buildUsuarioParams();
    return this.http.get<Proyecto[]>(`${this.apiUrl}proyectos/`, { params });
  }

  getProyectoID(id: number): Observable<Proyecto> {
    if (!id) return throwError(() => new Error('ID de proyecto inválido'));
    const params = this.buildUsuarioParams();
    return this.http.get<Proyecto>(`${this.apiUrl}proyectos/${id}/`, {
      params,
    });
  }

  createProyecto(proyecto: Partial<Proyecto>): Observable<Proyecto> {
    return this.http
      .post<Proyecto>(`${this.apiUrl}proyectos/`, proyecto)
      .pipe(tap(() => this.dataChanged.next()));
  }

  updateProyecto(proyecto: Proyecto): Observable<Proyecto> {
    const params = this.buildUsuarioParams();
    return this.http
      .put<Proyecto>(
        `${this.apiUrl}proyectos/${proyecto.id_proyecto}/`,
        proyecto,
        { params },
      )
      .pipe(tap(() => this.dataChanged.next()));
  }

  duplicarProyecto(idProyecto: number): Observable<{ nuevo_id: number }> {
    const params = this.buildUsuarioParams();
    return this.http
      .post<{
        nuevo_id: number;
      }>(`${this.apiUrl}proyectos/${idProyecto}/duplicar/`, {}, { params })
      .pipe(tap(() => this.dataChanged.next()));
  }

  deleteProyecto(id: number): Observable<void> {
    const params = this.buildUsuarioParams();
    return this.http
      .delete<void>(`${this.apiUrl}proyectos/${id}/`, { params })
      .pipe(
        tap(() => {
          this.dataChanged.next();
          setTimeout(() => this.dataChanged.next(), 100);
        }),
      );
  }

  // =============================
  // ========= MÓDULO ============
  // =============================

  getModulosPorProyecto(idProyecto: number): Observable<Modulo[]> {
    const params = this.buildUsuarioParams().set(
      'proyecto',
      String(idProyecto),
    );
    return this.http.get<Modulo[]>(`${this.apiUrl}modulos/`, { params });
  }

  createModulo(modulo: Partial<Modulo>): Observable<Modulo> {
    const params = this.buildUsuarioParams(); // <-- usuario_id
    return this.http
      .post<Modulo>(`${this.apiUrl}modulos/`, modulo, { params })
      .pipe(
        tap(() => {
          this.modulosCambiados.next();
          this.dataChanged.next();
        }),
      );
  }

  updateModulo(id: number, modulo: Partial<Modulo>): Observable<Modulo> {
    const params = this.buildUsuarioParams();
    return this.http
      .put<Modulo>(`${this.apiUrl}modulos/${id}/`, modulo, { params })
      .pipe(tap(() => this.dataChanged.next()));
  }

  deleteModulo(id: number): Observable<void> {
    const params = this.buildUsuarioParams();
    return this.http
      .delete<void>(`${this.apiUrl}modulos/${id}/`, { params })
      .pipe(tap(() => this.dataChanged.next()));
  }

  // =============================
  // ===== GASTOS DE OPERACIÓN ===
  // =============================

  getGastosOperacionPorProyecto(
    idProyecto: number,
  ): Observable<GastoOperacion[]> {
    if (!idProyecto) return throwError(() => new Error('ID inválido'));
    const params = this.buildUsuarioParams().set(
      'proyecto',
      String(idProyecto),
    );
    return this.http.get<GastoOperacion[]>(`${this.apiUrl}GastosOperaciones/`, {
      params,
    });
  }

  getGastosOperacionPorModulo(idModulo: number): Observable<GastoOperacion[]> {
    if (!idModulo) return throwError(() => new Error('ID inválido'));
    const params = this.buildUsuarioParams().set('modulo', String(idModulo));
    return this.http.get<GastoOperacion[]>(`${this.apiUrl}GastosOperaciones/`, {
      params,
    });
  }

  getGastoOperacionID(idProyecto: number): Observable<GastoOperacion[]> {
    return this.getGastosOperacionPorProyecto(idProyecto);
  }

  getGastosOperacion(): Observable<GastoOperacion[]> {
    return this.http.get<GastoOperacion[]>(`${this.apiUrl}GastosOperaciones/`, {
      params: this.buildUsuarioParams(),
    });
  }

  getGastoOperacionById(id: number): Observable<GastoOperacion> {
    return this.http.get<GastoOperacion>(
      `${this.apiUrl}GastosOperaciones/${id}/`,
      { params: this.buildUsuarioParams() },
    );
  }

  createGastoOperacion(payload: any): Observable<any> {
    return this.http
      .post(`${this.apiUrl}GastosOperaciones/`, payload, {
        params: this.buildUsuarioParams(),
      })
      .pipe(tap(() => this.dataChanged.next()));
  }

  updateGastoOperacion(gasto: any): Observable<any> {
    return this.http
      .put(`${this.apiUrl}GastosOperaciones/${gasto.id}/`, gasto, {
        params: this.buildUsuarioParams(),
      })
      .pipe(tap(() => this.dataChanged.next()));
  }

  deleteGastoOperacion(id: number): Observable<any> {
    return this.http
      .delete(`${this.apiUrl}GastosOperaciones/${id}/`, {
        params: this.buildUsuarioParams(),
      })
      .pipe(tap(() => this.dataChanged.next()));
  }

  moverItem(itemId: number, moduloDestinoId: number): Observable<any> {
    return this.http
      .post(
        `${this.apiUrl}GastosOperaciones/mover_item/`,
        {
          item_id: itemId,
          modulo_destino_id: moduloDestinoId,
        },
        { params: this.buildUsuarioParams() },
      )
      .pipe(tap(() => this.dataChanged.next()));
  }

  duplicarItem(itemId: number, moduloDestinoId: number): Observable<any> {
    return this.http
      .post(
        `${this.apiUrl}GastosOperaciones/duplicar_item/`,
        {
          item_id: itemId,
          modulo_destino_id: moduloDestinoId,
        },
        { params: this.buildUsuarioParams() },
      )
      .pipe(tap(() => this.dataChanged.next()));
  }

  getUnidadesGastoOperacion(): Observable<string[]> {
    return this.http.get<string[]>(
      `${this.apiUrl}GastosOperaciones/unidades/`,
      {
        params: this.buildUsuarioParams(),
      },
    );
  }

  // =============================
  // ========= MATERIALES ========
  // =============================

  getMaterialesPorGasto(idGasto: number): Observable<Materiales[]> {
    const params = this.buildUsuarioParams().set(
      'gasto_operacion',
      String(idGasto),
    );
    return this.http.get<Materiales[]>(`${this.apiUrl}materiales/`, { params });
  }

  getCatalogoMaterialesPorProyecto(idProyecto: number): Observable<any[]> {
    const params = this.buildUsuarioParams().set(
      'proyecto',
      String(idProyecto),
    );
    return this.http.get<any[]>(`${this.apiUrl}materiales/ultimos_precios/`, {
      params,
    });
  }

  getMaterialesIDGasto(id: number): Observable<Materiales[]> {
    if (!id) return throwError(() => new Error('ID inválido'));
    let params = new HttpParams();
    const usuarioId = this.getUsuarioId();
    if (usuarioId) params = params.set('usuario_id', usuarioId.toString());

    params = params.set('gasto_operacion', id.toString());

    return this.http.get<Materiales[]>(`${this.apiUrl}materiales/`, { params });
  }

  getMaterialesPorProyecto(idProyecto: number) {
    const params = this.buildUsuarioParams().set(
      'proyecto',
      String(idProyecto),
    );
    return this.http.get<any[]>(`${this.apiUrl}materiales/`, { params });
  }

  createMaterial(m: Materiales): Observable<Materiales> {
    return this.http
      .post<Materiales>(`${this.apiUrl}materiales/`, m, {
        params: this.buildUsuarioParams(),
      })
      .pipe(tap(() => this.dataChanged.next()));
  }

  updateMaterial(m: Materiales): Observable<Materiales> {
    return this.http
      .put<Materiales>(`${this.apiUrl}materiales/${m.id}/`, m, {
        params: this.buildUsuarioParams(),
      })
      .pipe(tap(() => this.dataChanged.next()));
  }

  actualizarPrecioMaterial(
    proyecto: number,
    descripcion: string,
    precio_unitario: number,
  ) {
    const params = this.buildUsuarioParams();
    return this.http.post(
      `${this.apiUrl}materiales/actualizar_precio_descripcion/`,
      { proyecto, descripcion, precio_unitario },
      { params },
    );
  }

  deleteMaterial(id: number): Observable<any> {
    return this.http
      .delete(`${this.apiUrl}materiales/${id}/`, {
        params: this.buildUsuarioParams(),
      })
      .pipe(tap(() => this.dataChanged.next()));
  }
  setTotalMateriales(total: number): void {
    this.totalMaterialesSubject.next(total);
  }
  // =============================
  // ========= MANO DE OBRA ======
  // =============================

  getManoDeObraPorGasto(idGasto: number): Observable<ManoDeObra[]> {
    const params = this.buildUsuarioParams().set(
      'gasto_operacion',
      String(idGasto),
    );
    return this.http.get<ManoDeObra[]>(`${this.apiUrl}mano_de_obra/`, {
      params,
    });
  }

  getManoDeObraIDGasto(id: number): Observable<ManoDeObra[]> {
    let params = new HttpParams();

    const usuarioId = this.getUsuarioId();
    if (usuarioId) params = params.set('usuario_id', usuarioId.toString());

    params = params.set('gasto_operacion', id.toString());

    return this.http.get<ManoDeObra[]>(`${this.apiUrl}mano_de_obra/`, {
      params,
    });
  }

  getCatalogoManoDeObraPorProyecto(idProyecto: number): Observable<any[]> {
    const params = this.buildUsuarioParams().set(
      'proyecto',
      String(idProyecto),
    );
    return this.http.get<any[]>(`${this.apiUrl}mano_de_obra/ultimos_precios/`, {
      params,
    });
  }

  getManoDeObraPorProyecto(idProyecto: number) {
    const params = this.buildUsuarioParams().set(
      'proyecto',
      String(idProyecto),
    );
    return this.http.get<any[]>(`${this.apiUrl}mano_de_obra/`, { params });
  }

  createManoDeObra(m: ManoDeObra): Observable<ManoDeObra> {
    return this.http
      .post<ManoDeObra>(`${this.apiUrl}mano_de_obra/`, m, {
        params: this.buildUsuarioParams(),
      })
      .pipe(tap(() => this.dataChanged.next()));
  }

  updateManoDeObra(m: ManoDeObra): Observable<ManoDeObra> {
    const params = this.buildUsuarioParams();

    const body = {
      descripcion: (m.descripcion || '').toUpperCase().trim(),
      unidad: (m.unidad || '').toUpperCase().trim(),
      cantidad: Number(m.cantidad ?? 0),
      precio_unitario: Number(m.precio_unitario ?? 0),
    };

    return this.http
      .patch<ManoDeObra>(`${this.apiUrl}mano_de_obra/${m.id}/`, body, {
        params,
      })
      .pipe(tap(() => this.dataChanged.next()));
  }

  actualizarPrecioManoObra(
    proyecto: number,
    descripcion: string,
    precio_unitario: number,
  ) {
    const params = this.buildUsuarioParams();
    return this.http.post(
      `${this.apiUrl}mano_de_obra/actualizar_precio_descripcion/`,
      { proyecto, descripcion, precio_unitario },
      { params },
    );
  }

  deleteManoDeObra(id: number): Observable<any> {
    return this.http
      .delete(`${this.apiUrl}mano_de_obra/${id}/`, {
        params: this.buildUsuarioParams(),
      })
      .pipe(tap(() => this.dataChanged.next()));
  }

  getUnidadesManoDeObra(): Observable<string[]> {
    let params = new HttpParams();

    const usuarioId = this.getUsuarioId();
    if (usuarioId) params = params.set('usuario_id', usuarioId.toString());

    return this.http.get<string[]>(`${this.apiUrl}mano_de_obra/unidades/`, {
      params,
    });
  }
  setTotalManoObra(total: number): void {
    this.totalManoObraSubject.next(total);
  }

  // =============================
  // ===== EQUIPO Y HERRAMIENTA ==
  // =============================

  getEquipoHerramientaPorGasto(
    idGasto: number,
  ): Observable<EquipoHerramienta[]> {
    const params = this.buildUsuarioParams().set(
      'gasto_operacion',
      String(idGasto),
    );
    return this.http.get<EquipoHerramienta[]>(
      `${this.apiUrl}equipo_herramienta/`,
      { params },
    );
  }

  getEquipoHerramientas(idGasto: number): Observable<EquipoHerramienta[]> {
    return this.getEquipoHerramientaPorGasto(idGasto);
  }

  getEquiposPorGasto(idGasto: number): Observable<EquipoHerramienta[]> {
    return this.getEquipoHerramientaPorGasto(idGasto);
  }

  getCatalogoEquipoHerramientaPorProyecto(
    idProyecto: number,
  ): Observable<any[]> {
    const params = this.buildUsuarioParams().set(
      'proyecto',
      String(idProyecto),
    );
    return this.http.get<any[]>(
      `${this.apiUrl}equipo_herramienta/ultimos_precios/`,
      { params },
    );
  }

  getEquiposPorProyecto(idProyecto: number) {
    const params = this.buildUsuarioParams().set(
      'proyecto',
      String(idProyecto),
    );
    return this.http.get<any[]>(`${this.apiUrl}equipo_herramienta/`, {
      params,
    });
  }

  createEquipoHerramienta(e: EquipoHerramienta): Observable<EquipoHerramienta> {
    return this.http
      .post<EquipoHerramienta>(`${this.apiUrl}equipo_herramienta/`, e, {
        params: this.buildUsuarioParams(),
      })
      .pipe(tap(() => this.dataChanged.next()));
  }

  updateEquipoHerramienta(e: EquipoHerramienta): Observable<EquipoHerramienta> {
    return this.http
      .put<EquipoHerramienta>(`${this.apiUrl}equipo_herramienta/${e.id}/`, e, {
        params: this.buildUsuarioParams(),
      })
      .pipe(tap(() => this.dataChanged.next()));
  }

  actualizarPrecioEquipo(
    proyecto: number,
    descripcion: string,
    precio_unitario: number,
  ) {
    const params = this.buildUsuarioParams();
    return this.http.post(
      `${this.apiUrl}equipo_herramienta/actualizar_precio_descripcion/`,
      { proyecto, descripcion, precio_unitario },
      { params },
    );
  }

  deleteEquipoHerramienta(id: number): Observable<any> {
    return this.http
      .delete(`${this.apiUrl}equipo_herramienta/${id}/`, {
        params: this.buildUsuarioParams(),
      })
      .pipe(tap(() => this.dataChanged.next()));
  }

  getUnidadesEquipoHerramienta(): Observable<string[]> {
    return this.http.get<string[]>(
      `${this.apiUrl}equipo_herramienta/unidades/`,
      { params: this.buildUsuarioParams() },
    );
  }
  setTotalEquipos(total: number): void {
    this.totalEquiposSubject.next(total);
  }

  // =============================
  // ======== GASTOS GENERALES ===
  // =============================

  getGastosGeneralesPorGasto(idGasto: number): Observable<GastosGenerales[]> {
    const params = this.buildUsuarioParams().set(
      'gasto_operacion',
      String(idGasto),
    );
    return this.http.get<GastosGenerales[]>(`${this.apiUrl}gastos_generales/`, {
      params,
    });
  }

  getGastosGenerales(idGasto: number): Observable<GastosGenerales[]> {
    return this.getGastosGeneralesPorGasto(idGasto);
  }

  getGastosGeneralesPorProyecto(
    idProyecto: number,
  ): Observable<{ [id: string]: any }> {
    const params = this.buildUsuarioParams().set(
      'proyecto',
      String(idProyecto),
    );
    return this.http.get<{ [id: string]: any }>(
      `${this.apiUrl}gastos_generales/totals_por_proyecto/`,
      { params },
    );
  }

  recalcularGastosGeneralesProyecto(idProyecto: number) {
    const params = this.buildUsuarioParams();
    return this.http.post(
      `${this.apiUrl}gastos_generales/recalcular_proyecto/`,
      { proyecto: idProyecto },
      { params },
    );
  }

  createGasto(g: GastosGenerales): Observable<GastosGenerales> {
    return this.http
      .post<GastosGenerales>(`${this.apiUrl}gastos_generales/`, g)
      .pipe(tap(() => this.dataChanged.next()));
  }

  updateGasto(g: GastosGenerales): Observable<GastosGenerales> {
    return this.http
      .put<GastosGenerales>(`${this.apiUrl}gastos_generales/${g.id}/`, g)
      .pipe(tap(() => this.dataChanged.next()));
  }

  recalcularGastosGeneralesItem(idGastoOperacion: number) {
    const params = this.buildUsuarioParams();
    return this.http.post(
      `${this.apiUrl}gastos_generales/recalcular_item/`,
      { gasto_operacion: idGastoOperacion },
      { params },
    );
  }

  getGastosGeneralesPorProyectoFull(
    idProyecto: number,
  ): Observable<GastosGenerales[]> {
    const params = this.buildUsuarioParams().set(
      'proyecto',
      String(idProyecto),
    );
    return this.http.get<GastosGenerales[]>(`${this.apiUrl}gastos_generales/`, {
      params,
    });
  }
}
