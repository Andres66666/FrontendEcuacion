import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Proyecto } from '../models/modelosProyectos';
import { ServiciosProyectos } from '../service/servicios-proyectos';
import { ModuloComponent } from '../modulo/modulo';
import { ItemsGastoOperacion } from '../items-gasto-operacion/items-gasto-operacion';
import { of, forkJoin, throwError, Observable } from 'rxjs'; // Agregado Observable
import { switchMap, map, catchError, finalize, tap } from 'rxjs/operators';
import { Router } from '@angular/router';

@Component({
  selector: 'app-proyectos',
  standalone: true,
  imports: [CommonModule, FormsModule, ModuloComponent, ItemsGastoOperacion],
  templateUrl: './proyectos.html',
  styleUrl: './proyectos.css',
})
export class Proyectos implements OnInit {
  proyectos: Proyecto[] = [];

  dropdownAbierto = false;
  mostrarModal = false;
  modoEdicion = false;

  proyectoForm: Proyecto = this.nuevoProyecto();
  proyectoSeleccionado: Proyecto | null = null; // proyecto seleccionado en dropdown

  // Variables para duplicación
  progresoDuplicacion: number = 0;
  duplicandoProyecto: boolean = false;
  usuario_id = 0; // Asumiendo que se obtiene del auth o similar; ajustar según necesidad

  constructor(private service: ServiciosProyectos, private router: Router) {}

  ngOnInit() {
    const usuario = this.service.getUsuarioLogueado(); // O directamente: JSON.parse(localStorage.getItem('usuarioLogueado') || '{}')
    if (!usuario || !usuario.id) {
      this.router.navigate(['/login']);
      return;
    }
    this.usuario_id = usuario.id; // ← ASIGNAR EL ID DEL USUARIO LOGUEADO
    this.listar();
  }

  nuevoProyecto(): Proyecto {
    return {
      id_proyecto: 0,
      NombreProyecto: '',
      carga_social: 0,
      iva_efectiva: 0,
      herramientas: 0,
      gastos_generales: 0,
      iva_tasa_nominal: 0,
      it: 0,
      iue: 0,
      ganancia: 0,
      margen_utilidad: 0,
      creado_por: this.usuario_id,
    };
  }

  listar() {
    this.service.getProyecto().subscribe((r) => {
      this.proyectos = r;
      // Si ya había un proyecto seleccionado, actualizamos la referencia
      if (this.proyectoSeleccionado) {
        this.proyectoSeleccionado =
          this.proyectos.find(
            (p) => p.id_proyecto === this.proyectoSeleccionado!.id_proyecto
          ) || null;
      }
    });
  }

  toggleDropdown() {
    this.dropdownAbierto = !this.dropdownAbierto;
  }

  abrirNuevo() {
    this.modoEdicion = false;
    this.proyectoForm = this.nuevoProyecto();
    this.mostrarModal = true;
    this.dropdownAbierto = false;
  }

  abrirEditar(p: Proyecto) {
    this.modoEdicion = true;
    this.proyectoForm = { ...p };
    this.mostrarModal = true;
    this.dropdownAbierto = false;
    this.proyectoSeleccionado = p; // se marca el proyecto seleccionado
  }

  cerrarModal() {
    this.mostrarModal = false;
  }

  guardar() {
    if (!this.proyectoForm.NombreProyecto.trim()) return;
    this.proyectoForm.creado_por = this.usuario_id;
    const req = this.modoEdicion
      ? this.service.updateProyecto(this.proyectoForm)
      : this.service.createProyecto(this.proyectoForm);

    req.subscribe((res: Proyecto) => {
      this.listar();
      this.cerrarModal();
      this.proyectoSeleccionado = res; // proyecto guardado ahora seleccionado
    });
  }

  eliminar(id: number) {
    if (!confirm('¿Eliminar proyecto?')) return;
    this.service.deleteProyecto(id).subscribe(() => {
      // Si borramos el proyecto seleccionado, limpiamos el select
      if (this.proyectoSeleccionado?.id_proyecto === id) {
        this.proyectoSeleccionado = null;
      }
      this.listar();
    });
  }

