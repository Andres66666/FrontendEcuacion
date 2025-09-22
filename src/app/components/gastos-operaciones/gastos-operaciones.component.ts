import { AfterViewInit, Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ServiciosService } from '../../services/servicios.service';
import { ExportService } from '../../services/export.service';
import { Proyecto, GastoOperacion, Modulo, GastosGenerales } from '../../models/models';
import { ConfirmacionComponent } from '../mensajes/confirmacion/confirmacion/confirmacion.component';
import { OkComponent } from '../mensajes/ok/ok.component';
import { ErrorComponent } from '../mensajes/error/error.component';
import { NumeroALetras } from '../../utils/numeroALetras';
import { UNIDADES, unidadTexto } from '../../models/unidades';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { map } from 'rxjs/operators';
import { ViewChild, ElementRef } from '@angular/core';
import { forkJoin } from 'rxjs';

  declare var bootstrap: any;
  interface GastoOperacionExtendido extends Partial<GastoOperacion> {
    esNuevo?: boolean;
    editarUnidad?: boolean;
    tipo?: 'modulo' | 'modulo_registrado' | 'gasto';  // Nuevo: distingue tipos
    codigo?: string;
    nombre?: string;
    editarModulo?: boolean;
    moduloId?: number | null;
    editar?: boolean;  // Al final de la interfaz
  }
  
@Component({
  selector: 'app-gastos-operaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmacionComponent, OkComponent, ErrorComponent, DragDropModule],
  templateUrl: './gastos-operaciones.component.html',
  styleUrls: ['./gastos-operaciones.component.css'],
})
export class GastosOperacionesComponent implements OnInit, AfterViewInit  {
  // 1. PROPIEDADES DE CONFIGURACIÓN DEL PROYECTO (parámetros del formulario)
  carga_social: number = 0;
  iva_efectiva: number = 0;
  herramientas: number = 0;
  gastos_generales: number = 0;
  iva_tasa_nominal: number = 0;
  it: number = 0;
  iue: number = 0;
  ganancia: number = 0;
  a_costo_venta: number = 0;
  b_margen_utilidad: number = 0;
  porcentaje_global_100: number = 100;
    // Propiedad para el nombre del proyecto (usada en ngModel)
  nombreProyecto: string = '';
  // 2. PROPIEDADES DE ESTADO DE UI Y MENSAJES
  // ✅ Mensajes y estado UI
  formatoInvalido = false;
  mostrarConfirmacion = false;
  tipoConfirmacion: 'proyecto' | 'item' | null = null;
  itemIndexAEliminar: number | null = null;
  mensajeConfirmacion = '';
  mensajeExito = '';
  mensajeError = '';
  mostrarLista = false;
  proyectosFiltrados: Proyecto[] = [];
  // 3. PROPIEDADES DE USUARIO LOGUEADO
  // ✅ Usuario logueado
  usuario_id = 0;
  nombre_usuario = '';
  apellido = '';
  roles: string[] = [];
  permisos: string[] = [];
  // 4. PROPIEDADES DE DATOS PRINCIPALES (proyectos, gastos, módulos)
  // ✅ Proyectos y gastos
  listaProyectos: Proyecto[] = [];
  proyectoSeleccionado: Proyecto | null = null;
  proyectoData: Partial<Proyecto> = {};
  items: GastoOperacionExtendido[] = [];
  totalOperacionPorGasto: { [id: number]: number } = {};
  identificadorGeneral = 0;
  // Nuevas propiedades para módulos
  modulos: Modulo[] = [];  // Lista de módulos del proyecto actual
  moduloSeleccionado: number | null = null;  // Para el modal de mover/asociar
  
  // Para ordenamiento
  modulosEnItems: GastoOperacionExtendido[] = [];
  // 5. PROPIEDADES AUXILIARES Y CONSTANTES
  unidades = UNIDADES;
  unidadTexto = unidadTexto;  // Propiedad para texto de unidades
  // 6. PROPIEDADES DE MODALES Y REFERENCIAS (ViewChild)
  modalNuevoProyecto: any;
  modalParametros: any;
  // --- NUEVAS VARIABLES PARA MODAL ---
  @ViewChild('modalMover') modalMoverRef!: ElementRef;
  modalMover: any;
  itemIndexAMover: number | null = null;
  nuevaPosicion: number = 1;

