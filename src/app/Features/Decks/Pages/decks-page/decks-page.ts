import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface DeckPreview {
  id: string;
  name: string;
  colors: string;
  format: string;
  cardCount: number;
}
@Component({
  selector: 'app-decks-page',
  imports: [RouterLink],
  templateUrl: './decks-page.html',
  styleUrl: './decks-page.css',
})
export class DecksPage {
  readonly decks: DeckPreview[] = [
    { id: 'azorius-control', name: 'Azorius Control', colors: 'W/U', format: 'Modern', cardCount: 60 },
    { id: 'mono-red-burn', name: 'Mono Red Burn', colors: 'R', format: 'Pioneer', cardCount: 60 },
    { id: 'golgari-midrange', name: 'Golgari Midrange', colors: 'B/G', format: 'Standard', cardCount: 60 },
  ];}
