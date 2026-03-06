import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

interface DeckDetails {
  id: string;
  name: string;
  format: string;
  gamePlan: string;
  keyCards: string[];
}

@Component({
  selector: 'app-decks-detail-page',
  imports: [RouterLink],
  templateUrl: './decks-detail-page.html',
  styleUrl: './decks-detail-page.css',
})
export class DecksDetailPage { private readonly route = inject(ActivatedRoute);

  readonly deckId = this.route.snapshot.paramMap.get('id') ?? '';

  readonly decksById: Record<string, DeckDetails> = {
    'azorius-control': {
      id: 'azorius-control',
      name: 'Azorius Control',
      format: 'Modern',
      gamePlan: 'Contrôler la partie puis gagner sur la durée.',
      keyCards: ['Counterspell', 'Supreme Verdict', 'Teferi'],
    },
    'mono-red-burn': {
      id: 'mono-red-burn',
      name: 'Mono Red Burn',
      format: 'Pioneer',
      gamePlan: 'Mettre la pression très vite avec des dégâts directs.',
      keyCards: ['Lightning Strike', 'Monastery Swiftspear', 'Play with Fire'],
    },
    'golgari-midrange': {
      id: 'golgari-midrange',
      name: 'Golgari Midrange',
      format: 'Standard',
      gamePlan: 'Jouer des menaces efficaces et gérer le board adverse.',
      keyCards: ['Cut Down', 'Glissa Sunslayer', "Sheoldred, the Apocalypse"],
    },
  };

  readonly deck = this.decksById[this.deckId];
  
}
