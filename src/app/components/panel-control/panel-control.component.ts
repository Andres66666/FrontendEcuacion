import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, HostListener, Inject, OnInit, PLATFORM_ID, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { StorageService } from '../../services/Storage.service';
import { ConfirmacionComponent } from '../mensajes/confirmacion/confirmacion/confirmacion.component';
import { ExportService } from '../../services/export.service';
import { ServiciosService } from '../../services/servicios.service';


@Component({
  selector: 'app-panel-control',
  standalone: true,
  imports: [CommonModule, RouterModule,ConfirmacionComponent],
  templateUrl: './panel-control.component.html',
  styleUrls: ['./panel-control.component.css']
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
  diasTranscurridos: number = 0;

  mostrarConfirmacion: boolean = false;
  mensajeConfirmacion: string = '';

  notificaciones: any[] = [];  // ← NUEVO: Lista de usuarios desactivados (notificaciones)
  mostrarNotificaciones = false;  // ← NUEVO: Para toggle del dropdown de notificaciones


  imagenAbrir: string = 'https://cdn-icons-png.flaticon.com/128/14025/14025576.png';   // la imagen para abrir
  imagenCerrar: string = 'https://cdn-icons-png.flaticon.com/128/603/603495.png'; // la imagen para cerrar


 
  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
    private storageService: StorageService,
    private exportService: ExportService,
    private serviciosService: ServiciosService  // ← NUEVO: Inyecta el servicio
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
    this.userName = `${datosUsuario.nombre ?? ''} ${datosUsuario.apellido ?? ''}`.trim();
    this.userPermissions = datosUsuario.permisos ?? [];
    this.imagenUrl = datosUsuario.imagen_url ?? null;
    this.diasTranscurridos = datosUsuario.dias_transcurridos ?? 0;

    this.checkScreenSize();
    this.resetInactivityTimer();
    // ← NUEVO: Cargar notificaciones de usuarios desactivados
    this.cargarNotificaciones();
  }


  ngOnDestroy(): void {
    if (this.timeoutInactivity) {
      clearTimeout(this.timeoutInactivity);
    }
  }
    // ← NUEVO: Cargar notificaciones de usuarios desactivados
  cargarNotificaciones(): void {
    this.serviciosService.getUsuariosDesactivados().subscribe({  // Asume que agregas este método en ServiciosService
      next: (usuariosDesactivados: any[]) => {
        this.notificaciones = usuariosDesactivados.map(usuario => ({
          id: usuario.id,
          nombre: `${usuario.nombre} ${usuario.apellido}`,
          correo: usuario.correo,
          fechaBloqueo: usuario.fecha_actualizacion || new Date().toISOString()  // Usa fecha de actualización como referencia
        }));
      },
      error: (error) => {
        console.error('Error al cargar notificaciones:', error);
        this.notificaciones = [];
      }
    });
  }

  // ← NUEVO: Toggle para mostrar/ocultar notificaciones
  toggleNotificaciones(): void {
    this.mostrarNotificaciones = !this.mostrarNotificaciones;
  }

  // ← NUEVO: Manejar clic en notificación (muestra detalle del usuario bloqueado)
  verNotificacion(usuario: any): void {
    const detalle = `Usuario bloqueado: ${usuario.nombre} (Correo: ${usuario.correo})`;
    alert(detalle);  // ← Simple alert; puedes cambiar por modal o navegación a detalle
    this.mostrarNotificaciones = false;  // Cierra el dropdown
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

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  @HostListener('document:click', ['$event'])
  handleOutsideClick(event: MouseEvent) {
    if (this.windowWidth >= 768) return;

    const target = event.target as HTMLElement;
    const clickedInsideSidebar = target.closest('.sidebar');
    const clickedInsideToggleButton = target.closest('.toggle-button');

    if (!clickedInsideSidebar && !clickedInsideToggleButton && this.isSidebarOpen) {
      this.isSidebarOpen = false;
    }
  }

  toggleSection(section: string) {
    this.activeSection = this.activeSection === section ? null : section;
  }

  isActive(section: string) {
    return this.activeSection === section;
  }

  closeSidebarOnMobile() {
    if (this.isMobileView) {
      this.isSidebarVisibleOnSmallScreens = false;
    }
  }

  @HostListener('document:mousemove')
  @HostListener('document:keydown')
  @HostListener('document:click')
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
