import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GastosOperacionesComponent } from './gastos-operaciones.component';

describe('GastosOperacionesComponent', () => {
  let component: GastosOperacionesComponent;
  let fixture: ComponentFixture<GastosOperacionesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GastosOperacionesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GastosOperacionesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
