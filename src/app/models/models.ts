// models.ts

// === USUARIOS, ROLES Y PERMISOS ===
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
  fecha_nacimiento: Date; // formato: YYYY-MM-DD
  telefono: string;
  correo: string;
  password: string; // puede omitirse en formularios de edición
  ci: string;
  fecha_creacion: Date; // formato: ISO string
  fecha_actualizacion: Date;
  imagen_url: string;
  estado: boolean;
}

export interface UsuarioRol {
  id: number;
  usuario: Usuario; // puede ser ID o el objeto completo
  rol: Rol;
}

export interface RolPermiso {
  id: number;
  rol: Rol;
  permiso: Permiso;
}

// === CATEGORIZACIÓN ===

export interface Categorias {
  id: number;
  nombre: string;
  descripcion: string;
  estado: boolean;
}

// === COSTOS DIRECTOS ===

export interface Materiales {
  id: number;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
}

export interface ManoDeObra {
  id: number;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  carga_social: number;
  impuestos_iva: number;
  total: number;
}

export interface EquipoHerramienta {
  id: number;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  herramientas: number;
  total: number;
}

// === ECUACIÓN ===

export interface Ecuacion {
  id: number;
  materiales: Materiales;
  mano_de_obra: ManoDeObra;
  quipo_herramienta: EquipoHerramienta;
  subtotal: number;
}

// === GASTOS GENERALES Y ADMINISTRATIVOS ===

export interface GastosGeneralesAdministrativos {
  id: number;
  ecuacion: Ecuacion;
  gastos_generales: number;
  total: number;
}
export interface IdentificadorGeneral {
  id_general: number;
  NombreProyecto: string;
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
