// src/app/utils/numero-a-letras.ts
export class NumeroALetras {
  private static unidades = [
    '',
    'uno',
    'dos',
    'tres',
    'cuatro',
    'cinco',
    'seis',
    'siete',
    'ocho',
    'nueve',
  ];
  private static especiales = [
    '',
    'uno',
    'dos',
    'tres',
    'cuatro',
    'cinco',
    'seis',
    'siete',
    'ocho',
    'nueve',
    'diez',
    'once',
    'doce',
    'trece',
    'catorce',
    'quince',
    'dieciséis',
    'diecisiete',
    'dieciocho',
    'diecinueve',
    'veinte',
  ];
  private static decenas = [
    '',
    '',
    'veinti',
    'treinta',
    'cuarenta',
    'cincuenta',
    'sesenta',
    'setenta',
    'ochenta',
    'noventa',
  ];
  private static centenas = [
    '',
    'ciento',
    'doscientos',
    'trescientos',
    'cuatrocientos',
    'quinientos',
    'seiscientos',
    'setecientos',
    'ochocientos',
    'novecientos',
  ];

  private static convertirGrupo(n: number): string {
    if (n === 100) return 'cien';
    let output = '';
    const centenas = Math.floor(n / 100);
    const decenas = Math.floor((n % 100) / 10);
    const unidades = n % 10;
    const decenasUnidades = n % 100;

    if (centenas > 0) output += this.centenas[centenas] + ' ';
    if (decenasUnidades <= 20) {
      output += this.especiales[decenasUnidades];
    } else {
      output += this.decenas[decenas];
      if (decenas === 2 && unidades !== 0) output += this.unidades[unidades];
      else if (unidades !== 0) output += ' y ' + this.unidades[unidades];
    }
    return output.trim();
  }

  static convertir(numero: number): string {
    if (numero === 0) return 'cero';
    if (numero > 999999999) return 'Número fuera de rango';

    let literal = '';
    const millones = Math.floor(numero / 1000000);
    const miles = Math.floor((numero % 1000000) / 1000);
    const cientos = numero % 1000;

    if (millones > 0)
      literal +=
        millones === 1
          ? 'un millón '
          : this.convertirGrupo(millones) + ' millones ';
    if (miles > 0)
      literal += miles === 1 ? 'mil ' : this.convertirGrupo(miles) + ' mil ';
    if (cientos > 0) literal += this.convertirGrupo(cientos);

    return literal.trim();
  }
}