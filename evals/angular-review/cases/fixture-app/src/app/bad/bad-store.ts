import { Injectable, computed, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';

@Injectable({ providedIn: 'root' })
export class BadStore {
  readonly loading = signal(false);
  readonly items = signal<string[]>([]);
  readonly count = computed(() => {
    this.loading.set(false);
    return this.items().length;
  });
  readonly saved = httpResource(() => ({ url: '/api/proposals', method: 'POST', body: { title: 'x' } }));

  refresh() {
    if (this.loading) {
      return;
    }
    const ready = !this.loading;
    return ready && [provideAnimations()];
  }
}