  upperNombre() {
    this.proyectoForm.NombreProyecto =
      this.proyectoForm.NombreProyecto.toUpperCase();
  }

  seleccionarProyecto(p: Proyecto) {
    this.proyectoSeleccionado = p;
    this.dropdownAbierto = false;
  }

  // Función auxiliar genérica para duplicar subítems (ajustada para usar métodos individuales)
  private duplicarItemsGenerico(
    getItems: (id: number) => Observable<any[]>,
    createItem: (item: any) => Observable<any>,
    idOriginal: number,
    idNuevo: number
  ): Observable<void> {
    return getItems(idOriginal).pipe(
      switchMap((items: any[]) => {
        // Especificado como any[]
        if (!items || items.length === 0) return of(null);
        const createCalls = items.map((item: any) => {
          const nuevo = {
            ...item,
            id: 0,
            id_gasto_operacion: idNuevo,
            creado_por: this.usuario_id,
          };
          return createItem(nuevo);
        });
        return forkJoin(createCalls);
      }),
      map(() => void 0),
      catchError((err) => {
        console.error('Error duplicando ítems', err);
        return throwError(err);
      })
    );
  }

  // Método auxiliar para duplicar subítems de un gasto de operación (simplificado)
  duplicarSubItems$(
    idGastoOriginal: number,
    idGastoDuplicado: number
  ): Observable<void> {
    const observables = [
      this.duplicarItemsGenerico(
        this.service.getMaterialesIDGasto.bind(this.service),
        this.service.createMaterial.bind(this.service),
        idGastoOriginal,
        idGastoDuplicado
      ),
      this.duplicarItemsGenerico(
        this.service.getManoDeObraIDGasto.bind(this.service),
        this.service.createManoDeObra.bind(this.service),
        idGastoOriginal,
        idGastoDuplicado
      ),
      this.duplicarItemsGenerico(
        this.service.getEquipoHerramientas.bind(this.service),
        this.service.createEquipoHerramienta.bind(this.service),
        idGastoOriginal,
        idGastoDuplicado
      ),
      this.duplicarItemsGenerico(
        this.service.getGastosGenerales.bind(this.service),
        this.service.createGasto.bind(this.service),
        idGastoOriginal,
        idGastoDuplicado
      ),
    ];
    return forkJoin(observables).pipe(map(() => void 0));
  }

  // Método principal para duplicar un proyecto completo (simplificado)
  duplicarProyecto(proyecto: Proyecto, event: Event): void {
    event.stopPropagation();
    this.duplicandoProyecto = true;
    this.actualizarProgreso(5);

    const proyectoDuplicadoPayload: Partial<Proyecto> = {
      ...proyecto,
      id_proyecto: 0,
      NombreProyecto: proyecto.NombreProyecto + ' (COPIA)',
      creado_por: this.usuario_id,
    };

    this.service
      .createProyecto(proyectoDuplicadoPayload)
      .pipe(
        switchMap((nuevoProyecto) =>
          this.duplicarModulos(nuevoProyecto, proyecto.id_proyecto)
        ),
        switchMap((ctx) => this.duplicarGastos(ctx, proyecto.id_proyecto)), // Pasar ID original
        switchMap((ctx) => this.duplicarSubItemsDeGastos(ctx)),
        switchMap(() => this.service.getProyecto()),
        tap((proyectos) => (this.proyectos = proyectos)),
        finalize(() => {
          this.actualizarProgreso(100);
          setTimeout(() => {
            this.duplicandoProyecto = false;
            this.progresoDuplicacion = 0;
          }, 5000);
        }),
        catchError((err) => {
          console.error('Error al duplicar proyecto:', err);
          return of(null);
        })
      )
      .subscribe((resultado) => {
        if (resultado) {
          setTimeout(() => alert('Proyecto duplicado correctamente.'), 5000);
        }
      });
  }

