import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Registrocliente } from './registrocliente';

describe('Registrocliente', () => {
  let component: Registrocliente;
  let fixture: ComponentFixture<Registrocliente>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Registrocliente]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Registrocliente);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
