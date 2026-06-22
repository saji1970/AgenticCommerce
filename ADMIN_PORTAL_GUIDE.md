# Admin Portal Guide

## Overview

The Admin Portal provides a web-based interface to manage and monitor the AgenticCommerce platform. It allows administrators to view all users, mandates, purchase intents, and transactions.

## Access

### Admin Portal URL
```
http://localhost:3000/admin
```

### Admin Credentials
- **Email**: `admin@agenticcommerce.com`
- **Password**: `Balaji1@`

## Features

### 1. Dashboard
- **Total Users**: Count of all registered users
- **Total Mandates**: Count of all agent mandates
- **Total Intents**: Count of all purchase intents
- **Total Spent**: Total amount spent from executed intents

### 2. Users Management
- View all users with their details
- Search users by email or name
- View user role (admin/user)
- See user creation date
- View individual user details

### 3. Mandates View
- View all agent mandates
- Filter by type (cart, intent, payment)
- Filter by status (active, pending, suspended, revoked)
- See associated users and agents

### 4. Purchase Intents
- View all purchase intents
- Filter by status (pending, approved, rejected, executed)
- See product details and pricing
- View user information

### 5. Transactions
- View all AP2 gateway transactions
- Filter by type and status
- See transaction amounts
- Track transaction history

## Setup Instructions

### 1. Run Migration
Add the `role` column to the users table:

```bash
cd apps/backend
$env:DATABASE_URL = "your-database-url"
npx tsx src/scripts/run-migration.ts 007_add_role_to_users.sql
```

### 2. Create Admin User
Create the admin user with the required credentials:

```bash
cd apps/backend
$env:DATABASE_URL = "your-database-url"
pnpm create:admin-user
```

### 3. Start Backend Server
```bash
cd apps/backend
pnpm dev
```

### 4. Access Admin Portal
Open your browser and navigate to:
```
http://localhost:3000/admin
```

## API Endpoints

All admin endpoints require authentication and admin role:

### Dashboard Stats
```
GET /api/admin/dashboard/stats
Authorization: Bearer <token>
```

### Get All Users
```
GET /api/admin/users?limit=50&offset=0&search=query
Authorization: Bearer <token>
```

### Get All Mandates
```
GET /api/admin/mandates?status=active&type=cart&limit=50&offset=0
Authorization: Bearer <token>
```

### Get All Intents
```
GET /api/admin/intents?status=pending&limit=50&offset=0
Authorization: Bearer <token>
```

### Get All Transactions
```
GET /api/admin/ap2/transactions?status=completed&limit=50&offset=0
Authorization: Bearer <token>
```

### Get User Details
```
GET /api/admin/users/:userId
Authorization: Bearer <token>
```

## Security

### Role-Based Access Control
- All admin routes require authentication via JWT token
- Additional `requireAdmin` middleware checks user role
- Only users with `role = 'admin'` can access admin endpoints

### Admin Middleware
The `requireAdmin` middleware:
1. Verifies user is authenticated
2. Checks user exists in database
3. Validates user has `admin` role
4. Returns 403 Forbidden if not admin

## File Structure

```
apps/backend/
├── src/
│   ├── controllers/
│   │   └── admin.controller.ts      # Admin API controllers
│   ├── middleware/
│   │   └── admin.middleware.ts      # Admin role check middleware
│   ├── routes/
│   │   └── admin.routes.ts          # Admin API routes
│   └── scripts/
│       ├── create-admin-user.ts    # Create admin user script
│       └── run-migration.ts         # Run migration script
├── migrations/
│   └── 007_add_role_to_users.sql   # Add role column migration
└── public/
    └── admin/
        └── index.html              # Admin portal frontend
```

## Troubleshooting

### Cannot Access Admin Portal
1. **Check if backend is running**: Ensure the server is running on port 3000
2. **Verify admin user exists**: Run `pnpm list:users` to see all users
3. **Check role**: Ensure your user has `role = 'admin'` in the database
4. **Verify token**: Check browser console for authentication errors

### Admin Routes Return 403
- Ensure you're logged in with an admin account
- Check that the user's role is set to `'admin'` in the database
- Verify the JWT token is valid and not expired

### Migration Fails
- If column already exists, the migration will show a warning but continue
- Check database connection string is correct
- Ensure you have proper database permissions

## Creating Additional Admin Users

To create additional admin users:

1. **Via Script** (recommended):
```bash
cd apps/backend
# Edit create-admin-user.ts to change email/password
pnpm create:admin-user
```

2. **Via Database**:
```sql
-- Hash password first (use bcrypt with 10 rounds)
-- Then insert:
INSERT INTO users (email, password_hash, first_name, last_name, role)
VALUES ('newadmin@example.com', '<hashed_password>', 'Admin', 'User', 'admin');
```

3. **Via API** (after initial admin is created):
- Register user normally
- Update role in database to 'admin'

## Next Steps

1. **Customize Admin Portal**: Edit `apps/backend/public/admin/index.html` to add more features
2. **Add More Admin Functions**: Extend `AdminController` with additional endpoints
3. **Add User Management**: Add endpoints to update user roles, suspend users, etc.
4. **Add Export Features**: Add CSV/JSON export for users, mandates, transactions
5. **Add Analytics**: Add charts and graphs for better data visualization

---

**Note**: In production, ensure:
- Strong admin passwords
- HTTPS for admin portal access
- Rate limiting on admin endpoints
- Audit logging for admin actions
- Two-factor authentication (2FA) for admin accounts
