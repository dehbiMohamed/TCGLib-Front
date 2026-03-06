import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-cards-page',
  imports: [RouterLink],
  templateUrl: './cards-page.html',
  styleUrl: './cards-page.css',
})
export class CardsPage {
  readonly searchExamples: string[] = ['Black Lotus', 'Counterspell', 'Sol Ring'];
  readonly searchStarted = false;}
