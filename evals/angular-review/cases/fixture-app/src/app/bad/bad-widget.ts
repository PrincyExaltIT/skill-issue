import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectionStrategy, effect, signal, inject, DestroyRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer } from '@angular/platform-browser';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { UntypedFormGroup } from '@angular/forms';
import { interval, shareReplay } from 'rxjs';

@Component({
  selector: 'app-bad-widget',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './bad-widget.html',
})
export class BadWidget implements OnInit {
  @Input() title = '';
  @Output() submit = new EventEmitter<string>();
  items = signal<string[]>([]);
  copy = signal<string[]>([]);
  status = 'idle';
  form!: UntypedFormGroup;
  data: any;
  private readonly apiKey = 'sk_live_51HxQ2bF7k9Lm3NpQr8sT';
  private readonly ticks$ = interval(1000).pipe(shareReplay(1));

  constructor(private http: HttpClient, private sanitizer: DomSanitizer) {
    effect(() => {
      this.copy.set(this.items());
    });
  }

  ngOnInit() {
    this.http.get('http://localhost:3000/api/talks').subscribe((talks) => {
      this.http.get('http://localhost:3000/api/speakers').subscribe((speakers) => {
        console.log(talks, speakers);
      });
    });
    this.ticks$.pipe(takeUntilDestroyed()).subscribe(() => this.status = 'tick');
    const count = toSignal(this.ticks$);
    setTimeout(() => {
      this.status = 'done';
    }, 500);
  }

  add(item: string) {
    this.items().push(item);
    this.items.update((list) => { list.push(item); return list; });
  }

  html(raw: string) {
    return this.sanitizer.bypassSecurityTrustHtml(raw);
  }
}
