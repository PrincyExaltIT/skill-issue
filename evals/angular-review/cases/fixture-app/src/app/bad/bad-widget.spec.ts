import { TestBed } from '@angular/core/testing';
import { BadWidget } from './bad-widget';

describe('BadWidget', () => {
  fit('should create', () => {
    const fixture = TestBed.createComponent(BadWidget);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
