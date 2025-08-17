// auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (isPlatformBrowser(platformId)) {
    const token = localStorage.getItem('access_token');
    if (token) {
      return true;
    } else {
      router.navigate(['/app-login']);
      return false;
    }
  } else {
    // Si se está ejecutando en el servidor, no hacer nada (o devolver false)
    return false;
  }
};