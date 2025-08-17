import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditarEcuacionComponent } from './editar-ecuacion.component';

describe('EditarEcuacionComponent', () => {
  let component: EditarEcuacionComponent;
  let fixture: ComponentFixture<EditarEcuacionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditarEcuacionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditarEcuacionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
