import { Component, input, output } from '@angular/core';

export interface Ticket { id: string; seats: number; }

@Component({
  selector: 'app-bad-card',
  template: `<p>{{ ticket().seats }}</p>`,
})
export class BadCard {
  readonly ticket = input.required({
    alias: 'booking',
    transform: (value: Ticket) => {
      value.seats = value.seats + 1;
      return value;
    },
  });
  readonly change = output<string>();
}
