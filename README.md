# Tickets.mv - Maldivian Movie Ticketing Platform 🇲🇻🎟️

A multi-tenant movie ticketing and cinema management platform tailored for the Maldives. Built with React 19, TypeScript, Tailwind CSS, and Vite.

## 🌟 Key Features

- **Multi-Tenant Architecture**: Island cinemas & organizers manage their own branding, halls, multi-screen layouts, showtimes, and bank details.
- **Interactive Multi-Screen Hall Seating**: Real-time interactive seat selection supporting multiple screens in shared auditoriums (Standard, VIP, Wheelchair accessible).
- **Localized Maldivian Payments**: BML gateway ready, Direct Bank Transfer slip upload with transaction receipt review & admin approval workflow.
- **Digital QR Ticket Passes & Scanner**: Anti-screenshot dynamic color bars, countdown timers, and built-in mobile camera QR door scanner with sound effects.
- **Cascading Atoll & Island Discovery**: Quick search across Maldivian atolls and islands.
- **Tiered Subscriptions & Sandbox**: Free 3-Day Trial (100 seats access, random subdomain, 1 hall & 1 screen) and Paid Plans (Weekly & Monthly) with custom subdomains.
- **Admin Hubs**: Dedicated Super Admin (`/super-admin`) and Cinema Tenant Portal (`/tenant-admin`).

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or newer)
- npm or pnpm

### Installation

```bash
git clone https://github.com/alippalheyss/ticketsmv.git
cd ticketsmv
npm install
```

### Development Server

```bash
npm run dev
```

### Production Build

```bash
npm run build
```

## 🌐 Deploying to Vercel

1. Push this repository to GitHub: `https://github.com/alippalheyss/ticketsmv`
2. Connect the repository to [Vercel](https://vercel.com).
3. The included `vercel.json` automatically manages client-side SPA routing.
4. Framework Preset: **Vite**
5. Build Command: `npm run build`
6. Output Directory: `dist`

## 📄 License
MIT
