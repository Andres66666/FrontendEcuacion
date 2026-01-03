import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import {
  Rol,
  Permiso,
  Usuario,
  UsuarioRol,
  RolPermiso,
  Atacante,
} from '../models/models';

@Injectable({
  providedIn: 'root',
})
export class ServiciosService {
  private apiUrl = 'http://localhost:8000/api/';
  // private apiUrl = 'https://backendecuacion.onrender.com/api/';

  constructor(private http: HttpClient) {}

  // =====================================================
  // SECCIÓN 1: Autenticación y Seguridad
  // =====================================================

  login(correo: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}login/`, { correo, password });
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
  // SECCIÓN 3: Gestión de Usuarios, Roles y Permisos
  // =====================================================

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
      map((usuarios) => usuarios.filter((u) => !u.estado))
    );
  }

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

  getRolPermiso(): Observable<RolPermiso[]> {
    return this.http.get<RolPermiso[]>(`${this.apiUrl}rol_permiso/`);
  }

  getRolPermisoID(id: number): Observable<RolPermiso> {
    return this.http.get<RolPermiso>(`${this.apiUrl}rol_permiso/${id}/`);
  }

  getPermisosPorRol(rolId: number): Observable<number[]> {
    return this.http.get<number[]>(
      `${this.apiUrl}rol_permiso/permisos_por_rol/?rol_id=${rolId}`
    );
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

  getRolesFromLocalStorage(): string[] {
    const usuario = localStorage.getItem('usuarioLogueado');
    return usuario ? JSON.parse(usuario).roles || [] : [];
  }

  verificarUsuario(usuario_id: number): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.apiUrl}usuario/${usuario_id}`);
  }

  // =====================================================
  // Registro de clientes externos
  // =====================================================
  validarCorreo(correo: string): Observable<any> {
    return this.http.post(`${this.apiUrl}validar-correo/`, { correo });
  }

  enviarVerificacion(datos: any): Observable<any> {
    return this.http.post(`${this.apiUrl}enviar-verificacion/`, datos);
  }

  confirmarRegistro(token: string): Observable<any> {
    return this.http.get(`${this.apiUrl}confirmar/${token}/`);
  }

  registrarCliente(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}registro-cliente/`, data);
  }
  completarVerificacion(token: string) {
    return this.confirmarRegistro(token);
  }

  // =====================================================
  // SECCIÓN 4: Identificadores Generales y Operaciones
  // =====================================================
}
