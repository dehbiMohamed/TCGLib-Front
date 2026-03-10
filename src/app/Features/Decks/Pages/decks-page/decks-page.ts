import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Deck } from '../../../../Models/Deck';
import { DeckService } from '../../../../Services/deck-service';

@Component({
  selector: 'app-decks-page',
  imports: [RouterLink],
  templateUrl: './decks-page.html',
  styleUrl: './decks-page.css',
})
export class DecksPage {
  private readonly router = inject(Router);
  private readonly deckService = inject(DeckService);

  readonly decks = this.deckService.decks;
  readonly errorMessage = signal('');
  readonly hasDecks = computed(() => this.decks().length > 0);
  readonly formatOptions = ['Standard', 'Modern', 'Pioneer', 'Commander'];

  createDeck(name: string, format: string): void {
    const newDeck = this.deckService.createDeck(name, format);

    if (!newDeck) {
      this.errorMessage.set('Entre un nom de deck et un format.');
      return;
    }

    this.errorMessage.set('');
    void this.router.navigate(['/decks', newDeck.id]);
  }

  getCardCount(deck: Deck): number {
    return this.deckService.getTotalCardCount(deck);
  }
}
