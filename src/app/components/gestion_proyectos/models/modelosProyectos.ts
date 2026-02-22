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
  margen_utilidad: number;
  creado_por: number;
}

export interface Modulo {
  id: number;
  proyecto: Proyecto;
  codigo: string;
  nombre: string;
}

export interface GastoOperacion {
  id: number;
  modulo: Modulo;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  costo_parcial: number;
}

export interface Materiales {
  id: number;
  gasto_operacion: number;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
}

export interface ManoDeObra {
  id: number;
  gasto_operacion: number;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
}

export interface EquipoHerramienta {
  id: number;
  gasto_operacion: number;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
}

export interface GastosGenerales {
  id: number;
  gasto_operacion: number;
  totalgastosgenerales: number;
  total: number;
}
