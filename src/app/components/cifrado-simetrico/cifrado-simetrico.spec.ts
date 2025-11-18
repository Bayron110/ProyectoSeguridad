import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CifradoSimetricoComponent } from './cifrado-simetrico';

describe('CifradoSimetricoComponent', () => {
  let component: CifradoSimetricoComponent;
  let fixture: ComponentFixture<CifradoSimetricoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CifradoSimetricoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CifradoSimetricoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

