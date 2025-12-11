import { Component, EventEmitter, Output, HostListener } from '@angular/core';
import { GastoOperacion, Modulo, Proyecto } from '../../../models/models';
import { ServiciosService } from '../../../services/servicios.service';
import { CommonModule, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfirmacionComponent } from '../../mensajes/confirmacion/confirmacion/confirmacion.component';
import { OkComponent } from '../../mensajes/ok/ok.component';
import { ErrorComponent } from '../../mensajes/error/error.component';
import { ModuloComponent } from '../modulo/modulo';
import { ItemsGastoOperacion } from '../items-gasto-operacion/items-gasto-operacion';
import { Router } from '@angular/router';
import { ReportesPDf } from '../reportes-pdf/reportes-pdf';
declare var bootstrap: any;
import { of, forkJoin, throwError } from 'rxjs';
import { switchMap, map, catchError, finalize, tap } from 'rxjs/operators';

interface GastoOperacionExtendido extends Partial<GastoOperacion> {
  esNuevo?: boolean;
  editarUnidad?: boolean;
  tipo?: 'modulo' | 'modulo_registrado' | 'gasto';
  codigo?: string;
  nombre?: string;
  editarModulo?: boolean;
  moduloId?: number | null;
  editar?: boolean;
  unidad?: string;
}
@Component({
  selector: 'app-proyectos',
  standalone: true, // Asumo standalone si estás usando las directivas en el template
  imports: [
    CommonModule,
    NgIf,
    FormsModule,
    ConfirmacionComponent,
    OkComponent,
    ErrorComponent,
    ModuloComponent,
    ItemsGastoOperacion,
    ReportesPDf,
  ],
  templateUrl: './proyectos.html',
  styleUrl: './proyectos.css',
})
export class Proyectos {
  // Propiedades relacionadas con proyectos
  listaProyectos: Proyecto[] = [];
  proyectoSeleccionado: Proyecto | null = null; // Ahora se usa directamente en el select
  proyectoData: Partial<Proyecto> = {};
  nombreProyecto: string = ''; // -- Parámetros inicializados a null para que el placeholder sea visible --
  carga_social: number | null = null;
  iva_efectiva: number | null = null;
  herramientas: number | null = null;
  gastos_generales: number | null = null;
  iva_tasa_nominal: number | null = null;
  it: number | null = null;
  iue: number | null = null;
  ganancia: number | null = null;
  a_costo_venta: number | null = null;
  b_margen_utilidad: number | null = null;
  porcentaje_global_100: number = 100; // Este es un valor fijo y deshabilitado

  usuario_id = 0;
  nombre_usuario = '';
  apellido = '';
  roles: string[] = [];
  permisos: string[] = [];
  proyectosFiltrados: Proyecto[] = [];
  mostrarConfirmacion = false;
  tipoConfirmacion: 'proyecto' | null = null;
  mensajeConfirmacion = '';
  mensajeExito = '';
  mensajeError = '';
  modalNuevoProyecto: any;
  modalParametros: any;
  mostrarDropdownProyectos: boolean = false;
  identificadorGeneral = 0;
  mostrarVistaPDF: boolean = false; // Output para comunicar con el componente padre
  @Output() proyectoSeleccionadoChange = new EventEmitter<Proyecto | null>();
  @Output() listaProyectosChange = new EventEmitter<Proyecto[]>();
  items: GastoOperacionExtendido[] = [];
  busquedaProyecto: string = '';
  progresoDuplicacion: number = 0;
  duplicandoProyecto: boolean = false;

  constructor(private servicios: ServiciosService, private router: Router) {}

  ngOnInit(): void {
    this.cargarProyectos();
    this.proyectosFiltrados = [...this.listaProyectos]; // Inicializar modales

    const modalNuevoEl = document.getElementById('modalNuevoProyecto');
    this.modalNuevoProyecto = modalNuevoEl
      ? new bootstrap.Modal(modalNuevoEl)
      : null;

    const modalProyectoParametrosEl = document.getElementById(
      'modalProyectoParametros'
    );
    this.modalParametros = modalProyectoParametrosEl
      ? new bootstrap.Modal(modalProyectoParametrosEl)
      : null;
  }
  cargarProyectos(): void {
    this.servicios.getIdentificadorGeneral().subscribe({
      next: (res) => {
        this.listaProyectos = res;
        this.proyectosFiltrados = [...res];
        this.listaProyectosChange.emit(this.listaProyectos);
      },
      error: (err) =>
        this.mostrarMensaje(
          'error',
          'No se pudieron cargar los proyectos existentes.'
        ),
    });
  }

