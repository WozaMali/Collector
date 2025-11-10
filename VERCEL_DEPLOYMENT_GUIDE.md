# 🚀 Woza Mali Collector App - Vercel Deployment Guide

This guide will help you deploy the Woza Mali Collector App to Vercel.

## 📋 Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **Supabase Project**: Your Supabase project should be set up and running
4. **Environment Variables**: You'll need your Supabase credentials

## 🔧 Pre-Deployment Setup

### 1. Environment Variables Required

You'll need these environment variables in Vercel:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_MAIN_URL=https://your-main-app.vercel.app
NEXT_PUBLIC_OFFICE_URL=https://your-office-app.vercel.app
NEXT_PUBLIC_COLLECTOR_URL=https://your-collector-app.vercel.app
NEXT_PUBLIC_SUPABASE_REDIRECT_URL=https://your-collector-app.vercel.app
```

### 2. Update Supabase Settings

In your Supabase dashboard:
1. Go to **Authentication** → **URL Configuration**
2. Add your Vercel URLs to:
   - **Site URL**: `https://your-collector-app.vercel.app`
   - **Redirect URLs**: 
     - `https://your-collector-app.vercel.app/auth/callback`
     - `https://your-collector-app.vercel.app/login`
     - `https://your-collector-app.vercel.app/dashboard`

## 🚀 Deployment Steps

### Method 1: Vercel CLI (Recommended)

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Navigate to Collector App**:
   ```bash
   cd WozaMaliCollector
   ```

3. **Login to Vercel**:
   ```bash
   vercel login
   ```

4. **Deploy**:
   ```bash
   vercel
   ```

5. **Follow the prompts**:
   - Set up and deploy? **Yes**
   - Which scope? **Your account**
   - Link to existing project? **No** (for first deployment)
   - Project name: **woza-mali-collector** (or your preferred name)
   - Directory: **./** (current directory)
   - Override settings? **No**

6. **Set Environment Variables**:
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   vercel env add NEXT_PUBLIC_MAIN_URL
   vercel env add NEXT_PUBLIC_OFFICE_URL
   vercel env add NEXT_PUBLIC_COLLECTOR_URL
   vercel env add NEXT_PUBLIC_SUPABASE_REDIRECT_URL
   ```

7. **Redeploy with environment variables**:
   ```bash
   vercel --prod
   ```

### Method 2: Vercel Dashboard

1. **Go to Vercel Dashboard**: [vercel.com/dashboard](https://vercel.com/dashboard)

2. **Import Project**:
   - Click "New Project"
   - Import from GitHub
   - Select your repository
   - Choose the `WozaMaliCollector` folder as root directory

3. **Configure Project**:
   - Framework Preset: **Next.js**
   - Root Directory: **WozaMaliCollector**
   - Build Command: `npm run build`
   - Output Directory: `.next`

4. **Set Environment Variables**:
   - Go to Project Settings → Environment Variables
   - Add all required variables (see list above)

5. **Deploy**:
   - Click "Deploy"
   - Wait for deployment to complete

## 🔧 Post-Deployment Configuration

### 1. Update App URLs

After deployment, update your other apps with the new Collector URL:

**Main App** (`src/lib/appUrls.ts`):
```typescript
export const APP_URLS = {
  MAIN: process.env.NEXT_PUBLIC_MAIN_URL || 'http://localhost:3000',
  OFFICE: process.env.NEXT_PUBLIC_OFFICE_URL || 'http://localhost:3001',
  COLLECTOR: process.env.NEXT_PUBLIC_COLLECTOR_URL || 'https://your-collector-app.vercel.app', // Update this
}
```

**Office App** (similar update):
```typescript
COLLECTOR: 'https://your-collector-app.vercel.app'
```

### 2. Test the Deployment

1. **Visit your deployed app**: `https://your-collector-app.vercel.app`
2. **Test authentication**: Try logging in with a collector account
3. **Test functionality**: Verify all features work correctly
4. **Test cross-app navigation**: Ensure links to other apps work

### 3. Set up Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your custom domain (e.g., `collector.wozamali.com`)
3. Configure DNS records as instructed
4. Update environment variables with new domain

## 🐛 Troubleshooting

### Common Issues

**1. Build Failures**
- Check that all dependencies are in `package.json`
- Ensure TypeScript errors are resolved
- Check build logs in Vercel dashboard

**2. Environment Variable Issues**
- Verify all required variables are set
- Check variable names match exactly
- Ensure no extra spaces or quotes

**3. Authentication Issues**
- Verify Supabase URLs are correct
- Check redirect URLs in Supabase dashboard
- Ensure CORS settings allow your domain

**4. Database Connection Issues**
- Verify Supabase project is active
- Check RLS policies are correct
- Ensure service role key is not used in client

### Debug Commands

```bash
# Check build locally
npm run build

# Test production build locally
npm run build && npm run start

# Check environment variables
vercel env ls

# View deployment logs
vercel logs
```

## 📊 Monitoring

### Vercel Analytics
- Enable Vercel Analytics in project settings
- Monitor performance and usage
- Set up alerts for errors

### Supabase Monitoring
- Check Supabase dashboard for database performance
- Monitor authentication logs
- Set up database backups

## 🔄 Continuous Deployment

### Automatic Deployments
- Push to `main` branch triggers production deployment
- Push to other branches creates preview deployments
- Use Vercel's GitHub integration for seamless deployments

### Manual Deployments
```bash
# Deploy to production
vercel --prod

# Deploy preview
vercel

# Deploy specific branch
vercel --target production
```

## 🎯 Next Steps

1. **Deploy other apps**: Deploy Main App and Office App to Vercel
2. **Set up monitoring**: Configure error tracking and analytics
3. **Configure CI/CD**: Set up automated testing and deployment
4. **Set up staging**: Create staging environment for testing
5. **Performance optimization**: Monitor and optimize app performance

## 📞 Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check Supabase logs
3. Review this guide for common solutions
4. Contact support if needed

---

**🎉 Congratulations!** Your Woza Mali Collector App is now deployed to Vercel and ready for production use!
