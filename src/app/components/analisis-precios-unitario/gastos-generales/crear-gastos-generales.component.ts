import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ServiciosService } from '../../../services/servicios.service';
import { ActivatedRoute } from '@angular/router';
import { GastosGenerales, Usuario } from '../../../models/models';

@Component({
  selector: 'app-crear-gastos-generales',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './crear-gastos-generales.component.html',
  styleUrl: './crear-gastos-generales.component.css',
})
export class CrearGastosGeneralesComponent {
  id_gasto_operaciones = 0;
  gastos_generales = 0;
  porcentaje_global_100 = 0;

  gastoExistente: GastosGenerales | null = null;
  totalMateriales = 0;
  totalManoObra = 0;
  totalEquipos = 0;
  usuarios: Usuario[] = [];


  Form: FormGroup;
  usuario_id: number = 0;
  nombre_usuario: string = '';
  apellido: string = '';
  roles: string[] = [];
  permisos: string[] = [];

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

    let datosUsuario: any = {};
    try {
      datosUsuario = JSON.parse(usuarioStr);
    } catch (error) {
      console.error('Error al parsear usuario desde localStorage', error);
      return;
    }
    this.usuario_id = datosUsuario.id ?? 0;
    this.nombre_usuario = datosUsuario.nombre ?? '';
    this.apellido = datosUsuario.apellido ?? '';
    this.roles = datosUsuario.rol ?? [];
    this.permisos = datosUsuario.permiso ?? [];
  }
  registrarGastosGenerales(): void {
    if (!this.id_gasto_operaciones) return;

    const nuevoGasto = {
      id: 0,
      id_gasto_operacion: this.id_gasto_operaciones,
      total: this.totalOperacion,
      creado_por: this.usuario_id, // solo creado_por en creación
      modificado_por: this.usuario_id, // inicializar modificado_por
    };

    this.servicio.createGasto(nuevoGasto).subscribe({
      next: (res) => {
        this.gastoExistente = res;
      },
      error: (err) => {
        console.error('Error al registrar gasto:', err);
      }
    });
  }

    
  actualizarGastosGenerales(): void {
    if (!this.gastoExistente) return;

    const gastoActualizado: GastosGenerales = {
      id: this.gastoExistente.id,
      id_gasto_operacion: this.id_gasto_operaciones,
      total: this.totalOperacion,
      creado_por: this.gastoExistente.creado_por, // 👈 mantener creado_por
      modificado_por: this.usuario_id, // 👈 solo modificado_por
    };

    this.servicio.updateGasto(gastoActualizado).subscribe({
      next: (res) => {
        this.cargarGastosGeneralesExistente();
      },
      error: (err) => {
        console.error('Error al actualizar gasto:', err);
      }
    });
  }

  get gastosGeneralesPorcentaje(): number {
    const val = this.Form.get('gastos_generales')?.value;
    return val != null && !isNaN(val) ? Number(val) : 0;
  }

  get totalGastosGenerales(): number {
  const suma = this.sumaTotales;
  return suma * (this.gastos_generales / this.porcentaje_global_100);
  }

  get sumaTotales(): number {
    return (this.totalMateriales || 0) + (this.totalManoObra || 0) + (this.totalEquipos || 0);
  }

  get totalOperacion(): number {
    return this.sumaTotales + this.totalGastosGenerales;
  }


  blockE(event: KeyboardEvent): void {
    if (['e', 'E', '+', '-'].includes(event.key)) event.preventDefault();
  }
}