import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { CardListItem } from '../../../../Models/Card-List-Item';
import { CardSearchService } from '../../../../Services/card-search-service';

@Component({
  selector: 'app-cards-page',
  imports: [RouterLink],
  templateUrl: './cards-page.html',
  styleUrl: './cards-page.css',
})
export class CardsPage {
  private readonly cardSearchService = inject(CardSearchService);

  readonly query = signal('');
  readonly cards = signal<CardListItem[]>([]);
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly searchStarted = computed(() => this.query().length > 0);
  readonly showEmptyState = computed(
    () => this.searchStarted() && !this.loading() && !this.errorMessage() && this.cards().length === 0
  );
  readonly hasCards = computed(() => !this.loading() && this.cards().length > 0);

  constructor() {
    toObservable(this.query)
      .pipe(
        debounceTime(100),
        distinctUntilChanged(),
        tap((query) => {
          this.errorMessage.set('');
          this.loading.set(query.length > 0);

          if (!query) {
            this.cards.set([]);
            this.loading.set(false);
          }
        }),
        switchMap((query) => {
          if (!query) {
            return of([]);
          }

          return this.cardSearchService.searchCards(query).pipe(
            catchError(() => {
              this.errorMessage.set('Erreur API. Verifie ta connexion puis reessaie.');
              return of([]);
            })
          );
        }),
        takeUntilDestroyed()
      )
      .subscribe((cards) => {
        this.cards.set(cards);
        this.loading.set(false);
      });
  }

  onQueryChange(query: string): void {
    this.query.set(query.trim());
  }
}
