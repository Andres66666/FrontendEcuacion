import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ServiciosService } from '../../../services/servicios.service';
import { Atacante, AuditoriaEvento } from '../../../models/models';
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
  selectedAtacante: Atacante | null = null; // Gráficas

  lineChart: any; // pieChart: any; // Eliminado // Filtros
  tiposAtaque: string[] = ['SQLi', 'XSS', 'CSRF', 'DoS'];
  selectedTipo: string = '';
  filteredAtacantes: Atacante[] = [];

  estadoResumen: string = 'Cargando resumen...';
  tipoResumen: string = 'Cargando resumen de tipos...';

  eventos: AuditoriaEvento[] = [];
  cargando = true;

  tipoIconos: { [key: string]: string } = {
    SQLi: 'https://cdn-icons-png.flaticon.com/128/10961/10961459.png',
    XSS: 'https://cdn-icons-png.flaticon.com/128/13502/13502242.png',
    CSRF: 'https://cdn-icons-png.flaticon.com/128/4440/4440880.png',
    DoS: 'https://cdn-icons-png.flaticon.com/128/6653/6653409.png',
  };

  selectedRange: 'dia' | 'mes' | 'anio' = 'dia';

  constructor(private servicio: ServiciosService) {}

  ngOnInit(): void {
    this.obtenerEventos();
  }
  ngAfterViewInit() {
    this.cargarAtaques();
  }
  obtenerEventos() {
    this.servicio.getEventosAuditoria().subscribe({
      next: (res) => {
        this.eventos = res;
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar auditoría:', err);
        this.cargando = false;
      },
    });
  }

  cargarAtaques() {
    this.servicio.getAtaquesDB().subscribe((res: Atacante[]) => {
      this.ataques = res;
      this.filteredAtacantes = [...res];
      if (res.length > 0) this.selectedAtacante = res[0];
      this.updateCharts(); // Dibuja todo al inicio
    });
  }

  seleccionarAtacante(atacante: Atacante) {
    this.selectedAtacante = atacante;
  }
  onRangeChange() {
    this.updateCharts();
  }

  filterByTipo(tipo: string) {
    this.selectedTipo = tipo;
    if (!tipo) {
      this.filteredAtacantes = [...this.ataques];
    } else {
      this.filteredAtacantes = this.ataques.filter((a) =>
        a.tipos.includes(tipo)
      );
    }
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
    const nuevoEstado = !a.bloqueado;
    this.servicio.updateAtacanteBloqueo(a.id!, nuevoEstado).subscribe(() => {
      a.bloqueado = nuevoEstado;
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
    const counts: { [tipo: string]: number } = {};
    this.filteredAtacantes.forEach((a) => {
      a.tipos.forEach((t) => {
        counts[t] = (counts[t] || 0) + 1;
      });
    });
    const totalAtaques = this.filteredAtacantes.length;
    let resumen = `<strong>Total Ataques Reportados: ${totalAtaques}</strong><br>`;

    Object.keys(counts)
      .sort((a, b) => counts[b] - counts[a])
      .forEach((tipo) => {
        const count = counts[tipo];
        const porcentaje =
          totalAtaques > 0 ? ((count / totalAtaques) * 100).toFixed(1) : 0;
        resumen += `<span class="badge ${this.getBadgeClass({
          tipos: [tipo],
        } as Atacante)} me-2">${tipo}</span>: ${count} (${porcentaje}%)<br>`;
      });

    return resumen;
  }

  getTimeSeriesData() {
    const ataquesTipos = ['SQLi', 'XSS', 'CSRF', 'DoS'];
    const map: { [fecha: string]: { [tipo: string]: number } } = {};

    this.filteredAtacantes.forEach((a) => {
      const fecha = this.formatDate(a.fecha, this.selectedRange);
      if (!map[fecha]) map[fecha] = {};
      a.tipos.forEach((t) => {
        map[fecha][t] = (map[fecha][t] || 0) + 1;
      });
    });

    const data = Object.keys(map).map((fecha) => ({ fecha, ...map[fecha] }));
    data.sort((a, b) => a.fecha.localeCompare(b.fecha));
    return data;
  }

  getEstadoSummary() {
    const bloqueado = this.filteredAtacantes.filter((a) => a.bloqueado).length;
    const activo = this.filteredAtacantes.length - bloqueado;
    return `Ataques Totales: ${this.filteredAtacantes.length} | Bloqueados: ${bloqueado} 🚫 | Activos: ${activo} ✅`;
  }
  formatDate(fecha: string, rango: 'dia' | 'mes' | 'anio') {
    const d = new Date(fecha);
    switch (rango) {
      case 'dia':
        return d.toISOString().split('T')[0]; // YYYY-MM-DD
      case 'mes':
        return `${d.getFullYear()}-${('0' + (d.getMonth() + 1)).slice(-2)}`; // YYYY-MM
      case 'anio':
        return `${d.getFullYear()}`;
    }
  }

  updateCharts() {
    this.createLineChart(this.getTimeSeriesData());
    this.estadoResumen = this.getEstadoSummary();
    this.tipoResumen = this.getTipoSummary();
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
        {
          type: 'number',
          position: 'left',
          title: { text: 'Cantidad de ataques' },
        },
      ],
      tooltip: {
        enabled: true,
        renderer: (params: any) => {
          let text = `Fecha: ${params.xValue}<br/>`;
          params.series.forEach((s: any) => {
            text += `${s.seriesId}: ${s.yValue}<br/>`;
          });
          return { content: text };
        },
      },
    });
  }
}
