export interface Proyecto {
  id_proyecto: number;
  NombreProyecto: string /* nombre del proyecto */;
  carga_social: number;
  iva_efectiva: number;
  herramientas: number;
  gastos_generales: number;
  iva_tasa_nominal: number;
  it: number;
  iue: number;
  ganancia: number;
  margen_utilidad: number;
  creado_por: number /* ID del usuario que creó el proyecto */;
}

export interface Modulo {
  id: number;
  proyecto: number;
  codigo: string;
  nombre: string /* nombre del módulo */;
}

export interface GastoOperacion {
  id: number;
  identificador: Proyecto | number;
  modulo: Modulo | number;
  descripcion: string /* descripción del gasto de operación esto es el nombre del item */;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  costo_parcial: number;
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
  totalgastosgenerales: number /* 1+2+3+4 */;
  total: number;
}
