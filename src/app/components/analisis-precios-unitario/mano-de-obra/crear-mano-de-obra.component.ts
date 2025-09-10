import { Component } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ServiciosService } from '../../../services/servicios.service';
import { ActivatedRoute } from '@angular/router';
import { ManoDeObra } from '../../../models/models';

@Component({
  selector: 'app-crear-mano-de-obra',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './crear-mano-de-obra.component.html',
  styleUrl: './crear-mano-de-obra.component.css',
})
export class CrearManoDeObraComponent {
  formulario: FormGroup;
  id_gasto_operaciones = 0;
  carga_social = 0;
  iva_efectiva = 0;
  porcentaje_global_100 = 0;

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
    this.formulario = this.fb.group({
      manoObra: this.fb.array([]),
      cargasSociales: [null, [Validators.required, Validators.min(0.55), Validators.max(0.7118)]],
      iva: [null, [Validators.required, Validators.min(0.01), Validators.max(1)]],
    });
    this.agregarManoObra();
  }

  ngOnInit(): void {
    this.recuperarUsuarioLocalStorage();
    this.route.queryParams.subscribe((params) => {
      this.id_gasto_operaciones = Number(params['id_gasto_operaciones']) || 0;
      this.carga_social = Number(params['carga_social']) || 0;
      this.iva_efectiva = Number(params['iva_efectiva']) || 0;
      this.porcentaje_global_100 = Number(params['porcentaje_global_100']) || 0;
      this.formulario.get('cargasSociales')?.setValue(this.carga_social);
      this.formulario.get('iva')?.setValue(this.iva_efectiva);
      this.formulario.get('porcentaje_global_100')?.setValue(this.porcentaje_global_100);
      if (this.id_gasto_operaciones) this.cargarManoDeObraExistente();
    });
  }
  unidadTexto(value: string): string {
    const map: { [key: string]: string } = {
      BLS: 'BLS – BOLSA',
      BRR: 'BRR – BARRA',
      CD: 'CD – CUADRILLA DIA.',
      CJA: 'CJA – CAJA',
      CNX: 'CNX – CONEXION',
      EVE: 'EVE – EVENTO',
      GL: 'GL – GALON',
      GLB: 'GLB – GLOBAL',
      HA: 'HA – HECTAREA',
      HDR: 'HDR – HOMBRES POR DIA',
      HH: 'HH – HOMBRES HORA',
      HR: 'HR – HORA',
      HRS: 'HRS – HORAS',
      'HY.': 'HY. – HOYO',
      JGO: 'JGO – JUEGO',
      KG: 'KG – KILOGRAMOS',
      KIT: 'KIT – KITS',
      KM: 'KM – KILOMETRO',
      KMB: 'KMB – KILOMETROS BERMA',
      LT: 'LT – LITROS',
      M: 'M – METRO',
      M2: 'M2 – METROS CUADRADOS',
      M3: 'M3 – METROS CUBICOS',
      M3K: 'M3K – METRO CUBICO POR KILOMETRO',
      MED: 'MED – MEDICION',
      MK: 'MK – MOTO KILOMETRO',
      ML: 'ML – METROS LINEALES',
      P2: 'P2 – PIE CUADRADO',
      PAR: 'PAR – UN PAR',
      PER: 'PER – PERSONAS',
      PIE: 'PIE – PIE LINEAL',
      PLA: 'PLA – PLANTIN',
      PTO: 'PTO – PUNTO',
      PZA: 'PZA – PIEZA',
      RLL: 'RLL – ROLLO',
      TLL: 'TLL – TALLER',
      TN: 'TN – TONELADA',
      TON: 'TON – TONELADAS',
      UND: 'UND – UNIDAD',
    };
    return map[value] || 'Seleccione unidad';
  }


  get manoObra(): FormArray {
    return this.formulario.get('manoObra') as FormArray;
  }
  get cargasSociales(): number {
    return this.formulario.get('cargasSociales')?.value;
  }
  get iva(): number {
    return this.formulario.get('iva')?.value;
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

  agregarManoObra(): void {
    this.manoObra.push(
      this.fb.group({
        descripcion: ['', Validators.required],
        unidad: ['', Validators.required],
        cantidad: [0, [Validators.required, Validators.min(0)]],
        precio_unitario: [0, [Validators.required, Validators.min(0)]],
        total: [{ value: 1, disabled: true }],
        esNuevo: [true],
        editarUnidad: [true],
      })
    );
  }

  cargarManoDeObraExistente(): void {
    this.servicio.getManoDeObraIDGasto(this.id_gasto_operaciones).subscribe((manoObra) => {
      this.manoObra.clear();
      manoObra.forEach((trabajo) => {
        this.manoObra.push(
          this.fb.group({
            id: [trabajo.id],
            descripcion: [trabajo.descripcion, Validators.required],
            unidad: [trabajo.unidad, Validators.required],
            cantidad: [trabajo.cantidad, [Validators.required, Validators.min(0)]],
            precio_unitario: [trabajo.precio_unitario, [Validators.required, Validators.min(0)]],
            total: [{ value: trabajo.total, disabled: true }],
            esNuevo: [false],
            editarUnidad: [false],
          })
        );
      });
    });
  }

  registrarItem(index: number): void {
    const trabajo = this.manoObra.at(index);
    if (trabajo.invalid) {
      trabajo.markAllAsTouched();
      return;
    }
    const nuevoTrabajo: ManoDeObra = {
      id: 0,
      id_gasto_operacion: this.id_gasto_operaciones,
      descripcion: trabajo.get('descripcion')?.value,
      unidad: trabajo.get('unidad')?.value,
      cantidad: trabajo.get('cantidad')?.value,
      precio_unitario: trabajo.get('precio_unitario')?.value,
      total: trabajo.get('total')?.value,
      creado_por: this.usuario_id,
      modificado_por: this.usuario_id,
    };
    this.servicio.createManoDeObra(nuevoTrabajo).subscribe((res) => {
      trabajo.patchValue({ id: res.id, esNuevo: false });
    });
  }

  actualizarItem(index: number): void {
    const trabajo = this.manoObra.at(index);
    if (trabajo.invalid || !trabajo.get('id')?.value) return;
    const trabajoActualizado: ManoDeObra = {
      id: trabajo.get('id')?.value,
      id_gasto_operacion: this.id_gasto_operaciones,
      descripcion: trabajo.get('descripcion')?.value,
      unidad: trabajo.get('unidad')?.value,
      cantidad: trabajo.get('cantidad')?.value,
      precio_unitario: trabajo.get('precio_unitario')?.value,
      total: trabajo.get('total')?.value,
      creado_por: this.usuario_id, // mantener el creador original
      modificado_por: this.usuario_id, // actualizar el modificador
    };
    this.servicio.updateManoDeObra(trabajoActualizado).subscribe();
  }

  eliminarItem(index: number): void {
    const trabajo = this.manoObra.at(index);
    if (trabajo.get('esNuevo')?.value) {
      this.manoObra.removeAt(index);
    } else {
      this.servicio.deleteManoDeObra(trabajo.get('id')?.value).subscribe(() => {
        this.manoObra.removeAt(index);
      });
    }
  }

  actualizarPrecioParcial(control: AbstractControl): void {
    const cantidad = control.get('cantidad')?.value || 0;
    const precio_unitario = control.get('precio_unitario')?.value || 0;
    control.get('total')?.setValue(cantidad * precio_unitario, { emitEvent: false });
  }
  onUnidadChange(control: AbstractControl): void {
    control.get('unidad')?.markAsTouched();
  }
  onCantidadChange(control: AbstractControl): void {
    control.get('cantidad')?.markAsTouched();
    this.actualizarPrecioParcial(control);
  }
  onPrecioUniChange(control: AbstractControl): void {
    control.get('precio_unitario')?.markAsTouched();
    this.actualizarPrecioParcial(control);
  }
  blockE(event: KeyboardEvent): void {
    if (['e', 'E', '+', '-'].includes(event.key)) event.preventDefault();
  }

  get subtotalManoObra(): number {
    return this.manoObra.controls.reduce((acc, control) => {
      const cantidad = control.get('cantidad')?.value || 0;
      const precio = control.get('precio_unitario')?.value || 0;
      return acc + cantidad * precio;
    }, 0);
  }
  get cargasManoObra(): number {
    return this.subtotalManoObra * (this.carga_social / this.porcentaje_global_100);
  }
  get ivaManoObra(): number {
    return (this.subtotalManoObra + this.cargasManoObra) * (this.iva_efectiva / this.porcentaje_global_100);
  }
  get totalManoObra(): number {
    const total = this.subtotalManoObra + this.cargasManoObra + this.ivaManoObra;
    const decimal = total % 1;
    const finalTotal = decimal >= 0.5 ? Math.round(total) : total;
    this.servicio.setTotalManoObra(finalTotal);
    return finalTotal;
  }
}