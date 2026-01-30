# Woza Mali Collector App

A comprehensive recycling collection management dashboard for collectors, built with Next.js and Supabase.

## 🚀 Features

### ✅ **Real-time Data Management**
- **Live Pickup Tracking** - Real-time updates from Supabase database
- **Customer Management** - View and manage customer profiles and addresses
- **Material Tracking** - Track different recycling materials with rates and contamination levels
- **Photo Documentation** - Support for pickup photos (scale, bags, other)

### 📊 **Dashboard & Analytics**
- **Performance Metrics** - Total collections, weight, earnings, and points
- **Monthly Analytics** - Track monthly performance and trends
- **Environmental Impact** - CO2 saved, water saved, landfill diverted
- **Financial Summary** - Earnings tracking and payment status

### 🔐 **Authentication & Security**
- **Supabase Auth** - Secure user authentication and session management
- **Role-based Access** - Collector-specific permissions and features
- **Secure API** - Protected endpoints with proper authorization

### 📱 **User Experience**
- **Responsive Design** - Works on desktop and mobile devices
- **Dark/Light Theme** - Automatic theme switching based on system preference
- **Toast Notifications** - Real-time feedback for user actions
- **Loading States** - Smooth user experience with proper loading indicators

## 🛠️ Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI Components**: Radix UI, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **State Management**: React Context + Hooks
- **Notifications**: Sonner Toast
- **Icons**: Lucide React

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase project with the Woza Mali schema
- Environment variables configured

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Database Setup
Run the SQL scripts in your Supabase SQL editor (in order):

1. **Install Base Schema**
   - `schemas/00-install-all.sql` - Install the complete schema

2. **Setup Address Fields (REQUIRED for Collector App)**
   - `schemas/ensure_address_fields_in_users.sql` - **REQUIRED** 
     - Ensures address fields (`street_addr`, `suburb`, `city`, `postal_code`) exist in users table
     - Sets up RLS policies allowing collectors to read user addresses for pickup scheduling
     - Creates indexes for performance on address queries
     - Safe to run multiple times (idempotent)

3. **Create Test Accounts (Optional)**
   - `create-test-collector.sql` - Create test collector accounts for development

> 📖 **For detailed database setup instructions, see [DATABASE_SETUP.md](./DATABASE_SETUP.md)**

### 4. Create Test User
1. Go to Supabase Dashboard > Authentication > Users
2. Create a new user with email: `collector@wozamali.com`
3. Set a password (e.g., `collector123`)
4. The profile will automatically link to the auth user

### 5. Start Development Server
```bash
npm run dev
```

The app will be available at `http://localhost:8082`

## 🗄️ Database Schema

The app uses the following key tables:
- **profiles** - User profiles (collectors, customers, admins)
- **addresses** - Customer pickup addresses
- **materials** - Recycling materials with rates
- **pickups** - Collection records
- **pickup_items** - Individual material items in pickups
- **pickup_photos** - Photo documentation
- **payments** - Payment tracking

## 🔧 Configuration

### Supabase Setup
1. Create a new Supabase project
2. Run the schema installation scripts
3. Configure Row Level Security (RLS) policies
4. Set up authentication providers

### Environment Variables
```env
# Required
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional
NEXT_PUBLIC_APP_URL=http://localhost:8082
```

## 📱 Usage

### Collector Dashboard
1. **Login** with collector credentials
2. **Overview Tab** - View performance metrics and quick actions
3. **Pickups Tab** - Manage all collection records
4. **Customers Tab** - View customer directory
5. **Analytics Tab** - Detailed performance insights

### Creating Pickups
1. Click "New Pickup" button
2. Select customer and pickup address
3. Add materials with weights and contamination levels
4. Submit for approval

### Photo Documentation
- Take photos during pickup
- Categorize by type (scale, bags, other)
- Include GPS coordinates if available

## 🔒 Security Features

- **Row Level Security** - Users can only access their own data
- **Authentication Required** - All routes protected
- **Role-based Access** - Collector-specific permissions
- **Secure API Calls** - All database operations through Supabase

## 🧪 Testing

### Test Accounts
- **Collector**: `collector@wozamali.com` / `collector123`
- **Customer**: `customer@wozamali.com` (for testing)

### Manual Testing
1. Login with test collector account
2. Create a new pickup
3. View dashboard metrics
4. Test customer management
5. Verify analytics calculations

## 🚀 Deployment

### Build for Production
```bash
npm run build
npm start
```

### Environment Variables
Ensure all environment variables are set in your production environment.

### Supabase Production
- Use production Supabase project
- Configure proper RLS policies
- Set up authentication providers
- Monitor performance and usage

## 📈 Performance

- **Optimized Queries** - Efficient database queries with proper indexing
- **Real-time Updates** - Live data synchronization
- **Lazy Loading** - Components load only when needed
- **Caching** - Supabase client-side caching

## 🐛 Troubleshooting

### Common Issues
1. **Authentication Errors** - Check Supabase credentials and RLS policies
2. **Database Connection** - Verify Supabase URL and keys
3. **Missing Data** - Ensure schema is properly installed
4. **Build Errors** - Check TypeScript types and dependencies

### Debug Mode
Enable debug logging in the browser console for detailed error information.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is part of the Woza Mali recycling platform.

## 🆘 Support

For support and questions:
- Check the documentation
- Review Supabase logs
- Contact the development team

---

**Built with ❤️ for sustainable recycling**
