import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ServiciosService } from '../../../services/servicios.service';
import { ActivatedRoute } from '@angular/router';
import { GastosGenerales, Usuario } from '../../../models/models';
import { OkComponent } from '../../mensajes/ok/ok.component';
import { ErrorComponent } from '../../mensajes/error/error.component';

@Component({
  selector: 'app-crear-gastos-generales',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, OkComponent, ErrorComponent],
  templateUrl: './crear-gastos-generales.component.html',
  styleUrls: ['./crear-gastos-generales.component.css'],
})
export class CrearGastosGeneralesComponent {
  id_gasto_operaciones = 0;
  gastos_generales = 0;
  porcentaje_global_100 = 0;

  gastoExistente: GastosGenerales | null = null;
  totalMateriales = 0;
  totalManoObra = 0;
  totalEquipos = 0;

  Form: FormGroup;
  usuario_id: number = 0;
  nombre_usuario: string = '';
  apellido: string = '';
  roles: string[] = [];
  permisos: string[] = [];

  mensajeExito = '';
  mensajeError = '';

  constructor(
    private fb: FormBuilder,
    private servicio: ServiciosService,
    private route: ActivatedRoute
  ) {
    this.Form = this.fb.group({
      usuario: [null, Validators.required],
    });
  }

  ngOnInit(): void {
    this.recuperarUsuarioLocalStorage();

    this.route.queryParams.subscribe((params) => {
      this.id_gasto_operaciones = Number(params['id_gasto_operaciones']) || 0;
      this.gastos_generales = Number(params['gastos_generales']) || 0;
      this.porcentaje_global_100 = Number(params['porcentaje_global_100']) || 0;
      this.Form.get('gastos_generales')?.setValue(this.gastos_generales);
      this.Form.get('porcentaje_global_100')?.setValue(this.porcentaje_global_100);

      this.cargarGastosGeneralesExistente();
    });

    this.servicio.totalMateriales$.subscribe((total) => (this.totalMateriales = total));
    this.servicio.totalManoObra$.subscribe((total) => (this.totalManoObra = total));
    this.servicio.totalEquipos$.subscribe((total) => (this.totalEquipos = total));
  }

  cargarGastosGeneralesExistente(): void {
    this.servicio.getGastosGenerales(this.id_gasto_operaciones).subscribe((gastos) => {
      this.gastoExistente = gastos.length > 0 ? gastos[0] : null;
    });
  }

  recuperarUsuarioLocalStorage() {
    const usuarioStr = localStorage.getItem('usuarioLogueado');
    if (!usuarioStr) return;

    try {
      const datosUsuario = JSON.parse(usuarioStr);
      this.usuario_id = datosUsuario.id ?? 0;
      this.nombre_usuario = datosUsuario.nombre ?? '';
      this.apellido = datosUsuario.apellido ?? '';
      this.roles = datosUsuario.rol ?? [];
      this.permisos = datosUsuario.permiso ?? [];
    } catch (error) {
      console.error('Error al parsear usuario desde localStorage', error);
    }
  }

  registrarGastosGenerales(): void {
    if (!this.id_gasto_operaciones) return;

    const nuevoGasto: GastosGenerales = {
      id: 0,
      id_gasto_operacion: this.id_gasto_operaciones,
      total: this.totalOperacion,
      creado_por: this.usuario_id,
      modificado_por: this.usuario_id,
    };

    this.servicio.createGasto(nuevoGasto).subscribe({
      next: (res) => {
        this.gastoExistente = res;
        this.mensajeExito = 'Gasto registrado correctamente.';
      },
      error: (err) => {
        console.error('Error al registrar gasto:', err);
        this.mensajeError = 'Error al registrar gasto.';
      },
    });
  }

  actualizarGastosGenerales(): void {
    if (!this.gastoExistente) return;

    const gastoActualizado: GastosGenerales = {
      id: this.gastoExistente.id,
      id_gasto_operacion: this.id_gasto_operaciones,
      total: this.totalOperacion,
      creado_por: this.gastoExistente.creado_por,
      modificado_por: this.usuario_id,
    };

    this.servicio.updateGasto(gastoActualizado).subscribe({
      next: () => {
        this.cargarGastosGeneralesExistente();
        this.mensajeExito = 'Gasto actualizado correctamente.';
      },
      error: (err) => {
        console.error('Error al actualizar gasto:', err);
        this.mensajeError = 'Error al actualizar gasto.';
      },
    });
  }

  manejarOk(): void {
    this.mensajeExito = '';
  }

  manejarError(): void {
    this.mensajeError = '';
  }

  // 🔹 Cálculos internos con todos los decimales
  get sumaTotales(): number {
    return (this.totalMateriales || 0) + (this.totalManoObra || 0) + (this.totalEquipos || 0);
  }

  get totalGastosGenerales(): number {
    return (this.sumaTotales * (this.gastos_generales / this.porcentaje_global_100));
  }

  get totalOperacion(): number {
    return this.sumaTotales + this.totalGastosGenerales;
  }

  // 🔹 Para mostrar los resultados redondeados
  formatearNumero(valor: number): string {
    return new Intl.NumberFormat('es-BO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor);
  }

  blockE(event: KeyboardEvent): void {
    if (['e', 'E', '+', '-'].includes(event.key)) event.preventDefault();
  }
}
