import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { catchError, Observable, of, throwError } from 'rxjs';
import { API_BASE_URL } from '../Core/config/api-base-url.token';
import { CardDetails } from '../Models/Card-Details';
import { CardListItem } from '../Models/Card-List-Item';

@Injectable({
  providedIn: 'root',
})
export class CardSearchService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly cardsApiUrl = `${this.apiBaseUrl}/cards`;

  searchCards(query: string): Observable<CardListItem[]> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return of([]);
    }

    return this.searchCardsInEnglish(trimmedQuery);
  }

  getCardById(cardId: string): Observable<CardDetails> {
    return this.http.get<CardDetails>(`${this.cardsApiUrl}/${encodeURIComponent(cardId)}`);
  }

  private searchCardsInEnglish(query: string): Observable<CardListItem[]> {
    const params = new HttpParams().set('query', query);

    return this.http.get<CardListItem[]>(`${this.cardsApiUrl}/search`, { params }).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) {
          return of([]);
        }

        return throwError(() => error);
      })
    );
  }
}
