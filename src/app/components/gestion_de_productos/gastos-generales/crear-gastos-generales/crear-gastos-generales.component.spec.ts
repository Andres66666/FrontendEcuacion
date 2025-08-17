import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearGastosGeneralesComponent } from './crear-gastos-generales.component';

describe('CrearGastosGeneralesComponent', () => {
  let component: CrearGastosGeneralesComponent;
  let fixture: ComponentFixture<CrearGastosGeneralesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrearGastosGeneralesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CrearGastosGeneralesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
