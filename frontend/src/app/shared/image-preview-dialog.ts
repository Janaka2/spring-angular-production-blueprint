import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface ImagePreviewData {
  url: string;
  name: string;
}

/** Shows an image attachment without downloading it; the object URL is revoked by the caller when the dialog closes. */
@Component({
  selector: 'app-image-preview',
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.name }}</h2>
    <mat-dialog-content><img [src]="data.url" [alt]="data.name" /></mat-dialog-content>
    <mat-dialog-actions align="end"><button mat-flat-button mat-dialog-close cdkFocusInitial>Close</button></mat-dialog-actions>
  `,
  styles: `
    img {
      max-width: 100%;
      max-height: 70vh;
      display: block;
      margin: 0 auto;
      border-radius: 8px;
    }
  `,
})
export class ImagePreviewDialog {
  readonly data = inject<ImagePreviewData>(MAT_DIALOG_DATA);
}