  private asignarProyecto(proyecto: Proyecto | null) {
    if (!proyecto) {
      this.resetearProyecto();
      return;
    }
    this.proyectoSeleccionado = proyecto;
    this.proyectoData = { ...proyecto };
    this.identificadorGeneral = proyecto.id_proyecto;
    this.nombreProyecto = proyecto.NombreProyecto;
    this.asignarParametrosProyecto(proyecto);
    this.proyectoSeleccionadoChange.emit(proyecto);
    // Cargar módulos e ítems (gastos) del proyecto
    this.cargarItemsProyecto(this.identificadorGeneral);
  }

  private cargarItemsProyecto(idGeneral: number): void {
    if (!idGeneral) {
      this.items = [];
      return;
    }
    // Cargar módulos e ítems en paralelo
    this.servicios.getProyectoCompleto(idGeneral).subscribe({
      next: ({ modulos, gastos }) => {
        // Procesar módulos
        const modulosEnItems = modulos.map((mod) => ({
          id: mod.id,
          tipo: 'modulo_registrado' as const,
          codigo: mod.codigo,
          nombre: mod.nombre,
          esNuevo: false,
          editarModulo: false,
          editar: false,
          moduloId: mod.id,
        }));
        // Procesar gastos (ítems de gastos de operación)
        const gastosEnItems = gastos.map((g) => ({
          ...g,
          tipo: 'gasto' as const,
          esNuevo: false,
          editarModulo: false,
          editar: false,
          moduloId: g.modulo?.id ?? null,
        }));
        // Combinar módulos e ítems
        this.items = [...modulosEnItems, ...gastosEnItems];
      },
      error: (err) => {
        console.error('Error cargando módulos e ítems:', err);
        this.items = [];
        this.mostrarMensaje(
          'error',
          'Error al cargar módulos e ítems del proyecto.'
        );
      },
    });
  }
  // En Proyectos (componente padre)
  refrescarDatos(): void {
    if (!this.identificadorGeneral) return;

    this.cargarItemsProyecto(this.identificadorGeneral); // Esto actualiza this.items
  }

  // Nuevo método para manejar mensajes desde ReportesPDf
  manejarMensaje(event: { tipo: 'exito' | 'error'; mensaje: string }): void {
    this.mostrarMensaje(event.tipo, event.mensaje);
  }
  private asignarParametrosProyecto(proyecto: Proyecto): void {
    this.proyectoData = { ...proyecto };
    this.carga_social = proyecto.carga_social ?? null;
    this.iva_efectiva = proyecto.iva_efectiva ?? null;
    this.herramientas = proyecto.herramientas ?? null;
    this.gastos_generales = proyecto.gastos_generales ?? null;
    this.iva_tasa_nominal = proyecto.iva_tasa_nominal ?? null;
    this.it = proyecto.it ?? null;
    this.iue = proyecto.iue ?? null;
    this.ganancia = proyecto.ganancia ?? null;
    this.a_costo_venta = proyecto.a_costo_venta ?? null;
    this.b_margen_utilidad = proyecto.b_margen_utilidad ?? null;
    this.porcentaje_global_100 = proyecto.porcentaje_global_100 ?? 100;
  }

