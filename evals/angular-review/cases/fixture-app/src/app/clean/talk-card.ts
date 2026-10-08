import { Component, computed, inject, input, output, linkedSignal, DestroyRef } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';

export interface Talk { id: string; title: string; tags: string[]; speakerPhoto: string; }

@Component({
  selector: 'app-talk-card',
  imports: [NgOptimizedImage],
  host: { '(keydown.enter)': 'open()' },
  template: `
    <article class="card" [class.favorite]="isFavorite()">
      <img [ngSrc]="talk().speakerPhoto" width="64" height="64" alt="Photo de l'orateur">
      <h3>{{ talk().title }}</h3>
      @for (tag of talk().tags; track tag) {
        <span class="tag">{{ tag }}</span>
      }
      <button type="button" (click)="toggle()">Favori</button>
    </article>
  `,
})
export class TalkCard {
  readonly talk = input.required<Talk>();
  readonly favoriteToggled = output<string>();
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly highlighted = toSignal(this.route.queryParamMap.pipe(map((p) => p.get('highlight'))));
  protected readonly isFavorite = linkedSignal(() => this.talk().id === this.highlighted());
  protected readonly tagCount = computed(() => this.talk().tags.length);

  toggle() {
    this.isFavorite.update((v) => !v);
    this.favoriteToggled.emit(this.talk().id);
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  open() {}
}
