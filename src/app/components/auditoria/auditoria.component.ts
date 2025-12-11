import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ServiciosService } from '../../services/servicios.service';
import { Atacante } from '../../models/models';
import { AgCharts } from 'ag-charts-community';

@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './auditoria.component.html',
  styleUrls: ['./auditoria.component.css'],
})
export class AuditoriaComponent implements AfterViewInit {
  ataques: Atacante[] = [];
  filteredAtacantes: Atacante[] = [];
  selectedAtacante: Atacante | null = null;

  tiposAtaque: string[] = ['SQLi', 'XSS', 'CSRF', 'DoS'];
  selectedTipo: string = '';

  selectedRange: 'dia' | 'mes' | 'anio' = 'dia';

  tipoResumen: string = 'Cargando resumen...';
  estadoResumen: string = 'Cargando resumen...';

  lineChart: any;

  tipoIconos: { [key: string]: string } = {
    SQLi: 'https://cdn-icons-png.flaticon.com/128/10961/10961459.png',
    XSS: 'https://cdn-icons-png.flaticon.com/128/13502/13502242.png',
    CSRF: 'https://cdn-icons-png.flaticon.com/128/4440/4440880.png',
    DoS: 'https://cdn-icons-png.flaticon.com/128/6653/6653409.png',
  };

  constructor(private servicio: ServiciosService) {}

  ngAfterViewInit() {
    this.cargarAtaques();
  }

  cargarAtaques() {
    this.servicio.getAtaquesDB().subscribe((res: Atacante[]) => {
      this.ataques = res;
      this.filteredAtacantes = [...res];
      if (res.length > 0) this.selectedAtacante = res[0];
      this.updateCharts();
    });
  }

  seleccionarAtacante(a: Atacante) {
    this.selectedAtacante = a;
  }

  filterByTipo(tipo: string) {
    this.selectedTipo = tipo;

    this.filteredAtacantes =
      tipo === ''
        ? [...this.ataques]
        : this.ataques.filter((a) => a.tipos.includes(tipo));

    this.selectedAtacante = this.filteredAtacantes[0] || null;
    this.updateCharts();
  }

  showAll() {
    this.selectedTipo = '';
    this.filteredAtacantes = [...this.ataques];
    this.selectedAtacante = this.filteredAtacantes[0] || null;
    this.updateCharts();
  }

  toggleBloqueo(a: Atacante) {
    const nuevo = !a.bloqueado;
    this.servicio.updateAtacanteBloqueo(a.id!, nuevo).subscribe(() => {
      a.bloqueado = nuevo;
      this.updateCharts();
    });
  }

  getBadgeClass(a: Atacante) {
    if (a.tipos.includes('SQLi')) return 'bg-danger bg-opacity-25 text-dark';
    if (a.tipos.includes('DoS')) return 'bg-warning bg-opacity-25 text-dark';
    if (a.tipos.includes('XSS')) return 'bg-info bg-opacity-25 text-dark';
    return 'bg-secondary bg-opacity-25 text-dark';
  }

  getTipoSummary() {
    const counts: any = {};

    this.filteredAtacantes.forEach((a) =>
      a.tipos.forEach((t) => {
        counts[t] = (counts[t] || 0) + 1;
      })
    );

    const total = this.filteredAtacantes.length;

    let html = `<strong>Total Ataques Reportados: ${total}</strong><br>`;

    Object.keys(counts)
      .sort((a, b) => counts[b] - counts[a])
      .forEach((tipo) => {
        const pct = total ? ((counts[tipo] / total) * 100).toFixed(1) : 0;

        html += `
          <span class="badge ${this.getBadgeClass({
            tipos: [tipo],
          } as Atacante)} me-2">${tipo}</span>
          : ${counts[tipo]} (${pct}%)<br>
        `;
      });

    return html;
  }

  getEstadoSummary() {
    const bloqueados = this.filteredAtacantes.filter((a) => a.bloqueado).length;
    const activos = this.filteredAtacantes.length - bloqueados;
    return `Ataques Totales: ${this.filteredAtacantes.length} | Bloqueados: ${bloqueados} 🚫 | Activos: ${activos} ✅`;
  }

  formatDate(f: string, r: 'dia' | 'mes' | 'anio') {
    const d = new Date(f);
    if (r === 'dia') return d.toISOString().split('T')[0];
    if (r === 'mes')
      return `${d.getFullYear()}-${('0' + (d.getMonth() + 1)).slice(-2)}`;
    return `${d.getFullYear()}`;
  }

  getTimeSeriesData() {
    const map: any = {};

    this.filteredAtacantes.forEach((a) => {
      const fecha = this.formatDate(a.fecha, this.selectedRange);
      if (!map[fecha]) map[fecha] = {};
      a.tipos.forEach((t) => {
        map[fecha][t] = (map[fecha][t] || 0) + 1;
      });
    });

    const data = Object.keys(map)
      .sort()
      .map((f) => ({ fecha: f, ...map[f] }));

    return data;
  }

  onRangeChange() {
    this.updateCharts();
  }

  updateCharts() {
    this.tipoResumen = this.getTipoSummary();
    this.estadoResumen = this.getEstadoSummary();

    this.createLineChart(this.getTimeSeriesData());
  }

  createLineChart(data: any[]) {
    const container = document.getElementById('myChart');
    if (!container) return;

    if (this.lineChart) this.lineChart.destroy();

    const series: any[] = Object.keys(data[0] || {})
      .filter((k) => k !== 'fecha')
      .map((t) => ({
        type: 'line',
        xKey: 'fecha',
        yKey: t,
        yName: t,
      }));

    this.lineChart = AgCharts.create({
      container,
      type: 'cartesian',
      data,
      series,
      axes: [
        { type: 'category', position: 'bottom', title: { text: 'Fecha' } },
        { type: 'number', position: 'left', title: { text: 'Cantidad' } },
      ],
    });
  }
}
