import { AfterViewInit, Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ServiciosService } from '../../services/servicios.service';
import { ExportService } from '../../services/export.service';
import {
  Proyecto,
  GastoOperacion,
  Modulo,
  GastosGenerales,
} from '../../models/models';
import { ConfirmacionComponent } from '../mensajes/confirmacion/confirmacion/confirmacion.component';
import { OkComponent } from '../mensajes/ok/ok.component';
import { ErrorComponent } from '../mensajes/error/error.component';
import { NumeroALetras } from '../../utils/numeroALetras';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { map } from 'rxjs/operators';
import { ViewChild, ElementRef } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ChangeDetectorRef } from '@angular/core'; // Agrega si no está
import { CustomValidatorsService } from '../../../validators/custom-validators.service';

declare var bootstrap: any;
interface GastoOperacionExtendido extends Partial<GastoOperacion> {
  esNuevo?: boolean;
  editarUnidad?: boolean;
  tipo?: 'modulo' | 'modulo_registrado' | 'gasto'; // Nuevo: distingue tipos
  codigo?: string;
  nombre?: string;
  editarModulo?: boolean;
  moduloId?: number | null;
  editar?: boolean;
}

@Component({
  selector: 'app-gastos-operaciones',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ConfirmacionComponent,
    OkComponent,
    ErrorComponent,
    DragDropModule,
  ],
  templateUrl: './gastos-operaciones.component.html',
  styleUrls: ['./gastos-operaciones.component.css'],
})
export class GastosOperacionesComponent implements OnInit, AfterViewInit {
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
  nombreProyecto: string = '';
  formatoInvalido = false;
  mostrarConfirmacion = false;
  tipoConfirmacion: 'proyecto' | 'item' | null = null;
  itemIndexAEliminar: number | null = null;
  mensajeConfirmacion = '';
  mensajeExito = '';
  mensajeError = '';
  proyectosFiltrados: Proyecto[] = [];
  usuario_id = 0;
  nombre_usuario = '';
  apellido = '';
  roles: string[] = [];
  permisos: string[] = [];
  listaProyectos: Proyecto[] = [];
  proyectoSeleccionado: Proyecto | null = null;
  proyectoData: Partial<Proyecto> = {};
  items: GastoOperacionExtendido[] = [];
  totalOperacionPorGasto: { [id: number]: number } = {};
  identificadorGeneral = 0;
  modulos: Modulo[] = [];
  moduloSeleccionado: number | null = null;
  modulosEnItems: GastoOperacionExtendido[] = [];
  modalNuevoProyecto: any;
  modalParametros: any;
  @ViewChild('modalMover') modalMoverRef!: ElementRef;
  modalMover: any;
  itemIndexAMover: number | null = null;
  nuevaPosicion: number = 1;
  unidadesUsadas: string[] = [];
  unidadesFiltradas: string[][] = [];
  mostrarLista: boolean[] = [];
  descripcionesUsadas: string[] = [];
  descripcionesFiltradas: string[][] = [];
  mostrarListaDescripcion: boolean[] = [];
  catalogoGastos: { descripcion: string; ultimo_precio?: number }[] = [];
  mostrarDropdownProyectos: boolean = false;
  seleccionando: boolean = false;
  /* Bloque 1: Inicialización y Configuración del Componente */
  constructor(
    private router: Router,
    private servicios: ServiciosService,
    private exportService: ExportService,
    private cdr: ChangeDetectorRef,
    private validador: CustomValidatorsService
  ) {}

  ngOnInit(): void {
    this.recuperarUsuarioLocalStorage();
    this.cargarProyectos();
    const ultimoProyectoStr = localStorage.getItem(
      'ultimoProyectoSeleccionado'
    );
    if (ultimoProyectoStr) {
      try {
        const proyectoGuardado: Proyecto = JSON.parse(ultimoProyectoStr);
        this.asignarProyecto(proyectoGuardado);
      } catch (error) {
        console.error('Error al cargar último proyecto', error);
      }
    }
    this.modalNuevoProyecto = new bootstrap.Modal(
      document.getElementById('modalNuevoProyecto')
    );
    this.modalParametros = new bootstrap.Modal(
      document.getElementById('modalParametros')
    );
    this.modalMover = new bootstrap.Modal(
      document.getElementById('modalMover')
    );
    this.cargarUnidadesGasto();
    this.cargarCatalogoGastos();
  }

