import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ServiciosService } from '../../../services/servicios.service';
import { Atacante } from '../../../models/models';
import { AgCharts } from 'ag-charts-community';


@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './auditoria.component.html',
  styleUrls: ['./auditoria.component.css']
})
export class AuditoriaComponent implements AfterViewInit {
  ataques: Atacante[] = [];
  selectedAtacante: Atacante | null = null;

  // Gráficas
  lineChart: any;
  barChart: any;
  pieChart: any;
  extraChart: any;

  // Filtros
  tiposAtaque: string[] = ['SQL', 'XSS', 'CSRF', 'DDoS', 'Keylogger', 'Auditoría', 'IA'];
  selectedTipo: string = '';
  filteredAtacantes: Atacante[] = [];

  // Iconos
  tipoIconos: { [key: string]: string } = {
    'SQL': 'https://cdn-icons-png.flaticon.com/128/10961/10961459.png',
    'XSS': 'https://cdn-icons-png.flaticon.com/128/13502/13502242.png',
    'CSRF': 'https://cdn-icons-png.flaticon.com/128/4440/4440880.png',
    'DDoS': 'https://cdn-icons-png.flaticon.com/128/6653/6653409.png',
    'Keylogger': 'https://cdn-icons-png.flaticon.com/128/2842/2842036.png',
    'Auditoría': 'https://cdn-icons-png.flaticon.com/128/4307/4307952.png',
    'IA': 'https://cdn-icons-png.flaticon.com/128/14668/14668039.png'
  };

  // 🔹 Rango para la auditoría
  selectedRange: 'dia' | 'mes' | 'anio' = 'dia';

  constructor(private servicio: ServiciosService) {}

