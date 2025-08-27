import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CrearManoDeObraComponent } from '../mano-de-obra/crear-mano-de-obra.component';
import { ActivatedRoute, Router } from '@angular/router';
import { CrearMaterialesComponent } from '../materiales/crear-materiales.component';
import { CrearEquipoHerramientaComponent } from '../equipo-herramienta/crear-equipo-herramienta.component';
import { CrearGastosGeneralesComponent } from '../gastos-generales/crear-gastos-generales.component';
import { ExportService } from '../../../services/export.service';

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

  id_gasto_operaciones: number=0;
  nombreProyecto: string = '';
  descripcion: string = '';
  unidad: string = '';
  cantidad: number = 0;
  identificadorGeneral: number = 0;

  constructor( private route: ActivatedRoute,    public router: Router,  private exportService: ExportService ){}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.id_gasto_operaciones = Number(params['id_gasto_operaciones']) || 0;
      this.nombreProyecto = params['proyecto'] || '';
      this.descripcion = params['descripcion'] || '';
      this.unidad = params['unidad'] || '';
      this.cantidad = Number(params['cantidad']) || 0;
      this.identificadorGeneral = Number(params['identificadorGeneral']) || 0;

      console.log('Datos recibidos:');
      console.table({
        id_gasto_operaciones: this.id_gasto_operaciones,
        nombreProyecto: this.nombreProyecto,
        descripcion: this.descripcion,
        unidad: this.unidad,
        cantidad: this.cantidad,
        identificadorGeneral: this.identificadorGeneral,
      });
    });
  }
  navigateToHome(): void {
    this.router.navigate(['/panel-control/gastos-operaciones']);
  }
  exportPDF() {
    this.exportService.generatePDF('contentToExport', 'factura.pdf');
  }
  exportWORD() {
    this.exportService.generateWord('contentToExport', 'factura.docx');
  }
}
