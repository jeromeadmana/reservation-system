# Reservation System MVP

A comprehensive chauffeur reservation management system with customer booking portal, admin dashboard, and chauffeur mobile interface.

## Features

### Customer Portal
- Get instant quotes for trips
- Book reservations with vehicle selection
- Manage upcoming and past reservations
- View real-time trip tracking
- Secure payment processing (Stripe-ready)

### Admin Dashboard
- Manage all reservations
- Assign chauffeurs to trips
- Track fleet vehicles
- Generate reports and analytics
- Manage users and chauffeurs

### Chauffeur Interface
- View assigned trips
- Update trip status (en route, on location, dropped off)
- Log trip details and mileage
- Navigate with integrated maps

## Technology Stack

- **Backend**: Node.js + Express + Prisma + SQLite
- **Frontend**: React + Vite + Tailwind CSS
- **Maps**: Google Maps API
- **Payments**: Stripe (integration-ready)

## Project Structure

```
reservation-system/
├── backend/                 # Node.js API server
├── frontend-customer/       # Customer booking portal
├── frontend-admin/          # Admin dashboard
├── frontend-chauffeur/      # Chauffeur mobile interface
├── shared/                  # Shared types and utilities
└── docs/                    # Documentation
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Google Maps API key (for mapping features)
- Stripe account (for payment integration)

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd reservation-system
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
# Copy example env files
cp backend/.env.example backend/.env
cp frontend-customer/.env.example frontend-customer/.env
cp frontend-admin/.env.example frontend-admin/.env
cp frontend-chauffeur/.env.example frontend-chauffeur/.env
```

4. Configure your environment variables in each `.env` file

5. Initialize the database
```bash
npm run prisma:generate
npm run prisma:migrate
```

6. Seed the database (optional)
```bash
npm run seed --workspace=backend
```

### Running the Application

Start all services:
```bash
npm run dev
```

Or run individual services:
```bash
npm run dev:backend        # Backend API on http://localhost:3000
npm run dev:customer       # Customer portal on http://localhost:5173
npm run dev:admin          # Admin dashboard on http://localhost:5174
npm run dev:chauffeur      # Chauffeur app on http://localhost:5175
```

### Database Management

```bash
npm run prisma:studio      # Open Prisma Studio GUI
npm run prisma:migrate     # Run migrations
npm run prisma:generate    # Generate Prisma Client
```

## API Documentation

Once the backend is running, visit:
- Swagger UI: http://localhost:3000/api-docs
- API endpoint: http://localhost:3000/api

## Default Users (After Seeding)

### Admin
- Email: admin@example.com
- Password: Admin123!

### Chauffeur
- Email: chauffeur@example.com
- Password: Chauffeur123!

### Customer
- Email: customer@example.com
- Password: Customer123!

## Development

### Building for Production

```bash
npm run build
```

### Running Tests

```bash
npm run test
```

## Migration to PostgreSQL

When ready to move from SQLite to PostgreSQL:

1. Update `backend/prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

2. Update `backend/.env`:
```
DATABASE_URL="postgresql://user:password@localhost:5432/reservation_system"
```

3. Run migrations:
```bash
npm run prisma:migrate
```

## Deployment

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for deployment instructions.

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed architecture documentation.

## License

MIT
