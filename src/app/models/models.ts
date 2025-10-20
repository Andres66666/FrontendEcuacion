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
// Tipos para AuditoriaEvento (para facilitar el uso en formularios y filtros)
export type TipoEvento =
  | 'ACCESO'
  | 'CREACION'
  | 'MODIFICACION'
  | 'ELIMINACION'
  | 'LOGIN_FALLIDO'
  | 'ATAQUE DETECTADO'
  | 'SISTEMA';
export type Severidad = 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO';

export interface AuditoriaEvento {
  id: number;
  fecha: string; // DateTime
  tipo: TipoEvento;
  accion: string | null;
  descripcion: string | null;
  resultado: boolean;

  // Relaciones
  usuario: number | Usuario | null; // ForeignKey, puede ser null
  rol_usuario: string | null;
  severidad: Severidad;

  // Cliente
  ip_cliente_publica: string | null;
  ip_cliente_privada: string | null;
  navegador: string | null;
  sistema_operativo: string | null;
  ubicacion: string | null;

  // Solicitud HTTP
  ruta: string | null;
  metodo_http: string | null;

  // Seguridad y auditoría
  bloqueado: boolean;
}

//  ================  seccion 2    ======================

export interface Proyecto {
  id_general: number;
  NombreProyecto: string;
  carga_social: number;
  iva_efectiva: number;
  herramientas: number;
  gastos_generales: number;
  iva_tasa_nominal: number;
  it: number;
  iue: number;
  ganancia: number;
  a_costo_venta: number;
  b_margen_utilidad: number;
  porcentaje_global_100: number;
  creado_por: number;
  modificado_por: number;
}

export interface Modulo {
  id: number;
  proyecto: number;
  codigo: string;
  nombre: string;
  fecha_creacion: string;
  creado_por: number;
  modificado_por: number;
}

export interface GastoOperacion {
  id: number;
  identificador: Proyecto; // objeto completo
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  precio_literal: string;
  costo_parcial: number;
  creado_por: number;
  modificado_por: number;
  modulo?: Modulo | null;
}
//  ================  seccion 3    ======================
export interface Materiales {
  id: number;
  id_gasto_operacion: number;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
  creado_por: number;
  modificado_por: number;
}
export interface ManoDeObra {
  id: number;
  id_gasto_operacion: number;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
  creado_por: number;
  modificado_por: number;
}
export interface EquipoHerramienta {
  id: number;
  id_gasto_operacion: number;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
  creado_por: number;
  modificado_por: number;
}
export interface GastosGenerales {
  id: number;
  id_gasto_operacion: number;
  total: number;
  creado_por: number;
  modificado_por: number;
}
