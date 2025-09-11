// E:\EcuacionPotosi\FrontendEcuacion\src\app\models\unidades.ts

export const UNIDADES = [
  'BLS', 'BRR', 'CD', 'CJA', 'CNX', 'EVE', 'GL', 'GLB', 'HA', 'HDR',
  'HH', 'HR', 'HRS', 'HY.', 'JGO', 'KG', 'KIT', 'KM', 'KMB', 'LT',
  'M', 'M2', 'M3', 'M3K', 'MED', 'MK', 'ML', 'P2', 'PAR', 'PER',
  'PIE', 'PLA', 'PTO', 'PZA', 'RLL', 'TLL', 'TN', 'TON', 'UND'
];

export function unidadTexto(value: number | string): string {
  if (typeof value === 'number') {
    return UNIDADES[value] ?? 'Seleccione unidad';
  }
  if (typeof value === 'string') {
    return UNIDADES.includes(value) ? value : 'Seleccione unidad';
  }
  return 'Seleccione unidad';
}
