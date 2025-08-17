import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface AlertOptions {
  title: string;
  description?: string;
  bgColor?: string;
  textColor?: string;
  timeout?: number;
  closable?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AlertService {
  private alertSubject = new BehaviorSubject<AlertOptions | null>(null);
  alert$ = this.alertSubject.asObservable();

  show(alert: AlertOptions) {
    this.alertSubject.next(alert);

    if (alert.timeout) {
      setTimeout(() => this.clear(), alert.timeout);
    }
  }

  clear() {
    this.alertSubject.next(null);
  }
}
