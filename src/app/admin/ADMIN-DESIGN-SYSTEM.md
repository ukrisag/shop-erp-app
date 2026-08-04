# Admin Design System

## 🎨 Color Palette

### Primary Colors
```css
Primary Blue:   #3B82F6 (blue-500)
Primary Dark:   #2563EB (blue-600)
Primary Light:  #60A5FA (blue-400)
```

### Secondary Colors
```css
Orange:    #F97316 (orange-500)
Success:   #10B981 (green-500)
Warning:   #F59E0B (amber-500)
Error:     #EF4444 (red-500)
```

### Neutral Colors
```css
Gray 50:   #F9FAFB
Gray 100:  #F3F4F6
Gray 200:  #E5E7EB
Gray 300:  #D1D5DB
Gray 600:  #4B5563
Gray 700:  #374151
Gray 800:  #1F2937
Gray 900:  #111827
```

---

## 📐 Layout Structure

### Page Container
```html
<div class="admin-page">
  <!-- Page Header -->
  <div class="page-header">
    <div>
      <h1 class="page-title">หัวข้อหน้า</h1>
      <p class="page-description">คำอธิบายหน้า</p>
    </div>
    <div class="page-actions">
      <!-- Action buttons -->
    </div>
  </div>

  <!-- Page Content -->
  <div class="page-content">
    <!-- Content here -->
  </div>
</div>
```

### Classes

```css
.admin-page {
  @apply min-h-screen bg-gray-50 p-6;
}

.page-header {
  @apply bg-white rounded-xl shadow-sm p-6 mb-6 flex items-center justify-between;
}

.page-title {
  @apply text-2xl font-bold text-gray-900;
}

.page-description {
  @apply text-sm text-gray-600 mt-1;
}

.page-actions {
  @apply flex items-center gap-3;
}

.page-content {
  @apply bg-white rounded-xl shadow-sm p-6;
}
```

---

## 🎯 Components

### Buttons

#### Primary Button
```html
<button class="btn-primary">
  <svg class="w-5 h-5">...</svg>
  <span>ปุ่มหลัก</span>
</button>
```

```css
.btn-primary {
  @apply px-6 py-2.5 bg-blue-600 text-white rounded-lg
         hover:bg-blue-700 active:bg-blue-800
         transition-colors duration-200
         flex items-center gap-2
         font-medium shadow-sm hover:shadow;
}
```

#### Secondary Button
```html
<button class="btn-secondary">ปุ่มรอง</button>
```

```css
.btn-secondary {
  @apply px-6 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg
         hover:bg-gray-50 active:bg-gray-100
         transition-colors duration-200
         flex items-center gap-2
         font-medium shadow-sm hover:shadow;
}
```

#### Success Button (Export Excel)
```html
<button class="btn-success">
  <svg>...</svg>
  Excel
</button>
```

```css
.btn-success {
  @apply px-4 py-2.5 bg-green-600 text-white rounded-lg
         hover:bg-green-700 active:bg-green-800
         transition-colors duration-200
         flex items-center gap-2
         font-medium shadow-sm hover:shadow;
}
```

#### Danger Button (Delete)
```html
<button class="btn-danger">ลบ</button>
```

```css
.btn-danger {
  @apply px-4 py-2.5 bg-red-600 text-white rounded-lg
         hover:bg-red-700 active:bg-red-800
         transition-colors duration-200
         flex items-center gap-2
         font-medium shadow-sm hover:shadow;
}
```

---

### Cards

#### Basic Card
```html
<div class="card">
  <div class="card-header">
    <h3 class="card-title">Card Title</h3>
  </div>
  <div class="card-body">
    Content here
  </div>
</div>
```

```css
.card {
  @apply bg-white rounded-xl shadow-sm overflow-hidden;
}

.card-header {
  @apply px-6 py-4 border-b border-gray-200 bg-gray-50;
}

.card-title {
  @apply text-lg font-semibold text-gray-900;
}

.card-body {
  @apply p-6;
}
```

#### Stats Card
```html
<div class="stats-card">
  <div class="stats-icon bg-blue-100 text-blue-600">
    <svg>...</svg>
  </div>
  <div class="stats-content">
    <p class="stats-label">ยอดขาย</p>
    <p class="stats-value">฿1,234,567</p>
    <p class="stats-change positive">
      <svg>...</svg>
      +12.5%
    </p>
  </div>
</div>
```

```css
.stats-card {
  @apply bg-white rounded-xl shadow-sm p-6
         hover:shadow-md transition-shadow duration-200
         flex items-start gap-4;
}

.stats-icon {
  @apply w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0;
}

.stats-content {
  @apply flex-1;
}

.stats-label {
  @apply text-sm font-medium text-gray-600;
}

.stats-value {
  @apply text-2xl font-bold text-gray-900 mt-1;
}

.stats-change {
  @apply text-sm font-medium mt-1 flex items-center gap-1;
}

.stats-change.positive {
  @apply text-green-600;
}

.stats-change.negative {
  @apply text-red-600;
}
```

---

