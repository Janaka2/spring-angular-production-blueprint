import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-forbidden',
  imports: [RouterLink, MatButtonModule],
  template: `<div class="page state">
    <h1>Not allowed</h1>
    <p>Your role does not include this action.</p>
    <a mat-stroked-button routerLink="/">Back to the dashboard</a>
  </div>`,
})
export class Forbidden {}
