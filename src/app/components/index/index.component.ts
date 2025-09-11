import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';


@Component({
  selector: 'app-index',
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  templateUrl: './index.component.html',
  styleUrl: './index.component.css'
})
export class IndexComponent {
  constructor(private router: Router) { }
  images = [
    'https://nexoinmobiliario.pe/blog/wp-content/uploads/2022/11/etapas-construccion-nexo-inmobiliaria.jpg',
    'https://radiolaprimerisima.com/wp-content/uploads/2021/10/agua10-1.jpg',
    'https://www.flexfunds.com/wp-content/uploads/2022/12/asesor-financiero.jpg',
    'https://usil-blog.s3.amazonaws.com/PROD/blog/image/planos-arquitectura.jpg',
  ];
  navigateToLogin() {
    this.router.navigate(['/login']);
  }
}
