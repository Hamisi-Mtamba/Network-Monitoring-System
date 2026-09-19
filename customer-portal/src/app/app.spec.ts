import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [App], providers: [provideRouter([]), provideHttpClient()] }).compileComponents();
  });
  it('renders the customer portal shell', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('main router-outlet')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.portal-header')).toBeNull();
  });
});
