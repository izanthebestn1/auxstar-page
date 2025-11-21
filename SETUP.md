# Setup Instructions

## First Time Setup

### 1. Initialize Default Admin User

If you don't have any users in your database, you need to create the initial admin account.

**Option A: Using the API endpoint**
```bash
curl -X POST https://your-domain.vercel.app/api/init-admin
```

This will create a default admin account:
- Username: `admin`
- Password: `admin123`

**⚠️ IMPORTANT: Change this password immediately after first login!**

### 2. Alternative: Use Environment Variables

Add this to your Vercel environment variables:

```json
AUTH_USERS_JSON=[{"username":"admin","password":"yourSecurePassword","role":"admin"}]
```

The system will automatically hash the password and create the user on first run.

### 3. Login

1. Go to `/admin/login.html`
2. Login with your credentials
3. Go to Users section to create additional users or change your password

## Database Configuration

Make sure you have set one of these environment variables in Vercel:
- `DATABASE_URL`
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`

## Troubleshooting

### Login not working?

1. Check Vercel logs for errors
2. Verify `bcryptjs` is in `package.json` dependencies
3. Ensure database connection is working
4. Try initializing default admin user via `/api/init-admin`

### No users in database?

Run the init-admin endpoint or set up AUTH_USERS_JSON environment variable.
