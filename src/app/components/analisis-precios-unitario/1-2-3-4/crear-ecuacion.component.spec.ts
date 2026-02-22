import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearEcuacionComponent } from './crear-ecuacion.component';

describe('CrearEcuacionComponent', () => {
  let component: CrearEcuacionComponent;
  let fixture: ComponentFixture<CrearEcuacionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrearEcuacionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CrearEcuacionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
