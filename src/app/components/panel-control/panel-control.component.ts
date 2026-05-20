import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
} from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ServiciosService } from '../../services/servicios.service';
import { StorageService } from '../../services/Storage.service';
import { ConfirmacionComponent } from '../mensajes/confirmacion/confirmacion.component';

@Component({
  selector: 'app-panel-control',
  standalone: true,
  imports: [CommonModule, RouterModule, ConfirmacionComponent],
  templateUrl: './panel-control.component.html',
  styleUrls: ['./panel-control.component.css'],
})
export class PanelControlComponent implements OnInit, OnDestroy {
  activeSection: string | null = null;
  isMobileView = false;
  isSidebarVisibleOnSmallScreens = true;

  timeoutInactivity: any;
  inactiveTime = 60 * 60 * 1000; // 1 hora
  isSidebarOpen = false;
  windowWidth: number = 0;

  userRole: string = '';
  userName: string = '';
  userPermissions: string[] = [];
  imagenUrl: string | null = '';
  diasTranscurridos: number | null = null;

  mostrarConfirmacion: boolean = false;
  mensajeConfirmacion: string = '';

  notificaciones: any[] = [];
  mostrarNotificaciones = false;
  @ViewChild('notificacionesContainer') notificacionesContainer!: ElementRef;

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
    private storageService: StorageService,
    private serviciosService: ServiciosService,
  ) {}

  ngOnInit(): void {
    const usuarioStr = this.storageService.getItem('usuarioLogueado');

    let datosUsuario: any = {};
    try {
      datosUsuario = usuarioStr ? JSON.parse(usuarioStr) : {};
    } catch (error) {
      console.error('Error al parsear usuario desde localStorage', error);
      datosUsuario = {};
    }

    this.userRole = Array.isArray(datosUsuario.roles)
      ? datosUsuario.roles[0]
      : datosUsuario.rol || datosUsuario.roles || '';
    this.userName = `${datosUsuario.nombre ?? ''} ${
      datosUsuario.apellido ?? ''
    }`.trim();
    this.userPermissions = datosUsuario.permisos ?? [];
    this.imagenUrl = datosUsuario.imagen_url ?? null;
    this.diasTranscurridos = datosUsuario.dias_transcurridos ?? null;

    this.checkScreenSize();
    this.resetInactivityTimer();
    if (this.userRole === 'Administrador') {
      this.cargarNotificaciones();
    }
  }
  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
    if (!this.isSidebarOpen) {
      this.activeSection = null;
    }
  }
  ngOnDestroy(): void {
    if (this.timeoutInactivity) {
      clearTimeout(this.timeoutInactivity);
    }
  }
  cargarNotificaciones(): void {
    this.serviciosService.getUsuariosDesactivados().subscribe({
      next: (usuariosDesactivados: any[]) => {
        this.notificaciones = usuariosDesactivados.map((usuario) => ({
          id: usuario.id,
          nombre: `${usuario.nombre} ${usuario.apellido}`,
          correo: usuario.correo,
          fechaBloqueo: usuario.fecha_actualizacion || new Date().toISOString(),
        }));
      },
      error: (error) => {
        console.error('Error al cargar notificaciones:', error);
        this.notificaciones = [];
      },
    });
  }

  toggleNotificaciones(event: MouseEvent): void {
    event.stopPropagation();
    this.mostrarNotificaciones = !this.mostrarNotificaciones;
  }
  verNotificacion(usuario: any): void {
    const detalle = `Usuario bloqueado: ${usuario.nombre} (Correo: ${usuario.correo})`;
    alert(detalle);
    this.mostrarNotificaciones = false;
  }
  toggleSection(section: string) {
    if (!this.isSidebarOpen) {
      this.isSidebarOpen = true;
      this.activeSection = section;
    } else {
      this.activeSection = this.activeSection === section ? null : section;
    }
  }
  recargarNotificaciones(): void {
    this.cargarNotificaciones();
  }

  puedeVer(permiso: string): boolean {
    return this.userPermissions?.includes(permiso) ?? false;
  }

  @HostListener('window:resize')
  onResize() {
    this.checkScreenSize();
  }

  checkScreenSize() {
    if (isPlatformBrowser(this.platformId)) {
      this.windowWidth = window.innerWidth;
      this.isSidebarOpen = this.windowWidth >= 768;
    }
  }

  isActive(section: string) {
    return this.activeSection === section;
  }

  closeSidebarOnMobile() {
    if (this.isMobileView) {
      this.isSidebarVisibleOnSmallScreens = false;
    }
  }
  @HostListener('document:click', ['$event'])
  handleOutsideClick(event: MouseEvent) {
    const target = event.target as HTMLElement;

    const clickedInsideSidebar = target.closest('.leftSide');
    const clickedInsideToggleButton = target.closest('.toggle-button');
    const clickedInsideDropdown = target.closest('.dropdown-menu');
    const clickedInsideNotificaciones =
      this.notificacionesContainer?.nativeElement.contains(target);

    if (!clickedInsideNotificaciones && this.mostrarNotificaciones) {
      this.mostrarNotificaciones = false;
    }
    if (
      !clickedInsideSidebar &&
      !clickedInsideToggleButton &&
      !clickedInsideDropdown &&
      this.isSidebarOpen
    ) {
      if (this.windowWidth < 768) {
        this.isSidebarOpen = false;
      } else {
        this.isSidebarOpen = false;
        this.activeSection = null;
      }
    }
  }

  navegarYRegresar(ruta: string) {
    this.router.navigate([ruta]);

    if (this.windowWidth >= 768) {
      this.isSidebarOpen = false;
      this.activeSection = null;
    } else {
      this.isSidebarOpen = false;
    }
  }
  @HostListener('document:mousemove')
  @HostListener('document:keydown')
  handleUserActivity() {
    this.resetInactivityTimer();
  }

  resetInactivityTimer() {
    if (this.timeoutInactivity) {
      clearTimeout(this.timeoutInactivity);
    }
    this.timeoutInactivity = setTimeout(() => {
      this.handleSessionTimeout();
    }, this.inactiveTime);
  }

  handleSessionTimeout() {
    alert('Sesión cerrada por inactividad');
    this.storageService.clear();
    this.router.navigate(['/index']);
  }

  verPerfil(): void {
    this.router.navigate(['panel-control/perfil']);
  }
  verServicios(): void {
    this.router.navigate(['panel-control/servicios']);
  }

  onSelectChange(action: string) {
    if (action === 'cerrarSesion') {
      this.confirmarCerrarSesion();
    }
  }

  confirmarCerrarSesion() {
    this.mensajeConfirmacion = '¿Está seguro de que desea cerrar sesión?';
    this.mostrarConfirmacion = true;
  }
  manejarAceptar() {
    this.mostrarConfirmacion = false;
    this.logout();
  }

  manejarCancelar() {
    this.mostrarConfirmacion = false;
  }

  logout() {
    this.storageService.clear();
    this.router.navigate(['/index']);
  }
}
