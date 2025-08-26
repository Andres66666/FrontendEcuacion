// auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { StorageService } from '../services/Storage.service';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  const storage = inject(StorageService); // 👈 inyección del servicio

  if (isPlatformBrowser(platformId)) {
    const token = storage.getItem('access_token'); // 👈 uso del servicio
    if (token) {
      return true;
    } else {
      router.navigate(['/login']); // 👈 corrige la ruta de login
      return false;
    }
  } else {
    return false;
  }
};
