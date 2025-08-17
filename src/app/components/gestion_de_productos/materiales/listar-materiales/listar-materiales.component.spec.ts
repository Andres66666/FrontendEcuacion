import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListarMaterialesComponent } from './listar-materiales.component';

describe('ListarMaterialesComponent', () => {
  let component: ListarMaterialesComponent;
  let fixture: ComponentFixture<ListarMaterialesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListarMaterialesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListarMaterialesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