  // Métodos de ciclo de vida
  ngOnInit(): void {
    this.recuperarUsuarioLocalStorage();
    this.cargarProyectos();
    const ultimoProyectoStr = localStorage.getItem("ultimoProyectoSeleccionado");
    if (ultimoProyectoStr) {
      try {
        const proyectoGuardado: Proyecto = JSON.parse(ultimoProyectoStr);
        this.asignarProyecto(proyectoGuardado);
      } catch (error) {
        console.error("Error al cargar último proyecto", error);
      }
    }
    // Inicializar modales Bootstrap
    this.modalNuevoProyecto = new bootstrap.Modal(document.getElementById('modalNuevoProyecto'));
    this.modalParametros = new bootstrap.Modal(document.getElementById('modalParametros'));
    this.modalMover = new bootstrap.Modal(document.getElementById('modalMover'));
  }
  ngAfterViewInit() {
    this.modalMover = new bootstrap.Modal(document.getElementById('modalMover')!);
  }
  //Constructor y Propiedades Iniciales (No son métodos, pero relacionados)
  constructor(
    private router: Router,
    private servicios: ServiciosService,
    private exportService: ExportService
  ) {}
  //Métodos de Inicialización y Carga de Datos
  private recuperarUsuarioLocalStorage() {
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
  // Cargar todos los proyectos existentes
  cargarProyectos(): void {
    this.servicios.getIdentificadorGeneral().subscribe({
      next: res => this.listaProyectos = res,
      error: err => this.mostrarMensaje('error', 'No se pudieron cargar los proyectos existentes.')
    });
  }
  cargarGastos(idGeneral: number): void {
    if (!idGeneral) {
      this.items = [];
      this.modulosEnItems = [];
      return;
    }
    // Cargar módulos primero (ya maneja condicional)
    this.cargarModulos(idGeneral);
    
    // Esperar módulos cargados? No, como es async, usa el estado actual (se actualiza en next de getGastoOperacionID)
    this.servicios.getGastoOperacionID(idGeneral).subscribe({
      next: (res) => {
        const gastos: GastoOperacionExtendido[] = res.map(item => ({
          ...item,
          tipo: 'gasto' as const,
          esNuevo: false,
          editarModulo: false,
          editar: false,
          moduloId: item.modulo?.id ?? null  // Si no hay módulos, será null
        }));
        
        // Condicional: Si hay módulos, combinar; sino, solo gastos
        if (this.modulosEnItems.length > 0) {
          this.items = [...this.modulosEnItems, ...gastos];
        } else {
          this.items = [...gastos];  // Solo gastos, sin filas de módulos
        }
        // Preservar temporales existentes (si el usuario estaba agregando antes de recargar)
        const temporalesExistentes = this.items.filter(item => item.tipo === 'modulo');
        if (temporalesExistentes.length > 0) {
          this.items.push(...temporalesExistentes);
        }
        this.items.forEach(item => {
            if (!item.id) return;
            this.servicios.getGastosGenerales(item.id).pipe(
              map((gastos: GastosGenerales[]) => gastos.length > 0 ? gastos[0].total : 0)
            ).subscribe(total => {
              this.totalOperacionPorGasto[item.id!] = total;
              item.precio_unitario = total;
              item.precio_literal = NumeroALetras.convertirConDecimal(this.SumaPrecioUnitarioActividad(item));
            });
          });

        this.ordenarItemsPorModulos();  // Si no hay módulos, solo ordena gastos (sin agrupación)
      },
      error: (err) => {
        this.mostrarMensaje('error', 'Error al cargar gastos.');
        this.items = [];  // Reset si error
      }
    });
  }
  cargarModulos(idGeneral: number): void {
    if (!idGeneral) {
      this.modulos = [];
      this.modulosEnItems = [];  // Reset explícito
      return;
    }
    this.servicios.getModulosPorProyecto(idGeneral).subscribe({
      next: (modulos) => {
        this.modulos = modulos;
        if (modulos.length === 0) {
          // Opcional: Mensaje informativo (no error, solo info)
          console.log('Proyecto seleccionado no tiene módulos asociados. Solo se mostrarán gastos.');
          // this.mostrarMensaje('info', 'Este proyecto no tiene módulos. Puedes agregar uno con "Agregar Módulo".');  // Descomenta si quieres notificar al usuario
        }
        // Generar modulosEnItems solo si hay módulos
        this.modulosEnItems = modulos.length > 0 ? modulos.map(mod => ({
          id: mod.id,
          tipo: 'modulo_registrado' as const,
          codigo: mod.codigo,
          nombre: mod.nombre,
          esNuevo: false,
          editarModulo: false,
          editar: false,
          moduloId: mod.id
        } as GastoOperacionExtendido)) : [];
      },
      error: (err) => {
        console.error('Error al cargar módulos:', err);
        this.mostrarMensaje('error', 'Error al cargar módulos del proyecto.');
        this.modulos = [];
        this.modulosEnItems = [];
      }
    });
  }
  private asignarProyecto(proyecto: Proyecto | null) {
    if (!proyecto) {
      this.modulos = [];  // Reset módulos
       this.modulosEnItems = [];

      this.proyectoSeleccionado = null;
      this.proyectoData = {};
      this.items = [];
      this.identificadorGeneral = 0;
      this.nombreProyecto = '';

      // Reset de parámetros
      this.carga_social = 0;
      this.iva_efectiva = 0;
      this.herramientas = 0;
      this.gastos_generales = 0;
      this.iva_tasa_nominal = 0;
      this.it = 0;
      this.iue = 0;
      this.ganancia = 0;
      this.a_costo_venta = 0;
      this.b_margen_utilidad = 0;
      this.porcentaje_global_100 = 0;

      // 🔹 limpiar localStorage si no hay proyecto
      localStorage.removeItem("ultimoProyectoSeleccionado");
      return;
    }

    this.proyectoSeleccionado = proyecto;
    this.proyectoData = { ...proyecto };
    this.identificadorGeneral = proyecto.id_general;
    this.nombreProyecto = proyecto.NombreProyecto;

    // Asignar valores reales de los parámetros
    this.carga_social = proyecto.carga_social ?? 0;
    this.iva_efectiva = proyecto.iva_efectiva ?? 0;
    this.herramientas = proyecto.herramientas ?? 0;
    this.gastos_generales = proyecto.gastos_generales ?? 0;
    this.iva_tasa_nominal = proyecto.iva_tasa_nominal ?? 0;
    this.it = proyecto.it ?? 0;
    this.iue = proyecto.iue ?? 0;
    this.ganancia = proyecto.ganancia ?? 0;
    this.a_costo_venta = proyecto.a_costo_venta ?? 0;
    this.b_margen_utilidad = proyecto.b_margen_utilidad ?? 0;
    this.porcentaje_global_100 = proyecto.porcentaje_global_100 ?? 0;

    this.cargarGastos(this.identificadorGeneral);
    this.cargarModulos(this.identificadorGeneral);  // Nuevo: cargar módulos
    localStorage.setItem("ultimoProyectoSeleccionado", JSON.stringify(proyecto));
  }
  //  Métodos de Proyectos (CRUD y Gestión)
  onProyectoSeleccionado(): void {
    const proyecto = this.listaProyectos.find(
      p => p.NombreProyecto.toLowerCase() === (this.proyectoData.NombreProyecto ?? '').toLowerCase()
    );
    this.asignarProyecto(proyecto || null);
  }
  // Crear identificador si es necesario antes de agregar items
  crearIdentificadorSiEsNecesario(): void {
    if (this.identificadorGeneral !== 0) {
      this.agregarItem();
      return;
    }

    if (!this.validarProyectoCompleto()) return;

    this.mensajeConfirmacion = '¿Deseas registrar el proyecto?';
    this.tipoConfirmacion = 'proyecto';
    this.mostrarConfirmacion = true;
  }
  guardarProyecto() {
    if (!this.nombreProyecto.trim()) {
      this.mostrarModalError('Ingrese un nombre válido para el proyecto');
      return;
    }

    const proyectoPayload: Partial<Proyecto> = {
      NombreProyecto: this.nombreProyecto.trim(),
      carga_social: this.toNum(this.carga_social),
      iva_efectiva: this.toNum(this.iva_efectiva),
      herramientas: this.toNum(this.herramientas),
      gastos_generales: this.toNum(this.gastos_generales),
      iva_tasa_nominal: this.toNum(this.iva_tasa_nominal),
      it: this.toNum(this.it),
      iue: this.toNum(this.iue),
      ganancia: this.toNum(this.ganancia),
      a_costo_venta: this.toNum(this.a_costo_venta),
      b_margen_utilidad: this.toNum(this.b_margen_utilidad),
      porcentaje_global_100: this.toNum(this.porcentaje_global_100),
      creado_por: this.usuario_id,
      modificado_por: this.usuario_id
    };

    const observable = this.proyectoSeleccionado?.id_general
      ? this.servicios.updateIdentificadorGeneral({ ...proyectoPayload, id_general: this.proyectoSeleccionado.id_general } as Proyecto)
      : this.servicios.createIdentificadorGeneral(proyectoPayload);

    observable.subscribe({
      next: (resp) => {
        this.asignarProyecto(resp);

        // 🔹 Volver a cargar desde backend para tener lista REAL
        this.servicios.getIdentificadorGeneral().subscribe({
          next: (proyectos) => {
            this.listaProyectos = proyectos;
            this.filtrarProyectos(); // refrescar lista visible
          }
        });

        this.mostrarModalExito(
          this.proyectoSeleccionado?.id_general ? 'Proyecto actualizado' : 'Proyecto creado'
        );
      },
      error: err => this.mostrarModalError('Error al guardar proyecto: ' + (err.error?.error || 'Intente de nuevo'))
    });
  }

  registrarProyecto(): void {
    this.guardarProyecto();
  }
  registrarNuevoProyecto(): void {
    this.guardarProyecto();
  }
  guardarParametros(): void {
    this.guardarProyecto();
  }

  actualizarProyecto(): void {
    this.guardarProyecto();
  }
  duplicarProyecto(proyecto: Proyecto, event: Event): void {
    event.stopPropagation();

    const proyectoDuplicado: Partial<Proyecto> = {
      ...proyecto,
      id_general: 0,
      NombreProyecto: proyecto.NombreProyecto + ' (Copia)',
      creado_por: this.usuario_id,
      modificado_por: this.usuario_id
    };

    this.servicios.createIdentificadorGeneral(proyectoDuplicado).subscribe({
      next: (nuevoProyecto: Proyecto) => {
        this.servicios.getModulosPorProyecto(proyecto.id_general).subscribe({
          next: (modulosOriginales: Modulo[]) => {
            // Crear módulos uno a uno y esperar todos
            const observables = modulosOriginales.map(mod => {
              const nuevoModulo: Partial<Modulo> = {
                ...mod,
                id: 0,
                proyecto: nuevoProyecto.id_general,
                creado_por: this.usuario_id,
                modificado_por: this.usuario_id
              };
              return this.servicios.createModulo(nuevoModulo);
            });

            forkJoin(observables).subscribe({
              next: (modulosGuardados: Modulo[]) => {
                // Mapa id original -> id duplicado
                const mapaModulos = new Map<number, number>();
                modulosOriginales.forEach((modOriginal, idx) => {
                  mapaModulos.set(modOriginal.id!, modulosGuardados[idx].id!);
                });

                this.servicios.getGastoOperacionID(proyecto.id_general).subscribe({
                  next: (gastosOriginales: GastoOperacion[]) => {
                    // Mapear gastos originales a duplicados, usando modulo_id
                    const gastosDuplicados: (Partial<GastoOperacion> & { modulo_id?: number | null })[] = gastosOriginales.map(g => ({
                      ...g,
                      id: 0,
                      identificador: nuevoProyecto,
                      modulo_id: g.modulo ? mapaModulos.get(g.modulo.id!) ?? null : null,
                      creado_por: this.usuario_id,
                      modificado_por: this.usuario_id
                    }));

                    // Eliminar la propiedad 'modulo' para evitar conflicto
                    gastosDuplicados.forEach(g => delete (g as any).modulo);

                    this.servicios.createGastoOperacion(gastosDuplicados).subscribe({
                      next: (gastosGuardados: any) => {
                        gastosGuardados.gastos.forEach((gastoDuplicado: GastoOperacion, index: number) => {
                          const original = gastosOriginales[index];
                          this.duplicarSubItems(original.id, gastoDuplicado.id);
                        });

                        this.mostrarModalExito('Proyecto duplicado correctamente con módulos y gastos.');
                        this.filtrarProyectos();
                      },
                      error: (err: any) => this.mostrarModalError('Error al duplicar gastos: ' + (err.error?.error || 'Intente de nuevo'))
                    });
                  },
                  error: (err: any) => this.mostrarModalError('Error al obtener gastos originales: ' + (err.error?.error || 'Intente de nuevo'))
                });
              },
              error: (err: any) => this.mostrarModalError('Error al duplicar módulos: ' + (err.error?.error || 'Intente de nuevo'))
            });
          },
          error: (err: any) => this.mostrarModalError('Error al obtener módulos originales: ' + (err.error?.error || 'Intente de nuevo'))
        });
      },
      error: (err: any) => this.mostrarModalError('Error al duplicar proyecto: ' + (err.error?.error || 'Intente de nuevo'))
    });
  }
  // duplicar materiales, mano de obra, equipo y gastos generales
  duplicarSubItems(idGastoOriginal: number, idGastoDuplicado: number) {
    // Materiales
    this.servicios.getMaterialesIDGasto(idGastoOriginal).subscribe(materiales => {
      const nuevos = materiales.map(m => ({
        ...m,
        id: 0,
        id_gasto_operacion: idGastoDuplicado,
        creado_por: this.usuario_id
      }));
      this.servicios.createMateriales(nuevos).subscribe();
    });

    // Mano de obra
    this.servicios.getManoDeObraIDGasto(idGastoOriginal).subscribe(manos => {
      const nuevas = manos.map(m => ({
        ...m,
        id: 0,
        id_gasto_operacion: idGastoDuplicado,
        creado_por: this.usuario_id
      }));
      this.servicios.createManoDeObraLista(nuevas).subscribe();
    });

    // Equipo/Herramienta
    this.servicios.getEquipoHerramientas(idGastoOriginal).subscribe(equipos => {
      const nuevos = equipos.map(e => ({
        ...e,
        id: 0,
        id_gasto_operacion: idGastoDuplicado,
        creado_por: this.usuario_id
      }));
      this.servicios.createEquipoHerramientaLista(nuevos).subscribe();
    });

    // Gastos Generales
    this.servicios.getGastosGenerales(idGastoOriginal).subscribe(gastosGen => {
      const nuevos = gastosGen.map(g => ({
        ...g,
        id: 0,
        id_gasto_operacion: idGastoDuplicado,
        creado_por: this.usuario_id
      }));
      this.servicios.createGastosGeneralesLista(nuevos).subscribe();
    });
  }
  abrirModalParametros(verProyectoExistente: boolean) {
    if (verProyectoExistente && this.proyectoSeleccionado) {
      // Editar proyecto existente
      this.nombreProyecto = this.proyectoSeleccionado.NombreProyecto;
      this.carga_social = this.proyectoSeleccionado.carga_social ?? 0;
      this.iva_efectiva = this.proyectoSeleccionado.iva_efectiva ?? 0;
      this.herramientas = this.proyectoSeleccionado.herramientas ?? 0;
      this.gastos_generales = this.proyectoSeleccionado.gastos_generales ?? 0;
      this.iva_tasa_nominal = this.proyectoSeleccionado.iva_tasa_nominal ?? 0;
      this.it = this.proyectoSeleccionado.it ?? 0;
      this.iue = this.proyectoSeleccionado.iue ?? 0;
      this.ganancia = this.proyectoSeleccionado.ganancia ?? 0;
      this.a_costo_venta = this.proyectoSeleccionado.a_costo_venta ?? 0;
      this.b_margen_utilidad = this.proyectoSeleccionado.b_margen_utilidad ?? 0;
      this.porcentaje_global_100 = this.proyectoSeleccionado.porcentaje_global_100 ?? 100;
    } else {
      // Crear nuevo proyecto → limpiar campos
      this.proyectoSeleccionado = null;
      this.nombreProyecto = '';
      this.carga_social = 0;
      this.iva_efectiva = 0;
      this.herramientas = 0;
      this.gastos_generales = 0;
      this.iva_tasa_nominal = 0;
      this.it = 0;
      this.iue = 0;
      this.ganancia = 0;
      this.a_costo_venta = 0;
      this.b_margen_utilidad = 0;
      this.porcentaje_global_100 = 100;
    }

    const modalEl = document.getElementById('modalProyectoParametros');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }
  actualizarParametrosEnTiempoReal(): void {
    if (!this.proyectoSeleccionado) return;

    const proyectoPayload: Partial<Proyecto> = {
      id_general: this.proyectoSeleccionado.id_general,
      NombreProyecto: this.nombreProyecto.trim(),
      carga_social: this.toNum(this.carga_social),
      iva_efectiva: this.toNum(this.iva_efectiva),
      herramientas: this.toNum(this.herramientas),
      gastos_generales: this.toNum(this.gastos_generales),
      iva_tasa_nominal: this.toNum(this.iva_tasa_nominal),
      it: this.toNum(this.it),
      iue: this.toNum(this.iue),
      ganancia: this.toNum(this.ganancia),
      a_costo_venta: this.toNum(this.a_costo_venta),
      b_margen_utilidad: this.toNum(this.b_margen_utilidad),
      porcentaje_global_100: this.toNum(this.porcentaje_global_100),
      modificado_por: this.usuario_id
    };

    this.servicios.updateIdentificadorGeneral(proyectoPayload as Proyecto).subscribe({
      next: (resp) => {
        // Actualizar estado local y lista
        const proyectoActualizado = { ...this.proyectoSeleccionado, ...proyectoPayload } as Proyecto;
        this.asignarProyecto(proyectoActualizado);
        this.listaProyectos = this.listaProyectos.map(p =>
          p.id_general === proyectoActualizado.id_general ? proyectoActualizado : p
        );
      },
      error: err => {
        this.mostrarModalError('Error al actualizar parámetros: ' + (err.error?.error || 'Intente de nuevo'));
      }
    });
  }
  filtrarProyectos(): void {
    const termino = this.nombreProyecto.toLowerCase().trim();
    this.proyectosFiltrados = termino
      ? this.listaProyectos.filter(p =>
          p.NombreProyecto.toLowerCase().includes(termino)
        )
      : [...this.listaProyectos]; // si input vacío → mostrar todos
  }
  seleccionarProyecto(proyecto: Proyecto): void {
    this.nombreProyecto = proyecto.NombreProyecto; // Esto mantiene el nombre en el input
    this.asignarProyecto(proyecto);
    this.mostrarLista = false; // cerrar dropdown
  }
  focusInput() { this.proyectosFiltrados = [...this.listaProyectos]; this.mostrarLista = true; }

 /// /* Métodos de Módulos (CRUD y Gestión) */
  agregarModulo(): void {
    if (!this.identificadorGeneral) {
      this.mostrarMensaje('error', 'Selecciona un proyecto primero para agregar módulos.');
      return;
    }
    const nuevoModulo: GastoOperacionExtendido = {
      tipo: 'modulo',
      codigo: '',
      nombre: '',
      esNuevo: true,
      editar: false
    };
    this.items.push(nuevoModulo);
    this.ordenarItemsPorModulos();  // Reordena preservando el temporal
    this.items = [...this.items];  // NUEVO: Fuerza change detection de Angular para renderizar inmediatamente
  }
  registrarModulo(index: number): void {
    const item = this.items[index];
    if (!this.identificadorGeneral) {
      this.mostrarMensaje('error', 'Selecciona un proyecto primero.');
      return;
    }
    if (!item.codigo?.trim() || !item.nombre?.trim()) {
      this.mostrarMensaje('error', 'Código y nombre del módulo son obligatorios.');
      return;
    }
    const payload: Partial<Modulo> = {
      proyecto: this.identificadorGeneral,  // Asocia explícitamente al proyecto
      codigo: item.codigo.trim(),
      nombre: item.nombre.trim(),
      creado_por: this.usuario_id,
      modificado_por: this.usuario_id
    };
    this.servicios.createModulo(payload).subscribe({
      next: (moduloCreado) => {
        this.mostrarMensaje('exito', 'Módulo registrado correctamente.');
        // Actualizar fila temporal a registrada
        this.items[index] = {
          ...item,
          id: moduloCreado.id,
          tipo: 'modulo_registrado',
          esNuevo: false,  // NUEVO: Reset para vista fija
          editar: false,   // Inicializa edición off
          editarModulo: false,
          moduloId: moduloCreado.id
        };
        this.modulos.push(moduloCreado);
        // Actualizar modulosEnItems solo con módulos del proyecto actual
        this.modulosEnItems = this.modulos.map(mod => ({
          id: mod.id,
          tipo: 'modulo_registrado' as const,
          codigo: mod.codigo,
          nombre: mod.nombre,
          esNuevo: false,
          editar: false,  // NUEVO: Inicializa explícitamente
          editarModulo: false,
          moduloId: mod.id
        } as GastoOperacionExtendido));
        this.ordenarItemsPorModulos();
        this.items = [...this.items];
      },
      error: (err) => {
        this.mostrarMensaje('error', 'Error al registrar módulo: ' + (err.error?.error || 'Verifica los datos.'));
      }
    });
  }
  editarModulo(index: number): void {
    const item = this.items[index];
    if (item.tipo !== 'modulo_registrado') {
      return;
    }
    // Activar modo edición
    (item as GastoOperacionExtendido).editar = true;  // Cast para seguridad
  }
  actualizarModuloRegistrado(index: number): void {
    const item = this.items[index];
    if (item.tipo !== 'modulo_registrado' || !(item as GastoOperacionExtendido).editar) {
      return;
    }
    if (!item.codigo?.trim() || !item.nombre?.trim()) {
      this.mostrarMensaje('error', 'Código y nombre del módulo son obligatorios.');
      (item as GastoOperacionExtendido).editar = false;
      return;
    }
    const payload: Partial<Modulo> = {
      codigo: item.codigo.trim(),
      nombre: item.nombre.trim(),
      modificado_por: this.usuario_id
    };
    this.servicios.updateModulo(item.id!, payload).subscribe({
      next: (moduloActualizado) => {
        // Actualizar en item y listas
        item.codigo = moduloActualizado.codigo;
        item.nombre = moduloActualizado.nombre;
        (item as GastoOperacionExtendido).editar = false;  // Salir de modo edición
        this.modulos = this.modulos.map(m => m.id === item.id ? moduloActualizado : m);
        this.modulosEnItems = this.modulosEnItems.map(m => m.id === item.id ? { ...m, codigo: moduloActualizado.codigo, nombre: moduloActualizado.nombre } : m);
        this.mostrarMensaje('exito', 'Módulo actualizado correctamente.');
        this.ordenarItemsPorModulos();  // Reagrupar si cambia
      },
      error: (err) => {
        this.mostrarMensaje('error', 'Error al actualizar módulo: ' + (err.error?.error || 'Intente de nuevo.'));
        (item as GastoOperacionExtendido).editar = false;  // Resetear
      }
    });
  }
  eliminarModulo(index: number): void {
    const item = this.items[index];
    if (item.tipo !== 'modulo_registrado') {
      return;
    }
    // Confirmación (usa confirm() simple; reemplaza con tu modal si tienes)
    if (!confirm(`¿Eliminar módulo "${item.nombre}"? Los gastos se desasociarán (no se eliminarán).`)) {
      return;
    }
    this.servicios.deleteModulo(item.id!).subscribe({
      next: () => {
        // Remover de modulos y items
        this.modulos = this.modulos.filter(m => m.id !== item.id);
        this.modulosEnItems = this.modulosEnItems.filter(m => m.id !== item.id);
        this.items.splice(index, 1);  // Remover fila de módulo
        // Desasociar gastos: Setear moduloId = null y actualizar backend
        const gastosDelModulo = this.items.filter(g => g.moduloId === item.id && g.tipo === 'gasto');
        gastosDelModulo.forEach(gasto => {
          if (gasto.id) {  // Solo si es registrado
            gasto.moduloId = null;
            gasto.modulo = null;
            // Actualizar backend para desasociar
            this.servicios.moverGastoAModulo(gasto.id, null).subscribe({
              next: () => {},  // Silencioso
              error: (err) => console.error('Error desasociando gasto:', err)  // Log solo
            });
          }
        });
        this.mostrarMensaje('exito', 'Módulo eliminado correctamente. Gastos desasociados.');
        this.ordenarItemsPorModulos();  // Reagrupar (gastos a "sin módulo")
        this.items = [...this.items];  // Refrescar UI
      },
      error: (err) => {
        this.mostrarMensaje('error', 'Error al eliminar módulo: ' + (err.error?.error || 'Intente de nuevo.'));
      }
    });
  }
  cancelarEdicion(index: number): void {
    const item = this.items[index];
    if (item.tipo !== 'modulo_registrado') {
      return;
    }
    // Resetear modo edición (sin guardar cambios)
    (item as GastoOperacionExtendido).editar = false;
    // Opcional: Restaurar valores originales si los guardaste en una prop temporal
    // item.codigo = item.codigoOriginal;  // Si implementas backup
    this.mostrarMensaje('exito', 'Edición cancelada.');
  }
  // Método auxiliar: obtenerNombreModulo
  obtenerNombreModulo(modulo: Modulo | null): string {
    return modulo ? `${modulo.codigo} - ${modulo.nombre}` : 'Sin módulo';
  }
  getGastosCount(moduloId: number): number {
    return this.items.filter(item => 
      item.tipo === 'gasto' && item.moduloId === moduloId
    ).length;
  }
  // /* Métodos de Ítems/Gastos (CRUD y Gestión) */
    // Método corregido: agregarItem (inicializa módulo)
  agregarItem(): void {
    if (!this.identificadorGeneral) {
      this.mostrarMensaje('error', 'Selecciona o registra un proyecto primero para agregar ítems.');
      this.abrirModalParametros(false);  // Opcional: Abre modal para crear proyecto
      return;
    }
    this.items.push({
      descripcion: '',
      unidad: '',
      cantidad: 0,
      precio_unitario: 0,
      precio_literal: '',
      esNuevo: true,
      editarModulo: true,  // Editable por defecto para nuevos
      editarUnidad: true,  // Inicializa edición de unidad
      tipo: 'gasto',  // Tipo explícito para nuevo gasto
      modulo: null,
      moduloId: null
    });
    this.ordenarItemsPorModulos();  // Reagrupar inmediatamente (agrega al final si no hay módulos)
  }
    // Método corregido: registrarItem (usa modulo_id)
  registrarItem(index: number): void {
    const item = this.items[index];
    if (!this.identificadorGeneral) {
      this.mostrarMensaje('error', 'Selecciona un proyecto primero.');
      return;
    }
    const payload: Partial<GastoOperacion> & { modulo_id?: number | null } = {
      ...item,
      identificador: {
        ...this.proyectoData,
        id_general: this.identificadorGeneral,
        NombreProyecto: this.nombreProyecto?.trim() ?? ''
      } as Proyecto,
      modulo_id: item.moduloId ?? null,  // Usa ID (number | null)
      creado_por: this.usuario_id,
      modificado_por: this.usuario_id
    };
    delete payload.modulo;  // Evita conflicto
    this.servicios.createGastoOperacion([payload]).subscribe({
      next: (res) => {
        const nuevoItem = { ...res.gastos[0], esNuevo: false, editarModulo: false, moduloId: res.gastos[0].modulo?.id ?? null };
        this.items[index] = nuevoItem;
        this.identificadorGeneral = res.identificador_general;
        this.mostrarMensaje('exito', 'Ítem registrado correctamente.');
      },
      error: (err) => this.mostrarMensaje('error', 'Error al registrar el ítem: ' + (err.error?.error || 'Verifica los datos enviados'))
    });
  }
  actualizarItem(index: number): void {
    const item = this.items[index];
    const payload: Partial<GastoOperacion> & { modulo_id?: number | null } = {
      ...item,
      cantidad: Number(item.cantidad),
      precio_unitario: Number(item.precio_unitario),
      modulo_id: item.moduloId ?? null,  // Usa ID (number | null)
      modificado_por: this.usuario_id,
      id: item.id  // Para update
    };
    delete payload.modulo;  // Evita conflicto
    this.servicios.updateGastoOperacion(payload).subscribe({
      next: (updatedItem) => {
        this.items[index] = { ...item, ...updatedItem, esNuevo: false, editarModulo: false, moduloId: updatedItem.modulo?.id ?? null };
        this.mostrarMensaje('exito', 'Ítem actualizado correctamente.');
      },
      error: (err) => this.mostrarMensaje('error', 'Error al actualizar el ítem: ' + (err.error?.error || 'Verifica los datos enviados'))
    });
  }
  eliminarItem(index: number): void {
    const item = this.items[index];
    if (!item.id) {  // Ítem nuevo/no guardado: Remover local
      this.items.splice(index, 1);
      this.mostrarMensaje('exito', 'Ítem eliminado.');
      return;
    }
    // Ítem guardado: Confirmar y eliminar backend
    this.mensajeConfirmacion = '¿Seguro que deseas eliminar este ítem?';
    this.tipoConfirmacion = 'item';  // Asume que tienes estas props para modal
    this.itemIndexAEliminar = index;
    this.mostrarConfirmacion = true;  // Muestra tu modal de confirmación
  }
  actualizarItemEnTiempoReal(item: GastoOperacionExtendido): void {
    if (!item.id) return; // Solo actualizar si ya está registrado

    const index = this.items.findIndex(i => i === item);
    if (index === -1) return;

    const payload: Partial<GastoOperacion> & { modulo_id?: number | null } = {
      ...item,
      cantidad: Number(item.cantidad),
      precio_unitario: Number(item.precio_unitario),
      modulo_id: item.moduloId ?? null,
      modificado_por: this.usuario_id,
      id: item.id
    };
    delete payload.modulo;

    this.servicios.updateGastoOperacion(payload).subscribe({
      next: (updatedItem) => {
        this.items[index] = { ...item, ...updatedItem, esNuevo: false, editarModulo: false, moduloId: updatedItem.modulo?.id ?? null };
        this.mostrarMensaje('exito', 'Ítem actualizado en tiempo real.');
      },
      error: (err) => this.mostrarMensaje('error', 'Error al actualizar ítem: ' + (err.error?.error || 'Intente de nuevo'))
    });
  }
  // Nuevo método: Actualizar módulo en el ítem al cambiar el select
  actualizarModulo(item: GastoOperacionExtendido): void {
    if (item.moduloId === null || item.moduloId === undefined) {
      item.modulo = null;
    } else {
     item.modulo = this.modulos.find(m => m.id === item.moduloId) || null;
    }
    // Opcional: Si es un ítem existente, actualizar en backend inmediatamente
    if (item.id && !item.esNuevo) {
     this.actualizarItem(this.items.indexOf(item));  // Reutiliza método existente
    }
  }
  obtenerNumero(index: number): number {
    // Contar solo gastos hasta esta posición (ignora módulos)
    return this.items
      .slice(0, index + 1)
      .filter(item => item.tipo === 'gasto').length;  // Solo 'gasto'
  }
  ///* Métodos de UI, Modales y Drag-Drop */
  drop(event: CdkDragDrop<any[]>) {
    moveItemInArray(this.items, event.previousIndex, event.currentIndex);
    // Si se movió un gasto, actualizar su moduloId si cruza módulos (opcional)
    const itemMovido = this.items[event.currentIndex];
    if (itemMovido.tipo === 'gasto' && event.currentIndex > 0) {
      const moduloAnterior = this.items[event.currentIndex - 1];
      if (moduloAnterior.tipo === 'modulo_registrado') {
        itemMovido.moduloId = moduloAnterior.id;
        // Opcional: Actualizar en backend
        if (itemMovido.id) this.actualizarItem(event.currentIndex);
      }
    }
    this.ordenarItemsPorModulos();  // Reagrupar si es necesario
    this.items = [...this.items];
  }
  private ordenarItemsPorModulos(): void {
    // Separar: Módulos registrados, temporales, y gastos
    const modulosRegistrados = this.items.filter(item => item.tipo === 'modulo_registrado');
    const modulosTemporales = this.items.filter(item => item.tipo === 'modulo');  // NUEVO: Preserva temporales
    const gastos = this.items.filter(item => item.tipo === 'gasto');

    const itemsOrdenados: GastoOperacionExtendido[] = [];
    
    // Ordenar registrados por ID
    modulosRegistrados.sort((a, b) => (a.id! > b.id!) ? 1 : -1);
    
    // Ordenar temporales por índice original (o simple, ya que son pocos)
    modulosTemporales.sort((a, b) => this.items.indexOf(a) - this.items.indexOf(b));

    if (modulosRegistrados.length > 0 || modulosTemporales.length > 0) {
      // Hay módulos (registrados o temporales): Agrupar
      // Primero: Registrados + sus gastos
      modulosRegistrados.forEach(modulo => {
        itemsOrdenados.push(modulo);
        const gastosDelModulo = gastos.filter(g => g.moduloId === modulo.id);
        gastosDelModulo.sort((a, b) => (a.id! > b.id!) ? 1 : -1);
        itemsOrdenados.push(...gastosDelModulo);
      });
      
      // Luego: Temporales (al final de registrados, como "propuestas nuevas")
      itemsOrdenados.push(...modulosTemporales);
      
      // Finalmente: Gastos sin módulo
      const gastosSinModulo = gastos.filter(g => !g.moduloId);
      gastosSinModulo.sort((a, b) => (a.id! > b.id!) ? 1 : -1);
      itemsOrdenados.push(...gastosSinModulo);
    } else {
      // No hay módulos: Solo ordena todos los gastos (sin agrupación)
      gastos.sort((a, b) => (a.id! > b.id!) ? 1 : -1);
      itemsOrdenados.push(...gastos);
    }

    this.items = itemsOrdenados;
  }
  abrirModalMover(index: number): void {
    this.itemIndexAMover = index;
    const item = this.items[index];
    this.moduloSeleccionado = item.modulo?.id ?? null;  // Corregido: usa modulo.id en lugar de moduloId
    if (!item.id) {
      this.mostrarMensaje('error', 'Registra el ítem primero para asociarlo a un módulo.');
      return;
    }
    this.modalMover.show();
  }
  confirmarMoverModulo(): void {
    if (this.itemIndexAMover === null || !this.items[this.itemIndexAMover!]?.id) return;
    const gastoId = this.items[this.itemIndexAMover!].id!;
    this.servicios.moverGastoAModulo(gastoId, this.moduloSeleccionado).subscribe({
      next: (gastoActualizado) => {
        const item = this.items[this.itemIndexAMover!];
        item.modulo = this.modulos.find(m => m.id === this.moduloSeleccionado) || null;
        item.moduloId = this.moduloSeleccionado;
        this.mostrarMensaje('exito', 'Gasto asociado correctamente.');
        this.modalMover.hide();
        this.ordenarItemsPorModulos();  // Reagrupar después de mover
        this.items = [...this.items];
      },
      error: (err) => {
        this.mostrarMensaje('error', 'Error al asociar gasto: ' + (err.error?.error || 'Intente de nuevo.'));
        this.modalMover.hide();
      }
    });
  }
  moverItem() {
    if (this.itemIndexAMover === null) return;

    const fromIndex = this.itemIndexAMover;
    let toIndex = this.nuevaPosicion - 1; // convertir a base 0

    // Validar límites
    if (toIndex < 0) toIndex = 0;
    if (toIndex >= this.items.length) toIndex = this.items.length - 1;

    // Mover dentro del array
    const [item] = this.items.splice(fromIndex, 1);
    this.items.splice(toIndex, 0, item);

    // 🔹 refrescar array para Angular
    this.items = [...this.items];

    // Cerrar modal
    this.modalMover.hide();
  }
  @HostListener('document:click', ['$event'])
  clickFuera(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.mb-3')) this.mostrarLista = false;
  }

  ///* Métodos de Confirmación y Mensajes */
  confirmarEliminacion(): void {
    const index = this.itemIndexAEliminar!;
    const item = this.items[index];
    
    if (item.tipo === 'modulo') {
      // Módulo temporal: Remover local sin backend
      this.items.splice(index, 1);
      this.mostrarMensaje('exito', 'Módulo temporal eliminado.');
    } else if (item.tipo === 'modulo_registrado') {
      // Llama eliminarModulo para lógica especial (backend + desasociar gastos)
      this.eliminarModulo(index);
    } else if (item.tipo === 'gasto' && item.id) {
      // Eliminar gasto via backend
      this.servicios.deleteGastoOperacion(item.id).subscribe({
        next: () => {
          this.items.splice(index, 1);
          this.mostrarMensaje('exito', 'Gasto eliminado correctamente.');
          this.ordenarItemsPorModulos();
          this.items = [...this.items];  // Fuerza re-renderizado
        },
        error: (err) => this.mostrarMensaje('error', 'Error al eliminar gasto: ' + (err.error?.error || 'Intente de nuevo.'))
      });
    } else {
      // Ítem temporal (gasto nuevo o otros): Remover local
      this.items.splice(index, 1);
      this.mostrarMensaje('exito', 'Ítem eliminado.');
    }
    
    // Reset modal (siempre al final, incluso si hay async)
    this.mostrarConfirmacion = false;
    this.itemIndexAEliminar = null;
    this.tipoConfirmacion = null;
    
    // Reagrupar si no fue async (para casos locales)
    if (item.tipo !== 'gasto' || !item.id) {
      this.ordenarItemsPorModulos();
      this.items = [...this.items];
    }
  }
  manejarAceptar() {
    this.mostrarConfirmacion = false;

    if (this.tipoConfirmacion === 'proyecto') {
      if (this.identificadorGeneral === 0) {
        // Registrar nuevo proyecto
        this.registrarProyecto();
      } else {
        // Eliminar proyecto existente SOLO desde el backend
        this.servicios.deleteIdentificadorGeneral(this.identificadorGeneral).subscribe({
          next: () => {
            // 🔹 Recargar lista REAL desde el backend
            this.servicios.getIdentificadorGeneral().subscribe({
              next: (proyectos) => {
                this.listaProyectos = proyectos;
                this.filtrarProyectos();
              },
              error: () => this.mostrarMensaje('error', 'Error al recargar proyectos.')
            });

            this.asignarProyecto(null); // limpiar selección
            this.mostrarMensaje('exito', 'Proyecto eliminado correctamente.');
          },
          error: () => this.mostrarMensaje('error', 'Error al eliminar el proyecto.')
        });
      }
    }

    if (this.tipoConfirmacion === 'item' && this.itemIndexAEliminar !== null) {
      const item = this.items[this.itemIndexAEliminar];
      this.servicios.deleteGastoOperacion(item.id!).subscribe({
        next: () => {
          this.mostrarMensaje('exito', 'Ítem eliminado correctamente.');
          this.items.splice(this.itemIndexAEliminar!, 1);
        },
        error: () => this.mostrarMensaje('error', 'Error al eliminar el ítem.')
      });
      this.confirmarEliminacion();
      return;  // Evita ejecutar más código
    }

    this.tipoConfirmacion = null;
    this.itemIndexAEliminar = null;
  }
  manejarCancelar() {
    this.mostrarConfirmacion = false;
    this.tipoConfirmacion = null;
    this.itemIndexAEliminar = null;
  }
  manejarOk() {
    this.mensajeExito = '';
  }

  manejarError() {
    this.mensajeError = '';
  }
  private mostrarMensaje(tipo: 'exito' | 'error', mensaje: string, duracion = 20000) {
    if (tipo === 'exito') this.mensajeExito = mensaje;
    else this.mensajeError = mensaje;

    setTimeout(() => {
      if (tipo === 'exito') this.mensajeExito = '';
      else this.mensajeError = '';
    }, duracion);
  }
  private mostrarModalExito(mensaje: string, duracion = 2000) {
    this.mensajeExito = mensaje;
    const modalEl = document.getElementById('modalOk');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();

    setTimeout(() => modal.hide(), duracion);
  }
  private mostrarModalError(mensaje: string, duracion = 2000) {
    this.mensajeError = mensaje;
    const modalEl = document.getElementById('modalError');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();

    setTimeout(() => modal.hide(), duracion);
  }
  private validarProyectoCompleto(): boolean {
    for (const key in this.proyectoData) {
      if (this.proyectoData[key as keyof Proyecto] === null || this.proyectoData[key as keyof Proyecto] === '') {
        this.mostrarMensaje('error', 'Completa todos los campos');
        return false;
      }
    }
    return true;
  }
  // /* Getters y Cálculos (Propiedades Computadas) */  
  get mostrarColumnaModulo(): boolean {
    // Retorna true si hay al menos un gasto sin módulo asignado
    return this.items.some(item => item.tipo === 'gasto' && (!item.moduloId || item.moduloId === null));
  }
  get total(): number {
    return this.items.reduce((acc, item) => acc + this.MultiplicacionPrecioUnitarioActividadPORcantidad(item), 0);
  }
  get totalLiteral(): string {
    return NumeroALetras.convertirConDecimal(this.total);
  }

  get totalGastosOperacionGeneral(): number {
  return this.items
    .filter(item => item.tipo === 'gasto')  // ← NUEVO: Filtra solo gastos (ignora módulos y temporales)
    .reduce((acc, item) => acc + this.toNum(item.precio_unitario), 0);  // Suma simple de precio_unitario
  }

  get totalValorAgregado(): number {  
    return this.items
       .filter(item => item.tipo === 'gasto')
       .reduce((acc, item) => acc + this.toNum(this.getValorAgregado(item)), 0);  // ← Agrega toNum aquí
   }
   
  getCostoVenta(item: GastoOperacionExtendido): number {
    const precio = this.toNum(item.precio_unitario);
    const ivaNominal = this.toNum(this.proyectoData.iva_tasa_nominal);
    const porcentajeGlobal = this.toNum(this.proyectoData.porcentaje_global_100);

    return precio - (precio * (ivaNominal / porcentajeGlobal));
  }
  getMargenUtilidad(item: GastoOperacionExtendido): number {
    if (this.toNum(this.proyectoData.a_costo_venta) === 0) return 0;

    const margen = this.toNum(this.proyectoData.b_margen_utilidad);
    const aCosto = this.toNum(this.proyectoData.a_costo_venta);
    const porcentajeGlobal = this.toNum(this.proyectoData.porcentaje_global_100);

    return ((margen / porcentajeGlobal) / (aCosto / porcentajeGlobal)) * this.getCostoVenta(item);
  }
  getIvaEfectivaCalculo(): number {
    const ivaNominal = this.toNum(this.proyectoData.iva_tasa_nominal);
    const aCosto = this.toNum(this.proyectoData.a_costo_venta);
    const margen = this.toNum(this.proyectoData.b_margen_utilidad);

    return ivaNominal / (aCosto + margen);
  }
  getIvaEfectiva(item: GastoOperacionExtendido): number {
    return (this.getCostoVenta(item) + this.getMargenUtilidad(item)) * this.getIvaEfectivaCalculo();
  }
  getPrecioFactura(item: GastoOperacionExtendido): number {
    return this.getCostoVenta(item) + this.getMargenUtilidad(item) + this.getIvaEfectiva(item);
  }
  getValorAgregado(item: GastoOperacionExtendido): number {
    const valor = this.getPrecioFactura(item) - this.toNum(item.precio_unitario);
    return this.roundTo(valor, 2);
  }
  SumaPrecioUnitarioActividad(item: GastoOperacionExtendido): number {
    return this.roundTo(this.toNum(item.precio_unitario) + this.getValorAgregado(item), 2);
  }
  MultiplicacionPrecioUnitarioActividadPORcantidad(item: GastoOperacionExtendido): number {
    return this.roundTo(this.SumaPrecioUnitarioActividad(item) * this.toNum(item.cantidad), 2);
  }

  ///* Métodos de Navegación y Exportación */
    // -------------------- NAVEGACION --------------------
  enviarAEcuacion(item: GastoOperacionExtendido): void {
    const params: any = {
      proyecto: this.nombreProyecto || '',
      id_gasto_operaciones: item.id || 0,
      descripcion: item.descripcion || '',
      unidad: item.unidad || '',
      cantidad: item.cantidad || 0,
      precio_unitario: item.precio_unitario || 0,
      precio_literal: item.precio_literal || '',
      identificadorGeneral: this.identificadorGeneral || 0,
      // Parámetros de proyecto
      carga_social: this.carga_social || 0,
      iva_efectiva: this.iva_efectiva || 0,
      herramientas: this.herramientas || 0,
      gastos_generales: this.gastos_generales || 0,
      porcentaje_global_100: this.porcentaje_global_100 || 0
    };

    this.router.navigate(['panel-control/CrearEcuacion'], { queryParams: params });
  }

  enviarTotalGastosGenerales(item: GastoOperacionExtendido): void {
    const params: any = {
      id_gasto_operaciones: item.id || 0,
      precio_unitario: item.precio_unitario || 0,
      identificadorGeneral: this.identificadorGeneral || 0,
      // Parámetros de proyecto
      iva_tasa_nominal: this.iva_tasa_nominal || 0,
      it: this.it || 0,
      iue: this.iue || 0,
      ganancia: this.ganancia || 0,
      a_costo_venta: this.a_costo_venta || 0,
      b_margen_utilidad: this.b_margen_utilidad || 0,
      porcentaje_global_100: this.porcentaje_global_100 || 0
    };

    this.router.navigate(['panel-control/PrecioFactura'], { queryParams: params });
  }
    // Enviar totales a vista PrecioFactura
  enviarTotalesAFactura(): void {
    const params: any = {
      identificadorGeneral: this.identificadorGeneral || 0,
      totalGastosOperacion: this.totalGastosOperacionGeneral,
      totalValorAgregado: this.totalValorAgregado,
      totalFactura: this.total,

      iva_tasa_nominal: this.iva_tasa_nominal || 0,
      it: this.it || 0,
      iue: this.iue || 0,
      ganancia: this.ganancia || 0,
      a_costo_venta: this.a_costo_venta || 0,
      b_margen_utilidad: this.b_margen_utilidad || 0,
      porcentaje_global_100: this.porcentaje_global_100 || 0
    };
    this.router.navigate(['panel-control/PrecioFactura'], { queryParams: params });
  }
  exportPDF() { this.exportService.generatePDF('contentToExport', 'factura.pdf'); }
  exportWORD() { this.exportService.generateWord('contentToExport', 'factura.docx'); }

  // /* Métodos de Validación y Utilidades */
  toNum(valor: any): number {
    return Number(valor) || 0;
  }
  roundTo(valor: number, decimales: number = 2): number {
    const factor = Math.pow(10, decimales);
    return Math.round(valor * factor) / factor;
  }
  private twoDecimals(value: number): number {
    return Number(value.toFixed(2));
  }
  formatearNumero(valor: number): string {
    return new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor);
  }
  validarFormatoDecimal(item: any): void {
    const valor = item.precio_unitario;
    const regex = /^\d+(\.\d{1,2})?$/;
    if (valor?.toString().startsWith('00') || !regex.test(valor?.toString())) {
      item.precio_unitario = 0;
      this.formatoInvalido = !regex.test(valor?.toString());
    } else {
      this.formatoInvalido = false;
    }
  }
  onPrecioUnitarioChange(index: number): void {
    const item = this.items[index];
    this.validarFormatoDecimal(item);
    if (item.precio_unitario != undefined) {
      item.precio_literal = NumeroALetras.convertirConDecimal(this.SumaPrecioUnitarioActividad(item));
    }
  }

// FINAL ORDEN

  // /* METODO ELIMINAR PROYECTO */
  eliminarProyecto(): void {
    if (!this.identificadorGeneral) {
      this.mostrarModalError('Selecciona un proyecto para eliminar.');
      return;
    }

    this.mensajeConfirmacion = '¿Seguro que deseas eliminar este proyecto y todos sus registros asociados?';
    this.tipoConfirmacion = 'proyecto';
    this.mostrarConfirmacion = true;
  }
}
