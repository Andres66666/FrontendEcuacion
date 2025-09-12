import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccionesSqlComponent } from './acciones-sql.component';

describe('AccionesSqlComponent', () => {
  let component: AccionesSqlComponent;
  let fixture: ComponentFixture<AccionesSqlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccionesSqlComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccionesSqlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
