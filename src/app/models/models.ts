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
  fecha_creacion: Date;
  fecha_actualizacion: Date;  
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
  fecha_creacion: Date;
  fecha_actualizacion: Date;  
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
  fecha_creacion: Date;
  fecha_actualizacion: Date;  
}
export interface ManoDeObra {
  id: number;
  id_gasto_operacion: number;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
  fecha_creacion: Date;
  fecha_actualizacion: Date;  
}
export interface EquipoHerramienta {
  id: number;
  id_gasto_operacion: number;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
  fecha_creacion: Date;
  fecha_actualizacion: Date;  
}
export interface GastosGenerales {
  id: number;
  id_gasto_operacion: number;
  total: number;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
  creado_por: Usuario;
}