  ngAfterViewInit() {
    this.modalMover = new bootstrap.Modal(
      document.getElementById('modalMover')!
    );
    setTimeout(() => {
      this.inicializarSubDropdownFinanciero();
      this.inicializarSubDropdownTipo();
      this.inicializarDropdowns();
    }, 150);
  }
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
  cargarProyectos(): void {
    this.servicios.getIdentificadorGeneral().subscribe({
      next: (res) => (this.listaProyectos = res),
      error: (err) =>
        this.mostrarMensaje(
          'error',
          'No se pudieron cargar los proyectos existentes.'
        ),
    });
  }
  cargarUnidadesGasto(): void {
    this.servicios.getUnidadesGastoOperacion().subscribe({
      next: (res: string[]) => {
        this.unidadesUsadas = res || []; // Unidades únicas ordenadas de BD
      },
      error: (err: any) => {
        console.error('Error cargando unidades de gastos desde BD:', err);
      },
    });
  }
  private cargarCatalogoGastos(): void {
    this.servicios.getGastosOperacion().subscribe({
      next: (gastos: GastoOperacion[]) => {
        this.catalogoGastos = gastos.map((g) => ({
          descripcion: g.descripcion.trim(),
          ultimo_precio: g.precio_unitario || 0, // Si aplica; omite si no
        }));
        this.descripcionesUsadas = [
          ...new Set(gastos.map((g) => g.descripcion.trim())),
        ]; // Únicas de BD
      },
      error: (err: any) => {
        console.error('Error cargando catálogo de gastos desde BD:', err);
      },
    });
  }
  inicializarDropdowns() {
    const dropdownToggleElements =
      document.querySelectorAll('.dropdown-toggle');
    dropdownToggleElements.forEach((dropdownToggleEl) => {
      // Excluye sub-toggles (IDs específicos) para inicialización manual separada
      if (
        dropdownToggleEl.id === 'dropdownFinanciero' ||
        dropdownToggleEl.id === 'dropdownReportesTipo'
      ) {
        return; // Salta; se inicializan en métodos específicos
      }
      if (!bootstrap.Dropdown.getInstance(dropdownToggleEl)) {
        new bootstrap.Dropdown(dropdownToggleEl, { autoClose: 'outside' });
      }
    });

    console.log(
      'DEBUG: Dropdowns principales de Bootstrap inicializados (subs excluidos).'
    );
  }
  private inicializarSubDropdownFinanciero(): void {
    const trigger = document.getElementById(
      'dropdownFinanciero'
    ) as HTMLElement;
    const subMenu = trigger?.parentElement?.querySelector(
      'ul.dropdown-menu'
    ) as HTMLElement;

    if (!trigger || !subMenu) {
      console.warn(
        'DEBUG: No se encontró el trigger o sub-menú de Financiero. Verifica ID en HTML.'
      );
      return;
    }

    console.log(
      'DEBUG: Inicializando sub-dropdown Financiero (solo clicks, sin hover). Trigger:',
      trigger
    );

    // Inicializar Bootstrap dropdown (usa data-bs-toggle para clicks automáticos)
    if (!bootstrap.Dropdown.getInstance(trigger)) {
      new bootstrap.Dropdown(trigger, {
        autoClose: 'outside',
        boundary: 'viewport',
        popper: false, // Desactiva popper para anidados simples
      });
    }

    // Listener global para cierre al click fuera (específico para este sub-menú)
    const globalClickHandler = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        subMenu.classList.contains('show') &&
        !trigger.contains(target) &&
        !subMenu.contains(target)
      ) {
        const dropdown = bootstrap.Dropdown.getInstance(trigger);
        if (dropdown) {
          dropdown.hide();
        } else {
          subMenu.classList.remove('show');
          trigger.setAttribute('aria-expanded', 'false');
        }
        console.log('DEBUG: Sub-menú Financiero cerrado por click fuera.');
      }
    };

    // Remover listener global previo si existe (evita duplicados)
    if ((document as any)._financieroGlobalClick) {
      document.removeEventListener(
        'click',
        (document as any)._financieroGlobalClick
      );
    }
    document.addEventListener('click', globalClickHandler);
    (document as any)._financieroGlobalClick = globalClickHandler;

    console.log(
      'DEBUG: Sub-dropdown Financiero inicializado (solo clicks via Bootstrap).'
    );
  }
  private inicializarSubDropdownTipo(): void {
    const trigger = document.getElementById(
      'dropdownReportesTipo'
    ) as HTMLElement;
    const subMenu = trigger?.parentElement?.querySelector(
      'ul.dropdown-menu'
    ) as HTMLElement;

    if (!trigger || !subMenu) {
      console.warn(
        'DEBUG: No se encontró el trigger o sub-menú de Tipo. Verifica ID en HTML.'
      );
      return;
    }

    console.log(
      'DEBUG: Inicializando sub-dropdown Tipo (solo clicks, sin hover). Trigger:',
      trigger
    );

    // Inicializar Bootstrap dropdown (usa data-bs-toggle para clicks automáticos)
    if (!bootstrap.Dropdown.getInstance(trigger)) {
      new bootstrap.Dropdown(trigger, {
        autoClose: 'outside',
        boundary: 'viewport',
        popper: false, // Desactiva popper para anidados simples
      });
    }

    // Listener global para cierre al click fuera (específico para este sub-menú)
    const globalClickHandler = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        subMenu.classList.contains('show') &&
        !trigger.contains(target) &&
        !subMenu.contains(target)
      ) {
        const dropdown = bootstrap.Dropdown.getInstance(trigger);
        if (dropdown) {
          dropdown.hide();
        } else {
          subMenu.classList.remove('show');
          trigger.setAttribute('aria-expanded', 'false');
        }
        console.log('DEBUG: Sub-menú Tipo cerrado por click fuera.');
      }
    };

    // Remover listener global previo si existe
    if ((document as any)._tipoGlobalClick) {
      document.removeEventListener('click', (document as any)._tipoGlobalClick);
    }
    document.addEventListener('click', globalClickHandler);
    (document as any)._tipoGlobalClick = globalClickHandler;

    console.log(
      'DEBUG: Sub-dropdown Tipo inicializado (solo clicks via Bootstrap).'
    );
  }

  /* Bloque 2: Gestión y Registro de Proyectos */
  private asignarProyecto(proyecto: Proyecto | null) {
    if (!proyecto) {
      this.modulos = []; // Reset módulos
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
      localStorage.removeItem('ultimoProyectoSeleccionado');
      console.log('DEBUG: Proyecto deseleccionado - Items reset a []'); // Log temporal
      this.cdr.detectChanges();
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
    this.cargarModulos(this.identificadorGeneral); // Nuevo: cargar módulos
    localStorage.setItem(
      'ultimoProyectoSeleccionado',
      JSON.stringify(proyecto)
    );

    // Al final, después de this.cargarGastos(this.identificadorGeneral); y this.cargarModulos(...):
    console.log(
      'DEBUG: Proyecto asignado ID =',
      proyecto.id_general,
      'Nombre =',
      proyecto.NombreProyecto
    );
    console.log('DEBUG: Iniciando carga de gastos y módulos...'); // Log temporal
    // Fuerza detección de cambios después de async (opcional, pero ayuda con timing)
    setTimeout(() => {
      this.cdr.detectChanges();
      console.log(
        'DEBUG: Change detection forzada después de asignar proyecto'
      );
    }, 100); // Pequeño delay para async
  }
  onProyectoSeleccionado(): void {
    const proyecto = this.listaProyectos.find(
      (p) =>
        p.NombreProyecto.toLowerCase() ===
        (this.proyectoData.NombreProyecto ?? '').toLowerCase()
    );
    this.asignarProyecto(proyecto || null);
  }
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
      modificado_por: this.usuario_id,
    };

    const observable = this.proyectoSeleccionado?.id_general
      ? this.servicios.updateIdentificadorGeneral({
          ...proyectoPayload,
          id_general: this.proyectoSeleccionado.id_general,
        } as Proyecto)
      : this.servicios.createIdentificadorGeneral(proyectoPayload);

    observable.subscribe({
      next: (resp) => {
        this.asignarProyecto(resp);

        // 🔹 Volver a cargar desde backend para tener lista REAL
        this.servicios.getIdentificadorGeneral().subscribe({
          next: (proyectos) => {
            this.listaProyectos = proyectos;
            this.filtrarProyectos(); // refrescar lista visible
          },
        });

        this.mostrarModalExito(
          this.proyectoSeleccionado?.id_general
            ? 'Proyecto actualizado'
            : 'Proyecto creado'
        );
      },
      error: (err) =>
        this.mostrarModalError(
          'Error al guardar proyecto: ' +
            (err.error?.error || 'Intente de nuevo')
        ),
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
      modificado_por: this.usuario_id,
    };

    this.servicios.createIdentificadorGeneral(proyectoDuplicado).subscribe({
      next: (nuevoProyecto: Proyecto) => {
        this.servicios.getModulosPorProyecto(proyecto.id_general).subscribe({
          next: (modulosOriginales: Modulo[]) => {
            // Crear módulos uno a uno y esperar todos
            const observables = modulosOriginales.map((mod) => {
              const nuevoModulo: Partial<Modulo> = {
                ...mod,
                id: 0,
                proyecto: nuevoProyecto.id_general,
                creado_por: this.usuario_id,
                modificado_por: this.usuario_id,
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

                this.servicios
                  .getGastoOperacionID(proyecto.id_general)
                  .subscribe({
                    next: (gastosOriginales: GastoOperacion[]) => {
                      // Mapear gastos originales a duplicados, usando modulo_id
                      const gastosDuplicados: (Partial<GastoOperacion> & {
                        modulo_id?: number | null;
                      })[] = gastosOriginales.map((g) => ({
                        ...g,
                        id: 0,
                        identificador: nuevoProyecto,
                        modulo_id: g.modulo
                          ? mapaModulos.get(g.modulo.id!) ?? null
                          : null,
                        creado_por: this.usuario_id,
                        modificado_por: this.usuario_id,
                      }));

                      // Eliminar la propiedad 'modulo' para evitar conflicto
                      gastosDuplicados.forEach((g) => delete (g as any).modulo);

                      this.servicios
                        .createGastoOperacion(gastosDuplicados)
                        .subscribe({
                          next: (gastosGuardados: any) => {
                            gastosGuardados.gastos.forEach(
                              (
                                gastoDuplicado: GastoOperacion,
                                index: number
                              ) => {
                                const original = gastosOriginales[index];
                                this.duplicarSubItems(
                                  original.id,
                                  gastoDuplicado.id
                                );
                              }
                            );

                            this.mostrarModalExito(
                              'Proyecto duplicado correctamente con módulos y gastos.'
                            );
                            this.filtrarProyectos();
                          },
                          error: (err: any) =>
                            this.mostrarModalError(
                              'Error al duplicar gastos: ' +
                                (err.error?.error || 'Intente de nuevo')
                            ),
                        });
                    },
                    error: (err: any) =>
                      this.mostrarModalError(
                        'Error al obtener gastos originales: ' +
                          (err.error?.error || 'Intente de nuevo')
                      ),
                  });
              },
              error: (err: any) =>
                this.mostrarModalError(
                  'Error al duplicar módulos: ' +
                    (err.error?.error || 'Intente de nuevo')
                ),
            });
          },
          error: (err: any) =>
            this.mostrarModalError(
              'Error al obtener módulos originales: ' +
                (err.error?.error || 'Intente de nuevo')
            ),
        });
      },
      error: (err: any) =>
        this.mostrarModalError(
          'Error al duplicar proyecto: ' +
            (err.error?.error || 'Intente de nuevo')
        ),
    });
  }
  duplicarSubItems(idGastoOriginal: number, idGastoDuplicado: number) {
    // Materiales
    this.servicios
      .getMaterialesIDGasto(idGastoOriginal)
      .subscribe((materiales) => {
        const nuevos = materiales.map((m) => ({
          ...m,
          id: 0,
          id_gasto_operacion: idGastoDuplicado,
          creado_por: this.usuario_id,
        }));
        this.servicios.createMateriales(nuevos).subscribe();
      });

    // Mano de obra
    this.servicios.getManoDeObraIDGasto(idGastoOriginal).subscribe((manos) => {
      const nuevas = manos.map((m) => ({
        ...m,
        id: 0,
        id_gasto_operacion: idGastoDuplicado,
        creado_por: this.usuario_id,
      }));
      this.servicios.createManoDeObraLista(nuevas).subscribe();
    });

    // Equipo/Herramienta
    this.servicios
      .getEquipoHerramientas(idGastoOriginal)
      .subscribe((equipos) => {
        const nuevos = equipos.map((e) => ({
          ...e,
          id: 0,
          id_gasto_operacion: idGastoDuplicado,
          creado_por: this.usuario_id,
        }));
        this.servicios.createEquipoHerramientaLista(nuevos).subscribe();
      });

    // Gastos Generales
    this.servicios
      .getGastosGenerales(idGastoOriginal)
      .subscribe((gastosGen) => {
        const nuevos = gastosGen.map((g) => ({
          ...g,
          id: 0,
          id_gasto_operacion: idGastoDuplicado,
          creado_por: this.usuario_id,
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
      this.porcentaje_global_100 =
        this.proyectoSeleccionado.porcentaje_global_100 ?? 100;
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
      modificado_por: this.usuario_id,
    };

    this.servicios
      .updateIdentificadorGeneral(proyectoPayload as Proyecto)
      .subscribe({
        next: (resp) => {
          // Actualizar estado local y lista
          const proyectoActualizado = {
            ...this.proyectoSeleccionado,
            ...proyectoPayload,
          } as Proyecto;
          this.asignarProyecto(proyectoActualizado);
          this.listaProyectos = this.listaProyectos.map((p) =>
            p.id_general === proyectoActualizado.id_general
              ? proyectoActualizado
              : p
          );
        },
        error: (err) => {
          this.mostrarModalError(
            'Error al actualizar parámetros: ' +
              (err.error?.error || 'Intente de nuevo')
          );
        },
      });
  }
  filtrarProyectos(): void {
    const termino = this.nombreProyecto.toLowerCase().trim();
    this.proyectosFiltrados = termino
      ? this.listaProyectos.filter((p) =>
          p.NombreProyecto.toLowerCase().includes(termino)
        )
      : [...this.listaProyectos]; // si input vacío → mostrar todos
  }
  seleccionarProyecto(proyecto: Proyecto): void {
    this.nombreProyecto = proyecto.NombreProyecto; // Esto mantiene el nombre en el input
    this.asignarProyecto(proyecto);
    this.mostrarDropdownProyectos = false; // CORREGIDO: Usa nueva propiedad (cierra dropdown)
  }
  focusInput() {
    this.proyectosFiltrados = [...this.listaProyectos];
    this.mostrarDropdownProyectos = true;
  }
  eliminarProyecto(): void {
    if (!this.identificadorGeneral) {
      this.mostrarModalError('Selecciona un proyecto para eliminar.');
      return;
    }
    this.mensajeConfirmacion =
      '¿Seguro que deseas eliminar este proyecto y todos sus registros asociados?';
    this.tipoConfirmacion = 'proyecto';
    this.mostrarConfirmacion = true;
  }
  /* Bloque 3: Gestión y Registro de Módulos */
  cargarModulos(idGeneral: number): void {
    if (!idGeneral) {
      this.modulos = [];
      this.modulosEnItems = []; // Reset explícito
      return;
    }
    this.servicios.getModulosPorProyecto(idGeneral).subscribe({
      next: (modulos) => {
        this.modulos = modulos;
        if (modulos.length === 0) {
          // Opcional: Mensaje informativo (no error, solo info)
          console.log(
            'Proyecto seleccionado no tiene módulos asociados. Solo se mostrarán gastos.'
          );
          // this.mostrarMensaje('info', 'Este proyecto no tiene módulos. Puedes agregar uno con "Agregar Módulo".');  // Descomenta si quieres notificar al usuario
        }
        // Generar modulosEnItems solo si hay módulos
        this.modulosEnItems =
          modulos.length > 0
            ? modulos.map(
                (mod) =>
                  ({
                    id: mod.id,
                    tipo: 'modulo_registrado' as const,
                    codigo: mod.codigo,
                    nombre: mod.nombre,
                    esNuevo: false,
                    editarModulo: false,
                    editar: false,
                    moduloId: mod.id,
                  } as GastoOperacionExtendido)
              )
            : [];
      },
      error: (err) => {
        console.error('Error al cargar módulos:', err);
        this.mostrarMensaje('error', 'Error al cargar módulos del proyecto.');
        this.modulos = [];
        this.modulosEnItems = [];
      },
    });
  }
  agregarModulo(): void {
    if (!this.identificadorGeneral) {
      this.mostrarMensaje(
        'error',
        'Selecciona un proyecto primero para agregar módulos.'
      );
      return;
    }
    const nuevoModulo: GastoOperacionExtendido = {
      tipo: 'modulo',
      codigo: '',
      nombre: '',
      esNuevo: true,
      editar: false,
    };
    this.items.push(nuevoModulo);
    this.ordenarItemsPorModulos(); // Reordena preservando el temporal
    this.items = [...this.items]; // NUEVO: Fuerza change detection de Angular para renderizar inmediatamente
  }
  registrarModulo(index: number): void {
    const item = this.items[index];
    if (!this.identificadorGeneral) {
      this.mostrarMensaje('error', 'Selecciona un proyecto primero.');
      return;
    }
    if (!item.codigo?.trim() || !item.nombre?.trim()) {
      this.mostrarMensaje(
        'error',
        'Código y nombre del módulo son obligatorios.'
      );
      return;
    }
    const payload: Partial<Modulo> = {
      proyecto: this.identificadorGeneral, // Asocia explícitamente al proyecto
      codigo: item.codigo.trim(),
      nombre: item.nombre.trim(),
      creado_por: this.usuario_id,
      modificado_por: this.usuario_id,
    };
    this.servicios.createModulo(payload).subscribe({
      next: (moduloCreado) => {
        this.mostrarMensaje('exito', 'Módulo registrado correctamente.');
        // Actualizar fila temporal a registrada
        this.items[index] = {
          ...item,
          id: moduloCreado.id,
          tipo: 'modulo_registrado',
          esNuevo: false, // NUEVO: Reset para vista fija
          editar: false, // Inicializa edición off
          editarModulo: false,
          moduloId: moduloCreado.id,
        };
        this.modulos.push(moduloCreado);
        // Actualizar modulosEnItems solo con módulos del proyecto actual
        this.modulosEnItems = this.modulos.map(
          (mod) =>
            ({
              id: mod.id,
              tipo: 'modulo_registrado' as const,
              codigo: mod.codigo,
              nombre: mod.nombre,
              esNuevo: false,
              editar: false, // NUEVO: Inicializa explícitamente
              editarModulo: false,
              moduloId: mod.id,
            } as GastoOperacionExtendido)
        );
        this.ordenarItemsPorModulos();
        this.items = [...this.items];
      },
      error: (err) => {
        this.mostrarMensaje(
          'error',
          'Error al registrar módulo: ' +
            (err.error?.error || 'Verifica los datos.')
        );
      },
    });
  }
  editarModulo(index: number): void {
    const item = this.items[index];
    if (item.tipo !== 'modulo_registrado') {
      return;
    }
    // Activar modo edición
    (item as GastoOperacionExtendido).editar = true; // Cast para seguridad
  }
  actualizarModuloRegistrado(index: number): void {
    const item = this.items[index];
    if (
      item.tipo !== 'modulo_registrado' ||
      !(item as GastoOperacionExtendido).editar
    ) {
      return;
    }
    if (!item.codigo?.trim() || !item.nombre?.trim()) {
      this.mostrarMensaje(
        'error',
        'Código y nombre del módulo son obligatorios.'
      );
      (item as GastoOperacionExtendido).editar = false;
      return;
    }
    const payload: Partial<Modulo> = {
      codigo: item.codigo.trim(),
      nombre: item.nombre.trim(),
      modificado_por: this.usuario_id,
    };
    this.servicios.updateModulo(item.id!, payload).subscribe({
      next: (moduloActualizado) => {
        // Actualizar en item y listas
        item.codigo = moduloActualizado.codigo;
        item.nombre = moduloActualizado.nombre;
        (item as GastoOperacionExtendido).editar = false; // Salir de modo edición
        this.modulos = this.modulos.map((m) =>
          m.id === item.id ? moduloActualizado : m
        );
        this.modulosEnItems = this.modulosEnItems.map((m) =>
          m.id === item.id
            ? {
                ...m,
                codigo: moduloActualizado.codigo,
                nombre: moduloActualizado.nombre,
              }
            : m
        );
        this.mostrarMensaje('exito', 'Módulo actualizado correctamente.');
        this.ordenarItemsPorModulos(); // Reagrupar si cambia
      },
      error: (err) => {
        this.mostrarMensaje(
          'error',
          'Error al actualizar módulo: ' +
            (err.error?.error || 'Intente de nuevo.')
        );
        (item as GastoOperacionExtendido).editar = false; // Resetear
      },
    });
  }
  eliminarModulo(index: number): void {
    const item = this.items[index];
    if (item.tipo !== 'modulo_registrado') {
      return;
    }
    // Confirmación (usa confirm() simple; reemplaza con tu modal si tienes)
    if (
      !confirm(
        `¿Eliminar módulo "${item.nombre}"? Los gastos se desasociarán (no se eliminarán).`
      )
    ) {
      return;
    }
    this.servicios.deleteModulo(item.id!).subscribe({
      next: () => {
        // Remover de modulos y items
        this.modulos = this.modulos.filter((m) => m.id !== item.id);
        this.modulosEnItems = this.modulosEnItems.filter(
          (m) => m.id !== item.id
        );
        this.items.splice(index, 1); // Remover fila de módulo
        // Desasociar gastos: Setear moduloId = null y actualizar backend
        const gastosDelModulo = this.items.filter(
          (g) => g.moduloId === item.id && g.tipo === 'gasto'
        );
        gastosDelModulo.forEach((gasto) => {
          if (gasto.id) {
            // Solo si es registrado
            gasto.moduloId = null;
            gasto.modulo = null;
            // Actualizar backend para desasociar
            this.servicios.moverGastoAModulo(gasto.id, null).subscribe({
              next: () => {}, // Silencioso
              error: (err) => console.error('Error desasociando gasto:', err), // Log solo
            });
          }
        });
        this.mostrarMensaje(
          'exito',
          'Módulo eliminado correctamente. Gastos desasociados.'
        );
        this.ordenarItemsPorModulos(); // Reagrupar (gastos a "sin módulo")
        this.items = [...this.items]; // Refrescar UI
      },
      error: (err) => {
        this.mostrarMensaje(
          'error',
          'Error al eliminar módulo: ' +
            (err.error?.error || 'Intente de nuevo.')
        );
      },
    });
  }
  cancelarEdicion(index: number): void {
    const item = this.items[index];
    if (item.tipo !== 'modulo_registrado') {
      return;
    }
    (item as GastoOperacionExtendido).editar = false;
    this.mostrarMensaje('exito', 'Edición cancelada.');
  }
  obtenerNombreModulo(modulo: Modulo | null): string {
    return modulo ? `${modulo.codigo} - ${modulo.nombre}` : 'Sin módulo';
  }
  getGastosCount(moduloId: number): number {
    return this.items.filter(
      (item) => item.tipo === 'gasto' && item.moduloId === moduloId
    ).length;
  }
  abrirModalMover(index: number): void {
    this.itemIndexAMover = index;
    const item = this.items[index];
    this.moduloSeleccionado = item.modulo?.id ?? null; // Corregido: usa modulo.id en lugar de moduloId
    if (!item.id) {
      this.mostrarMensaje(
        'error',
        'Registra el ítem primero para asociarlo a un módulo.'
      );
      return;
    }
    this.modalMover.show();
  }
  confirmarMoverModulo(): void {
    if (this.itemIndexAMover === null || !this.items[this.itemIndexAMover!]?.id)
      return;
    const gastoId = this.items[this.itemIndexAMover!].id!;
    this.servicios
      .moverGastoAModulo(gastoId, this.moduloSeleccionado)
      .subscribe({
        next: (gastoActualizado) => {
          const item = this.items[this.itemIndexAMover!];
          item.modulo =
            this.modulos.find((m) => m.id === this.moduloSeleccionado) || null;
          item.moduloId = this.moduloSeleccionado;
          this.mostrarMensaje('exito', 'Gasto asociado correctamente.');
          this.modalMover.hide();
          this.ordenarItemsPorModulos(); // Reagrupar después de mover
          this.items = [...this.items];
        },
        error: (err) => {
          this.mostrarMensaje(
            'error',
            'Error al asociar gasto: ' +
              (err.error?.error || 'Intente de nuevo.')
          );
          this.modalMover.hide();
        },
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
  /* Bloque 4: Gestión y Registro de Ítems/Gastos */
  cargarGastos(idGeneral: number): void {
    if (!idGeneral) {
      this.items = [];
      this.modulosEnItems = [];
      // CORREGIDO: Agregar reset de arrays filtrados si no hay items
      this.unidadesFiltradas = [];
      this.mostrarLista = [];
      this.descripcionesFiltradas = [];
      this.mostrarListaDescripcion = [];
      return;
    }
    // Cargar módulos primero (ya maneja condicional)
    this.cargarModulos(idGeneral);

    this.servicios.getGastoOperacionID(idGeneral).subscribe({
      next: (res) => {
        const gastos: GastoOperacionExtendido[] = res.map((item) => ({
          ...item,
          tipo: 'gasto' as const,
          esNuevo: false,
          editarModulo: false,
          editar: false,
          moduloId: item.modulo?.id ?? null,
        }));

        if (this.modulosEnItems.length > 0) {
          this.items = [...this.modulosEnItems, ...gastos];
        } else {
          this.items = [...gastos];
        }
        const temporalesExistentes = this.items.filter(
          (item) => item.tipo === 'modulo'
        );
        if (temporalesExistentes.length > 0) {
          this.items.push(...temporalesExistentes);
        }
        this.items.forEach((item) => {
          if (!item.id) return;
          this.servicios
            .getGastosGenerales(item.id)
            .pipe(
              map((gastos: GastosGenerales[]) =>
                gastos.length > 0 ? gastos[0].total : 0
              )
            )
            .subscribe((total) => {
              this.totalOperacionPorGasto[item.id!] = total;
              item.precio_unitario = total;
              item.precio_literal = NumeroALetras.convertirConDecimal(
                this.SumaPrecioUnitarioActividad(item)
              );
              this.cdr.detectChanges();
            });
        });

        this.ordenarItemsPorModulos();

        // CORREGIDO: Movido aquí (dentro de next, después de poblar this.items)
        this.unidadesFiltradas = this.items.map(() => [...this.unidadesUsadas]);
        this.mostrarLista = this.items.map(() => false);
        this.descripcionesFiltradas = this.items.map(() => [
          ...this.descripcionesUsadas,
        ]);
        this.mostrarListaDescripcion = this.items.map(() => false);

        this.items.forEach((item) => {
          if (item.unidad) this.agregarUnidadSiNoExiste(item.unidad);
          if (item.descripcion)
            this.agregarDescripcionSiNoExiste(item.descripcion);
        });
      },
      error: (err) => {
        this.mostrarMensaje('error', 'Error al cargar gastos.');
        this.items = [];
        // CORREGIDO: Agregar reset en error
        this.unidadesFiltradas = [];
        this.mostrarLista = [];
        this.descripcionesFiltradas = [];
        this.mostrarListaDescripcion = [];
      },
    });
  }
  agregarItem(): void {
    if (!this.identificadorGeneral) {
      this.mostrarMensaje(
        'error',
        'Selecciona o registra un proyecto primero para agregar ítems.'
      );
      this.abrirModalParametros(false);
      return;
    }
    this.items.push({
      descripcion: '',
      unidad: '',
      cantidad: 0,
      precio_unitario: 0,
      precio_literal: '',
      esNuevo: true,
      editarModulo: true,
      editarUnidad: true,
      tipo: 'gasto',
      modulo: null,
      moduloId: null,
    });
    this.ordenarItemsPorModulos();

    // CORREGIDO: Esto está bien (inicializa para nueva fila)
    this.unidadesFiltradas.push([...this.unidadesUsadas]);
    this.mostrarLista.push(false);
    this.descripcionesFiltradas.push([...this.descripcionesUsadas]);
    this.mostrarListaDescripcion.push(false);
  }
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
        NombreProyecto: this.nombreProyecto?.trim() ?? '',
      } as Proyecto,
      modulo_id: item.moduloId ?? null,
      creado_por: this.usuario_id,
      modificado_por: this.usuario_id,
    };
    delete payload.modulo;
    this.servicios.createGastoOperacion([payload]).subscribe({
      next: (res) => {
        const nuevoItem = {
          ...res.gastos[0],
          esNuevo: false,
          editarModulo: false,
          moduloId: res.gastos[0].modulo?.id ?? null,
        };
        this.items[index] = nuevoItem;
        this.identificadorGeneral = res.identificador_general;
        this.mostrarMensaje('exito', 'Ítem registrado correctamente.');

        // CORREGIDO: Movido dentro de next (usa 'res' correctamente)
        if (res.gastos[0].unidad)
          this.agregarUnidadSiNoExiste(res.gastos[0].unidad);
        if (res.gastos[0].descripcion)
          this.agregarDescripcionSiNoExiste(res.gastos[0].descripcion);
      },
      error: (err) =>
        this.mostrarMensaje(
          'error',
          'Error al registrar el ítem: ' +
            (err.error?.error || 'Verifica los datos enviados')
        ),
    });
  }
  actualizarItem(index: number): void {
    const item = this.items[index];
    const payload: Partial<GastoOperacion> & { modulo_id?: number | null } = {
      ...item,
      cantidad: Number(item.cantidad),
      precio_unitario: Number(item.precio_unitario),
      modulo_id: item.moduloId ?? null,
      modificado_por: this.usuario_id,
      id: item.id,
    };
    delete payload.modulo;
    this.servicios.updateGastoOperacion(payload).subscribe({
      next: (updatedItem) => {
        this.items[index] = {
          ...item,
          ...updatedItem,
          cantidad: Number(updatedItem.cantidad),
          esNuevo: false,
          editarModulo: false,
          moduloId: updatedItem.modulo?.id ?? null,
        };

        this.mostrarMensaje('exito', 'Ítem actualizado correctamente.');

        // CORREGIDO: Agregar verificación de cambio y actualización de listas (tiempo real, no duplicados)
        if (updatedItem.unidad && updatedItem.unidad !== item.unidad)
          this.agregarUnidadSiNoExiste(updatedItem.unidad);
        if (
          updatedItem.descripcion &&
          updatedItem.descripcion !== item.descripcion
        )
          this.agregarDescripcionSiNoExiste(updatedItem.descripcion);
        this.cdr.detectChanges();
      },
      error: (err) =>
        this.mostrarMensaje(
          'error',
          'Error al actualizar el ítem: ' +
            (err.error?.error || 'Verifica los datos enviados')
        ),
    });
  }
  eliminarItem(index: number): void {
    const item = this.items[index];
    if (!item.id) {
      // Ítem nuevo/no guardado: Remover local
      this.items.splice(index, 1);
      this.mostrarMensaje('exito', 'Ítem eliminado.');
      return;
    }
    // Ítem guardado: Confirmar y eliminar backend
    this.mensajeConfirmacion = '¿Seguro que deseas eliminar este ítem?';
    this.tipoConfirmacion = 'item'; // Asume que tienes estas props para modal
    this.itemIndexAEliminar = index;
    this.mostrarConfirmacion = true; // Muestra tu modal de confirmación
  }

  actualizarModulo(item: GastoOperacionExtendido): void {
    if (item.moduloId === null || item.moduloId === undefined) {
      item.modulo = null;
    } else {
      item.modulo = this.modulos.find((m) => m.id === item.moduloId) || null;
    }
    if (item.id && !item.esNuevo) {
      this.actualizarItem(this.items.indexOf(item));
    }
  }
  obtenerNumero(index: number): number {
    return this.items
      .slice(0, index + 1)
      .filter((item) => item.tipo === 'gasto').length;
  }
  /* Bloque 5: UI, Modales y Mensajes */
  private mostrarMensaje(
    tipo: 'exito' | 'error',
    mensaje: string,
    duracion = 20000
  ) {
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
          this.items = [...this.items]; // Fuerza re-renderizado
        },
        error: (err) =>
          this.mostrarMensaje(
            'error',
            'Error al eliminar gasto: ' +
              (err.error?.error || 'Intente de nuevo.')
          ),
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
    // Re-inicializa filtrados para mantener sincronía con items restantes
    this.unidadesFiltradas = this.items.map(() => [...this.unidadesUsadas]);
    this.mostrarLista = this.items.map(() => false);
    this.descripcionesFiltradas = this.items.map(() => [
      ...this.descripcionesUsadas,
    ]);
    this.mostrarListaDescripcion = this.items.map(() => false);
  }
  manejarAceptar() {
    this.mostrarConfirmacion = false;

    if (this.tipoConfirmacion === 'proyecto') {
      if (this.identificadorGeneral === 0) {
        // Registrar nuevo proyecto
        this.registrarProyecto();
      } else {
        // Eliminar proyecto existente SOLO desde el backend
        this.servicios
          .deleteIdentificadorGeneral(this.identificadorGeneral)
          .subscribe({
            next: () => {
              // 🔹 Recargar lista REAL desde el backend
              this.servicios.getIdentificadorGeneral().subscribe({
                next: (proyectos) => {
                  this.listaProyectos = proyectos;
                  this.filtrarProyectos();
                },
                error: () =>
                  this.mostrarMensaje('error', 'Error al recargar proyectos.'),
              });

              this.asignarProyecto(null); // limpiar selección
              this.mostrarMensaje('exito', 'Proyecto eliminado correctamente.');
            },
            error: () =>
              this.mostrarMensaje('error', 'Error al eliminar el proyecto.'),
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
        error: () => this.mostrarMensaje('error', 'Error al eliminar el ítem.'),
      });
      this.confirmarEliminacion();
      return; // Evita ejecutar más código
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
  private validarProyectoCompleto(): boolean {
    for (const key in this.proyectoData) {
      if (
        this.proyectoData[key as keyof Proyecto] === null ||
        this.proyectoData[key as keyof Proyecto] === ''
      ) {
        this.mostrarMensaje('error', 'Completa todos los campos');
        return false;
      }
    }
    return true;
  }
  @HostListener('document:click', ['$event'])
  clickFuera(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.proyecto-dropdown')) {
      this.mostrarDropdownProyectos = false;
    }
  }
  @HostListener('document:click', ['$event'])
  handleClickOutside(event: Event): void {
    const target = event.target as HTMLElement;
    // Lógica existente para autocomplete de unidades/descripciones (mantén igual)
    const listaUnidades = document.querySelectorAll('.unidad-list');
    const listaDescripciones = document.querySelectorAll('.descripcion-list');
    const esDentroUnidad = Array.from(listaUnidades).some((el) =>
      el.contains(target)
    );
    const esDentroDescripcion = Array.from(listaDescripciones).some((el) =>
      el.contains(target)
    );
    const esInputUnidad = target.classList.contains('input-unidad');
    const esInputDescripcion = target.classList.contains('input-descripcion');
    if (!esDentroUnidad && !esInputUnidad && !this.seleccionando) {
      this.mostrarLista = this.mostrarLista.map(() => false);
    }
    if (!esDentroDescripcion && !esInputDescripcion && !this.seleccionando) {
      this.mostrarListaDescripcion = this.mostrarListaDescripcion.map(
        () => false
      );
    }
    if (!target.closest('.proyecto-dropdown')) {
      console.log('Click fuera del dropdown de proyectos - cerrando lista');
      this.mostrarDropdownProyectos = false;
    } else {
      console.log('Click dentro del dropdown de proyectos - no cerrando');
    }
  }
  /* Bloque 6: Drag-Drop y Ordenamiento */
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
    this.ordenarItemsPorModulos(); // Reagrupar si es necesario
    this.items = [...this.items];
  }
  private ordenarItemsPorModulos(): void {
    // Separar: Módulos registrados, temporales, y gastos
    const modulosRegistrados = this.items.filter(
      (item) => item.tipo === 'modulo_registrado'
    );
    const modulosTemporales = this.items.filter(
      (item) => item.tipo === 'modulo'
    ); // NUEVO: Preserva temporales
    const gastos = this.items.filter((item) => item.tipo === 'gasto');

    const itemsOrdenados: GastoOperacionExtendido[] = [];

    // Ordenar registrados por ID
    modulosRegistrados.sort((a, b) => (a.id! > b.id! ? 1 : -1));

    // Ordenar temporales por índice original (o simple, ya que son pocos)
    modulosTemporales.sort(
      (a, b) => this.items.indexOf(a) - this.items.indexOf(b)
    );

    if (modulosRegistrados.length > 0 || modulosTemporales.length > 0) {
      // Hay módulos (registrados o temporales): Agrupar
      // Primero: Registrados + sus gastos
      modulosRegistrados.forEach((modulo) => {
        itemsOrdenados.push(modulo);
        const gastosDelModulo = gastos.filter((g) => g.moduloId === modulo.id);
        gastosDelModulo.sort((a, b) => (a.id! > b.id! ? 1 : -1));
        itemsOrdenados.push(...gastosDelModulo);
      });

      // Luego: Temporales (al final de registrados, como "propuestas nuevas")
      itemsOrdenados.push(...modulosTemporales);

      // Finalmente: Gastos sin módulo
      const gastosSinModulo = gastos.filter((g) => !g.moduloId);
      gastosSinModulo.sort((a, b) => (a.id! > b.id! ? 1 : -1));
      itemsOrdenados.push(...gastosSinModulo);
    } else {
      // No hay módulos: Solo ordena todos los gastos (sin agrupación)
      gastos.sort((a, b) => (a.id! > b.id! ? 1 : -1));
      itemsOrdenados.push(...gastos);
    }

    this.items = itemsOrdenados;
  }
  /* Bloque 7: Cálculos y Getters (Propiedades Computadas) */
  get mostrarColumnaModulo(): boolean {
    return this.items.some(
      (item) =>
        item.tipo === 'gasto' && (!item.moduloId || item.moduloId === null)
    );
  }
  get totalLiteral(): string {
    return NumeroALetras.convertirConDecimal(this.total);
  }
  get totalGastosOperacionGeneral(): number {
    return this.items
      .filter(
        (item) =>
          item.tipo === 'gasto' &&
          item.id &&
          this.toNum(item.precio_unitario) > 0
      ) // ← MEJORA: Filtra válidos
      .reduce((acc, item) => acc + this.toNum(item.precio_unitario), 0);
  }
  get totalValorAgregado(): number {
    return this.items
      .filter(
        (item) =>
          item.tipo === 'gasto' &&
          item.id &&
          this.toNum(item.precio_unitario) > 0
      ) // ← MEJORA
      .reduce((acc, item) => acc + this.getValorAgregado(item), 0);
  }
  get total(): number {
    return this.items
      .filter((item) => item.tipo === 'gasto' && item.id) // ← MEJORA: Ignora temporales
      .reduce(
        (acc, item) =>
          acc + this.MultiplicacionPrecioUnitarioActividadPORcantidad(item),
        0
      );
  }
  getCostoVenta(item: GastoOperacionExtendido): number {
    const precio = this.toNum(item.precio_unitario);
    const ivaNominal = this.toNum(this.proyectoData.iva_tasa_nominal);
    const porcentajeGlobal = this.toNum(
      this.proyectoData.porcentaje_global_100
    );

    return precio - precio * (ivaNominal / porcentajeGlobal);
  }
  getMargenUtilidad(item: GastoOperacionExtendido): number {
    if (this.toNum(this.proyectoData.a_costo_venta) === 0) return 0;

    const margen = this.toNum(this.proyectoData.b_margen_utilidad);
    const aCosto = this.toNum(this.proyectoData.a_costo_venta);
    const porcentajeGlobal = this.toNum(
      this.proyectoData.porcentaje_global_100
    );

    return (
      (margen / porcentajeGlobal / (aCosto / porcentajeGlobal)) *
      this.getCostoVenta(item)
    );
  }
  getIvaEfectivaCalculo(): number {
    const ivaNominal = this.toNum(this.proyectoData.iva_tasa_nominal);
    const aCosto = this.toNum(this.proyectoData.a_costo_venta);
    const margen = this.toNum(this.proyectoData.b_margen_utilidad);

    return ivaNominal / (aCosto + margen);
  }
  getIvaEfectiva(item: GastoOperacionExtendido): number {
    return (
      (this.getCostoVenta(item) + this.getMargenUtilidad(item)) *
      this.getIvaEfectivaCalculo()
    );
  }
  getPrecioFactura(item: GastoOperacionExtendido): number {
    return (
      this.getCostoVenta(item) +
      this.getMargenUtilidad(item) +
      this.getIvaEfectiva(item)
    );
  }
  getValorAgregado(item: GastoOperacionExtendido): number {
    const valor =
      this.getPrecioFactura(item) - this.toNum(item.precio_unitario);
    return this.roundTo(valor, 2);
  }
  SumaPrecioUnitarioActividad(item: GastoOperacionExtendido): number {
    return this.roundTo(
      this.toNum(item.precio_unitario) + this.getValorAgregado(item),
      2
    );
  }
  MultiplicacionPrecioUnitarioActividadPORcantidad(
    item: GastoOperacionExtendido
  ): number {
    return this.roundTo(
      this.SumaPrecioUnitarioActividad(item) * this.toNum(item.cantidad),
      2
    );
  }
  /* Bloque 8: Navegación y Exportación */
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
      porcentaje_global_100: this.porcentaje_global_100 || 0,
    };

    this.router.navigate(['panel-control/CrearEcuacion'], {
      queryParams: params,
    });
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
      porcentaje_global_100: this.porcentaje_global_100 || 0,
    };

    this.router.navigate(['panel-control/PrecioFactura'], {
      queryParams: params,
    });
  }
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
      porcentaje_global_100: this.porcentaje_global_100 || 0,
    };
    this.router.navigate(['panel-control/PrecioFactura'], {
      queryParams: params,
    });
  }
  exportPDFFactura() {
    this.exportService.generatePDF('contentToExport', 'factura.pdf');
  }
  obtenerNumeroParaGasto(indice: number): number {
    return indice + 1; // Simple: 1, 2, 3... para la lista filtrada de gastos
  }
  generarPDFMaterialesProyecto(): void {
    if (!this.identificadorGeneral || !this.nombreProyecto) {
      this.mostrarMensaje(
        'error',
        'Selecciona un proyecto primero para generar el PDF.'
      );
      return;
    }
    // Llama al servicio (usa propiedades privadas internamente; no expone en HTML)
    this.exportService.generatePDFMaterialesProyecto(
      this.identificadorGeneral,
      this.nombreProyecto
    );
  }
  generatePDFManoDeObraProyecto(): void {
    if (!this.identificadorGeneral || !this.nombreProyecto) {
      this.mostrarMensaje(
        'error',
        'Selecciona un proyecto primero para generar el PDF.'
      );
      return;
    }
    // Llama al servicio (usa propiedades privadas internamente; no expone en HTML)
    this.exportService.generatePDFManoDeObraProyecto(
      this.identificadorGeneral,
      this.nombreProyecto
    );
  }
  generatePDFEquipoHerramientaProyecto(): void {
    if (!this.identificadorGeneral || !this.nombreProyecto) {
      this.mostrarMensaje(
        'error',
        'Selecciona un proyecto primero para generar el PDF.'
      );
      return;
    }
    // Llama al servicio (usa propiedades privadas internamente; no expone en HTML)
    this.exportService.generatePDFEquipoHerramientaProyecto(
      this.identificadorGeneral,
      this.nombreProyecto
    );
  }
  exportPDFGeneral(): void {
    if (!this.identificadorGeneral || !this.nombreProyecto) {
      this.mostrarMensaje(
        'error',
        'Selecciona un proyecto primero para generar el PDF.'
      );
      return;
    }

    this.exportService
      .generatePDFGastosOperacionProyecto(
        this.identificadorGeneral,
        this.nombreProyecto
      )
      .then(() => {
        this.mostrarMensaje(
          'exito',
          `PDF generado para "${this.nombreProyecto}".`
        );
        console.log(
          `PDF generado: reporte-gastos-operacion-modulos_${this.nombreProyecto}_${this.identificadorGeneral}.pdf`
        );
      })
      .catch((error) => {
        console.error('Error generando PDF:', error);
        this.mostrarMensaje(
          'error',
          'Error al generar el PDF. Ver consola para detalles.'
        );
      });
  }
  generarReporteGeneralPDF(): void {
    if (!this.identificadorGeneral || !this.nombreProyecto) {
      return this.mostrarMensaje(
        'error',
        'Selecciona un proyecto válido para generar el reporte general.'
      );
    }

    const params = {
      identificadorGeneral: this.identificadorGeneral,
      nombreProyecto: this.nombreProyecto,
      totalGastosOperacion: this.totalGastosOperacionGeneral,
      totalValorAgregado: this.totalValorAgregado,
      totalFactura: this.total,
      iva_tasa_nominal: this.iva_tasa_nominal || 0,
      it: this.it || 0,
      iue: this.iue || 0,
      ganancia: this.ganancia || 0,
      a_costo_venta: this.a_costo_venta || 0,
      b_margen_utilidad: this.b_margen_utilidad || 0,
      porcentaje_global_100: this.porcentaje_global_100 ?? 100,
      fechaReporte: new Date().toLocaleDateString('es-BO'),
    };

    const fileName = `Reporte_General_${this.nombreProyecto.replace(
      /[^a-zA-Z0-9]/g,
      '_'
    )}_${this.identificadorGeneral}.pdf`;

    this.exportService
      .generatePDFReporteGeneral(params, fileName)
      .then(() =>
        this.mostrarMensaje(
          'exito',
          `Reporte general PDF generado para "${this.nombreProyecto}".`
        )
      )
      .catch((error) => {
        console.error('Error al generar el PDF de Reporte General:', error);
        this.mostrarMensaje(
          'error',
          'Error al generar el reporte general. Ver consola para detalles.'
        );
      });
  }
  getGastosRegistrados(): GastoOperacionExtendido[] {
    const todosGastos = this.items.filter((item) => item.tipo === 'gasto');
    const conId = todosGastos.filter((item) => !!item.id);
    if (conId.length === 0) {
      console.log(
        'DEBUG: getGastosRegistrados vacío. Verifica: proyecto seleccionado?',
        !!this.identificadorGeneral,
        'Items total:',
        this.items.length
      );
    }
    return conId.sort((a, b) => (a.id! > b.id! ? 1 : -1));
  }
  generarReporteFinanciero(item: GastoOperacionExtendido): void {
    if (!item.id || !this.identificadorGeneral || !this.nombreProyecto) {
      this.mostrarMensaje(
        'error',
        'No se puede generar el reporte: Gasto o proyecto no válido.'
      );
      return;
    }
    // Preparar params con datos del gasto y parámetros del proyecto
    const params = {
      // Datos del gasto
      id_gasto_operaciones: item.id,
      descripcion: item.descripcion || 'Sin descripción',
      precio_unitario: Number(item.precio_unitario) || 0,
      unidad: item.unidad || 'N/A',
      cantidad: Number(item.cantidad) || 0,
      // Parámetros del proyecto (de propiedades locales)
      identificadorGeneral: this.identificadorGeneral,
      iva_tasa_nominal: this.iva_tasa_nominal || 0,
      it: this.it || 0,
      iue: this.iue || 0,
      ganancia: this.ganancia || 0,
      a_costo_venta: this.a_costo_venta || 0,
      b_margen_utilidad: this.b_margen_utilidad || 0,
      porcentaje_global_100: this.porcentaje_global_100 || 100,
      // Info adicional para el reporte
      nombreProyecto: this.nombreProyecto,
      fechaReporte: new Date().toLocaleDateString('es-BO'),
    };
    // Generar filename único
    const safeDescripcion = (item.descripcion || 'gasto')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 20);
    const fileName = `reporte-financiero-${this.nombreProyecto.replace(
      /[^a-zA-Z0-9]/g,
      '_'
    )}-${safeDescripcion}.pdf`;
    // Llamar al servicio para generar PDF
    this.exportService
      .generatePDFFinanciero(params, fileName)
      .then(() => {
        this.mostrarMensaje(
          'exito',
          `Reporte financiero generado para "${item.descripcion}".`
        );
        console.log(
          `PDF generado para gasto ID: ${item.id}, Descripción: ${item.descripcion}`
        );
      })
      .catch((error) => {
        console.error('Error generando PDF financiero:', error);
        this.mostrarMensaje(
          'error',
          'Error al generar el reporte financiero. Ver consola.'
        );
      });
  }
  /* Bloque 9: Utilidades y Validaciones */
  toNum(valor: any): number {
    return Number(valor) || 0;
  }
  roundTo(valor: number, decimales: number = 2): number {
    const factor = Math.pow(10, decimales);
    return Math.round(valor * factor) / factor;
  }
  formatearNumero(valor: number | null | undefined): string {
    if (valor === null || valor === undefined || isNaN(Number(valor))) {
      return '';
    }

    // Convertir a string para analizar los decimales originales
    const valorStr = valor.toString();
    const partes = valorStr.split('.'); // [entero, decimales]
    const parteEntera = partes[0];
    const parteDecimal = partes[1] ?? '';

    // Formatear la parte entera con puntos de miles
    const parteEnteraFormateada = parteEntera.replace(
      /\B(?=(\d{3})+(?!\d))/g,
      '.'
    );

    // Si tiene decimales, los agregamos con coma, sino solo la parte entera
    return parteDecimal
      ? `${parteEnteraFormateada},${parteDecimal}`
      : parteEnteraFormateada;
  }
  onCantidadInput(event: Event, item: GastoOperacionExtendido): void {
    const input = event.target as HTMLInputElement;
    let valor = input.value;
    valor = valor.replace(/[^0-9.,]/g, '');
    const valorCrudo = valor.replace(',', '.');
    const numero = parseFloat(valorCrudo);
    if (!isNaN(numero)) {
      item.cantidad = numero;
    } else {
      item.cantidad = 0;
    }
    input.value = valor;
  }

  formatearCantidadInput(item: GastoOperacionExtendido): void {
    if (item.cantidad !== null && item.cantidad !== undefined) {
      const numero = Number(item.cantidad);
      if (!isNaN(numero)) {
        item.cantidad = numero; // mantiene los decimales originales
      }
    }
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
      item.precio_literal = NumeroALetras.convertirConDecimal(
        this.SumaPrecioUnitarioActividad(item)
      );
    }
    this.cdr.detectChanges(); // ← NUEVO: Re-renderiza tabla después de cambios
  }
  /* Bloque 10: Autocompletado y Filtrado (Unidades y Descripciones) */
  private agregarUnidadSiNoExiste(unidad: string): void {
    const normalizado = unidad.trim();
    if (normalizado && !this.unidadesUsadas.includes(normalizado)) {
      this.unidadesUsadas.push(normalizado); // Agrega solo si nueva (no duplicado)
      this.unidadesUsadas.sort(); // Ordena alfabéticamente para UI
    }
  }
  private agregarDescripcionSiNoExiste(descripcion: string): void {
    const normalizado = descripcion.trim();
    if (normalizado && !this.descripcionesUsadas.includes(normalizado)) {
      this.descripcionesUsadas.push(normalizado);
      this.descripcionesUsadas.sort(); // Ordena para UI
    }
  }
  filtrarDescripciones(index: number, event: Event): void {
    const valor = (event.target as HTMLInputElement).value.toLowerCase();
    this.descripcionesFiltradas[index] = this.descripcionesUsadas.filter((d) =>
      d.toLowerCase().includes(valor)
    );
    this.items[index].descripcion = (event.target as HTMLInputElement).value;
  }
  mostrarDescripcionesFila(index: number): void {
    this.mostrarListaDescripcion = this.mostrarListaDescripcion.map(
      () => false
    );
    this.mostrarListaDescripcion[index] = true;
    this.descripcionesFiltradas[index] = [...this.descripcionesUsadas];
  }
  seleccionarDescripcion(index: number, descripcion: string): void {
    this.items[index].descripcion = descripcion;

    // Opcional: Auto-rellenar si hay catálogo (adapta si precio es editable)
    const gasto = this.catalogoGastos.find(
      (g) => g.descripcion === descripcion
    );
    if (gasto && this.items[index].precio_unitario === undefined) {
      this.items[index].precio_unitario = gasto.ultimo_precio;
      this.onPrecioUnitarioChange(index);
    }

    this.mostrarListaDescripcion[index] = false;
  }
  guardarDescripcionPersonalizada(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const valor = input.value.trim();

    if (valor) {
      this.items[index].descripcion = valor;
      this.agregarDescripcionSiNoExiste(valor); // Agrega si nueva (no duplicado)
    } else {
      this.items[index].descripcion = '';
    }
  }
  filtrarDescripcionInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    let valor = input.value;
    valor = valor.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ.,\s]/g, '');
    valor = valor.replace(/\s{2,}/g, ' ');
    input.value = valor;
    this.items[index].descripcion = valor;
    this.descripcionesFiltradas[index] = this.descripcionesUsadas.filter((d) =>
      d.toLowerCase().includes(valor.toLowerCase())
    );
  }

  /*  */
  filtrarUnidades(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    let valor = input.value;

    // 🔹 Solo permitir letras, números y espacios (sin caracteres especiales)
    valor = valor.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, '');

    // 🔹 Actualiza visualmente el campo
    input.value = valor;

    // 🔹 Actualiza el modelo y filtra la lista de unidades existentes
    this.unidadesFiltradas[index] = this.unidadesUsadas.filter((u) =>
      u.toLowerCase().includes(valor.toLowerCase())
    );

    this.items[index].unidad = valor;
  }

  mostrarUnidadesFila(index: number): void {
    this.seleccionando = false; // CORREGIDO: Reset flag al mostrar lista

    this.mostrarLista = this.mostrarLista.map(() => false); // Cierra otras
    this.mostrarLista[index] = true;
    this.unidadesFiltradas[index] = [...this.unidadesUsadas];
  }

  seleccionarUnidad(index: number, unidad: string): void {
    this.seleccionando = true; // CORREGIDO: Previene cierre por blur durante selección

    const item = this.items[index];
    item.unidad = unidad; // Actualiza el valor en el item (se refleja en input por ngModel)

    // Opcional: Si el item ya está registrado, actualiza en BD en tiempo real
    if (item.id && !item.esNuevo) {
      /* this.actualizarItemEnTiempoReal(item); */
    }

    // Cierra la lista con timeout (después de blur)
    setTimeout(() => {
      this.mostrarLista[index] = false;
      this.seleccionando = false; // Reset flag
    }, 100); // 100ms suficiente para que blur no interfiera
  }
  guardarUnidadPersonalizada(index: number, event: Event): void {
    if (this.seleccionando) return; // CORREGIDO: Ignora si viene de selección (previene sobrescritura)

    const input = event.target as HTMLInputElement;
    const valor = input.value.trim();

    if (valor) {
      this.items[index].unidad = valor;
      this.agregarUnidadSiNoExiste(valor); // Agrega si nueva (no duplicado, tiempo real)
    } else {
      this.items[index].unidad = '';
    }
  }
  filtrarCodigoInput(event: Event, item: GastoOperacionExtendido): void {
    const input = event.target as HTMLInputElement;
    let valor = input.value;

    valor = valor.replace(/[^a-zA-Z0-9]/g, '');

    input.value = valor;
    item.codigo = valor;
  }

  filtrarNombreInput(event: Event, item: GastoOperacionExtendido): void {
    const input = event.target as HTMLInputElement;
    let valor = input.value;

    valor = valor.replace(/[^a-zA-Z0-9]/g, '');

    input.value = valor;
    item.nombre = valor;
  }
  // Método para filtrar el campo "Nombre del Proyecto" (solo letras, números, espacios y acentos; sin caracteres especiales)
  filtrarNombreProyectoInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let valor = input.value;
    valor = valor.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, '');
    valor = valor.replace(/\s{2,}/g, ' ');
    input.value = valor;
    this.nombreProyecto = valor;
  }
}
