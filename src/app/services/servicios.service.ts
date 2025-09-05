import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, map, Observable } from 'rxjs';

import {
  Rol,
  Permiso,
  Usuario,
  UsuarioRol,
  RolPermiso,
  Materiales,
  ManoDeObra,
  EquipoHerramienta,
  GastosGenerales,
  GastoOperacion,
  Proyecto,
} from '../models/models';

@Injectable({
  providedIn: 'root',
})
export class ServiciosService {
  private apiUrl = 'http://localhost:8000/api/';

 /*  private apiUrl = 'https://backendecuacion.onrender.com/api/'; */
  

  constructor(private http: HttpClient) {}
  //  =====================================================
  //  ================  seccion 1    ======================
  //  =====================================================
  login(correo: string, password: string): Observable<any> {
    const loginData = { correo: correo, password: password }; // 👈 debe coincidir con el serializer
    return this.http.post<any>(`${this.apiUrl}login/`, loginData);
  }
  getRolesFromLocalStorage(): string[] {
    const roles = localStorage.getItem('rol');
    return roles ? JSON.parse(roles) : [];
  }
  verificarUsuario(usuario_id: number): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.apiUrl}usuario/${usuario_id}`);
  }
  getRoles(): Observable<Rol[]> {
    return this.http.get<Rol[]>(`${this.apiUrl}rol/`);
  }
  getRolID(id: number): Observable<Rol> {
    return this.http.get<Rol>(`${this.apiUrl}rol/${id}/`);
  }
  createRol(rol: Rol): Observable<Rol> {
    return this.http.post<Rol>(`${this.apiUrl}rol/`, rol);
  }
  updateRol(rol: Rol): Observable<Rol> {
    return this.http.put<Rol>(`${this.apiUrl}rol/${rol.id}/`, rol);
  }

  // === Permiso ===
  getPermisos(): Observable<Permiso[]> {
    return this.http.get<Permiso[]>(`${this.apiUrl}permiso/`);
  }
  getPermisoID(id: number): Observable<Permiso> {
    return this.http.get<Permiso>(`${this.apiUrl}permiso/${id}/`);
  }
  createPermiso(p: Permiso): Observable<Permiso> {
    return this.http.post<Permiso>(`${this.apiUrl}permiso/`, p);
  }
  updatePermiso(p: Permiso): Observable<Permiso> {
    return this.http.put<Permiso>(`${this.apiUrl}permiso/${p.id}/`, p);
  }

  // === Usuario ===
  getUsuarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${this.apiUrl}usuario/`);
  }
  getUsuarioID(id: number): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.apiUrl}usuario/${id}/`);
  }
  createUsuario(usuario: Usuario): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.apiUrl}usuario/`, usuario);
  }
  editarUsuario(id: number, usuario: FormData): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.apiUrl}usuario/${id}/`, usuario);
  }

  // === UsuarioRol ===
  getUsuarioRoles(): Observable<UsuarioRol[]> {
    return this.http.get<UsuarioRol[]>(`${this.apiUrl}usuario_rol/`);
  }
  getUsuarioRolID(id: number): Observable<UsuarioRol> {
    return this.http.get<UsuarioRol>(`${this.apiUrl}usuario_rol/${id}/`);
  }
  createUsuarioRol(ur: UsuarioRol): Observable<UsuarioRol> {
    return this.http.post<UsuarioRol>(`${this.apiUrl}usuario_rol/`, ur);
  }
  updateUsuarioRol(ur: UsuarioRol): Observable<UsuarioRol> {
    return this.http.put<UsuarioRol>(`${this.apiUrl}usuario_rol/${ur.id}/`, ur);
  }

  // === RolPermiso ===
  getRolPermiso(): Observable<RolPermiso[]> {
    return this.http.get<RolPermiso[]>(`${this.apiUrl}rol_permiso/`);
  }
  getRolPermisoID(id: number): Observable<RolPermiso> {
    return this.http.get<RolPermiso>(`${this.apiUrl}rol_permiso/${id}/`);
  }
  createRolPermiso(rolPermiso: RolPermiso): Observable<RolPermiso> {
    return this.http.post<RolPermiso>(`${this.apiUrl}rol_permiso/`, rolPermiso);
  }
  updateRolPermiso(rolPermiso: RolPermiso): Observable<RolPermiso> {
    return this.http.put<RolPermiso>(
      `${this.apiUrl}rol_permiso/${rolPermiso.id}/`,
      rolPermiso
    );
  }
  //  =====================================================
  //  ================  seccion 2    ======================
  //  =====================================================
  getIdentificadorGeneral(): Observable<Proyecto[]> {
    return this.http.get<Proyecto[]>(`${this.apiUrl}IdGeneral/`);
  }

  getIdentificadorGeneralID(id: number): Observable<Proyecto> {
    return this.http.get<Proyecto>(
      `${this.apiUrl}IdGeneral/${id}/`
    );
  }

  createIdentificadorGeneral(
    gasto: Partial<Proyecto>
  ): Observable<Proyecto> {
    return this.http.post<Proyecto>(
      `${this.apiUrl}IdGeneral/`,
      gasto
    );
  }
  updateIdentificadorGeneral(
    identificador: Proyecto
  ): Observable<Proyecto> {
    return this.http.put<Proyecto>(
      `${this.apiUrl}IdGeneral/${identificador.id_general}/`,
      identificador
    );
  }
  deleteIdentificadorGeneral(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}IdGeneral/${id}/`);
  }

  // === Gasto de Operación ===
  getGastosOperacion(): Observable<GastoOperacion[]> {
    return this.http.get<GastoOperacion[]>(`${this.apiUrl}GastosOperaciones/`);
  }

  getGastoOperacionID(id: number): Observable<GastoOperacion[]> {
    return this.http.get<GastoOperacion[]>(
      `${this.apiUrl}GastosOperaciones/?identificador=${id}`
    );
  }
  // El método para crear gastos recibe un arreglo de Partial<GastoOperacion> (sin id, identificador, etc)
  createGastoOperacion(gastos: Partial<GastoOperacion>[]): Observable<{
    mensaje: string;
    identificador_general: number;
    gastos: GastoOperacion[];
  }> {
    return this.http.post<{
      mensaje: string;
      identificador_general: number;
      gastos: GastoOperacion[];
    }>(`${this.apiUrl}GastosOperaciones/`, gastos);
  }

  updateGastoOperacion(
    gasto: Partial<GastoOperacion>
  ): Observable<GastoOperacion> {
    return this.http.put<GastoOperacion>(
      `${this.apiUrl}GastosOperaciones/${gasto.id}/`,
      gasto
    );
  }

  deleteGastoOperacion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}GastosOperaciones/${id}/`);
  }
  //  =====================================================
  //  ================  seccion 3    ======================
  //  =====================================================
  // ==================
  // === Materiales ===
  // ==================

  getMateriales(): Observable<Materiales[]> {
    return this.http.get<Materiales[]>(`${this.apiUrl}materiales/`);
  }
  getMaterialesID(id: number): Observable<Materiales> {
    return this.http.get<Materiales>(
      `${this.apiUrl}materiales/${id}/`
    );
  }
  getMaterialesIDGasto(id_gasto_operacion: number): Observable<Materiales[]> {
    return this.http.get<Materiales[]>(`${this.apiUrl}materiales/?id_gasto_operacion=${id_gasto_operacion}`);
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
  // ====================
  // === Mano de Obra ===
  // ====================
  getManoDeObra(): Observable<ManoDeObra[]> {
    return this.http.get<ManoDeObra[]>(`${this.apiUrl}mano_de_obra/`);
  }
  getManoDeObraIDGasto(id_gasto_operacion: number): Observable<ManoDeObra[]> {
    return this.http.get<ManoDeObra[]>(`${this.apiUrl}mano_de_obra/?id_gasto_operacion=${id_gasto_operacion}`);
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

  // ==========================
  // === Equipo Herramienta ===
  // ==========================
  getEquiposHerramientas(): Observable<EquipoHerramienta[]> {
    return this.http.get<EquipoHerramienta[]>(`${this.apiUrl}equipo_herramienta/`);
  }
  getEquipoHerramientas(id_gasto_operacion: number): Observable<EquipoHerramienta[]> {
    return this.http.get<EquipoHerramienta[]>(
      `${this.apiUrl}equipo_herramienta/?id_gasto_operacion=${id_gasto_operacion}`
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
    return this.http.delete<EquipoHerramienta>(`${this.apiUrl}equipo_herramienta/${id}/`);
  }



  // === Gastos Generales y Administrativos === suma de 1+2+3 * 0.12 % 
  getGastos(): Observable<GastosGenerales[]> {
    return this.http.get<GastosGenerales[]>(
      `${this.apiUrl}gastos_generales/`
    );
  }  
  getGastosGenerales(id_gasto_operacion: number): Observable<GastosGenerales[]> {
    return this.http.get<GastosGenerales[]>(
      `${this.apiUrl}gastos_generales/?id_gasto_operacion=${id_gasto_operacion}`
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
  //  =====================================================
  //  =========== seccion 4 Mandar Totales   ==============
  //  =====================================================

  private totalMaterialesSubject = new BehaviorSubject<number>(0);
  totalMateriales$ = this.totalMaterialesSubject.asObservable();
  private totalManoObraSubject = new BehaviorSubject<number>(0);
  totalManoObra$ = this.totalManoObraSubject.asObservable();
  private totalEquiposSubject = new BehaviorSubject<number>(0);
  totalEquipos$ = this.totalEquiposSubject.asObservable();
  // === Materiales ===
  setTotalMateriales(total: number) {this.totalMaterialesSubject.next(total);}
  // === Mano de Obra ===
  setTotalManoObra(total: number) {this.totalManoObraSubject.next(total);}
  // === Equipos y Herramientas ===
  setTotalEquipos(total: number) {this.totalEquiposSubject.next(total);}

  //  =====================================================
  //  ================  seccion 5    ======================
  //  =====================================================

}
