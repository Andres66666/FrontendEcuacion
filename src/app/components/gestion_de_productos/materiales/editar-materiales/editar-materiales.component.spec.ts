import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditarMaterialesComponent } from './editar-materiales.component';

describe('EditarMaterialesComponent', () => {
  let component: EditarMaterialesComponent;
  let fixture: ComponentFixture<EditarMaterialesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditarMaterialesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditarMaterialesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
