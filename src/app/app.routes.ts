import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home';
import { CifradoSimetricoComponent } from './components/cifrado-simetrico/cifrado-simetrico';
import { CifradoAsimetricoComponent } from './components/cifrado-asimetrico/cifrado-asimetrico';

export const routes: Routes = [
    { path: '', component: HomeComponent },

    { path: 'cifrado-simetrico', component: CifradoSimetricoComponent },

    { path: 'cifrado-asimetrico', component: CifradoAsimetricoComponent },

    { path: '**', redirectTo: '' }
];


