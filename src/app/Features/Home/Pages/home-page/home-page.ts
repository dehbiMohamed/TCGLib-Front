import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { take } from 'rxjs';

import { CardListItem } from '../../../../Models/Card-List-Item';
import { CardSearchService } from '../../../../Services/card-search-service';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
})
export class HomePage {
  private readonly cardSearchService = inject(CardSearchService);
  private readonly featuredCardsQuery = [
    '!"Black Lotus"',
    '!"Lightning Bolt"',
    '!"Counterspell"',
    '!"Sol Ring"',
    '!"Birds of Paradise"',
    '!"Dark Ritual"',
    '!"Wrath of God"',
    '!"Shivan Dragon"',
  ].join(' or ');

  readonly marqueeCopies = [0, 1];
  readonly featuredCards = signal<CardListItem[]>([]);

  constructor() {
    this.cardSearchService
      .searchCards(`(${this.featuredCardsQuery})`)
      .pipe(take(1))
      .subscribe({
        next: (cards) => {
          this.featuredCards.set(cards.filter((card) => Boolean(card.imageUrl)).slice(0, 8));
        },
        error: () => {
          this.featuredCards.set([]);
        },
      });
  }
}
