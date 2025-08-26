  //  =====================================================
  //  ================  seccion 1    ======================
  //  =====================================================
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

  //  =====================================================
  //  ================  seccion 2    ======================
  //  =====================================================
export interface IdentificadorGeneral {
  id_general: number;
  NombreProyecto: string;
  carga_social: number;
  impuestos_iva: number;
  herramientas: number;
  gastos_generales: number;
  iva_efectiva: number;
  it: number;
  iue: number;
  ganancia: number;
  a_costo_venta: number;
  b_margen_utilidad: number;
  porcentaje_global_100: number;
}

export interface GastoOperacion {
  id: number;
  identificador: IdentificadorGeneral; // objeto completo
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  precio_literal: string;
  costo_parcial: number;
  fecha_creacion: string;
  ultima_modificacion: string;
}
  //  =====================================================
  //  ================  seccion 3    ======================
  //  =====================================================
export interface Materiales {
  id: number;
  id_gasto_operacion: number;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
}
export interface ManoDeObra {
  id: number;
  id_gasto_operacion: number;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
}
export interface EquipoHerramienta {
  id: number;
  id_gasto_operacion: number;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
}
export interface GastosGenerales {
  id: number;
  id_gasto_operacion: number;
  total: number;
}
  //  =====================================================
  //  ================  seccion 4    ======================
  //  =====================================================