### Tables

#### Table Container
```html
<div class="table-container">
  <table class="data-table">
    <thead>
      <tr>
        <th>Column 1</th>
        <th>Column 2</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Data 1</td>
        <td>Data 2</td>
      </tr>
    </tbody>
  </table>
</div>
```

```css
.table-container {
  @apply overflow-x-auto rounded-lg border border-gray-200;
}

.data-table {
  @apply w-full;
}

.data-table thead {
  @apply bg-gray-50 border-b border-gray-200;
}

.data-table th {
  @apply px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider;
}

.data-table tbody tr {
  @apply border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150;
}

.data-table tbody tr:last-child {
  @apply border-b-0;
}

.data-table td {
  @apply px-6 py-4 text-sm text-gray-900;
}
```

---

### Forms

#### Search Bar
```html
<div class="search-bar">
  <svg class="search-icon">...</svg>
  <input
    type="text"
    placeholder="ค้นหา..."
    class="search-input"
  />
</div>
```

```css
.search-bar {
  @apply relative w-full sm:w-96;
}

.search-icon {
  @apply absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400;
}

.search-input {
  @apply w-full pl-10 pr-4 py-2.5
         border border-gray-300 rounded-lg
         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
         text-sm;
}
```

#### Select Dropdown
```html
<div class="form-group">
  <label class="form-label">หมวดหมู่</label>
  <select class="form-select">
    <option>Option 1</option>
  </select>
</div>
```

```css
.form-group {
  @apply space-y-1;
}

.form-label {
  @apply block text-sm font-medium text-gray-700;
}

.form-select {
  @apply w-full px-3 py-2.5
         border border-gray-300 rounded-lg
         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
         text-sm;
}
```

---

### Badges & Tags

#### Status Badge
```html
<span class="badge badge-success">เปิดใช้งาน</span>
<span class="badge badge-warning">รอดำเนินการ</span>
<span class="badge badge-error">ปิดใช้งาน</span>
```

```css
.badge {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium;
}

.badge-success {
  @apply bg-green-100 text-green-800;
}

.badge-warning {
  @apply bg-amber-100 text-amber-800;
}

.badge-error {
  @apply bg-red-100 text-red-800;
}

.badge-info {
  @apply bg-blue-100 text-blue-800;
}
```

---

### Filters Bar

```html
<div class="filters-bar">
  <!-- Search -->
  <div class="search-bar">
    <svg class="search-icon">...</svg>
    <input type="text" class="search-input" placeholder="ค้นหา..." />
  </div>

  <!-- Filters -->
  <div class="filters-grid">
    <div class="form-group">
      <label class="form-label">หมวดหมู่</label>
      <select class="form-select">...</select>
    </div>

    <div class="form-group">
      <label class="form-label">สถานะ</label>
      <select class="form-select">...</select>
    </div>
  </div>

  <!-- Actions -->
  <div class="filters-actions">
    <button class="btn-secondary">ล้างตัวกรอง</button>
    <button class="btn-primary">+ เพิ่มใหม่</button>
  </div>
</div>
```

```css
.filters-bar {
  @apply bg-white rounded-xl shadow-sm p-6 mb-6 space-y-4;
}

.filters-grid {
  @apply grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4;
}

.filters-actions {
  @apply flex items-center gap-3 justify-end;
}
```

---

## 📏 Spacing & Sizing

### Standard Gaps
- xs: 0.25rem (1)
- sm: 0.5rem (2)
- md: 0.75rem (3)
- lg: 1rem (4)
- xl: 1.5rem (6)
- 2xl: 2rem (8)

### Card Padding
- Mobile: p-4
- Desktop: p-6

### Button Height
- Small: py-1.5 px-3
- Medium: py-2.5 px-6
- Large: py-3 px-8

---

## 🖼️ Icons

Use **Heroicons** for consistency:
- Outline for default states
- Solid for active/filled states

```html
<!-- Plus Icon -->
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
</svg>

<!-- Edit Icon -->
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
</svg>
```

---

## 🎭 Animations

### Transitions
```css
/* Hover transitions */
transition-colors duration-200

/* Shadow transitions */
transition-shadow duration-200

/* Transform transitions */
transition-transform duration-200

/* All transitions */
transition-all duration-200
```

### Loading State
```html
<div class="loading-spinner">
  <div class="spinner"></div>
  <span>กำลังโหลด...</span>
</div>
```

```css
.loading-spinner {
  @apply flex flex-col items-center justify-center py-12 gap-3;
}

.spinner {
  @apply animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600;
}
```

---

## 📱 Responsive Breakpoints

```css
sm:  640px   (tablet)
md:  768px   (tablet landscape)
lg:  1024px  (desktop)
xl:  1280px  (large desktop)
2xl: 1536px  (extra large)
```

### Grid Patterns

```html
<!-- 1 -> 2 -> 4 columns -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  ...
</div>

<!-- 1 -> 3 columns -->
<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
  ...
</div>

<!-- 1 -> 2 columns -->
<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
  ...
</div>
```
