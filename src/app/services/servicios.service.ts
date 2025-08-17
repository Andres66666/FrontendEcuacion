import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  Rol,
  Permiso,
  Usuario,
  UsuarioRol,
  RolPermiso,
  Categorias,
  Materiales,
  ManoDeObra,
  EquipoHerramienta,
  Ecuacion,
  GastosGeneralesAdministrativos,
  GastoOperacion,
  IdentificadorGeneral,
} from '../models/models';

@Injectable({
  providedIn: 'root',
})
export class ServiciosService {
  private apiUrl = 'http://localhost:8000/api/';

  constructor(private http: HttpClient) {}

  // === Rol ===
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
  // === Clientes ===

  createCliente(usuario: any, imagenArchivo?: File): Observable<Usuario> {
    if (imagenArchivo) {
      const formData = new FormData();
      formData.append('nombre', usuario.nombre);
      formData.append('apellido', usuario.apellido);
      formData.append(
        'fecha_nacimiento',
        typeof usuario.fecha_nacimiento === 'string'
          ? usuario.fecha_nacimiento
          : new Date(usuario.fecha_nacimiento).toISOString().split('T')[0]
      );
      formData.append('telefono', usuario.telefono);
      formData.append('correo', usuario.correo);
      formData.append('password', usuario.password);
      formData.append('ci', usuario.ci);
      formData.append('estado', usuario.estado ? 'true' : 'false');
      formData.append('imagen_url', imagenArchivo);
      return this.http.post<Usuario>(`${this.apiUrl}cliente/`, formData);
    } else {
      return this.http.post<Usuario>(`${this.apiUrl}cliente/`, usuario);
    }
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

  // === Categorias ===
  getCategorias(): Observable<Categorias[]> {
    return this.http.get<Categorias[]>(`${this.apiUrl}categoria/`);
  }
  createCategoria(c: Categorias): Observable<Categorias> {
    return this.http.post<Categorias>(`${this.apiUrl}categoria/`, c);
  }
  updateCategoria(c: Categorias): Observable<Categorias> {
    return this.http.put<Categorias>(`${this.apiUrl}categoria/${c.id}/`, c);
  }

  // === Materiales ===
  getMateriales(): Observable<Materiales[]> {
    return this.http.get<Materiales[]>(`${this.apiUrl}materiales/`);
  }
  createMaterial(m: Materiales): Observable<Materiales> {
    return this.http.post<Materiales>(`${this.apiUrl}materiales/`, m);
  }
  updateMaterial(m: Materiales): Observable<Materiales> {
    return this.http.put<Materiales>(`${this.apiUrl}materiales/${m.id}/`, m);
  }

  // === Mano de Obra ===
  getManoDeObra(): Observable<ManoDeObra[]> {
    return this.http.get<ManoDeObra[]>(`${this.apiUrl}mano_de_obra/`);
  }
  createManoDeObra(m: ManoDeObra): Observable<ManoDeObra> {
    return this.http.post<ManoDeObra>(`${this.apiUrl}mano_de_obra/`, m);
  }
  updateManoDeObra(m: ManoDeObra): Observable<ManoDeObra> {
    return this.http.put<ManoDeObra>(`${this.apiUrl}mano_de_obra/${m.id}/`, m);
  }

  // === Equipo Herramienta ===
  getEquiposHerramientas(): Observable<EquipoHerramienta[]> {
    return this.http.get<EquipoHerramienta[]>(
      `${this.apiUrl}equipo_herramienta/`
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

  // === Ecuacion ===
  getEcuaciones(): Observable<Ecuacion[]> {
    return this.http.get<Ecuacion[]>(`${this.apiUrl}ecuacion/`);
  }
  createEcuacion(e: Ecuacion): Observable<Ecuacion> {
    return this.http.post<Ecuacion>(`${this.apiUrl}ecuacion/`, e);
  }
  updateEcuacion(e: Ecuacion): Observable<Ecuacion> {
    return this.http.put<Ecuacion>(`${this.apiUrl}ecuacion/${e.id}/`, e);
  }

  // === Gastos Generales y Administrativos ===
  getGastos(): Observable<GastosGeneralesAdministrativos[]> {
    return this.http.get<GastosGeneralesAdministrativos[]>(
      `${this.apiUrl}gastos/`
    );
  }
  createGasto(
    g: GastosGeneralesAdministrativos
  ): Observable<GastosGeneralesAdministrativos> {
    return this.http.post<GastosGeneralesAdministrativos>(
      `${this.apiUrl}gastos/`,
      g
    );
  }
  updateGasto(
    g: GastosGeneralesAdministrativos
  ): Observable<GastosGeneralesAdministrativos> {
    return this.http.put<GastosGeneralesAdministrativos>(
      `${this.apiUrl}gastos/${g.id}/`,
      g
    );
  }
  // === Gasto de identificador general ===
  getIdentificadorGeneral(): Observable<IdentificadorGeneral[]> {
    return this.http.get<IdentificadorGeneral[]>(`${this.apiUrl}IDGeneral/`);
  }

  getIdentificadorGeneralID(id: number): Observable<IdentificadorGeneral> {
    return this.http.get<IdentificadorGeneral>(
      `${this.apiUrl}IDGeneral/${id}/`
    );
  }

  createIdentificadorGeneral(
    gasto: Partial<IdentificadorGeneral>
  ): Observable<IdentificadorGeneral> {
    return this.http.post<IdentificadorGeneral>(
      `${this.apiUrl}IDGeneral/`,
      gasto
    );
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

  /* servicio de login */
  login(correo: string, password: string): Observable<any> {
    const loginData = { correo: correo, password: password };
    return this.http.post<any>(`${this.apiUrl}login/`, loginData);
  }
}
