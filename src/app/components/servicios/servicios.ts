import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ServiciosService } from '../../services/servicios.service';
import { text } from 'node:stream/consumers';

@Component({
  selector: 'app-servicios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './servicios.html',
  styleUrls: ['./servicios.css'],
})
export class Servicios {
  planSeleccionado: any = null;
  tipoPago: 'Mensual' | 'Anual' = 'Mensual';
  usuarioLogeado: any = null;

  planes = [
    {
      nombre: 'Personas naturales',
      mensual: 130,
      anual: 1248,
      descuento: '20% OFF',
      descripcion: 'Ideal para profesionales independientes y estudiantes.',
      color: 'warning',
      badge: 'EMPRENDEDORES',
      destacado: false,

      beneficios: [
        { icono: 'bi-folder2-open', texto: 'Hasta 3 proyectos activos', incluido: true },
        { icono: 'bi-diagram-3', texto: '10 módulo por proyecto', incluido: true },
        { icono: 'bi-people', texto: '1 usuario administrador', incluido: true },
        { icono: 'bi-calculator', texto: 'Presupuestos automáticos', incluido: true },
        { icono: 'bi-cash-stack', texto: 'Cálculo de utilidad', incluido: true },
        { icono: 'bi-graph-up-arrow', texto: 'Análisis básico de costos', incluido: true },
        { icono: 'bi-file-earmark-bar-graph', texto: 'Reportes básicos', incluido: true },
        { icono: 'bi-file-earmark-excel', texto: 'Exportación Excel/PDF', incluido: false },
        { icono: 'bi-cloud-arrow-up', texto: '20 GB almacenamiento SSD', incluido: true },
        { icono: 'bi-shield-lock', texto: 'Seguridad y autenticación 2FA', incluido: true },
        { icono: 'bi-headset', texto: 'Soporte prioritario 24/7', incluido: false },
        { icono: 'bi-arrow-repeat', texto: 'Actualizaciones automáticas', incluido: true },
        { icono: 'bi-database-check', texto: 'Backups automáticos', incluido: false },
        { icono: 'bi-building', texto: 'Panel administrativo empresarial', incluido: false },
      ],
    },

    {
      nombre: 'Micro empresas',
      mensual: 340,
      anual: 3264,
      descuento: '20% OFF',
      descripcion: 'Perfecto para pequeñas constructoras y equipos.',
      color: 'primary',
      badge: 'MÁS POPULAR',
      destacado: true,

      beneficios: [
        { icono: 'bi-folder2-open', texto: 'Hasta 15 proyectos activos', incluido: true },
        { icono: 'bi-diagram-3', texto: '50 módulos por proyecto', incluido: true },
        { icono: 'bi-people', texto: 'Hasta 5 usuarios', incluido: true },
        { icono: 'bi-calculator', texto: 'Presupuestos automáticos', incluido: true },
        { icono: 'bi-cash-stack', texto: 'Cálculo de utilidad avanzado', incluido: true },
        { icono: 'bi-graph-up-arrow', texto: 'Comparación de precios', incluido: true },
        { icono: 'bi-bar-chart-line', texto: 'Historial de costos', incluido: true },
        { icono: 'bi-file-earmark-bar-graph', texto: 'Reportes avanzados', incluido: true },
        { icono: 'bi-file-earmark-excel', texto: 'Exportación Excel/PDF', incluido: true },
        { icono: 'bi-cloud-arrow-up', texto: '50 GB almacenamiento SSD', incluido: true },
        { icono: 'bi-shield-lock', texto: 'Seguridad y autenticación 2FA', incluido: true },
        { icono: 'bi-headset', texto: 'Soporte prioritario 24/7', incluido: false },
        { icono: 'bi-arrow-repeat', texto: 'Actualizaciones automáticas', incluido: true },
        { icono: 'bi-database-check', texto: 'Backups automáticos', incluido: true },
        { icono: 'bi-building', texto: 'Panel administrativo empresarial', incluido: false },
      ],
    },

    {
      nombre: 'Empresas',
      mensual: 680,
      anual: 6528,
      descuento: '20% OFF',
      descripcion: 'Pensado para constructoras medianas y grandes.',
      color: 'success',
      badge: 'MEJOR VALOR',
      destacado: false,

      beneficios: [
        { icono: 'bi-folder2-open', texto: 'Hasta 100 proyectos activos', incluido: true },
        { icono: 'bi-diagram-3', texto: 'Módulos ilimitados', incluido: true },
        { icono: 'bi-people', texto: 'Usuarios ilimitados', incluido: true },
        { icono: 'bi-person-gear', texto: 'Control avanzado de usuarios', incluido: true },
        { icono: 'bi-calculator', texto: 'Presupuestos automáticos', incluido: true },
        { icono: 'bi-cash-stack', texto: 'Cálculo avanzado de utilidad', incluido: true },
        { icono: 'bi-graph-up-arrow', texto: 'Análisis financiero avanzado', incluido: true },
        { icono: 'bi-bar-chart-line', texto: 'Historial y trazabilidad de costos', incluido: true },
        { icono: 'bi-file-earmark-bar-graph', texto: 'Reportes personalizados', incluido: true },
        { icono: 'bi-file-earmark-excel', texto: 'Exportación Excel/PDF', incluido: true },
        { icono: 'bi-cloud-arrow-up', texto: '100 GB almacenamiento SSD', incluido: true },
        { icono: 'bi-shield-lock', texto: 'Seguridad avanzada empresarial', incluido: true },
        { icono: 'bi-headset', texto: 'Soporte prioritario 24/7', incluido: true },
        { icono: 'bi-arrow-repeat', texto: 'Actualizaciones prioritarias', incluido: true },
        { icono: 'bi-database-check', texto: 'Backups automáticos diarios', incluido: true },
        { icono: 'bi-building', texto: 'Panel administrativo empresarial', incluido: true },
      ],
    },

    {
      nombre: 'Institucional',
      mensual: 1800,
      anual: 17280,
      descuento: '20% OFF',
      descripcion: 'Infraestructura dedicada para instituciones y corporaciones.',
      color: 'danger',
      badge: 'EMPRESARIAL',
      destacado: false,

      beneficios: [
        { icono: 'bi-folder2-open', texto: 'Proyectos ilimitados', incluido: true },
        { icono: 'bi-diagram-3', texto: 'Módulos ilimitados', incluido: true },
        { icono: 'bi-people', texto: 'Usuarios ilimitados', incluido: true },
        { icono: 'bi-person-gear', texto: 'Control total de usuarios y roles', incluido: true },
        { icono: 'bi-calculator', texto: 'Presupuestos automáticos inteligentes', incluido: true },
        { icono: 'bi-cash-stack', texto: 'Cálculo financiero corporativo', incluido: true },
        { icono: 'bi-graph-up-arrow', texto: 'Analítica avanzada y métricas', incluido: true },
        { icono: 'bi-bar-chart-line', texto: 'Historial completo de costos', incluido: true },
        { icono: 'bi-file-earmark-bar-graph', texto: 'Reportes corporativos personalizados', incluido: true },
        { icono: 'bi-file-earmark-excel', texto: 'Exportación ilimitada Excel/PDF', incluido: true },
        { icono: 'bi-cloud-arrow-up', texto: 'Almacenamiento ilimitado SSD', incluido: true },
        { icono: 'bi-shield-lock', texto: 'Seguridad avanzada empresarial', incluido: true },
        { icono: 'bi-headset', texto: 'Soporte premium dedicado 24/7', incluido: true },
        { icono: 'bi-arrow-repeat', texto: 'Actualizaciones exclusivas', incluido: true },
        { icono: 'bi-database-check', texto: 'Backups automáticos y recuperación', incluido: true },
        { icono: 'bi-building', texto: 'Infraestructura dedicada', incluido: true },
      ],
    },
  ];
  constructor(private serviciosService: ServiciosService) {
    const usuario = localStorage.getItem('usuarioLogueado');
    this.usuarioLogeado = usuario ? JSON.parse(usuario) : null;
  }

  seleccionarPlan(plan: any, modo: 'Mensual' | 'Anual') {
    this.planSeleccionado = plan;
    this.tipoPago = modo;
  }

  get precioFinal(): number {
    if (!this.planSeleccionado) return 0;
    return this.tipoPago === 'Mensual'
      ? this.planSeleccionado.mensual
      : this.planSeleccionado.anual;
  }

  realizarCompra() {
    if (!this.usuarioLogeado) {
      alert('Debe iniciar sesión para continuar.');
      return;
    }
    alert(
      `Procesando pago de Bs. ${this.precioFinal} para el plan ${this.planSeleccionado.nombre}`,
    );
  }
  abrirPago() {
    if (!this.usuarioLogeado) {
      alert('Debe iniciar sesión para continuar.');
      return;
    }

    alert(
      `Procesando pago de Bs. ${this.precioFinal} para el plan ${this.planSeleccionado.nombre} (${this.tipoPago})`,
    );
  }
}
