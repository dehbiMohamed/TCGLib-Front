import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface NavItem {
  label: string;
  path: string;
  exact: boolean;
}

@Component({
  selector: 'app-navbar',
  imports: [RouterLinkActive, RouterLink],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar { readonly navItems: NavItem[] = [
  { label: 'Home', path: '/' , exact: true},
  { label: 'Cards', path: '/cards' , exact: false},
  { label: 'Decks', path: '/decks' , exact: false}
];
}
