import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearManoDeObraComponent } from './crear-mano-de-obra.component';

describe('CrearManoDeObraComponent', () => {
  let component: CrearManoDeObraComponent;
  let fixture: ComponentFixture<CrearManoDeObraComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrearManoDeObraComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CrearManoDeObraComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
