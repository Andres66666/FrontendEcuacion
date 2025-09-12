import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AgCharts } from 'ag-charts-community';
interface Atacante {
  ip: string;
  pais: string;
  asn: string;
  userAgent: string;
  eventos: number;
  ultima: string;
  tipo: string;
  bloqueado?: boolean;
}
@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './auditoria.component.html',
  styleUrls: ['./auditoria.component.css']
})
export class AuditoriaComponent implements AfterViewInit {
  selectedRange: 'dia' | 'mes' | 'anio' = 'dia';

  // 🔹 Guardamos referencia de TODOS los gráficos
  chart: any;
  barChart: any;
  pieChart: any;
  extraChart: any;

  dataSets = {
    dia: [
      { hour: '00h', sql: 10, xss: 5, ddos: 2 },
      { hour: '06h', sql: 25, xss: 10, ddos: 5 },
      { hour: '12h', sql: 30, xss: 15, ddos: 8 },
      { hour: '18h', sql: 20, xss: 8, ddos: 3 },
      { hour: '24h', sql: 15, xss: 4, ddos: 1 },
    ],
    mes: [
      { week: 'Semana 1', sql: 100, xss: 40, ddos: 20 },
      { week: 'Semana 2', sql: 250, xss: 60, ddos: 30 },
      { week: 'Semana 3', sql: 180, xss: 50, ddos: 25 },
      { week: 'Semana 4', sql: 220, xss: 70, ddos: 40 },
    ],
    anio: [
      { month: 'Ene', sql: 500, xss: 200, ddos: 150 },
      { month: 'Feb', sql: 600, xss: 250, ddos: 180 },
      { month: 'Mar', sql: 800, xss: 300, ddos: 220 },
      { month: 'Abr', sql: 700, xss: 280, ddos: 200 },
      { month: 'May', sql: 900, xss: 350, ddos: 250 },
      { month: 'Jun', sql: 1000, xss: 400, ddos: 300 },
    ],
  };

  ngAfterViewInit(): void {
    this.updateCharts(this.dataSets.dia);
  }

  // 🔹 Método central: dibuja todos los gráficos
  updateCharts(data: any[]) {
    this.createChart(data);
    this.createBarChart(data);
    this.createPieChart(data);
    this.createExtraChart(data);
  }

  createChart(data: any[]) {
    const chartContainer = document.getElementById('myChart');
    if (!chartContainer) return;

    if (this.chart) this.chart.destroy();

    const normalized = data.map(d => ({
      hour: d.hour,
      sql: d.sql,
      xss: d.xss,
      ddos: d.ddos
    }));

    this.chart = AgCharts.create({
      container: chartContainer,
      data: normalized,
      series: [
        { type: 'line', xKey: 'hour', yKey: 'sql', yName: 'SQL' },
        { type: 'line', xKey: 'hour', yKey: 'xss', yName: 'XSS' },
        { type: 'line', xKey: 'hour', yKey: 'ddos', yName: 'DDoS' },
      ],
      axes: [
        { type: 'category', position: 'bottom', title: { text: 'Tiempo' } },
        { type: 'number', position: 'left', title: { text: 'Cantidad de ataques' } }
      ],
      legend: { position: 'bottom' },
      tooltip: { enabled: true }
    });
  }

  createBarChart(data: any[]) {
    const container = document.getElementById('myBarChart');
    if (!container) return;

    if (this.barChart) this.barChart.destroy();

    this.barChart = AgCharts.create({
      container,
      data,
      series: [
        { type: 'bar', xKey: 'hour', yKey: 'sql', yName: 'SQL', fill: '#EF5452' },
        { type: 'bar', xKey: 'hour', yKey: 'xss', yName: 'XSS', fill: '#5470C6' },
        { type: 'bar', xKey: 'hour', yKey: 'ddos', yName: 'DDoS', fill: '#91CC75' },
      ],
      axes: [
        { type: 'category', position: 'bottom', title: { text: 'Tiempo' } },
        { type: 'number', position: 'left', title: { text: 'Cantidad de ataques' } }
      ],
      legend: { position: 'bottom' },
      tooltip: { enabled: true }
    });
  }

  createPieChart(data: any[]) {
    const container = document.getElementById('myPieChart');
    if (!container) return;

    if (this.pieChart) this.pieChart.destroy();

    this.pieChart = AgCharts.create({
      container,
      data,
      series: [
        { type: 'pie', angleKey: 'sql', labelKey: 'hour', calloutLabelKey: 'hour' }
      ]
    });
  }

