# Performance Optimization Guide

## Current Issues & Solutions

### 1. Large HTML Files (73KB for skillstream-ai-hub.html)

**Problem**: Single HTML files contain all CSS, JS, and HTML inline.

**Solution**:
```html
<!-- Before: -->
<style>
  /* 50KB of CSS inline */
</style>

<!-- After: -->
<link rel="stylesheet" href="css/ai-hub.css">
```

**Action Items**:
- [ ] Extract inline `<style>` tags into separate `.css` files
- [ ] Extract inline `<script>` tags into separate `.js` files
- [ ] Minify CSS/JS on build
- [ ] Enable gzip compression on Vercel

### 2. Duplicated Code Across 40+ Pages

**Problem**: Header, footer, navigation repeated in every file.

**Solution**: Use `vercel.json` to add middleware that injects shared components.

**Quick Fix**:
```javascript
// Create shared-header.html
<header>...</header>

// Include via JavaScript in all pages
<script>
  fetch('shared-header.html')
    .then(r => r.text())
    .then(html => document.body.insertAdjacentHTML('afterbegin', html));
</script>
```

**Better Fix**: Use a static site generator (11ty, Hugo) or template language.

### 3. Unoptimized Images

**Problem**: No image optimization.

**Solution**:
- Use `<picture>` and `<source>` for responsive images
- Use WebP format with fallbacks
- Add `loading="lazy"` to offscreen images

```html
<picture>
  <source srcset="image.webp" type="image/webp">
  <source srcset="image.jpg" type="image/jpeg">
  <img src="image.jpg" alt="..." loading="lazy">
</picture>
```

### 4. Missing Service Worker for Offline Support

**Problem**: App doesn't work offline.

**Solution**: Add service worker for offline caching.

**File**: `public/service-worker.js`
```javascript
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('v1').then((cache) => {
      return cache.addAll([
        '/',
        '/js/config.js',
        '/css/styles.css',
        // Add other critical files
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

Register in HTML:
```javascript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js');
}
```

### 5. No Code Splitting

**Problem**: All JavaScript loads upfront, even if not needed.

**Solution**: Lazy load components.

```javascript
// Lazy load AI Hub only when tab clicked
document.getElementById('tabAiHubBtn').addEventListener('click', () => {
  import('./features/ai-hub.js').then(module => {
    module.init();
  });
});
```

### 6. Multiple Supabase Initialization

**Problem**: `createClient()` called in every file.

**Solution**: Use centralized config.

```javascript
// js/supabase-client.js
export const sb = window.supabase.createClient(
  APP_CONFIG.SUPABASE_URL,
  APP_CONFIG.SUPABASE_ANON_KEY
);
```

Then import everywhere:
```javascript
import { sb } from './js/supabase-client.js';
```

## Quick Wins (Implement First)

### 1. Enable Gzip in Vercel
```json
// vercel.json
{
  "buildCommand": "npm run build",
  "routes": [
    {
      "src": "/js/(.*)",
      "headers": {
        "cache-control": "public, max-age=31536000, immutable"
      }
    },
    {
      "src": "/css/(.*)",
      "headers": {
        "cache-control": "public, max-age=31536000, immutable"
      }
    },
    {
      "src": "/(.*)\\.html",
      "headers": {
        "cache-control": "public, max-age=0, must-revalidate"
      }
    }
  ]
}
```

### 2. Minify HTML Files
```bash
# Use html-minifier
npm install --save-dev html-minifier

# Build script
for file in *.html; do
  npx html-minifier --input-dir . --output-dir . --file-ext html
done
```

### 3. Add Preload for Critical Resources
```html
<!-- In <head> -->
<link rel="preload" as="script" href="/js/config.js">
<link rel="preload" as="font" href="https://fonts.googleapis.com/css2?family=Syne">
```

### 4. Optimize Font Loading
```html
<!-- Use font-display: swap to avoid invisible text -->
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@500;600;700;800&display=swap" rel="stylesheet">
```

### 5. Defer Non-Critical Scripts
```html
<!-- Critical -->
<script src="/js/config.js"></script>

<!-- Non-critical, defer -->
<script src="/js/analytics.js" defer></script>
<script src="/js/sentry-init.js" defer></script>
```

## Metrics to Track

### Core Web Vitals
- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1

### Other Metrics
- **TTFB** (Time to First Byte): < 600ms
- **FCP** (First Contentful Paint): < 1.8s
- **Bundle Size**: < 500KB (gzipped)

### Tools
- [Google Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [WebPageTest](https://www.webpagetest.org/)
- [Vercel Analytics](https://vercel.com/analytics)
- [SpeedCurve](https://www.speedcurve.com/)

## Monitoring Performance

Add to every page:
```html
<script src="/js/performance.js"></script>
```

This tracks:
- DOM Ready time
- Page Load time
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)
- API latency

Review in Analytics dashboard weekly.

## Optimization Priority

1. **High Impact, Low Effort**
   - Enable gzip compression ✅
   - Add cache headers ✅
   - Minify assets ✅
   - Optimize fonts ✅

2. **High Impact, Medium Effort**
   - Code splitting/lazy loading ⏳
   - Service worker for offline support ⏳
   - Image optimization ⏳

3. **Medium Impact, High Effort**
   - Extract to template language ⏳
   - Migrate to framework (React, Vue) ⏳
   - Database query optimization ⏳
