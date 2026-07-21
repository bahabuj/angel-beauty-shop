# 🏪 Angelsbeauty — Complete Website Documentation

> Premium Skincare E-Commerce Platform  
> **URL:** https://github.com/bahabuj/angel-beauty-shop  
> **Business:** Angelsbeauty Skincare — 246 Union St, Lynn MA 01901  
> **Phone:** +1 (617) 955-0069  
> **WhatsApp:** wa.me/16179550069

---

## 📋 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Front-End Pages](#3-front-end-pages)
4. [Admin Dashboard](#4-admin-dashboard)
5. [API Endpoints](#5-api-endpoints)
6. [Database Schema](#6-database-schema)
7. [Key Features](#7-key-features)
8. [Special Features](#8-special-features)
9. [File & Folder Structure](#9-file--folder-structure)
10. [Setup & Installation](#10-setup--installation)

---

## 1. Project Overview

**Angelsbeauty** is a full-featured e-commerce website for selling premium skincare products. It features a beautiful storefront with product browsing, shopping cart, checkout with multiple payment options, and a comprehensive admin dashboard for managing the entire store.

The site is a **Single Page Application (SPA)** using hash-based routing — all pages render within one `page.tsx` file, with navigation managed through Zustand state and URL hash fragments.

### Brand Identity
- **Brand Name:** Angelsbeauty
- **Founder & CEO:** Nina Angel
- **Tagline:** "Premium Skincare for Radiant Skin"
- **Color Palette:** Gold, Blush, Cream, Rose, Nude
- **Fonts:** Playfair Display (headings) + Inter (body)

---

## 2. Technology Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router, standalone output) |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS 4 + custom theme colors |
| **UI Library** | shadcn/ui (44 components, New York style) |
| **State Management** | Zustand (4 stores: nav, auth, cart, UI) |
| **Database** | SQLite via Prisma ORM |
| **Authentication** | NextAuth.js v4 (JWT) + Firebase (Google OAuth) |
| **Animation** | Framer Motion |
| **Charts** | Recharts |
| **PDF Generation** | jsPDF |
| **File Upload** | Local filesystem (public/uploads/) |
| **Icons** | Lucide React |
| **Runtime** | Bun |

---

## 3. Front-End Pages

The website has **15 pages** accessed via hash-based routing:

### 🏠 Home Page (`#home`)
The main storefront featuring:
- **Announcement Bar** — Scrolling marquee with configurable icons and text (managed from admin)
- **Hero Carousel** — Image/video slides with Ken Burns effect, adjustable overlay darkness
- **Featured Products** — Products marked as "featured" in admin
- **Promo Banners** — Promotional cards with CTA buttons (managed from admin)
- **New Arrivals** — Products marked as "new arrival"
- **Best Sellers** — Products marked as "best seller"
- **Before & After Gallery** — Customer transformation photos
- **Why Choose Us** — 4 value propositions (Natural Ingredients, Dermatologist Tested, Cruelty Free, Premium Quality)
- **Customer Testimonials** — Customer reviews
- **Inspiration Hub** — Daily beauty tips with custom icons and colors
- **Instagram CTA** — Link to Instagram profile
- **CTA Banner** — "Ready to Glow?" call-to-action
- **Newsletter Signup** — Email subscription form

### 🛍️ Shop Page (`#shop`)
Full product catalog with:
- **Category Filter** — Filter by product category
- **Search Bar** — Search products by name
- **Sort Options** — Newest First, Price Low→High, Price High→Low
- **Product Grid** — Cards with image, name, price, Add to Cart button
- **Pagination** — 10 products per page with navigation

### 📦 Product Detail Page (`#product/{slug}`)
Individual product page with:
- **Image Gallery** — All product images with main photo
- **Product Info** — Name, price, compare price, description
- **Tabs** — Benefits, Ingredients, How to Use
- **Quantity Selector** — Increment/decrement with stock limit
- **Add to Cart** — Button with success feedback
- **WhatsApp Inquiry** — Direct WhatsApp message about the product
- **Related Products** — Same category suggestions

### 🛒 Cart Page (`#cart`)
Shopping cart with:
- **Cart Items** — Image, name, price, quantity controls
- **Remove Items** — Delete from cart
- **Subtotal** — Running total calculation
- **Free Shipping Threshold** — Progress bar showing $100 free delivery target
- **Continue Shopping / Checkout** — Navigation buttons

### 💳 Checkout Page (`#checkout`)
Order placement with:
- **Shipping Form** — Name, email, phone, address, city, state, zip code
- **Payment Methods** — Pay on Delivery, Card Payment, Bank Transfer, Paystack
- **Order Summary** — Items, subtotal, total
- **Place Order** — Submit order and generate invoice

### ✅ Order Success Page (`#order-success`)
Order confirmation showing:
- **Success Message** — Green checkmark animation
- **Order Details** — Confirmation number
- **Invoice Notice** — "Invoice will be sent to your email"
- **Continue Shopping** — Return to shop

### 👤 About Page (`#about`)
Company information with:
- **Brand Story** — Mission and vision
- **Founder Section** — CEO Nina Angel with photo and bio
- **Values** — Natural Ingredients, Cruelty Free, Dermatologist Tested, Premium Quality

### 📞 Contact Page (`#contact`)
Contact information and form:
- **Contact Form** — Name, email, subject, message
- **Business Info** — Phone, email, address
- **Business Hours** — Operating schedule
- **WhatsApp Link** — Direct chat button

### 🔐 Auth Page (`/auth`)
Authentication with:
- **Login Form** — Email + password
- **Sign Up Form** — Name, email, password, confirm password
- **Google Sign-In** — Firebase OAuth popup
- **Auth Slides Carousel** — Branded sliding images from database

### 👤 Account Page (`#account`)
User profile with:
- **Profile Info** — Name, email, phone, avatar
- **Order History** — Past orders with status badges (Pending, Processing, Shipped, Delivered, Cancelled)

### 📄 Policy Pages
- **Privacy Policy** (`#privacy`)
- **Terms & Conditions** (`#terms`)
- **Shipping Policy** (`#shipping`)

---

## 4. Admin Dashboard

Accessed via `#admin` in the URL or by **triple-clicking the decorative dot** in the footer copyright line. No login required — direct access.

### Dashboard Sections (11 sections)

#### 1. 📊 Dashboard Overview
- Stats cards: Total Products, Total Orders, Revenue, Subscribers
- Revenue bar chart (Recharts)
- Recent orders table

#### 2. 📦 Products Management
- Full CRUD (Create, Read, Update, Delete)
- Image upload (click, drag-and-drop, or paste URL)
- Fields: Name, Slug (auto-generated), Category, Price, Compare Price, Stock, Description, Benefits (comma-separated), Ingredients, How to Use
- Toggle switches: Featured, New Arrival, Best Seller
- Search and pagination

#### 3. 🏷️ Categories Management
- Full CRUD with image upload
- Drag-and-drop reorder
- Active/inactive toggle
- Product count per category

#### 4. 📋 Orders Management
- Order list with customer details
- Status updates: Pending → Processing → Shipped → Delivered / Cancelled
- Invoice generation (PDF)
- Invoice email sending

#### 5. 🎯 Promo Banners
- CRUD for promotional banners
- Image upload, CTA text and link
- Active/inactive toggle, ordering

#### 6. 🎬 Visual Content (3 tabs)
- **Hero Slides** — Image/video upload, overlay darkness slider, Ken Burns toggle, ordering
- **Partners** — Logo, name, URL, ordering
- **Announcement Bar** — Scrolling marquee items with icons (truck, sparkles, gift, star, heart) and separators

#### 7. 🔐 Auth Page Slides
- CRUD for login page carousel slides
- Image/video upload, active toggle, ordering

#### 8. 🔄 Before & After Images
- CRUD for transformation gallery
- Before/after image upload
- Name, duration, result description, ordering

#### 9. 💡 Inspiration Hub
- CRUD for inspiration cards
- Image upload, icon selection (Sun, Sparkles, Droplets, Heart, Leaf, Check)
- Color theme, tip text, ordering

#### 10. 📧 Newsletter Subscribers
- View all subscriber emails
- Delete subscribers
- Email list management

#### 11. ⚙️ Settings
- Admin profile settings
- Store settings
- Notification preferences
- Security settings (change password, 2FA toggle)

---

## 5. API Endpoints

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List/search/filter products (query: category, search, featured, newArrival, bestSeller, sort, minPrice, maxPrice) |
| POST | `/api/products` | Create product (auto-resolves duplicate slugs, sanitizes fields) |
| GET | `/api/products/[id]` | Get single product |
| PUT | `/api/products/[id]` | Update product (auto-resolves duplicate slugs) |
| DELETE | `/api/products/[id]` | Delete product |
| GET | `/api/products/slug/[slug]` | Get product by slug |

### Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories` | List all categories |
| POST | `/api/categories` | Create category |
| GET | `/api/categories/[id]` | Get single category |
| PUT | `/api/categories/[id]` | Update category |
| DELETE | `/api/categories/[id]` | Delete category |
| PUT | `/api/categories/reorder` | Reorder categories (drag-and-drop) |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orders` | List all orders |
| POST | `/api/orders` | Create new order |
| GET | `/api/orders/[id]` | Get single order |
| PUT | `/api/orders/[id]` | Update order status |

### Hero Slides
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/hero-slides` | List active hero slides |
| POST | `/api/hero-slides` | Create hero slide |
| PUT | `/api/hero-slides/[id]` | Update hero slide |
| DELETE | `/api/hero-slides/[id]` | Delete hero slide |

### Partners
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/partners` | List active partners |
| POST | `/api/partners` | Create partner |
| PUT | `/api/partners/[id]` | Update partner |
| DELETE | `/api/partners/[id]` | Delete partner |

### Announcement Items
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/announcement-items` | List all announcements |
| POST | `/api/announcement-items` | Create announcement |
| PUT | `/api/announcement-items/[id]` | Update announcement |
| DELETE | `/api/announcement-items/[id]` | Delete announcement |

### Promo Banners
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/promos` | List promo banners |
| POST | `/api/promos` | Create promo banner |
| PUT | `/api/promos/[id]` | Update promo banner |
| DELETE | `/api/promos/[id]` | Delete promo banner |

### Transformations (Before & After)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transformations` | List transformations |
| POST | `/api/transformations` | Create transformation |
| PUT | `/api/transformations/[id]` | Update transformation |
| DELETE | `/api/transformations/[id]` | Delete transformation |

### Inspiration Items
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inspiration-items` | List inspiration items |
| POST | `/api/inspiration-items` | Create inspiration item |
| PUT | `/api/inspiration-items/[id]` | Update inspiration item |
| DELETE | `/api/inspiration-items/[id]` | Delete inspiration item |

### Auth Slides
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth-slides` | List active auth slides |
| GET | `/api/auth-slides-all` | List ALL auth slides (admin) |
| POST | `/api/auth-slides` | Create auth slide |
| PUT | `/api/auth-slides/[id]` | Update auth slide |
| DELETE | `/api/auth-slides/[id]` | Delete auth slide |

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login (email/password) |
| POST | `/api/auth/credential-signin` | NextAuth credentials sign-in |
| POST | `/api/auth/firebase-signin` | Firebase Google OAuth sign-in |
| GET/POST | `/api/auth/[...nextauth]` | NextAuth.js catch-all handler |
| GET | `/api/auth/me` | Get current authenticated user |
| POST | `/api/auth/logout` | Logout and clear session |

### Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats` | Dashboard statistics |
| GET | `/api/home-data` | Combined homepage data |
| GET/POST | `/api/newsletter` | List subscribers / Subscribe |
| DELETE | `/api/newsletter/[id]` | Remove subscriber |
| POST | `/api/upload` | Upload files (images/videos) |
| POST/GET | `/api/invoice/generate` | Generate invoice PDF |
| POST | `/api/invoice/send` | Send invoice email |

---

## 6. Database Schema

### User
| Field | Type | Notes |
|-------|------|-------|
| id | String | Auto-generated (cuid) |
| email | String | Unique |
| name | String? | Optional |
| password | String? | Bcrypt hashed |
| role | String | Default: "customer" |
| phone | String? | Optional |
| avatar | String? | Optional |
| image | String? | Optional |
| emailVerified | DateTime? | Optional |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

### Category
| Field | Type | Notes |
|-------|------|-------|
| id | String | Auto-generated (cuid) |
| name | String | Required |
| slug | String | Unique |
| description | String? | Optional |
| image | String? | Optional |
| order | Int | Default: 0 |
| active | Boolean | Default: true |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

### Product
| Field | Type | Notes |
|-------|------|-------|
| id | String | Auto-generated (cuid) |
| name | String | Required |
| slug | String | Unique |
| description | String | Required |
| price | Float | Required |
| comparePrice | Float? | Optional (for showing original/sale price) |
| categorySlug | String | Links to Category |
| images | String | JSON array of image URLs |
| benefits | String | JSON array of benefit strings |
| ingredients | String | Text |
| howToUse | String | Text |
| stock | Int | Default: 0 |
| featured | Boolean | Default: false |
| newArrival | Boolean | Default: false |
| bestSeller | Boolean | Default: false |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

### Order
| Field | Type | Notes |
|-------|------|-------|
| id | String | Auto-generated (cuid) |
| userId | String? | Optional (guest checkout) |
| items | String | JSON array of order items |
| subtotal | Float | Required |
| total | Float | Required |
| status | String | Default: "pending" |
| customerName | String | Required |
| email | String | Required |
| phone | String? | Optional |
| address | String | Required |
| city | String | Required |
| state | String? | Optional |
| zipCode | String? | Optional |
| country | String | Default: "United States" |
| paymentMethod | String | Default: "pay_on_delivery" |
| invoiceNumber | String? | Auto-generated (INV-YYYYMM-XXXX) |
| invoiceSent | Boolean | Default: false |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

### NewsletterSubscriber
| Field | Type | Notes |
|-------|------|-------|
| id | String | Auto-generated (cuid) |
| email | String | Unique |
| createdAt | DateTime | Auto |

### PromoBanner
| Field | Type | Notes |
|-------|------|-------|
| id | String | Auto-generated (cuid) |
| title | String | Required |
| subtitle | String? | Optional |
| image | String? | Optional |
| ctaText | String? | Call-to-action button text |
| ctaLink | String? | Call-to-action URL |
| active | Boolean | Default: true |
| order | Int | Default: 0 |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

### HeroSlide
| Field | Type | Notes |
|-------|------|-------|
| id | String | Auto-generated (cuid) |
| title | String | Default: "" |
| subtitle | String? | Optional |
| mediaUrl | String | Image or video URL |
| mediaType | String | "image" or "video" |
| active | Boolean | Default: true |
| order | Int | Default: 0 |
| overlayDark | Float | Default: 0.5 (0-1) |
| kenBurns | Boolean | Default: true |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

### AuthSlide
| Field | Type | Notes |
|-------|------|-------|
| id | String | Auto-generated (cuid) |
| title | String | Required |
| subtitle | String? | Optional |
| mediaUrl | String | Image or video URL |
| mediaType | String | Default: "image" |
| active | Boolean | Default: true |
| order | Int | Default: 0 |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

### Partner
| Field | Type | Notes |
|-------|------|-------|
| id | String | Auto-generated (cuid) |
| name | String | Required |
| logo | String | Image URL |
| url | String? | Optional website link |
| active | Boolean | Default: true |
| order | Int | Default: 0 |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

### AnnouncementItem
| Field | Type | Notes |
|-------|------|-------|
| id | String | Auto-generated (cuid) |
| text | String | Marquee text |
| icon | String | Default: "none" (truck/sparkles/gift/star/heart) |
| separator | String | Default: "✦" |
| active | Boolean | Default: true |
| order | Int | Default: 0 |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

### Transformation
| Field | Type | Notes |
|-------|------|-------|
| id | String | Auto-generated (cuid) |
| name | String | Customer name |
| duration | String | e.g. "4 Weeks" |
| result | String | Result description |
| beforeImg | String | Before photo URL |
| afterImg | String | After photo URL |
| active | Boolean | Default: true |
| order | Int | Default: 0 |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

### InspirationItem
| Field | Type | Notes |
|-------|------|-------|
| id | String | Auto-generated (cuid) |
| label | String | Card title |
| tip | String | Tip text |
| image | String | Background image URL |
| icon | String | Default: "Sparkles" (Sun/Sparkles/Droplets/Heart/Leaf/Check) |
| color | String | Default: "from-gold/80" |
| active | Boolean | Default: true |
| order | Int | Default: 0 |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

---

## 7. Key Features

### 🔐 Authentication System
- **NextAuth.js v4** with JWT strategy (30-day sessions)
- **Email/Password** login with bcrypt password hashing
- **Google OAuth** via Firebase (popup → server-side token verification → auto-create user)
- **Auto password migration** — Legacy plain-text passwords are auto-migrated to bcrypt on login
- **Role-based access** — "customer" vs "admin" roles

### 🛒 Shopping Cart
- **Zustand** with persist middleware (saves to localStorage)
- Add, remove, update quantity
- Subtotal/total calculations
- Free shipping threshold at $100 with progress bar

### 💳 Checkout & Payments
- Guest and authenticated checkout
- Multiple payment methods: Pay on Delivery, Card Payment, Bank Transfer, Paystack
- Order status tracking (Pending → Processing → Shipped → Delivered / Cancelled)
- Automatic invoice number generation (INV-YYYYMM-XXXX)

### 📄 Invoice Generation
- **jsPDF** for PDF generation (fully in-memory)
- Professional branded PDF with gold header, company info, itemized table, totals
- Saved to `public/invoices/` directory
- Invoice email sending capability

### 📤 File Upload System
- Supports images (JPEG, PNG, GIF, WebP, SVG) up to 50MB
- Supports videos (MP4, WebM, OGG, MOV) up to 200MB
- Organized in `/public/uploads/{folder}/` directories
- Unique filenames with timestamp + UUID
- Used across all admin sections

### 📧 Newsletter System
- Subscribe via footer form or homepage
- Email stored in database (unique)
- Admin can view and manage all subscribers

### 🤖 Chatbot
- Floating chat bubble (bottom-right, above WhatsApp button)
- Animated open/close with Framer Motion
- 5 quick-question preset buttons
- Rule-based responses for common questions
- Scrollable message area

---

## 8. Special Features

| Feature | Details |
|---------|---------|
| 🔒 **Secret Admin Access** | Triple-click the decorative dot in the footer copyright line to go directly to admin |
| 🔗 **Hash-based Admin URL** | Navigate to `#admin` or `#admin/section` in the URL to access admin dashboard |
| 📱 **WhatsApp Integration** | Floating green button (wa.me/16179550069) + product-specific WhatsApp inquiry button |
| 🎥 **Video Hero Slides** | Hero carousel supports both images and videos with Ken Burns effect and adjustable overlay |
| 📊 **Dashboard Charts** | Revenue bar charts using Recharts |
| 🎨 **Drag & Drop Ordering** | Categories can be reordered via drag-and-drop |
| 🎭 **Before/After Gallery** | Interactive transformation gallery with side-by-side photos |
| 💡 **Inspiration Hub** | Customizable inspiration cards with icon and color theme selection |
| 📢 **Dynamic Announcement Bar** | Scrolling marquee with configurable icons and separators |
| 🖼️ **Lazy Loading** | All page components use `next/dynamic` for code splitting |
| 📱 **Mobile Responsive** | Full responsive design with mobile menu, touch-friendly buttons |
| 🎨 **Custom Theme** | Gold/blush/cream/rose/nude color palette with Playfair Display + Inter fonts |
| 🔄 **SPA Architecture** | Single-page app with hash routing and browser history support |
| 💳 **Payment Icons** | Visa, Mastercard, Verve, Paystack, Bank Transfer, Cash on Delivery |

### Social Media Links
- **Instagram:** https://www.instagram.com/angelsbskincare/
- **TikTok:** https://www.tiktok.com/@angelsbeautyskincare
- **Facebook:** (placeholder)
- **WhatsApp:** wa.me/16179550069
- **YouTube:** (placeholder)

---

## 9. File & Folder Structure

```
angel-beauty-shop/
├── prisma/
│   ├── schema.prisma          # Database schema (12 models)
│   └── seed.ts                # Database seeder
├── public/
│   ├── images/                # Static images (hero, products, partners, etc.)
│   ├── uploads/               # User-uploaded files
│   │   ├── products/
│   │   ├── hero/
│   │   ├── categories/
│   │   ├── transformations/
│   │   ├── inspiration/
│   │   ├── promos/
│   │   └── auth/
│   ├── invoices/              # Generated PDF invoices
│   └── logo.svg
├── src/
│   ├── app/
│   │   ├── page.tsx           # Main SPA entry point
│   │   ├── layout.tsx         # Root layout with providers
│   │   ├── globals.css        # Global styles + theme
│   │   ├── auth/page.tsx      # Auth page (login/signup)
│   │   ├── angelsbeauty-admin/page.tsx  # Admin login page
│   │   └── api/               # 38 API endpoints
│   │       ├── products/      # CRUD + slug lookup
│   │       ├── categories/    # CRUD + reorder
│   │       ├── orders/        # CRUD
│   │       ├── hero-slides/   # CRUD
│   │       ├── partners/      # CRUD
│   │       ├── announcement-items/ # CRUD
│   │       ├── promos/        # CRUD
│   │       ├── transformations/ # CRUD
│   │       ├── inspiration-items/ # CRUD
│   │       ├── auth-slides/   # CRUD + list-all
│   │       ├── auth/          # Login, signup, logout, me, NextAuth
│   │       ├── newsletter/    # Subscribe + list
│   │       ├── upload/        # File upload
│   │       ├── invoice/       # Generate + send PDF
│   │       ├── stats/         # Dashboard stats
│   │       └── home-data/     # Combined homepage data
│   ├── components/
│   │   ├── layout/            # Navbar, Footer, Chatbot, WhatsApp Button
│   │   ├── pages/             # 15 page components
│   │   ├── admin/             # 11 admin section components
│   │   ├── ui/                # 44 shadcn/ui components
│   │   └── providers/         # Session provider
│   ├── store/                 # Zustand stores
│   │   ├── nav-store.ts       # Page navigation state
│   │   ├── auth-store.ts      # Authentication state
│   │   ├── cart-store.ts      # Shopping cart state
│   │   └── ui-store.ts        # UI state (mobile menu, etc.)
│   ├── hooks/                 # Custom hooks
│   ├── lib/                   # Utilities
│   │   ├── db.ts              # Prisma client
│   │   ├── auth.ts            # NextAuth config
│   │   ├── utils.ts           # Utility functions
│   │   ├── firebase.ts        # Firebase client config
│   │   ├── firebase-client.ts # Firebase app init
│   │   └── firebase-admin.ts  # Firebase Admin SDK
│   └── middleware.ts          # Route protection
├── next.config.ts
├── tailwind.config.ts
├── package.json
└── tsconfig.json
```

---

## 10. Setup & Installation

### Prerequisites
- Node.js 18+ or Bun
- npm or bun package manager

### Installation Steps

```bash
# 1. Clone the repository
git clone https://github.com/bahabuj/angel-beauty-shop.git
cd angel-beauty-shop

# 2. Install dependencies
bun install

# 3. Set up environment variables
# Create a .env file with:
# DATABASE_URL=file:./db/custom.db
# NEXTAUTH_SECRET=your-secret-key
# NEXTAUTH_URL=http://localhost:3000
# FIREBASE_API_KEY=your-firebase-key
# FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
# FIREBASE_PROJECT_ID=your-project-id
# FIREBASE_STORAGE_BUCKET=your-project.appspot.com
# FIREBASE_MESSAGING_SENDER_ID=your-sender-id
# FIREBASE_APP_ID=your-app-id

# 4. Set up the database
bun run db:push

# 5. Seed the database (optional)
bun run prisma db seed

# 6. Start the development server
bun run dev

# 7. Open http://localhost:3000
```

### Admin Access
- Navigate to `http://localhost:3000#admin`
- Or triple-click the dot in the footer copyright line
- No login required — direct dashboard access

### Build for Production
```bash
bun run build
bun run start
```

---

*Documentation generated on June 8, 2026*
