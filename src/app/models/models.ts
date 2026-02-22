//  ================  seccion 1    ======================

export interface Rol {
  id: number;
  nombre: string;
  estado: boolean;
}
export interface Permiso {
  id: number;
  nombre: string;
  estado: boolean;
}
export interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  fecha_nacimiento: Date;
  telefono: string;
  correo: string;
  password: string;
  ci: string;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
  imagen_url: string;
  estado: boolean;
}
export interface UsuarioRol {
  id: number;
  usuario: Usuario;
  rol: Rol;
}
export interface RolPermiso {
  id: number;
  rol: Rol;
  permiso: Permiso;
}

export interface Codigo2FA {
  id: number;
  usuario: Usuario;
  codigo: string;
  creado_en: Date;
  expirado: Date;
}

export interface RegistroPendiente {
  id: number;
  token: string; // UUID generado por backend
  datos: string; // JSON con los datos del formulario
  correo: string;
  creado_en: Date;
  verificado: boolean;
}

export interface Atacante {
  id?: number;
  ip: string;
  tipos: string[];
  descripcion: string;
  payload: string;
  user_agent: string;
  fecha: string;
  bloqueado: boolean;
}
