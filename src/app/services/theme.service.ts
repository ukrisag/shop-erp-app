import { Injectable, signal, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type ThemeMode = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  // Reactive signal for current theme
  theme = signal<ThemeMode>(this.getInitialTheme());

  constructor() {
    // Apply theme whenever signal changes
    if (this.isBrowser) {
      effect(() => {
        const currentTheme = this.theme();
        this.applyTheme(currentTheme);
      });
    }
  }

  private getInitialTheme(): ThemeMode {
    if (!this.isBrowser) {
      return 'light';
    }

    try {
      const savedTheme = localStorage.getItem('apple_theme') as ThemeMode;
      if (savedTheme === 'dark' || savedTheme === 'light') {
        return savedTheme;
      }

      // Check system preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch (e) {
      console.warn('Could not read theme from localStorage', e);
    }

    return 'light';
  }

  private applyTheme(theme: ThemeMode) {
    if (!this.isBrowser) return;

    try {
      const root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      localStorage.setItem('apple_theme', theme);
    } catch (e) {
      console.warn('Could not apply theme', e);
    }
  }

  toggleTheme(): void {
    const nextTheme: ThemeMode = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(nextTheme);
  }

  setTheme(theme: ThemeMode): void {
    this.theme.set(theme);
  }

  isDark(): boolean {
    return this.theme() === 'dark';
  }
}
