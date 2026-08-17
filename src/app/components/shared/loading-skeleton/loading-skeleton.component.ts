import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="animate-pulse">
      <!-- Table Skeleton -->
      <div *ngIf="type === 'table'" class="space-y-4">
        <div class="h-10 bg-gray-200 rounded w-full"></div>
        <div *ngFor="let item of getArray(rows)" class="grid grid-cols-12 gap-4">
          <div class="col-span-2 h-8 bg-gray-200 rounded"></div>
          <div class="col-span-3 h-8 bg-gray-200 rounded"></div>
          <div class="col-span-2 h-8 bg-gray-200 rounded"></div>
          <div class="col-span-2 h-8 bg-gray-200 rounded"></div>
          <div class="col-span-3 h-8 bg-gray-200 rounded"></div>
        </div>
      </div>

      <!-- Card Skeleton -->
      <div *ngIf="type === 'card'" class="space-y-3">
        <div class="h-6 bg-gray-200 rounded w-3/4"></div>
        <div class="h-4 bg-gray-200 rounded w-full"></div>
        <div class="h-4 bg-gray-200 rounded w-5/6"></div>
        <div class="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>

      <!-- List Skeleton -->
      <div *ngIf="type === 'list'" class="space-y-3">
        <div *ngFor="let item of getArray(rows)" class="flex items-center space-x-4">
          <div class="rounded-full bg-gray-200 h-10 w-10"></div>
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-gray-200 rounded w-3/4"></div>
            <div class="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>

      <!-- Form Skeleton -->
      <div *ngIf="type === 'form'" class="space-y-4">
        <div *ngFor="let item of getArray(rows)">
          <div class="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div class="h-10 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .animate-pulse {
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }
  `]
})
export class LoadingSkeletonComponent {
  @Input() type: 'table' | 'card' | 'list' | 'form' = 'card';
  @Input() rows: number = 3;

  getArray(count: number): number[] {
    return Array(count).fill(0);
  }
}
