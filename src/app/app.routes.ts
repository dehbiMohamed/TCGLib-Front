import { Routes } from '@angular/router';
import { Layout } from './Core/layout/layout';
import { HomePage } from './Features/Home/Pages/home-page/home-page';
import { CardsPage } from './Features/Cards/Pages/cards-page/cards-page';
import { DecksPage } from './Features/Decks/Pages/decks-page/decks-page';
import { DecksDetailPage } from './Features/Decks/Pages/decks-detail-page/decks-detail-page';

export const routes: Routes = [
    {
        path: '',
        component: Layout,
        children: [
            {path:'', component: HomePage},
            {path:'cards', component: CardsPage},
            {path:'decks', component: DecksPage},
            {path:'decks/:id', component: DecksDetailPage}
        ]
    },
    { path: '**', redirectTo: '' }
];
