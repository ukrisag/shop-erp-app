import { Component, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ProductService } from '../../services/product.service';
import { Product, Brand } from '../../models/product.model';
import { ProductCardComponent } from '../products/product-card/product-card';
import { ImageFallbackDirective } from '../../directives/image-fallback.directive';

interface FeatureHighlight {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterLink, ProductCardComponent, ImageFallbackDirective],
  templateUrl: './home.html',
  styleUrl: './home.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit {
  featuredProducts = signal<Product[]>([]);
  bestsellerProducts = signal<Product[]>([]);
  brands = signal<Brand[]>([]);
  loading = signal(true);

  // Active showcase tab
  activeSpotlight = signal<number>(0);

  spotlightHighlights: FeatureHighlight[] = [
    {
      id: 'sus304',
      badge: 'PRO QUALITY',
      title: 'สแตนเลส SUS304 แท้',
      subtitle: 'ทนกรด ด่าง ไม่เป็นสนิมตลอดอายุการใช้งาน',
      description: 'ผลิตจากสแตนเลสเกรดอาหาร Food-Grade ปลอดภัย ไร้สารปนเปื้อน เหมาะสำหรับครัวพาณิชย์และร้านอาหารทุกประเภท',
      icon: '🛡️',
    },
    {
      id: 'heavy-duty',
      badge: 'HEAVY DUTY',
      title: 'โครงสร้างเสริมแกร่ง',
      subtitle: 'รองรับการใช้งานต่อเนื่อง 24 ชั่วโมง',
      description: 'ออกแบบและผลิตด้วยเทคโนโลยีเลเซอร์คัตติ้ง รอยต่อเชื่อมสนิท ไร้เหลี่ยมคม รับน้ำหนักได้สูง',
      icon: '⚡',
    },
    {
      id: 'custom',
      badge: 'CUSTOM FIT',
      title: 'สั่งทำตามขนาดพื้นที่',
      subtitle: 'บริการวัดพื้นที่และออกแบบ 3D ฟรี',
      description: 'ทีมวิศวกรผู้เชี่ยวชาญพร้อมให้คำปรึกษา ออกแบบเครื่องครัวให้ลงตัวกับพื้นที่และการใช้งานจริง',
      icon: '📐',
    },
  ];

  constructor(
    private productService: ProductService
  ) {}

  ngOnInit() {
    this.loadData();
  }

  setSpotlight(index: number) {
    this.activeSpotlight.set(index);
  }

  loadData() {
    this.loading.set(true);
    forkJoin({
      featured: this.productService.getFeaturedProducts(8),
      bestsellers: this.productService.getBestsellerProducts(8),
      brands: this.productService.getBrands()
    }).subscribe({
      next: (data) => {
        this.featuredProducts.set(data.featured);
        this.bestsellerProducts.set(data.bestsellers);
        this.brands.set(data.brands);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('❌ Error loading home data:', error);
        this.loading.set(false);
      }
    });
  }
}
