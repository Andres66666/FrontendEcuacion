import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  HostListener,
  Inject,
  OnInit,
  PLATFORM_ID,
  OnDestroy,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { StorageService } from '../../services/Storage.service';
import { ConfirmacionComponent } from '../mensajes/confirmacion/confirmacion/confirmacion.component';
import { ServiciosService } from '../../services/servicios.service';

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

  notificaciones: any[] = []; // ← NUEVO: Lista de usuarios desactivados (notificaciones)
  mostrarNotificaciones = false; // ← NUEVO: Para toggle del dropdown de notificaciones
  @ViewChild('notificacionesContainer') notificacionesContainer!: ElementRef;

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
    private storageService: StorageService,
    private serviciosService: ServiciosService, // ← NUEVO: Inyecta el servicio
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

    // Adaptamos claves posibles para evitar undefined
    this.userRole = datosUsuario.rol ?? datosUsuario.roles ?? '';
    this.userName = `${datosUsuario.nombre ?? ''} ${
      datosUsuario.apellido ?? ''
    }`.trim();
    this.userPermissions = datosUsuario.permisos ?? [];
    this.imagenUrl = datosUsuario.imagen_url ?? null;
    this.diasTranscurridos = datosUsuario.dias_transcurridos ?? null;

    this.checkScreenSize();
    this.resetInactivityTimer();
    // ← NUEVO: Cargar notificaciones de usuarios desactivados
    this.cargarNotificaciones();
  }
  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;

    // Si cerramos el sidebar a modo mini, cerramos los submenús abiertos
    if (!this.isSidebarOpen) {
      this.activeSection = null;
    }
  }
  ngOnDestroy(): void {
    if (this.timeoutInactivity) {
      clearTimeout(this.timeoutInactivity);
    }
  }
  // ← NUEVO: Cargar notificaciones de usuarios desactivados
  cargarNotificaciones(): void {
    this.serviciosService.getUsuariosDesactivados().subscribe({
      // Asume que agregas este método en ServiciosService
      next: (usuariosDesactivados: any[]) => {
        this.notificaciones = usuariosDesactivados.map((usuario) => ({
          id: usuario.id,
          nombre: `${usuario.nombre} ${usuario.apellido}`,
          correo: usuario.correo,
          fechaBloqueo: usuario.fecha_actualizacion || new Date().toISOString(), // Usa fecha de actualización como referencia
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

  // ← NUEVO: Manejar clic en notificación (muestra detalle del usuario bloqueado)
  verNotificacion(usuario: any): void {
    const detalle = `Usuario bloqueado: ${usuario.nombre} (Correo: ${usuario.correo})`;
    alert(detalle); // ← Simple alert; puedes cambiar por modal o navegación a detalle
    this.mostrarNotificaciones = false; // Cierra el dropdown
  }
  toggleSection(section: string) {
    // SI el sidebar está cerrado (modo mini) y haces clic en un icono
    if (!this.isSidebarOpen) {
      this.isSidebarOpen = true; // Abrimos la barra lateral
      this.activeSection = section; // Mostramos el submenú
    } else {
      // Comportamiento normal si ya está abierta
      this.activeSection = this.activeSection === section ? null : section;
    }
  }
  // ← NUEVO: Recargar notificaciones (opcional, para refresh manual)
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

    // --- TU LÓGICA ACTUAL DEL SIDEBAR (NO CAMBIA) ---
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

  // Agrega este método dentro de tu clase PanelControlComponent
  navegarYRegresar(ruta: string) {
    this.router.navigate([ruta]);

    // Repliega la barra después de seleccionar
    if (this.windowWidth >= 768) {
      this.isSidebarOpen = false;
      this.activeSection = null;
    } else {
      // En móviles la oculta totalmente
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
