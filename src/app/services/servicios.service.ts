import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, forkJoin, map, Observable } from 'rxjs';
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
  Atacante,
  Modulo,
} from '../models/models';

@Injectable({
  providedIn: 'root',
})
export class ServiciosService {
  /*   private apiUrl = 'http://localhost:8000/api/'; */
  private apiUrl = 'https://backendecuacion.onrender.com/api/';

  constructor(private http: HttpClient) {}
  // =====================================================
  // 🧩 SECCIÓN 1: Autenticación y Seguridad
  // =====================================================

  login(correo: string, password: string): Observable<any> {
    const loginData = { correo, password };
    return this.http.post<any>(`${this.apiUrl}login/`, loginData);
  }

  resetPassword(correo: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}reset-password/`, { correo });
  }

  enviarCodigoCorreo(usuarioId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}enviar-codigo/`, {
      usuario_id: usuarioId,
    });
  }

  generarQR(usuarioId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}generar-qr/`, {
      usuario_id: usuarioId,
    });
  }

  verificar2FA(
    usuarioId: number,
    codigo: string,
    metodo: 'correo' | 'totp'
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}verificar-2fa/`, {
      usuario_id: usuarioId,
      codigo,
      metodo,
    });
  }

  verificarTempPassword(
    usuarioId: number,
    tempToken: string,
    tempPass: string
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}verificar-temp/`, {
      usuario_id: usuarioId,
      temp_token: tempToken,
      temp_pass: tempPass,
    });
  }

  cambiarPasswordTemp(
    usuarioId: number,
    tempToken: string,
    nuevaPassword: string,
    confirmarPassword: string
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}cambiar-password-temp/`, {
      usuario_id: usuarioId,
      temp_token: tempToken,
      nueva_password: nuevaPassword,
      confirmar_password: confirmarPassword,
    });
  }

  // =====================================================
  // 🔒 SECCIÓN 2: Auditoría y Seguridad del Sistema
  // =====================================================

  getAtaquesDB(): Observable<Atacante[]> {
    return this.http.get<any[]>(`${this.apiUrl}auditoria_db/`).pipe(
      map((ataques: any[]) =>
        ataques.map((a) => ({
          ...a,
          tipos: Array.isArray(a.tipos)
            ? a.tipos
            : a.tipos
            ? a.tipos.split(',')
            : [],
        }))
      )
    );
  }

  updateAtacanteBloqueo(id: number, bloqueado: boolean): Observable<any> {
    return this.http.patch(`${this.apiUrl}auditoria_db/${id}/`, { bloqueado });
  }

  // =====================================================
  // 👤 SECCIÓN 3: Gestión de Usuarios, Roles y Permisos
  // =====================================================

  // --- Roles ---
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

  // --- Permisos ---
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

  // --- Usuarios ---
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

  getUsuariosDesactivados(): Observable<any[]> {
    return this.getUsuarios().pipe(
      map((usuarios) => usuarios.filter((usuario) => !usuario.estado))
    );
  }

  // --- UsuarioRol ---
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

  // --- RolPermiso ---
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

  // --- Métodos auxiliares ---
  getRolesFromLocalStorage(): string[] {
    const usuario = localStorage.getItem('usuarioLogueado');
    if (usuario) {
      const userObj = JSON.parse(usuario);
      return userObj.roles || [];
    }
    return [];
  }

  verificarUsuario(usuario_id: number): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.apiUrl}usuario/${usuario_id}`);
  }

  // =====================================================
  // 🧱 SECCIÓN 4: Identificadores Generales y Operaciones
  // =====================================================

  getIdentificadorGeneral(): Observable<Proyecto[]> {
    return this.http.get<Proyecto[]>(`${this.apiUrl}IdGeneral/`);
  }

  getIdentificadorGeneralID(id: number): Observable<Proyecto> {
    return this.http.get<Proyecto>(`${this.apiUrl}IdGeneral/${id}/`);
  }

  createIdentificadorGeneral(gasto: Partial<Proyecto>): Observable<Proyecto> {
    return this.http.post<Proyecto>(`${this.apiUrl}IdGeneral/`, gasto);
  }

  updateIdentificadorGeneral(identificador: Proyecto): Observable<Proyecto> {
    return this.http.put<Proyecto>(
      `${this.apiUrl}IdGeneral/${identificador.id_general}/`,
      identificador
    );
  }

  deleteIdentificadorGeneral(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}IdGeneral/${id}/`);
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
    return this.http.get<string[]>(`${this.apiUrl}gasto_operacion/unidades/`);
  }

  // --- Módulos ---
  getModulosPorProyecto(idProyecto: number): Observable<Modulo[]> {
    return this.http.get<Modulo[]>(
      `${this.apiUrl}modulos/?proyecto=${idProyecto}`
    );
  }

  createModulo(modulo: Partial<Modulo>): Observable<Modulo> {
    return this.http.post<Modulo>(`${this.apiUrl}modulos/`, modulo);
  }

  updateModulo(id: number, modulo: Partial<Modulo>): Observable<Modulo> {
    return this.http.put<Modulo>(`${this.apiUrl}/modulos/${id}/`, modulo);
  }

  deleteModulo(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/modulos/${id}/`);
  }

  // --- Gastos y módulos ---
  createGastoOperacion(
    gastos: (Partial<GastoOperacion> & { modulo_id?: number | null })[]
  ): Observable<{
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
    gasto: Partial<GastoOperacion> & { modulo_id?: number | null }
  ): Observable<GastoOperacion> {
    const payload = { ...gasto };
    return this.http.put<GastoOperacion>(
      `${this.apiUrl}GastosOperaciones/${gasto.id}/`,
      payload
    );
  }

  deleteGastoOperacion(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/GastosOperaciones/${id}/`);
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
  getCatalogoMaterialesPorProyecto(
    id_gasto_operacion: number
  ): Observable<Materiales[]> {
    return this.http.get<Materiales[]>(
      `${this.apiUrl}materiales/catalogo/?id_gasto_operacion=${id_gasto_operacion}`
    );
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
  getCatalogoManoDeObraPorProyecto(
    id_gasto_operacion: number
  ): Observable<ManoDeObra[]> {
    return this.http.get<ManoDeObra[]>(
      `${this.apiUrl}mano_de_obra/catalogo/?id_gasto_operacion=${id_gasto_operacion}`
    );
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

  getCatalogoEquipoHerramientaPorProyecto(
    id_gasto_operacion: number
  ): Observable<EquipoHerramienta[]> {
    return this.http.get<EquipoHerramienta[]>(
      `${this.apiUrl}equipo_herramienta/catalogo/?id_gasto_operacion=${id_gasto_operacion}`
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

  //  =====================================================
  //  ================  seccion 5    ======================
  //  =====================================================
  // Materiales
  createMateriales(materiales: Materiales[]): Observable<Materiales[]> {
    return forkJoin(materiales.map((m) => this.createMaterial(m)));
  }

  // Mano de Obra
  createManoDeObraLista(manos: ManoDeObra[]): Observable<ManoDeObra[]> {
    return forkJoin(manos.map((m) => this.createManoDeObra(m)));
  }

  // Equipo/Herramienta
  createEquipoHerramientaLista(
    equipos: EquipoHerramienta[]
  ): Observable<EquipoHerramienta[]> {
    return forkJoin(equipos.map((e) => this.createEquipoHerramienta(e)));
  }

  // Gastos Generales
  createGastosGeneralesLista(
    gastos: GastosGenerales[]
  ): Observable<GastosGenerales[]> {
    return forkJoin(gastos.map((g) => this.createGasto(g)));
  }
}
