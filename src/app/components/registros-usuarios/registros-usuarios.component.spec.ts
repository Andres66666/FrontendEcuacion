import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegistrosUsuariosComponent } from './registros-usuarios.component';

describe('RegistrosUsuariosComponent', () => {
  let component: RegistrosUsuariosComponent;
  let fixture: ComponentFixture<RegistrosUsuariosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegistrosUsuariosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegistrosUsuariosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