  ngAfterViewInit() {
    this.cargarAtaques();
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


filterByTipo(tipo: string) {
  this.selectedTipo = tipo;
  if (!tipo) {
    this.filteredAtacantes = [...this.ataques];
  } else {
    this.filteredAtacantes = this.ataques.filter(a => a.tipos.includes(tipo));
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
    if (a.tipos.includes('SQL')) return 'bg-danger bg-opacity-25 text-dark';
    if (a.tipos.includes('DDoS')) return 'bg-warning bg-opacity-25 text-dark';
    if (a.tipos.includes('XSS')) return 'bg-info bg-opacity-25 text-dark';
    return 'bg-secondary bg-opacity-25 text-dark';
  }

  // 🔹 Normalizar para Pie Chart
  getPieData() {
    const data: { tipo: string; count: number }[] = [];
    this.filteredAtacantes.forEach(a => {
      a.tipos.forEach(t => {
        const existing = data.find(d => d.tipo === t);
        if (existing) existing.count += 1;
        else data.push({ tipo: t, count: 1 });
      });
    });
    return data;
  }

  // 🔹 Normalizar para Line Chart y Bar Chart
  getTimeSeriesData() {
    const ataquesTipos = ['SQL', 'XSS', 'CSRF', 'DDoS', 'Keylogger', 'IA']; 
    const map: { [fecha: string]: { [tipo: string]: number } } = {};

    this.filteredAtacantes.forEach(a => {
      const fecha = this.formatDate(a.fecha, this.selectedRange);
      if (!map[fecha]) map[fecha] = {};
      a.tipos.forEach(t => {
        map[fecha][t] = (map[fecha][t] || 0) + 1;
      });
    });

    const data = Object.keys(map).map(fecha => ({ fecha, ...map[fecha] }));
    data.sort((a, b) => a.fecha.localeCompare(b.fecha));
    return data;
  }



  // 🔹 Extra Chart: bloqueados vs activos
getExtraData() {
  const bloqueado = this.filteredAtacantes.filter(a => a.bloqueado).length;
  const activo = this.filteredAtacantes.length - bloqueado;

  return [
    { estado: 'Bloqueado', count: bloqueado, descripcion: this.filteredAtacantes.filter(a => a.bloqueado).map(a => `${a.ip}: ${a.descripcion}`).join('<br/>') },
    { estado: 'Activo', count: activo, descripcion: this.filteredAtacantes.filter(a => !a.bloqueado).map(a => `${a.ip}: ${a.descripcion}`).join('<br/>') }
  ];
}
  formatDate(fecha: string, rango: 'dia' | 'mes' | 'anio') {
    const d = new Date(fecha);
    switch (rango) {
      case 'dia': return d.toISOString().split('T')[0]; // YYYY-MM-DD
      case 'mes': return `${d.getFullYear()}-${('0'+(d.getMonth()+1)).slice(-2)}`; // YYYY-MM
      case 'anio': return `${d.getFullYear()}`;
    }
  }


  updateCharts() {
  this.createPieChart(this.getPieData());
  this.createLineChart(this.getTimeSeriesData());
  this.createExtraChart(this.getExtraData());
}createPieChart(data: any[]) {
  const container = document.getElementById('myPieChart');
  if (!container) return;
  if (this.pieChart) this.pieChart.destroy();

  this.pieChart = AgCharts.create({
    container,
    data,
    series: [{
      type: 'pie',
      angleKey: 'count',
      labelKey: 'tipo',
      calloutLabelKey: 'tipo',
      fills: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#8AFF33'], // Colores por tipo
      strokes: ['#fff'],
      strokeWidth: 1,
      tooltip: {
        renderer: (params: any) => {
          const tipo = params.datum.tipo;
          const atacantesTipo = this.filteredAtacantes.filter((a: any) => a.tipos.includes(tipo));
          const desc = atacantesTipo
            .map((a: any) => `<strong>${a.ip}</strong>: ${a.descripcion}`)
            .join('<br/>');
          return { content: `<strong>${tipo}</strong> (${params.datum.count})<br/>${desc}` };
        }
      }
    }]
  } as any);
}

createLineChart(data: any[]) {
  const container = document.getElementById('myChart');
  if (!container) return;
  if (this.lineChart) this.lineChart.destroy();

  const series: any[] = Object.keys(data[0] || {})
    .filter(k => k !== 'fecha')
    .map(t => ({
      type: 'line',
      xKey: 'fecha',
      yKey: t,
      yName: t
    }));


  this.lineChart = AgCharts.create({
    container,
    type: 'cartesian',
    data,
    series,
    axes: [
      { type: 'category', position: 'bottom', title: { text: 'Fecha' } },
      { type: 'number', position: 'left', title: { text: 'Cantidad de ataques' } }
    ],
    tooltip: {
      enabled: true,
      renderer: (params: any) => {
        let text = `Fecha: ${params.xValue}<br/>`;
        params.series.forEach((s: any) => {
          text += `${s.seriesId}: ${s.yValue}<br/>`;
        });
        return { content: text };
      }
    }
  });
}


createExtraChart(data: any[]) {
  const container = document.getElementById('myExtraChart');
  if (!container) return;
  if (this.extraChart) this.extraChart.destroy();

  this.extraChart = AgCharts.create({
    container,
    data,
    series: [{
      type: 'pie',
      angleKey: 'count',
      labelKey: 'estado',
      calloutLabelKey: 'estado',
      fills: ['#FF4C4C', '#4CAF50'], // Rojo para bloqueados, verde para activos
      strokes: ['#fff'],
      strokeWidth: 1,
      tooltip: {
        renderer: (params: any) => {
          const atacantes = this.filteredAtacantes.filter(a =>
            params.datum.estado === 'Bloqueado' ? a.bloqueado : !a.bloqueado
          );
          const desc = atacantes
            .map(a => `<strong>${a.ip}</strong>: ${a.descripcion}`)
            .join('<br/>');
          return { content: `<strong>${params.datum.estado}</strong> (${params.datum.count})<br/>${desc}` };
        }
      }
    }]
  } as any);
}


onRangeChange() {
  this.updateCharts();
}
}
