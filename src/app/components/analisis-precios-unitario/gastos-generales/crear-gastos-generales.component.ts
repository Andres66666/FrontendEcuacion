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
  usuario_id: number = 0; // Agregar propiedad para el ID del usuario
  nombre_usuario: string = '';
  apellido: string = '';
  mostrarPrecioMayor: boolean = true; 
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
    this.recuperarUsuario();
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
  recuperarUsuario() {
      const usuario = this.getUsuarioLocalStorage();
      if (usuario) {
        this.nombre_usuario = usuario.nombre || '';
        this.apellido = usuario.apellido || '';
        this.usuario_id = usuario.usuario_id || 0;
        const roles = this.servicio.getRolesFromLocalStorage();
        this.mostrarPrecioMayor = !this.tieneRolOcultarPrecio(roles);

        // Verificar si el usuario existe en la base de datos
        this.servicio
          .verificarUsuario(this.usuario_id)
          .subscribe((usuarioExistente) => {
            if (usuarioExistente) {
              const usuarioSeleccionado = this.usuarios.find(
                (u) => u.id === this.usuario_id
              );
              if (usuarioSeleccionado) {
                this.Form.patchValue({ usuario: usuarioSeleccionado });
              }
            }
          });
      }
    }
  tieneRolOcultarPrecio(roles: string[]): boolean {
      const rolesOcultarPrecio = ['Empleado', 'Cajero', 'JefeDeEmpleado'];
      return roles.some((rol) => rolesOcultarPrecio.includes(rol));
    }
    private getUsuarioLocalStorage() {
      if (typeof window !== 'undefined') {
        try {
          const usuario = localStorage.getItem('usuario');
          return usuario ? JSON.parse(usuario) : null;
        } catch (error) {
          console.error('Error al recuperar usuario de localStorage', error);
          return null;
        }
      }
      return null;
    }
  getUsuarios() {
    this.servicio.getUsuarios().subscribe((data) => {
      this.usuarios = data;
    });
  }

  registrarGastosGenerales(): void {
    if (!this.id_gasto_operaciones  && this.Form.valid) return;
    const { usuario } = this.Form.value;
    const nuevoGasto = {
      id: 0,
      id_gasto_operacion: this.id_gasto_operaciones,
      total: this.totalOperacion,
      fecha_creacion: new Date(),
      fecha_actualizacion: new Date(),
      
      creado_por: { ...usuario },
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

  // ...en tu componente...
    actualizarGastosGenerales(): void {
      if (!this.gastoExistente) return;
      const { usuario } = this.Form.value;
      const gastoActualizado: GastosGenerales = {
        id: this.gastoExistente.id,
        id_gasto_operacion: this.id_gasto_operaciones,
        total: this.totalOperacion,
        fecha_creacion: new Date(),
        fecha_actualizacion: new Date(),
        creado_por: { ...usuario },
        
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
    return this.Form.get('gastos_generales')?.value;
  }

  get totalGastosGenerales(): number {
    const suma = this.totalMateriales + this.totalManoObra + this.totalEquipos;
    return suma * (this.gastosGeneralesPorcentaje / this.porcentaje_global_100);
  }

  get sumaTotales(): number {
    return this.totalMateriales + this.totalManoObra + this.totalEquipos;
  }

  get totalOperacion(): number {
    return this.sumaTotales + this.totalGastosGenerales;
  }

  blockE(event: KeyboardEvent): void {
    if (['e', 'E', '+', '-'].includes(event.key)) event.preventDefault();
  }
}