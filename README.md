# AgenticCommerce - Mobile Shopping App

A full-stack mobile shopping application built with React Native (Expo) and Node.js/Express, featuring user authentication and profile management.

## Tech Stack

- **Frontend**: React Native with Expo, TypeScript
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL
- **Monorepo**: pnpm workspaces
- **Authentication**: JWT tokens with bcrypt password hashing
- **Validation**: Zod schemas (shared between frontend and backend)

## Project Structure

```
AgenticCommerce/
├── apps/
│   ├── backend/          # Express API server
│   └── mobile/           # React Native mobile app
├── packages/
│   ├── shared-types/     # Shared TypeScript types
│   └── validation/       # Shared Zod validation schemas
└── pnpm-workspace.yaml
```

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **pnpm** (v8 or higher) - `npm install -g pnpm`
- **PostgreSQL** (v14 or higher)
- **Expo Go** app on your phone (for testing the mobile app)

## Getting Started

### 1. Install Dependencies

```bash
# Install all workspace dependencies
pnpm install
```

### 2. Build Shared Packages

```bash
# Build shared TypeScript packages
pnpm run build:shared
```

### 3. Set Up PostgreSQL Database

#### Create Database

```bash
# Using psql
psql -U postgres
CREATE DATABASE agentic_commerce;
\q
```

Or use a GUI tool like pgAdmin.

#### Run Migration

```bash
# Navigate to backend directory
cd apps/backend

# Run the migration script
psql -U postgres -d agentic_commerce -f migrations/001_create_users_table.sql
```

This will create the `users` table with all necessary fields and indexes.

### 4. Configure Environment Variables

The backend `.env` file is already created at `apps/backend/.env` with default values:

```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=agentic_commerce
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=agentic-commerce-super-secret-jwt-key-minimum-32-characters-long
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:8081
```

**Important**: Update `DB_PASSWORD` with your PostgreSQL password.

### 5. Configure Mobile API URL

For testing on a physical device, update the API URL in `apps/mobile/src/services/api.ts`:

```typescript
// Replace localhost with your machine's IP address
const API_URL = 'http://YOUR_MACHINE_IP:3000/api';
```

To find your IP address:
- **Windows**: Run `ipconfig` in terminal
- **macOS/Linux**: Run `ifconfig` in terminal

Example: `http://192.168.1.100:3000/api`

## Running the Application

### Option 1: Run Everything Concurrently

```bash
# From project root
pnpm run dev
```

This starts both the backend server and mobile app.

### Option 2: Run Separately

**Terminal 1 - Backend:**
```bash
pnpm run dev:backend
```

**Terminal 2 - Mobile App:**
```bash
pnpm run dev:mobile
```

### Testing the Mobile App

1. Install **Expo Go** from your app store (iOS/Android)
2. Run `pnpm run dev:mobile`
3. Scan the QR code with:
   - **iOS**: Camera app
   - **Android**: Expo Go app
4. The app will load on your phone

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user

### User (Protected)
- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update user profile

### Health
- `GET /api/health` - Health check endpoint

## Features

### Implemented
- ✅ User registration with validation
- ✅ User login with JWT authentication
- ✅ Secure password hashing (bcrypt)
- ✅ User profile management
- ✅ Secure token storage (expo-secure-store)
- ✅ Input validation (Zod schemas)
- ✅ Error handling
- ✅ Navigation (Auth flow + App flow)
- ✅ Responsive UI components

### Planned
- ⏳ Product catalog browsing
- ⏳ Shopping cart functionality
- ⏳ Order management
- ⏳ Payment integration
- ⏳ Push notifications
- ⏳ Password reset
- ⏳ Email verification
- ⏳ Profile picture upload

## Database Schema

### Users Table

```sql
users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  phone_number VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
```

## Development

### Backend Development

```bash
cd apps/backend

# Start development server with hot reload
pnpm run dev

# Build for production
pnpm run build

# Type check
pnpm run type-check
```

### Mobile Development

```bash
cd apps/mobile

# Start Expo development server
pnpm start

# Run on Android
pnpm run android

# Run on iOS (macOS only)
pnpm run ios

# Type check
pnpm run type-check
```

### Shared Packages

When you modify shared types or validation schemas:

```bash
# Rebuild shared packages
pnpm run build:shared
```

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
pg_isready

# Verify database exists
psql -U postgres -l | grep agentic_commerce
```

### Mobile App Can't Connect to Backend

1. Ensure backend is running: `pnpm run dev:backend`
2. Check health endpoint: `http://localhost:3000/api/health`
3. Update API URL in `apps/mobile/src/services/api.ts` with your machine's IP
4. Ensure your phone and computer are on the same WiFi network

### Build Errors

```bash
# Clean install
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install

# Rebuild shared packages
pnpm run build:shared
```

## Project Scripts

### Root Level

- `pnpm run dev` - Run backend and mobile concurrently
- `pnpm run dev:backend` - Run backend only
- `pnpm run dev:mobile` - Run mobile only
- `pnpm run build` - Build all packages
- `pnpm run build:shared` - Build shared packages only
- `pnpm run type-check` - Type check all packages

## Security Features

- Password hashing with bcrypt (10 salt rounds)
- JWT token authentication with expiration
- Secure token storage on mobile (expo-secure-store)
- Input validation on frontend and backend
- CORS configuration
- Helmet security headers
- SQL injection protection (parameterized queries)
- Error handling without exposing sensitive information

## Architecture Highlights

### Monorepo Benefits
- Shared TypeScript types between frontend and backend
- Centralized dependency management
- Consistent tooling and standards
- Easy code sharing and reuse

### Clean Architecture
- **Backend**: Repository → Service → Controller → Routes
- **Mobile**: Services → Context → Hooks → Components → Screens
- Clear separation of concerns
- Easy to test and maintain

## Contributing

This is a personal project. Feel free to fork and modify for your own use.

## License

MIT