  // Función auxiliar para duplicar módulos
  private duplicarModulos(
    nuevoProyecto: Proyecto,
    idProyectoOriginal: number
  ): Observable<any> {
    this.actualizarProgreso(20);
    return this.service.getModulosPorProyecto(idProyectoOriginal).pipe(
      switchMap((modulosOriginales) => {
        if (!modulosOriginales || modulosOriginales.length === 0) {
          this.actualizarProgreso(40);
          return of({
            nuevoProyecto,
            modulosOriginales: [],
            modulosGuardados: [],
          });
        }
        const createCalls = modulosOriginales.map((mod) => {
          const nuevoModulo = {
            ...mod,
            id: 0,
            proyecto: nuevoProyecto.id_proyecto,
          };
          return this.service.createModulo(nuevoModulo);
        });
        return forkJoin(createCalls).pipe(
          map((modulosGuardados) => ({
            nuevoProyecto,
            modulosOriginales,
            modulosGuardados,
          }))
        );
      }),
      catchError((err) => {
        console.error('Error duplicando módulos:', err);
        return throwError(err);
      })
    );
  }

  // Función auxiliar para duplicar gastos
  private duplicarGastos(
    ctx: any,
    idProyectoOriginal: number
  ): Observable<any> {
    this.actualizarProgreso(45);
    const { nuevoProyecto, modulosOriginales, modulosGuardados } = ctx;
    const mapaModulos = new Map<number, number>();
    modulosOriginales.forEach((mod: any, idx: number) => {
      const nuevoId = modulosGuardados[idx]?.id ?? null;
      if (mod.id && nuevoId) mapaModulos.set(mod.id, nuevoId);
    });

    return this.service.getGastoOperacionID(idProyectoOriginal).pipe(
      // Usar ID del proyecto original
      switchMap((gastosOriginales) => {
        this.actualizarProgreso(60);
        if (!gastosOriginales || gastosOriginales.length === 0) {
          return of({ nuevoProyecto, gastosGuardados: [], gastosOriginales });
        }
        const payloads = gastosOriginales.map((g: any) => ({
          descripcion: g.descripcion,
          unidad: g.unidad,
          cantidad: g.cantidad,
          precio_unitario: g.precio_unitario,
          identificador: { id_proyecto: nuevoProyecto.id_proyecto },
          modulo_id: g.modulo?.id ? mapaModulos.get(g.modulo.id) ?? null : null,
          creado_por: this.usuario_id,
          modificado_por: this.usuario_id,
        }));
        return forkJoin(
          payloads.map((payload) =>
            this.service
              .createGastoOperacion([payload])
              .pipe(map((resp: any) => (resp?.gastos ? resp.gastos[0] : resp)))
          )
        ).pipe(
          map((gastosGuardados) => ({
            nuevoProyecto,
            gastosGuardados,
            gastosOriginales,
          }))
        );
      }),
      catchError((err) => {
        console.error('Error duplicando gastos:', err);
        return throwError(err);
      })
    );
  }

  // Función auxiliar para duplicar subítems de gastos
  private duplicarSubItemsDeGastos(ctx: any): Observable<any> {
    const { nuevoProyecto, gastosGuardados, gastosOriginales } = ctx;
    if (!gastosGuardados || gastosGuardados.length === 0) {
      this.actualizarProgreso(95);
      return of({ nuevoProyecto, gastosGuardados: [] });
    }
    const total = gastosGuardados.length;
    let completed = 0;
    const observables = gastosGuardados.map((gasto: any, idx: number) => {
      const original = gastosOriginales[idx];
      return this.duplicarSubItems$(original.id, gasto.id).pipe(
        tap(() => {
          completed++;
          const pct = 60 + Math.round((35 * completed) / total);
          this.actualizarProgreso(pct);
        }),
        catchError((err) => {
          console.error('Error duplicando subítems:', err);
          return of(null);
        })
      );
    });
    return forkJoin(observables).pipe(
      map(() => ({ nuevoProyecto, gastosGuardados }))
    );
  }

  // Método auxiliar para actualizar el progreso
  private actualizarProgreso(porcentaje: number) {
    this.progresoDuplicacion = Math.max(
      0,
      Math.min(100, Math.round(porcentaje))
    );
  }
}
