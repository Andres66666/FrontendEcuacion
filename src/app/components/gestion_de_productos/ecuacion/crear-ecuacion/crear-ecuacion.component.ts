import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CrearMaterialesComponent } from '../../materiales/crear-materiales/crear-materiales.component';
import { CrearManoDeObraComponent } from '../../mano-de-obra/crear-mano-de-obra/crear-mano-de-obra.component';
import { CrearEquipoHerramientaComponent } from '../../equipo-herramienta/crear-equipo-herramienta/crear-equipo-herramienta.component';
import { CrearGastosGeneralesComponent } from '../../gastos-generales/crear-gastos-generales/crear-gastos-generales.component';

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
export class CrearEcuacionComponent {}
