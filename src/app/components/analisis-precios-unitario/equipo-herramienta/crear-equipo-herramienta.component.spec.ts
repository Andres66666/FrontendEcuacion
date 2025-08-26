import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearEquipoHerramientaComponent } from './crear-equipo-herramienta.component';

describe('CrearEquipoHerramientaComponent', () => {
  let component: CrearEquipoHerramientaComponent;
  let fixture: ComponentFixture<CrearEquipoHerramientaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrearEquipoHerramientaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CrearEquipoHerramientaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
