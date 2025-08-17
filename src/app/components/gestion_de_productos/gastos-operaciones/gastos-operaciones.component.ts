import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { GastoOperacion, IdentificadorGeneral } from '../../../models/models';
import { ServiciosService } from '../../../services/servicios.service';

interface GastoOperacionExtendido extends Partial<GastoOperacion> {
  esNuevo?: boolean;
}

@Component({
  selector: 'app-gastos-operaciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gastos-operaciones.component.html',
  styleUrls: ['./gastos-operaciones.component.css'],
})
export class GastosOperacionesComponent implements OnInit {
  formatoInvalido: boolean = false;
  items: GastoOperacionExtendido[] = [];
  identificadorGeneral: number = 0;
  nombreProyecto: string = '';

  listaProyectos: IdentificadorGeneral[] = [];
  proyectoSeleccionado: IdentificadorGeneral | null = null;

  literales_unidades = [
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

  literales_especiales = [
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

  literales_decenas = [
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

  literales_centenas = [
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

  constructor(private router: Router, private servicios: ServiciosService) {}

  ngOnInit(): void {
    this.identificadorGeneral = 0;
    this.items = [];
    this.cargarProyectos();
  }

  // función para bloquear la letra e y símbolos +,- en campos numéricos
  blockE(event: KeyboardEvent) {
    if (['e', 'E', '+', '-'].includes(event.key)) {
      event.preventDefault();
    }
  }

  cargarProyectos(): void {
    this.servicios.getIdentificadorGeneral().subscribe({
      next: (res) => {
        this.listaProyectos = res;
      },
      error: (err) => {
        console.error('Error al cargar proyectos:', err);
        alert('No se pudieron cargar los proyectos existentes.');
      },
    });
  }

  onProyectoSeleccionado(): void {
    if (!this.proyectoSeleccionado) return;

    this.identificadorGeneral = this.proyectoSeleccionado.id_general;
    this.nombreProyecto = this.proyectoSeleccionado.NombreProyecto;
    this.cargarGastos(this.identificadorGeneral);
  }

  crearIdentificadorSiEsNecesario(): void {
    if (this.identificadorGeneral === 0) {
      if (!this.nombreProyecto.trim()) {
        alert('Por favor ingrese un nombre de proyecto válido.');
        return;
      }

      this.servicios
        .createIdentificadorGeneral({
          NombreProyecto: this.nombreProyecto.trim(),
        })
        .subscribe({
          next: (res) => {
            this.identificadorGeneral = res.id_general;
            this.nombreProyecto = res.NombreProyecto;
            console.log(
              'Identificador en uso (creado o existente):',
              this.identificadorGeneral
            );
            this.agregarItemEspecificoYaConIdentificador();
          },
          error: (err) => {
            console.error('Error al crear identificador:', err);
            alert('No se pudo crear el identificador.');
          },
        });
    } else {
      this.agregarItemEspecificoYaConIdentificador();
    }
  }

  agregarItemEspecificoYaConIdentificador(): void {
    this.items.push({
      descripcion: '',
      unidad: '',
      cantidad: 0,
      precio_unitario: 0,
      precio_literal: '',
      esNuevo: true,
    });
  }

  obtenerUltimoIdentificadorGeneral(): void {
    this.servicios.getIdentificadorGeneral().subscribe({
      next: (res) => {
        if (res.length > 0) {
          const ultimo = [...res].sort(
            (a, b) => b.id_general - a.id_general
          )[0];
          this.identificadorGeneral = ultimo.id_general;
          this.cargarGastos(ultimo.id_general);
        } else {
          this.identificadorGeneral = 0;
        }
      },
      error: (err) => {
        console.error('Error al obtener identificadores:', err);
        alert('No se pudo cargar el último identificador.');
      },
    });
  }

  cargarGastos(idGeneral: number): void {
    this.servicios.getGastoOperacionID(idGeneral).subscribe({
      next: (res) => {
        this.items = res.map((item) => ({ ...item, esNuevo: false }));
      },
      error: (err) => {
        console.error('Error al cargar gastos:', err);
        alert('Error al cargar los gastos.');
      },
    });
  }

  agregarItemEspecifico(): void {
    this.items.push({
      descripcion: '',
      unidad: '',
      cantidad: 0,
      precio_unitario: 0,
      precio_literal: '',
      esNuevo: true,
    });
  }

  registrarItem(index: number): void {
    const item = this.items[index];

    const payload: Partial<GastoOperacion> = {
      descripcion: item.descripcion || '',
      unidad: item.unidad || '',
      cantidad: item.cantidad || 0,
      precio_unitario: item.precio_unitario || 0,
      precio_literal: item.precio_literal || '',
      identificador: {
        id_general: this.identificadorGeneral,
        NombreProyecto: this.nombreProyecto,
      },
    };

    this.servicios.createGastoOperacion([payload]).subscribe({
      next: (res) => {
        this.items[index] = {
          ...res.gastos[0],
          esNuevo: false,
        };
        this.identificadorGeneral = res.identificador_general;
      },
      error: (err) => {
        console.error('Error al registrar el ítem:', err);
        alert('Error al registrar el ítem.');
      },
    });
  }

  actualizarItem(index: number): void {
    const item = this.items[index];
    this.servicios.updateGastoOperacion(item).subscribe({
      next: () => {
        alert('Ítem actualizado correctamente.');
        this.cargarGastos(this.identificadorGeneral);
      },
      error: (err) => {
        console.error('Error al actualizar el ítem:', err);
        alert('Error al actualizar el ítem.');
      },
    });
  }

  eliminarItem(index: number): void {
    const item = this.items[index];

    if (item.id === undefined) {
      this.items.splice(index, 1);
      return;
    }

    this.servicios.deleteGastoOperacion(item.id).subscribe({
      next: () => {
        alert('Ítem eliminado correctamente.');
        this.items.splice(index, 1);
      },
      error: (err) => {
        console.error('Error al eliminar el ítem:', err);
        alert('Error al eliminar el ítem.');
      },
    });
  }

  guardarItems(): void {
    const nuevosItems = this.items.filter((item) => item.id === undefined);

    if (nuevosItems.length === 0) {
      alert('No hay nuevos ítems para registrar.');
      return;
    }

    const payload = nuevosItems.map((item) => ({
      descripcion: item.descripcion || '',
      unidad: item.unidad || '',
      cantidad: item.cantidad || 0,
      precio_unitario: item.precio_unitario || 0,
      precio_literal: item.precio_literal || '',
      identificador: {
        id_general: this.identificadorGeneral,
        NombreProyecto: this.nombreProyecto,
      },
    }));

    this.servicios.createGastoOperacion(payload).subscribe({
      next: (res) => {
        alert(`Gastos registrados con ID: ${res.identificador_general}`);
        this.identificadorGeneral = res.identificador_general;
        this.cargarGastos(this.identificadorGeneral);
      },
      error: (err) => {
        console.error('Error al guardar ítems:', err);
        alert('Error al guardar ítems.');
      },
    });
  }

  get total(): number {
    return this.items.reduce(
      (acc, item) => acc + (item.cantidad ?? 0) * (item.precio_unitario ?? 0),
      0
    );
  }

  validarFormatoDecimal(item: any): void {
    const valor = item.precio_unitario;
    const regex = /^\d+(\.\d{1,2})?$/;
    if (valor?.toString().startsWith('00')) {
      item.precio_unitario = 0;
    } else if (!regex.test(valor?.toString())) {
      item.precio_unitario = 0;
      this.formatoInvalido = true;
    } else {
      this.formatoInvalido = false;
    }
  }

  // Métodos para convertir el precio unitario de forma literal
  private convertirGrupo(n: number): string {
    let output = '';
    const centenas = Math.floor(n / 100);
    const decenas = Math.floor((n % 100) / 10);
    const unidades = n % 10;
    const decenasUnidades = n % 100;

    if (n === 100) return 'cien';

    if (centenas > 0) {
      output += this.literales_centenas[centenas] + ' ';
    }

    if (decenasUnidades <= 20) {
      output += this.literales_especiales[decenasUnidades];
    } else {
      output += this.literales_decenas[decenas];
      if (decenas === 2 && unidades !== 0) {
        // veintiuno, veintidós, ...
        output += this.literales_unidades[unidades];
      } else if (unidades !== 0) {
        output += ' y ' + this.literales_unidades[unidades];
      }
    }

    return output.trim();
  }

  numeroALetras(numero: number): string {
    if (numero === 0) return 'cero';
    if (numero > 999999999) return 'Número fuera de rango';

    let literal = '';

    const millones = Math.floor(numero / 1000000);
    const miles = Math.floor((numero % 1000000) / 1000);
    const cientos = numero % 1000;

    if (millones > 0) {
      if (millones === 1) {
        literal += 'un millón ';
      } else {
        literal += this.convertirGrupo(millones) + ' millones ';
      }
    }

    if (miles > 0) {
      if (miles === 1) {
        literal += 'mil ';
      } else {
        literal += this.convertirGrupo(miles) + ' mil ';
      }
    }

    if (cientos > 0) {
      literal += this.convertirGrupo(cientos);
    }

    return literal.trim();
  }

  numeroALetrasConDecimal(numero: number): string {
    if (isNaN(numero)) return '';

    const parteEntera = Math.floor(numero);
    const parteDecimal = Math.round((numero - parteEntera) * 100);

    let literal = this.numeroALetras(parteEntera);
    literal = literal.charAt(0).toUpperCase() + literal.slice(1);

    const decimalStr = parteDecimal.toString().padStart(2, '0');

    return `${literal} ${decimalStr}/100 bolivianos`;
  }

  onPrecioUnitarioChange(index: number) {
    const item = this.items[index];

    this.validarFormatoDecimal(item);
    const precio = item.precio_unitario;
    if (precio != undefined) {
      const literal = this.numeroALetrasConDecimal(precio);
      item.precio_literal =
        literal.charAt(0).toUpperCase() + literal.slice(1) + '.';
    }
  }

  // MODIFICACIÓN CLAVE AQUÍ: usar el 'item' recibido como argumento
  enviarAEcuacion(item: GastoOperacionExtendido): void {
    this.router.navigate(['panel-control/ecuacion'], {
      queryParams: {
        proyecto: this.nombreProyecto, // Puedes seguir enviando el nombre del proyecto general
        id_gasto: item.id, // Opcional: si la vista de ecuaciones necesita el ID específico
        descripcion: item.descripcion || '',
        unidad: item.unidad || '',
        cantidad: item.cantidad || 0,
        precio_unitario: item.precio_unitario || 0, // Añadido para que también se pueda usar
        precio_literal: item.precio_literal || '', // Añadido para que también se pueda usar
        // Puedes añadir más propiedades del 'item' según lo necesites en la vista de ecuaciones
      },
    });
  }
}