  onProyectoSeleccionado(): void {
    const proyecto = this.listaProyectos.find(
      (p) =>
        p.NombreProyecto.toLowerCase() ===
        (this.proyectoData.NombreProyecto ?? '').toLowerCase()
    );
    this.asignarProyecto(proyecto || null);
  }
  guardarProyecto() {
    if (!this.nombreProyecto.trim()) {
      this.mostrarModalError('Ingrese un nombre válido para el proyecto');
      return;
    } // Usamos el toNum para convertir null o undefined a 0 antes de enviar al backend
    const proyectoPayload: Partial<Proyecto> = {
      NombreProyecto: this.nombreProyecto.trim().toUpperCase(),
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
    };

    const observable = this.proyectoSeleccionado?.id_proyecto
      ? this.servicios.updateIdentificadorGeneral({
          ...proyectoPayload,
          id_proyecto: this.proyectoSeleccionado.id_proyecto,
        } as Proyecto)
      : this.servicios.createIdentificadorGeneral(proyectoPayload);

    observable.subscribe({
      next: (resp) => {
        this.asignarProyecto(resp); // Volver a cargar desde backend para tener lista REAL

        this.servicios.getIdentificadorGeneral().subscribe({
          next: (proyectos) => {
            this.listaProyectos = proyectos;
            this.filtrarProyectos();
            this.listaProyectosChange.emit(this.listaProyectos);
          },
        });

        this.mostrarMensaje(
          'exito',
          this.proyectoSeleccionado?.id_proyecto
            ? 'Proyecto actualizado correctamente.'
            : 'Proyecto creado correctamente.'
        );
      },
      error: (err) =>
        this.mostrarMensaje(
          'error',
          'Error al guardar proyecto: ' +
            (err.error?.error || 'Intente nuevamente.')
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
    if (!this.proyectoSeleccionado) {
      this.mostrarModalError('No hay proyecto seleccionado');
      return;
    }
    const proyectoPayload: Partial<Proyecto> = {
      id_proyecto: this.proyectoSeleccionado.id_proyecto,
      NombreProyecto: this.nombreProyecto.trim().toUpperCase(),
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
    };

    this.servicios
      .updateIdentificadorGeneral(proyectoPayload as Proyecto)
      .subscribe({
        next: (resp) => {
          // Actualizar estado local y lista
          const proyectoActualizado = {
            ...this.proyectoSeleccionado,
            ...proyectoPayload,
          } as Proyecto; // Actualizar proyecto seleccionado

          this.asignarProyecto(proyectoActualizado); // Actualizar en la lista de proyectos

          this.listaProyectos = this.listaProyectos.map((p) =>
            p.id_proyecto === proyectoActualizado.id_proyecto
              ? proyectoActualizado
              : p
          ); // Cerrar modal

          const modalEl = document.getElementById('modalProyectoParametros');
          if (modalEl) {
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
          } // Mostrar mensaje de éxito

          this.mostrarMensaje(
            'exito',
            'Parámetros actualizados correctamente.'
          );
        },
        error: (err) => {
          this.mostrarModalError(
            'Error al actualizar parámetros: ' +
              (err.error?.error || 'Intente de nuevo')
          );
        },
      });
    this.cerrarModalParametros();
  }

  duplicarSubItems$(idGastoOriginal: number, idGastoDuplicado: number) {
    // For each subitem type we return an observable that completes when the create call finishes.
    const materiales$ = this.servicios
      .getMaterialesIDGasto(idGastoOriginal)
      .pipe(
        switchMap((materiales) => {
          if (!materiales || materiales.length === 0) return of(null);
          const nuevos = materiales.map((m: any) => ({
            ...m,
            id: 0,
            id_gasto_operacion: idGastoDuplicado,
            creado_por: this.usuario_id,
          }));
          return this.servicios.createMateriales(nuevos).pipe(
            catchError((err) => {
              console.error('Error duplicando materiales', err);
              return throwError(err);
            })
          );
        })
      );

    const manoObra$ = this.servicios.getManoDeObraIDGasto(idGastoOriginal).pipe(
      switchMap((manos) => {
        if (!manos || manos.length === 0) return of(null);
        const nuevas = manos.map((m: any) => ({
          ...m,
          id: 0,
          id_gasto_operacion: idGastoDuplicado,
          creado_por: this.usuario_id,
        }));
        return this.servicios.createManoDeObraLista(nuevas).pipe(
          catchError((err) => {
            console.error('Error duplicando mano de obra', err);
            return throwError(err);
          })
        );
      })
    );

    const equipo$ = this.servicios.getEquipoHerramientas(idGastoOriginal).pipe(
      switchMap((equipos) => {
        if (!equipos || equipos.length === 0) return of(null);
        const nuevos = equipos.map((e: any) => ({
          ...e,
          id: 0,
          id_gasto_operacion: idGastoDuplicado,
          creado_por: this.usuario_id,
        }));
        return this.servicios.createEquipoHerramientaLista(nuevos).pipe(
          catchError((err) => {
            console.error('Error duplicando equipo', err);
            return throwError(err);
          })
        );
      })
    );

    const gastosGen$ = this.servicios.getGastosGenerales(idGastoOriginal).pipe(
      switchMap((gastosGen) => {
        if (!gastosGen || gastosGen.length === 0) return of(null);
        const nuevos = gastosGen.map((g: any) => ({
          ...g,
          id: 0,
          id_gasto_operacion: idGastoDuplicado,
          creado_por: this.usuario_id,
        }));
        return this.servicios.createGastosGeneralesLista(nuevos).pipe(
          catchError((err) => {
            console.error('Error duplicando gastos generales', err);
            return throwError(err);
          })
        );
      })
    );

    // Wait for all subitem create calls to finish
    return forkJoin([materiales$, manoObra$, equipo$, gastosGen$]).pipe(
      map(() => void 0) // return void on completion
    );
  }

  duplicarProyecto(proyecto: Proyecto, event: Event): void {
    event.stopPropagation();
    this.duplicandoProyecto = true;
    this.actualizarProgreso(5);

    const proyectoDuplicadoPayload: Partial<Proyecto> = {
      ...proyecto,
      id_proyecto: 0,
      NombreProyecto: proyecto.NombreProyecto + ' (Copia)',
    };
    this.servicios
      .createIdentificadorGeneral(proyectoDuplicadoPayload)
      .pipe(
        switchMap((nuevoProyecto: Proyecto) => {
          this.actualizarProgreso(20);
          // Get modules
          return this.servicios
            .getModulosPorProyecto(proyecto.id_proyecto)
            .pipe(
              switchMap((modulosOriginales: Modulo[]) => {
                if (!modulosOriginales || modulosOriginales.length === 0) {
                  this.actualizarProgreso(40);
                  return of([] as Modulo[]);
                }

                const createModuloCalls = modulosOriginales.map((mod) => {
                  const nuevoModulo: Partial<Modulo> = {
                    ...mod,
                    id: 0,
                    proyecto: nuevoProyecto.id_proyecto,
                  };
                  return this.servicios.createModulo(nuevoModulo);
                });

                return forkJoin(createModuloCalls).pipe(
                  map((modulosGuardados) => ({
                    nuevoProyecto,
                    modulosOriginales,
                    modulosGuardados,
                  }))
                );
              }),
              catchError((err) => {
                console.error('Error obteniendo o creando módulos:', err);
                return throwError(err);
              })
            );
        }),
        switchMap((ctx: any) => {
          this.actualizarProgreso(45);
          const {
            nuevoProyecto,
            modulosOriginales = [],
            modulosGuardados = [],
          } = ctx;
          const mapaModulos = new Map<number, number>();
          modulosOriginales.forEach((modOriginal: Modulo, idx: number) => {
            const nuevoId = modulosGuardados[idx]?.id ?? null;
            if (modOriginal.id != null && nuevoId != null)
              mapaModulos.set(modOriginal.id!, nuevoId);
          });
          return this.servicios.getGastoOperacionID(proyecto.id_proyecto).pipe(
            switchMap((gastosOriginales: any[]) => {
              this.actualizarProgreso(60);

              if (!gastosOriginales || gastosOriginales.length === 0) {
                return of({
                  nuevoProyecto,
                  gastosGuardados: [] as any[],
                  gastosOriginales,
                });
              }
              const gastosDuplicadosPayloads = gastosOriginales.map(
                (g: any) => {
                  const moduloId = g.modulo?.id
                    ? mapaModulos.get(g.modulo.id) ?? null
                    : null;
                  const payload = {
                    ...g,
                    id: 0,
                    identificador: nuevoProyecto,
                    modulo_id: moduloId,
                    creado_por: this.usuario_id,
                    modificado_por: this.usuario_id,
                  };
                  delete (payload as any).modulo;
                  return payload;
                }
              );
              return this.servicios
                .createGastoOperacion(gastosDuplicadosPayloads)
                .pipe(
                  map((gastosGuardadosResp: any) => ({
                    nuevoProyecto,
                    gastosGuardados:
                      gastosGuardadosResp?.gastos ?? gastosGuardadosResp ?? [],
                    gastosOriginales,
                  }))
                );
            }),
            catchError((err) => {
              console.error('Error obteniendo o creando gastos:', err);
              return throwError(err);
            })
          );
        }),
        switchMap((ctx: any) => {
          const {
            nuevoProyecto,
            gastosGuardados = [],
            gastosOriginales = [],
          } = ctx;
          if (!gastosGuardados || gastosGuardados.length === 0) {
            this.actualizarProgreso(95);
            return of({ nuevoProyecto, gastosGuardados: [] });
          }
          const total = gastosGuardados.length;
          let completed = 0;
          const subitemObservables = gastosGuardados.map(
            (gastoGuardado: any, idx: number) => {
              const original = gastosOriginales[idx];
              return this.duplicarSubItems$(original.id, gastoGuardado.id).pipe(
                tap(() => {
                  completed++;
                  const base = 60;
                  const target = 95;
                  const pct =
                    base + Math.round(((target - base) * completed) / total);
                  this.actualizarProgreso(pct);
                }),
                catchError((err) => {
                  console.error(
                    'Error duplicando subitems para gasto',
                    gastoGuardado.id,
                    err
                  );
                  return of(null);
                })
              );
            }
          );
          return forkJoin(subitemObservables).pipe(
            map(() => ({ nuevoProyecto, gastosGuardados }))
          );
        }),
        tap(() => {
          this.actualizarProgreso(98);
        }),
        switchMap((ctx) => {
          return this.servicios.getIdentificadorGeneral().pipe(
            tap((proyectos) => {
              this.listaProyectos = proyectos;
              this.filtrarProyectos();
              this.listaProyectosChange.emit(this.listaProyectos);
            })
          );
        }),
        finalize(() => {
          this.actualizarProgreso(100);
          setTimeout(() => {
            this.duplicandoProyecto = false;
            this.progresoDuplicacion = 0;
          }, 5000);
        }),
        catchError((err) => {
          this.mostrarMensaje(
            'error',
            'Error al duplicar proyecto: ' +
              (err?.error?.error || err?.message || 'Intente nuevamente.')
          );
          return of(null);
        })
      )
      .subscribe((resultado) => {
        if (resultado) {
          setTimeout(() => {
            this.mostrarMensaje(
              'exito',
              'Proyecto duplicado correctamente con módulos, gastos e ítems.'
            );
          }, 5000);
        }
      });
  }
  private actualizarProgreso(porcentaje: number) {
    this.progresoDuplicacion = Math.max(
      0,
      Math.min(100, Math.round(porcentaje))
    );
  }
  abrirModalParametros(verProyectoExistente: boolean) {
    if (verProyectoExistente && this.proyectoSeleccionado) {
      // Editar proyecto existente
      this.nombreProyecto = this.proyectoSeleccionado.NombreProyecto;
      this.carga_social = this.proyectoSeleccionado.carga_social ?? null;
      this.iva_efectiva = this.proyectoSeleccionado.iva_efectiva ?? null;
      this.herramientas = this.proyectoSeleccionado.herramientas ?? null;
      this.gastos_generales =
        this.proyectoSeleccionado.gastos_generales ?? null;
      this.iva_tasa_nominal =
        this.proyectoSeleccionado.iva_tasa_nominal ?? null;
      this.it = this.proyectoSeleccionado.it ?? null;
      this.iue = this.proyectoSeleccionado.iue ?? null;
      this.ganancia = this.proyectoSeleccionado.ganancia ?? null;
      this.a_costo_venta = this.proyectoSeleccionado.a_costo_venta ?? null;
      this.b_margen_utilidad =
        this.proyectoSeleccionado.b_margen_utilidad ?? null;
      this.porcentaje_global_100 =
        this.proyectoSeleccionado.porcentaje_global_100 ?? 100;
    } else {
      // Crear nuevo proyecto → limpiar campos a null para mostrar placeholders
      this.proyectoSeleccionado = null;
      this.nombreProyecto = '';
      this.carga_social = null;
      this.iva_efectiva = null;
      this.herramientas = null;
      this.gastos_generales = null;
      this.iva_tasa_nominal = null;
      this.it = null;
      this.iue = null;
      this.ganancia = null;
      this.a_costo_venta = null;
      this.b_margen_utilidad = null;
      this.porcentaje_global_100 = 100;
    }

    const modalEl = document.getElementById('modalProyectoParametros');
    if (modalEl) {
      const modalInst =
        bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
      modalInst.show();
    } else {
      // Fallback: mostrar mensaje mínimo sin lanzar error
      this.mostrarMensaje('error', 'No se encontró el modal de parámetros.');
    }
  }

  cerrarModalParametros() {
    const modalEl = document.getElementById('modalProyectoParametros');
    if (!modalEl) return; // ❌ Quitar foco de cualquier botón dentro del modal

    const btnFoco = modalEl.querySelector('button:focus') as HTMLElement;
    if (btnFoco) btnFoco.blur(); // ✅ Usar Bootstrap para cerrar modal correctamente

    const modalInst = bootstrap.Modal.getInstance(modalEl);
    if (modalInst) {
      modalInst.hide();
    }
  }

  filtrarProyectos(): void {
    const termino = this.nombreProyecto.toLowerCase().trim();
    this.proyectosFiltrados = termino
      ? this.listaProyectos.filter((p) =>
          p.NombreProyecto.toLowerCase().includes(termino)
        )
      : [...this.listaProyectos];
  }

  seleccionarProyecto(proyecto: Proyecto): void {
    this.asignarProyecto(proyecto);
  }

  filtrarProyectoPorBusqueda() {
    const texto = this.busquedaProyecto.toLowerCase().trim();

    this.proyectosFiltrados = this.listaProyectos.filter((p) =>
      p.NombreProyecto.toLowerCase().includes(texto)
    );
  }

  toggleDropdownProyectos() {
    this.mostrarDropdownProyectos = !this.mostrarDropdownProyectos;

    if (this.mostrarDropdownProyectos) {
      this.proyectosFiltrados = [...this.listaProyectos];
      this.busquedaProyecto = '';
    }
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
  } /* Bloque 5: UI, Modales y Mensajes */

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

  private mostrarModalError(mensaje: string, duracion = 2000) {
    this.mensajeError = mensaje;
    const modalEl = document.getElementById('modalError');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();

    setTimeout(() => modal.hide(), duracion);
  }

  confirmarEliminacion(): void {
    // Para proyectos, manejar eliminación aquí
    if (this.tipoConfirmacion === 'proyecto') {
      this.servicios
        .deleteIdentificadorGeneral(this.identificadorGeneral)
        .subscribe({
          next: () => {
            // 🔹 Recargar lista REAL desde el backend
            this.servicios.getIdentificadorGeneral().subscribe({
              next: (proyectos) => {
                this.listaProyectos = proyectos;
                this.filtrarProyectos();
                this.listaProyectosChange.emit(this.listaProyectos);
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
    } // Reset modal

    this.mostrarConfirmacion = false;
    this.tipoConfirmacion = null;
  }

  manejarAceptar() {
    this.confirmarEliminacion();
  }

  manejarCancelar() {
    this.mostrarConfirmacion = false;
    this.tipoConfirmacion = null;
  }

  manejarOk() {
    this.mensajeExito = '';
  }

  manejarError() {
    this.mensajeError = '';
  }

  private resetearProyecto(): void {
    this.proyectoSeleccionado = null;
    this.proyectoData = {};
    this.identificadorGeneral = 0;
    this.nombreProyecto = '';
    this.carga_social = null;
    this.iva_efectiva = null;
    this.herramientas = null;
    this.gastos_generales = null;
    this.iva_tasa_nominal = null;
    this.it = null;
    this.iue = null;
    this.ganancia = null;
    this.a_costo_venta = null;
    this.b_margen_utilidad = null;
    this.porcentaje_global_100 = 100;
  }
  toNum(valor: any): number {
    return Number(valor) || 0;
  }

  filtrarNombreProyectoInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let valor = input.value;
    valor = valor.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, '');
    valor = valor.replace(/\s{2,}/g, ' ');
    input.value = valor;
    this.nombreProyecto = valor;
  }
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const inputGroup = document.querySelector('.input-group'); // Contenedor del input
    const dropdown = document.querySelector('.dropdown-proyectos'); // El ul del dropdown
    if (inputGroup && dropdown) {
      // Si el clic NO está dentro del input-group NI del dropdown, ocultar
      if (!inputGroup.contains(target) && !dropdown.contains(target)) {
        this.mostrarDropdownProyectos = false;
      }
    }
  }
  togglePDF(): void {
    if (!this.identificadorGeneral) return; // prevenir si no hay proyecto

    this.mostrarVistaPDF = !this.mostrarVistaPDF;
  }
}
