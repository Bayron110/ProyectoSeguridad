import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { NavBar } from "./components/nav-bar/nav-bar";
import { Footer } from "./components/footer/footer";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NavBar, RouterOutlet, Footer],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App { }
