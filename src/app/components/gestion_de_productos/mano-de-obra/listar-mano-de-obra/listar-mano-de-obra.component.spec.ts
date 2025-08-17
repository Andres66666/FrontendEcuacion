import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListarManoDeObraComponent } from './listar-mano-de-obra.component';

describe('ListarManoDeObraComponent', () => {
  let component: ListarManoDeObraComponent;
  let fixture: ComponentFixture<ListarManoDeObraComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListarManoDeObraComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListarManoDeObraComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
