import { TestBed } from '@angular/core/testing';

import { ServiciosProyectos } from './servicios-proyectos';

describe('ServiciosProyectos', () => {
  let service: ServiciosProyectos;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ServiciosProyectos);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
