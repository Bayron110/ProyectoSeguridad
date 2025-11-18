import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CifradoAsimetricoComponent } from './cifrado-asimetrico';

describe('CifradoAsimetricoComponent', () => {
  let component: CifradoAsimetricoComponent;
  let fixture: ComponentFixture<CifradoAsimetricoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CifradoAsimetricoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CifradoAsimetricoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

