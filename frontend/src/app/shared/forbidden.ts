import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-forbidden',
  imports: [RouterLink, MatButtonModule, MatIconModule],
  template: `<div class="page">
    <div class="state">
      <span class="halo bad"><mat-icon aria-hidden="true">lock</mat-icon></span>
      <p class="eyebrow">403</p>
      <h1>Not allowed</h1>
      <p>Your role does not include this action. Ask an administrator if you need access.</p>
      <a mat-flat-button routerLink="/"><mat-icon>arrow_back</mat-icon> Back to the dashboard</a>
    </div>
  </div>`,
})
export class Forbidden {}
