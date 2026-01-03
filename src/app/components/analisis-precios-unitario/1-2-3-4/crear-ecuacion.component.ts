import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CrearManoDeObraComponent } from '../mano-de-obra/crear-mano-de-obra.component';
import { ActivatedRoute, Router } from '@angular/router';
import { CrearMaterialesComponent } from '../materiales/crear-materiales.component';
import { CrearEquipoHerramientaComponent } from '../equipo-herramienta/crear-equipo-herramienta.component';
import { CrearGastosGeneralesComponent } from '../gastos-generales/crear-gastos-generales.component';
import { Proyecto } from '../../gestion_proyectos/models/modelosProyectos';
import { ServiciosProyectos } from '../../gestion_proyectos/service/servicios-proyectos';

@Component({
  selector: 'app-crear-ecuacion',
  standalone: true,
  imports: [
    CommonModule,
    CrearMaterialesComponent,
    CrearManoDeObraComponent,
    CrearEquipoHerramientaComponent,
    CrearGastosGeneralesComponent,
  ],
  templateUrl: './crear-ecuacion.component.html',
  styleUrl: './crear-ecuacion.component.css',
})
export class CrearEcuacionComponent {
  id_gasto_operaciones: number = 0;
  nombreProyecto: string = '';
  descripcion: string = '';
  unidad: string = '';
  cantidad: number = 0;
  identificadorGeneral: number = 0;
  proyectoData!: Proyecto;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: ServiciosProyectos
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.id_gasto_operaciones = Number(params['id_gasto_operaciones']) || 0;
      this.identificadorGeneral = Number(params['id_proyecto']) || 0;
      this.nombreProyecto = params['proyecto'] || '';
      this.descripcion = params['descripcion'] || '';
      this.unidad = params['unidad'] || '';
      this.cantidad = Number(params['cantidad']) || 0;

      // 🔥 CARGA COMPLETA DEL PROYECTO
      this.cargarProyecto();
    });
  }
  cargarProyecto(): void {
    if (!this.identificadorGeneral) return;

    this.service.getProyectoID(this.identificadorGeneral).subscribe((p) => {
      this.proyectoData = p;
    });
  }

  navigateToHome(): void {
    this.router.navigate(['/panel-control/proyectos']);
  }
}
