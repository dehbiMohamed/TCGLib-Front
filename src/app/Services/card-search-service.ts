import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { CardDetails } from '../Models/Card-Details';
import { CardListItem } from '../Models/Card-List-Item';

@Injectable({
  providedIn: 'root',
})
export class CardSearchService {
  private readonly http = inject(HttpClient);

  searchCards(query: string): Observable<CardListItem[]> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return of([]);
    }

    return this.searchCardsInEnglish(trimmedQuery);
  }

  getCardById(cardId: string): Observable<CardDetails> {
    const url = `https://api.scryfall.com/cards/${encodeURIComponent(cardId)}`;

    return this.http.get<any>(url).pipe(
      map((card) => ({
        id: card.id,
        name: card.name,
        imageUrl: this.getCardImage(card),
        manaCost: card.mana_cost ?? '',
        typeLine: this.getCardTypeLine(card),
        oracleText: this.getCardOracleText(card),
        setName: card.set_name ?? '',
        rarity: card.rarity ?? '',
        artist: card.artist ?? '',
      }))
    );
  }

  private searchCardsInEnglish(query: string): Observable<CardListItem[]> {
    const scryfallQuery = `${query} lang:en`;
    const url =
      `https://api.scryfall.com/cards/search` +
      `?q=${encodeURIComponent(scryfallQuery)}` +
      `&unique=cards`;

    return this.http.get<any>(url).pipe(
      map((response) =>
        response.data.map((card: any) => ({
          id: card.id,
          name: card.name,
          setName: card.set_name,
          imageUrl: this.getCardImage(card),
        }))
      ),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) {
          return of([]);
        }

        return throwError(() => error);
      })
    );
  }

  private getCardImage(card: any): string {
    return (
      card.image_uris?.normal ??
      card.card_faces?.[0]?.image_uris?.normal ??
      card.image_uris?.small ??
      card.card_faces?.[0]?.image_uris?.small ??
      ''
    );
  }

  private getCardOracleText(card: any): string {
    const faceTexts =
      card.card_faces
        ?.map((face: any) => face.oracle_text)
        .filter((text: string | undefined) => Boolean(text)) ?? [];

    return card.oracle_text ?? faceTexts.join('\n\n');
  }

  private getCardTypeLine(card: any): string {
    const faceTypes =
      card.card_faces
        ?.map((face: any) => face.type_line)
        .filter((typeLine: string | undefined) => Boolean(typeLine)) ?? [];

    return card.type_line ?? faceTypes.join(' // ');
  }
}
