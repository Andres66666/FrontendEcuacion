import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditarManoDeObraComponent } from './editar-mano-de-obra.component';

describe('EditarManoDeObraComponent', () => {
  let component: EditarManoDeObraComponent;
  let fixture: ComponentFixture<EditarManoDeObraComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditarManoDeObraComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditarManoDeObraComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
