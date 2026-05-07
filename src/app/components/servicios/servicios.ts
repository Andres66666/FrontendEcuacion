import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ServiciosService } from '../../services/servicios.service';

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
      nombre: 'Inicial',
      mensual: 14,
      anual: 168,
      color: '#FFB300',
      beneficios: [
        { texto: 'Acceso Sistema Base', incluido: true },
        { texto: 'Soporte Técnico', incluido: false },
        { texto: 'Actualizaciones Beta', incluido: false },
        { texto: 'Reportes Mensuales', incluido: false },
      ],
    },
    {
      nombre: 'Individual',
      mensual: 60,
      anual: 720,
      color: '#03A9F4',
      beneficios: [
        { texto: 'Acceso Sistema Base', incluido: true },
        { texto: 'Soporte Técnico', incluido: true },
        { texto: 'Actualizaciones Beta', incluido: false },
        { texto: 'Reportes Mensuales', incluido: false },
      ],
    },
    {
      nombre: 'Profesional',
      mensual: 130,
      anual: 1560,
      color: '#E91E63',
      beneficios: [
        { texto: 'Acceso Sistema Base', incluido: true },
        { texto: 'Soporte Técnico', incluido: true },
        { texto: 'Actualizaciones Beta', incluido: true },
        { texto: 'Reportes Mensuales', incluido: false },
      ],
    },
    {
      nombre: 'Equipo',
      mensual: 340,
      anual: 4080,
      color: '#4CAF50',
      beneficios: [
        { texto: 'Acceso Sistema Base', incluido: true },
        { texto: 'Soporte Técnico', incluido: true },
        { texto: 'Actualizaciones Beta', incluido: true },
        { texto: 'Reportes Mensuales', incluido: true },
      ],
    },
    {
      nombre: 'Empresa Pequeña',
      mensual: 340,
      anual: 4080,
      color: '#9C27B0',
      beneficios: [
        { texto: 'Gestión de Inventarios', incluido: true },
        { texto: 'Soporte 24/7', incluido: true },
        { texto: 'Multi-usuario (3)', incluido: true },
      ],
    },
    {
      nombre: 'Empresa Grande',
      mensual: 680,
      anual: 8160,
      color: '#FF5722',
      beneficios: [
        { texto: 'Gestión de Inventarios', incluido: true },
        { texto: 'Soporte VIP', incluido: true },
        { texto: 'Usuarios Ilimitados', incluido: true },
      ],
    },
    {
      nombre: 'Empresarial',
      mensual: 680,
      anual: 8160,
      color: '#00BCD4',
      beneficios: [
        { texto: 'Personalización Total', incluido: true },
        { texto: 'Servidor Dedicado', incluido: true },
        { texto: 'Soporte On-site', incluido: true },
        { texto: 'Garantía de Uptime', incluido: true },
      ],
    },
    {
      nombre: 'Institucional',
      mensual: 1800,
      anual: 14400,
      color: '#bfc230',
      beneficios: [
        { texto: 'Todo lo anterior', incluido: true },
        { texto: 'Capacitación Personal', incluido: true },
        { texto: 'Auditoría Trimestral', incluido: true },
        { texto: 'Contrato Perpetuo', incluido: true },
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
