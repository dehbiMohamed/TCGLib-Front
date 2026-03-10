import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, distinctUntilChanged, map, of, switchMap, tap } from 'rxjs';
import { CardDetails } from '../../../../Models/Card-Details';
import { CardSearchService } from '../../../../Services/card-search-service';
import { DeckService } from '../../../../Services/deck-service';

@Component({
  selector: 'app-card-detail-page',
  imports: [RouterLink],
  templateUrl: './card-detail-page.html',
  styleUrl: './card-detail-page.css',
})
export class CardDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly cardSearchService = inject(CardSearchService);
  private readonly deckService = inject(DeckService);

  readonly cardId = toSignal(this.route.paramMap.pipe(map((params) => params.get('id') ?? '')), {
    initialValue: '',
  });
  readonly card = signal<CardDetails | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly addToDeckMessage = signal('');
  readonly decks = this.deckService.decks;
  readonly hasDecks = computed(() => this.decks().length > 0);

  constructor() {
    toObservable(this.cardId)
      .pipe(
        distinctUntilChanged(),
        tap((cardId) => {
          this.card.set(null);
          this.errorMessage.set('');
          this.addToDeckMessage.set('');

          if (!cardId) {
            this.loading.set(false);
            this.errorMessage.set('Aucun identifiant de carte trouve dans l URL.');
            return;
          }

          this.loading.set(true);
        }),
        switchMap((cardId) => {
          if (!cardId) {
            return of(null);
          }

          return this.cardSearchService.getCardById(cardId).pipe(
            catchError(() => {
              this.errorMessage.set('Carte introuvable ou erreur lors du chargement.');
              return of(null);
            })
          );
        }),
        takeUntilDestroyed()
      )
      .subscribe((card) => {
        this.card.set(card);
        this.loading.set(false);
      });
  }

  addCardToDeck(deckId: string): void {
    const currentCard = this.card();
    if (!currentCard) {
      return;
    }

    this.deckService.addCardToDeck(deckId, {
      id: currentCard.id,
      name: currentCard.name,
      imageUrl: currentCard.imageUrl,
    });

    const targetDeck = this.deckService.findDeckById(deckId);
    this.addToDeckMessage.set(`${currentCard.name} ajoutee a ${targetDeck?.name ?? 'ce deck'}.`);
  }
}
