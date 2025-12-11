export interface Proyecto {
  id_proyecto: number;
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
}

export interface Modulo {
  id: number;
  proyecto: number;
  codigo: string;
  nombre: string;
}

export interface GastoOperacion {
  id: number;
  identificador: Proyecto;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  precio_literal: string;
  costo_parcial: number;
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
