# Production Deployment Checklist

Before deploying to production, verify all items below:

## Security

- [ ] **Environment Variables**
  - [ ] `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set in Vercel project settings
  - [ ] `ANTHROPIC_API_KEY` is set and restricted to your domain
  - [ ] No secrets are hardcoded in repository
  - [ ] `.env` file is in `.gitignore`
  - [ ] All API keys are rotated (last checked: __________)

- [ ] **CORS Configuration**
  - [ ] `ALLOWED_ORIGINS` only includes your production domain
  - [ ] No wildcard (`*`) in CORS origins
  - [ ] Test cross-origin requests from production domain

- [ ] **Authentication**
  - [ ] JWT tokens have expiration set
  - [ ] Password requirements are enforced (8+ chars, uppercase, digit)
  - [ ] Email verification is enabled
  - [ ] Password reset flow works
  - [ ] Logout clears all sessions

- [ ] **HTTPS & SSL**
  - [ ] All traffic is HTTPS (enforced)
  - [ ] SSL certificate is valid and not self-signed
  - [ ] Security headers are set (X-Frame-Options, X-Content-Type-Options, CSP)
  - [ ] HTTP strict transport security (HSTS) is enabled

- [ ] **API Security**
  - [ ] Rate limiting is enabled (100 req/min per IP)
  - [ ] API keys are never exposed client-side
  - [ ] Input validation on all endpoints
  - [ ] SQL injection protection confirmed
  - [ ] CSRF tokens used for state-changing requests

## Performance

- [ ] **Asset Optimization**
  - [ ] CSS/JS files are minified
  - [ ] Images are optimized and lazy-loaded
  - [ ] Bundle size is under 500KB (gzipped)
  - [ ] No unused dependencies
  - [ ] Caching headers are set appropriately

- [ ] **Database**
  - [ ] Database indexes are created for frequently queried columns
  - [ ] Query performance is acceptable (<100ms)
  - [ ] Connection pooling is enabled
  - [ ] Backup strategy is verified
  - [ ] Automatic backups run daily

- [ ] **CDN & Caching**
  - [ ] Static assets use Vercel CDN
  - [ ] Cache headers set for: JS (1 year), CSS (1 year), HTML (no cache)
  - [ ] Browser caching is configured
  - [ ] Cache invalidation strategy documented

- [ ] **Third-Party Services**
  - [ ] Supabase project is on paid tier (if needed)
  - [ ] Anthropic API quota is sufficient
  - [ ] Rate limits are set appropriately

## Monitoring & Logging

- [ ] **Error Tracking**
  - [ ] Sentry is configured and initialized
  - [ ] Unhandled errors are captured
  - [ ] Error notifications are enabled
  - [ ] Sentry issues dashboard is monitored

- [ ] **Analytics**
  - [ ] Vercel Analytics or Plausible is enabled
  - [ ] Key events are tracked (login, feature usage, errors)
  - [ ] Dashboards are configured
  - [ ] Alerts for unusual activity are set up

- [ ] **Logging**
  - [ ] Logs are centralized (e.g., in Sentry, LogRocket, or CloudWatch)
  - [ ] Log levels are set to INFO or higher in production
  - [ ] Sensitive data is not logged (passwords, tokens)
  - [ ] Log retention policy is set

- [ ] **Uptime Monitoring**
  - [ ] UptimeRobot or similar is configured
  - [ ] Health check endpoint (`/health`) responds correctly
  - [ ] Alerts are sent on downtime
  - [ ] Incident response plan is documented

- [ ] **Performance Monitoring**
  - [ ] Page load times are tracked
  - [ ] API response times are within SLA (e.g., <200ms)
  - [ ] Alerts for slow requests are configured
  - [ ] Performance dashboard is reviewed regularly

## Data Protection

- [ ] **Backup & Recovery**
  - [ ] Database backups run at least daily
  - [ ] Backup restoration has been tested
  - [ ] Backup retention is at least 30 days
  - [ ] Disaster recovery plan is documented

- [ ] **Privacy**
  - [ ] Privacy policy is published and up-to-date
  - [ ] User data export feature works
  - [ ] Data deletion (GDPR) feature works
  - [ ] Consent forms are displayed

- [ ] **Compliance**
  - [ ] GDPR requirements are met (if serving EU users)
  - [ ] Terms of Service are published
  - [ ] Cookie consent banner is shown
  - [ ] Data processing agreements are signed (with third parties)

## Testing

- [ ] **Functional Testing**
  - [ ] Critical user flows tested (login → course → complete)
  - [ ] All major features work on production
  - [ ] Cross-browser testing done (Chrome, Firefox, Safari, Edge)
  - [ ] Mobile responsiveness verified
  - [ ] Accessibility tested (keyboard navigation, screen readers)

- [ ] **Load Testing**
  - [ ] Load test with expected peak traffic (users simultaneously)
  - [ ] Database handles concurrent queries
  - [ ] API response times acceptable under load
  - [ ] Scaling strategy documented

- [ ] **Security Testing**
  - [ ] SQL injection attempts blocked
  - [ ] XSS attempts blocked
  - [ ] CSRF protection works
  - [ ] Rate limiting works
  - [ ] Admin endpoints require authentication

- [ ] **Smoke Tests**
  - [ ] Homepage loads
  - [ ] Login/signup works
  - [ ] AI features respond
  - [ ] Database queries succeed
  - [ ] Notifications send correctly

## Documentation

- [ ] **Runbooks**
  - [ ] Incident response procedures documented
  - [ ] Deployment rollback procedure documented
  - [ ] On-call rotation schedule
  - [ ] Key contact information documented

- [ ] **Code Documentation**
  - [ ] README is up-to-date
  - [ ] API documentation is complete
  - [ ] Database schema is documented
  - [ ] Critical business logic has comments

- [ ] **Operational Documentation**
  - [ ] Environment setup guide documented
  - [ ] How to add/manage users documented
  - [ ] How to respond to common issues documented
  - [ ] Release notes template exists

## Post-Deployment

- [ ] **Verification**
  - [ ] All features working on production
  - [ ] Performance is acceptable
  - [ ] No errors in Sentry
  - [ ] Analytics showing correct data
  - [ ] Team notified of successful deployment

- [ ] **Monitoring**
  - [ ] Health checks passing
  - [ ] Error rate is normal
  - [ ] No unusual database queries
  - [ ] API latency is acceptable
  - [ ] No spike in failed logins

- [ ] **Follow-up**
  - [ ] Customer support notified of changes
  - [ ] Status page updated if applicable
  - [ ] Post-deployment review scheduled
  - [ ] Issues tracked and prioritized

---

## Quick Deployment Command

```bash
# Verify health check locally
curl http://localhost:8000/health

# Build and test
npm run build
npm run test

# Deploy to Vercel (automatic on git push to main)
git add .
git commit -m "Production deployment"
git push origin main

# Verify production
curl https://your-domain.com/health

# Check monitoring
# - Open Sentry dashboard
# - Open Analytics dashboard
# - Review UptimeRobot status
```

## Emergency Contacts

- **On-Call Engineer**: ________________
- **Engineering Lead**: ________________
- **DevOps Contact**: ________________
- **Incident Channel**: ________________

## Last Deployment

- **Date**: ________________
- **Version**: ________________
- **Deployed by**: ________________
- **Status**: ✅ Success / ❌ Rollback
- **Notes**: ________________________________
