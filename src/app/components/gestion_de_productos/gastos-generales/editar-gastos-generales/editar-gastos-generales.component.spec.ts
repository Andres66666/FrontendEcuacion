import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditarGastosGeneralesComponent } from './editar-gastos-generales.component';

describe('EditarGastosGeneralesComponent', () => {
  let component: EditarGastosGeneralesComponent;
  let fixture: ComponentFixture<EditarGastosGeneralesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditarGastosGeneralesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditarGastosGeneralesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