  createExtraChart(data: any[]) {
    const container = document.getElementById('myExtraChart');
    if (!container) return;

    if (this.extraChart) this.extraChart.destroy();

    this.extraChart = AgCharts.create({
      container,
      data,
      series: [
        { type: 'bar', xKey: 'hour', yKey: 'ddos', yName: 'DDoS' }
      ]
    });
  }

  // 🔹 Cambia datos según rango y redibuja todos los gráficos
  onRangeChange() {
    let data: any[] = [];
    switch (this.selectedRange) {
      case 'dia':
        data = this.dataSets.dia;
        break;
      case 'mes':
        data = this.dataSets.mes.map(d => ({
          hour: d.week,
          sql: d.sql,
          xss: d.xss,
          ddos: d.ddos
        }));
        break;
      case 'anio':
        data = this.dataSets.anio.map(d => ({
          hour: d.month,
          sql: d.sql,
          xss: d.xss,
          ddos: d.ddos
        }));
        break;
    }
    this.updateCharts(data);
  }



tiposAtaque = ['SQL', 'XSS', 'CSRF', 'DDoS', 'Keylogger', 'Auditoría', 'IA'];
  selectedTipo: string = 'SQL';

  atacantes: Atacante[] = [
    { ip: '203.0.113.45', pais: 'BO', asn: 'AS64500', userAgent: 'sqlmap/1.6', eventos: 12, ultima: '2025-09-11 12:01', tipo: 'SQL', bloqueado: false },
    { ip: '198.51.100.22', pais: 'BR', asn: 'ASXXXXX', userAgent: 'botnet-checker', eventos: 2400, ultima: '2025-09-11 02:24', tipo: 'DDoS', bloqueado: false },
    { ip: '192.0.2.10', pais: 'PE', asn: 'AS12345', userAgent: 'Mozilla/5.0', eventos: 3, ultima: '2025-09-11 07:30', tipo: 'XSS', bloqueado: false }
  ];

  filteredAtacantes: Atacante[] = [...this.atacantes];
  selectedAtacante: Atacante | null = this.atacantes[0];

  // Filtrar por tipo de ataque
  filterByTipo(tipo: string) {
    this.selectedTipo = tipo;
    this.filteredAtacantes = this.atacantes.filter(a => a.tipo === tipo);
    this.selectedAtacante = this.filteredAtacantes[0] || null;
  }

  // Ver todos
  showAll() {
    this.selectedTipo = '';
    this.filteredAtacantes = [...this.atacantes];
    this.selectedAtacante = this.filteredAtacantes[0] || null;
  }

  // Seleccionar atacante
  selectAtacante(a: Atacante) {
    this.selectedAtacante = a;
  }

  // Bloquear / desbloquear
  toggleBloqueo(a: Atacante) {
    a.bloqueado = !a.bloqueado;
    alert(`Atacante ${a.ip} ${a.bloqueado ? 'bloqueado' : 'desbloqueado'} (simulado)`);
  }

  // Badge colores suaves
  getBadgeClass(a: Atacante) {
    const base = 'text-dark';
    switch(a.tipo) {
      case 'SQL': return 'bg-danger bg-opacity-25 ' + base;
      case 'DDoS': return 'bg-warning bg-opacity-25 ' + base;
      case 'XSS': return 'bg-info bg-opacity-25 ' + base;
      default: return 'bg-secondary bg-opacity-25 ' + base;
    }
  }
  tipoIconos: { [key: string]: string } = {
  'SQL': 'https://cdn-icons-png.flaticon.com/128/10961/10961459.png',
  'XSS': 'https://cdn-icons-png.flaticon.com/128/13502/13502242.png',
  'CSRF': 'https://cdn-icons-png.flaticon.com/128/4440/4440880.png',
  'DDoS': 'https://cdn-icons-png.flaticon.com/128/6653/6653409.png',
  'Keylogger': 'https://cdn-icons-png.flaticon.com/128/2842/2842036.png',
  'Auditoría': 'https://cdn-icons-png.flaticon.com/128/4307/4307952.png',
  'IA': 'https://cdn-icons-png.flaticon.com/128/14668/14668039.png'
};

}
