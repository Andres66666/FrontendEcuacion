import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OkComponent } from './ok.component';

describe('OkComponent', () => {
  let component: OkComponent;
  let fixture: ComponentFixture<OkComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OkComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OkComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
