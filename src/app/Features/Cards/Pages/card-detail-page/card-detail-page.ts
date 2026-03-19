import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, distinctUntilChanged, map, of, switchMap, tap } from 'rxjs';
import { CardDetails } from '../../../../Models/Card-Details';
import { deckOperationReasons } from '../../../../Models/Deck';
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
  readonly returnDeckId = toSignal(this.route.queryParamMap.pipe(map((params) => params.get('fromDeckId') ?? '')), {
    initialValue: '',
  });
  readonly returnHome = toSignal(this.route.queryParamMap.pipe(map((params) => params.get('fromHome') === '1')), {
    initialValue: false,
  });
  readonly card = signal<CardDetails | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly addToDeckMessage = signal('');
  readonly addToDeckMessageTone = signal<'success' | 'warning'>('success');
  readonly decks = this.deckService.decks;
  readonly hasDecks = computed(() => this.decks().length > 0);
  readonly backLink = computed(() => {
    if (this.returnDeckId()) {
      return ['/decks', this.returnDeckId()];
    }

    return this.returnHome() ? ['/'] : ['/cards'];
  });
  readonly backLabel = computed(() => {
    if (this.returnDeckId()) {
      return 'Retour au deck';
    }

    return this.returnHome() ? 'Retour a l accueil' : 'Retour aux cartes';
  });
  readonly colorLabel = computed(() => {
    const currentCard = this.card();
    if (!currentCard) {
      return '';
    }

    return currentCard.colors.length > 0 ? currentCard.colors.join(', ') : 'Incolore';
  });
  readonly hasCardStats = computed(() => {
    const currentCard = this.card();
    if (!currentCard) {
      return false;
    }

    return Boolean(
      (currentCard.power && currentCard.toughness) ||
        currentCard.loyalty ||
        currentCard.releasedAt ||
        currentCard.collectorNumber
    );
  });

  constructor() {
    toObservable(this.cardId)
      .pipe(
        distinctUntilChanged(),
        tap((cardId) => {
          this.card.set(null);
          this.errorMessage.set('');
          this.addToDeckMessage.set('');
          this.addToDeckMessageTone.set('success');

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
    }).subscribe({
      next: (addResult) => {
        const targetDeck = this.deckService.findDeckById(deckId);

        if (addResult.added) {
          this.addToDeckMessageTone.set('success');
          this.addToDeckMessage.set(`${currentCard.name} ajoutee a ${targetDeck?.name ?? 'ce deck'}.`);
          return;
        }

        if (addResult.reason === deckOperationReasons.commanderSingleton) {
          this.addToDeckMessageTone.set('warning');
          this.addToDeckMessage.set(
            `${currentCard.name} est deja dans ${targetDeck?.name ?? 'ce deck Commander'}. Une seule copie est autorisee dans cette version simple du projet.`
          );
        }
      },
      error: () => {
        this.addToDeckMessageTone.set('warning');
        this.addToDeckMessage.set('Impossible d ajouter cette carte au deck pour le moment.');
      },
    });
  }

  canAddCardToDeck(deckId: string): boolean {
    const currentCard = this.card();
    return currentCard ? this.deckService.canAddCardToDeck(deckId, currentCard.id) : false;
  }
}
