import { Component, OnInit } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { HeaderComponent } from './components/layout/header/header';
import { FooterComponent } from './components/layout/footer/footer';
import { ToastComponent } from './components/shared/toast/toast';
import { ConfirmDialogComponent } from './components/shared/confirm-dialog/confirm-dialog';
import { AuthService } from './services/auth.service';
import { WishlistService } from './services/wishlist.service';
import { CartService } from './services/cart.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, HeaderComponent, FooterComponent, ToastComponent, ConfirmDialogComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent implements OnInit {
  title = 'ร้านเครื่องครัวแสงทอง';
  isAdminRoute = typeof window !== 'undefined' ? window.location.pathname.startsWith('/admin') : false;

  constructor(
    private authService: AuthService,
    private wishlistService: WishlistService,
    private cartService: CartService,
    private router: Router
  ) {
    this.checkAdminRoute();

    // Check if route changes
    this.router.events.subscribe(() => {
      this.checkAdminRoute();
    });
  }

  private checkAdminRoute(): void {
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    const routerUrl = this.router.url && this.router.url !== '/' ? this.router.url : '';
    this.isAdminRoute = routerUrl.startsWith('/admin') || path.startsWith('/admin');
  }

  ngOnInit(): void {
    this.checkAdminRoute();

    // Load wishlist and cart if user is authenticated
    if (this.authService.isAuthenticated) {
      this.wishlistService.loadWishlist();
      this.cartService.loadCart();
    }
  }
}
