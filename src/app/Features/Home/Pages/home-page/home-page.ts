import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface QuickAction {
  label: string;
  description: string;
  path: string;
}

@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
})
export class HomePage {
  readonly quickActions: QuickAction[] = [
  {
    label: 'Rechercher des Cartes',
      description: 'Préparer l’écran de recherche pour Scryfall.',
    path: '/cards'
  },
  {
    label: 'Gérer mes decks',
      description: 'Préparer la structure des decks pour les prochaines étapes.',
      path: '/decks',
  }
];
 readonly dayOneChecklist: string[] = [
    'Navigation globale fonctionnelle',
    'Pages principales accessibles',
    'Structure prête pour les features du jour 2',
  ];
}
