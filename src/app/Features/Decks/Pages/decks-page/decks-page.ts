import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Deck, DeckValidationSummary } from '../../../../Models/Deck';
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
  readonly successMessage = signal('');
  readonly hasDecks = computed(() => this.decks().length > 0);
  readonly formatOptions = ['Standard', 'Modern', 'Pioneer', 'Commander'];

  createDeck(name: string, format: string): void {
    this.successMessage.set('');
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

  getValidationSummary(deck: Deck): DeckValidationSummary {
    return this.deckService.getDeckValidationSummary(deck);
  }

  deleteDeck(deck: Deck): void {
    const shouldDelete =
      typeof globalThis.confirm !== 'function' ||
      globalThis.confirm(`Supprimer le deck "${deck.name}" ?`);

    if (!shouldDelete) {
      return;
    }

    const removed = this.deckService.removeDeck(deck.id);

    if (!removed) {
      this.errorMessage.set('Impossible de supprimer ce deck.');
      return;
    }

    this.errorMessage.set('');
    this.successMessage.set(`Le deck ${deck.name} a ete supprime.`);
  }
}
