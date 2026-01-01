# 🔐 SECURITY GUIDELINES

## ⚠️ CRITICAL: Environment Variables Security

### **NEVER COMMIT THESE FILES:**
```
.env.local
.env.production
.env.development.local
.env.test.local
.env
```

### **HOW TO SETUP ENVIRONMENT VARIABLES:**

1. **Copy the template:**
   ```bash
   cp .env.example .env.local
   ```

2. **Fill with your actual credentials**
   - Get credentials from respective service dashboards
   - NEVER share these values publicly
   - NEVER commit .env.local to Git

3. **Verify .env.local is ignored:**
   ```bash
   git status
   # Should NOT show .env.local
   ```

---

## 🚨 IF CREDENTIALS ARE LEAKED:

### **Immediate Actions Required:**

#### **1. SUPABASE:**
```
✅ Regenerate anon key: Settings → API → Regenerate anon key
✅ Regenerate service_role key: Settings → API → Regenerate service role key
✅ Reset database password: Settings → Database → Reset password
✅ Revoke access token: Account → Access Tokens → Revoke old token
✅ Generate new access token: Account → Access Tokens → Create new
```

#### **2. STRIPE:**
```
✅ Roll API keys: Developers → API keys → Roll keys
✅ Generate new webhook secret: Developers → Webhooks → Add endpoint
```

#### **3. GOOGLE OAUTH:**
```
✅ Delete old credentials: Google Cloud Console → Credentials → Delete
✅ Create new OAuth 2.0 Client ID
✅ Update redirect URIs
```

#### **4. WHATSAPP/FACEBOOK:**
```
✅ Regenerate access token: Meta Business → WhatsApp → Settings → API Setup
✅ Generate new verify token (custom string)
```

#### **5. OTHER SERVICES:**
```
✅ SendGrid: Settings → API Keys → Delete old → Create new
✅ OpenAI: API Keys → Revoke → Create new
✅ Mapbox: Account → Access tokens → Delete → Create new
✅ Eupago: Contact support to regenerate
```

---

## 🛡️ PREVENTION MEASURES:

### **1. Local Development:**
```bash
# ALWAYS use .env.local
# NEVER commit .env.local
# Use .env.example as template only
```

### **2. Production (Vercel/Netlify):**
```bash
# Set environment variables in dashboard
# Vercel: Settings → Environment Variables
# Netlify: Site settings → Build & deploy → Environment
```

### **3. Git Hooks (Optional):**

Install pre-commit hook to prevent accidental commits:

```bash
# Install git-secrets
brew install git-secrets  # Mac
# OR
sudo apt-get install git-secrets  # Linux

# Setup
git secrets --install
git secrets --register-aws
```

### **4. Repository Scanning:**

Use tools to scan for leaked secrets:
- **GitHub:** Enable secret scanning in repository settings
- **GitGuardian:** https://www.gitguardian.com
- **TruffleHog:** https://github.com/trufflesecurity/trufflehog

---

## 📋 SECURITY CHECKLIST:

```
□ .env.local is in .gitignore
□ .env.local is NOT in Git history
□ All credentials are in .env.local (not hardcoded)
□ .env.example exists (without real values)
□ Production env vars are in Vercel/Netlify dashboard
□ No API keys in source code
□ No passwords in comments
□ No tokens in README or docs
```

---

## 🔍 CHECK FOR LEAKED CREDENTIALS:

### **Scan Git History:**
```bash
# Search for potential secrets
git log -p | grep -i "password\|secret\|key\|token" | head -50
```

### **Check Current Files:**
```bash
# Search all files for patterns
grep -r "sk_.*" .  # Stripe secret keys
grep -r "Bearer.*" .  # Auth tokens
grep -r "password.*=" .  # Passwords
```

---

## 📞 INCIDENT RESPONSE:

If you discover leaked credentials:

1. **Immediately rotate all compromised credentials**
2. **Check access logs for unauthorized usage**
3. **Update all environments (dev, staging, prod)**
4. **Document the incident**
5. **Review and improve security practices**

---

## 🚀 SECURE DEPLOYMENT WORKFLOW:

```bash
# 1. Develop locally with .env.local
npm run dev

# 2. Commit code (without .env.local)
git add .
git commit -m "feat: new feature"
git push

# 3. Set env vars in production dashboard
# Vercel: vercel.com/dashboard
# Netlify: app.netlify.com

# 4. Deploy
# Auto-deploys on push (Vercel/Netlify)
```

---

## 📚 ADDITIONAL RESOURCES:

- [OWASP Secrets Management](https://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_password)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Netlify Environment Variables](https://docs.netlify.com/configure-builds/environment-variables/)

---

**Remember: Security is not optional. Always protect credentials!** 🔐