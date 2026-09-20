# 🚀 Deployment Guide - Block by Block

## Render Deployment

### Prerequisites
- ✅ GitHub account
- ✅ Render account (free tier available)
- ✅ Supabase credentials
- ✅ OpenRouter API key
- ✅ HSK testnet wallet

---

## Step 1: Connect Repository to Render

1. Go to [render.com](https://render.com)
2. Sign in with GitHub
3. Click **New** → **Web Service**
4. Connect your GitHub repo: `mauc-agentic/block-by-block`
5. Select `main` branch

---

## Step 2: Configure Service

### Basic Settings:
- **Name:** `block-by-block-backend`
- **Root Directory:** `backend`
- **Runtime:** `Docker`
- **Plan:** `Starter` ($7/month)

### Build Settings:
- **Docker:** Automatically detected from `Dockerfile`
- **Port:** `8000`

---

## Step 3: Add Environment Secrets

Go to **Environment** in Render dashboard and add each secret:

### Database
```
SUPABASE_DB_URL = postgresql://postgres.yrsvgcnrtfggcoksginp:[PASSWORD]@aws-0-ca-central-1.pooler.supabase.com:5432/postgres
```

### Backend Security
```
SECRET_KEY = <generar-con-secrets.token_urlsafe(32)>
```

### AI Verification (OpenRouter)
```
OPENROUTER_API_KEY = sk-or-v1-[YOUR_KEY_HERE]
OPENROUTER_URL = https://openrouter.ai/api/v1/chat/completions
```

### Blockchain (HSK Testnet)
```
HSK_RPC_URL = https://testnet.hsk.xyz
HSK_CHAIN_ID = 133
AGENT_ADDRESS = 0x94C5E2065F555e01364ad83879D3ADDD298E706f
AGENT_PRIVATE_KEY = 0x[YOUR_PRIVATE_KEY_HEX]
CAUSE_VAULT_ADDRESS = 0x591723edf457032ad341366f4654a973fbd0daa9
```

### CORS
```
ALLOWED_ORIGINS = https://block-by-block-backend.onrender.com,http://localhost:3000
```

---

## Step 4: Deploy

1. Click **Create Web Service**
2. Render will automatically:
   - Build Docker image
   - Install dependencies from `requirements.txt`
   - Start the application
3. Wait ~5-10 minutes for deployment to complete

Check logs in Render dashboard if there are issues.

---

## Step 5: Verify Deployment

```bash
# Check health
curl https://block-by-block-backend.onrender.com/docs

# Should return Swagger API documentation
```

Your backend is now live at:
```
https://block-by-block-backend.onrender.com
```

---

## Health Checks

Render automatically monitors:
- **Endpoint:** `/docs` (Swagger)
- **Interval:** 30 seconds
- **Timeout:** 10 seconds
- **Retries:** 3

If health checks fail, check backend logs for errors.

---

## Troubleshooting

### Build fails with "Read-only file system"
- ✅ **Fixed:** Using `psycopg2-binary` instead of source build
- ✅ **Fixed:** Multi-stage Docker build to minimize dependencies

### 502 Bad Gateway
1. Check Render logs: **Logs** tab
2. Verify `SUPABASE_DB_URL` is correct
3. Check all required environment variables are set
4. Increase health check `start-period` if needed

### Database connection timeout
1. Verify Supabase pooler URL: `aws-0-ca-central-1.pooler.supabase.com`
2. Check password doesn't contain special chars that need URL encoding
3. Try connecting locally first: `psql $SUPABASE_DB_URL`

### Cold starts
- Render free tier sleeps after 15 min of inactivity
- Upgrade to Starter ($7/mo) for continuous uptime
- First request after sleep will be slow (~30s)

---

## Environment Variables Reference

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `SUPABASE_DB_URL` | ✅ | `postgresql://...` | PostgreSQL connection string |
| `SECRET_KEY` | ✅ | `Uqs8TAj...` | JWT signing key |
| `OPENROUTER_API_KEY` | ✅ | `sk-or-v1-...` | AI model API key |
| `HSK_RPC_URL` | ✅ | `https://testnet.hsk.xyz` | Blockchain RPC endpoint |
| `HSK_CHAIN_ID` | ✅ | `133` | HSK testnet chain ID |
| `AGENT_ADDRESS` | ✅ | `0x94C5E2065...` | Agent wallet address |
| `AGENT_PRIVATE_KEY` | ✅ | `0x<64-hex>` | Agent private key (hex) |
| `CAUSE_VAULT_ADDRESS` | ✅ | `0x591723ed...` | Smart contract address |
| `ALLOWED_ORIGINS` | ✅ | `https://...` | CORS allowed domains |
| `ALGORITHM` | ⚠️ | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_HOURS` | ⚠️ | `24` | Token expiration (hours) |

---

## Monitoring

### Logs
- View in Render dashboard: **Logs** tab
- Real-time streaming of application output

### Metrics
- **CPU Usage:** Starter tier: 0.5 CPU
- **Memory:** Starter tier: 512 MB
- **Bandwidth:** Unlimited

### Performance
- Monitor in Render dashboard
- Alert on high error rates or slow response times

---

## Updating Deployment

After pushing to `main`:

**Option 1: Automatic (recommended)**
- Render automatically redeploys on git push
- Check logs during deployment
- Takes ~5-10 minutes

**Option 2: Manual**
1. Go to Render dashboard
2. Click **Manual Deploy**
3. Select `main` branch
4. Click **Deploy**

---

## Scaling (When Needed)

| Plan | Price | CPU | Memory | Use Case |
|------|-------|-----|--------|----------|
| Free | $0 | Shared | Shared | Development only (sleeps after 15min) |
| Starter | $7/mo | 0.5 | 512 MB | MVP, low traffic |
| Standard | $12/mo | 1 | 1 GB | Production, moderate traffic |
| Premium | $29/mo | 2 | 4 GB | High traffic, scaling |

Upgrade anytime from Render dashboard.

---

## Production Checklist

- [ ] All secrets added to Render environment
- [ ] Health checks passing (green icon)
- [ ] Database connection verified
- [ ] AI API key tested
- [ ] Blockchain RPC responding
- [ ] CORS configured for frontend domain
- [ ] SSL certificate active (automatic)
- [ ] Monitoring enabled
- [ ] Error logging configured
- [ ] Database backups enabled

---

## Support

- **Render Docs:** https://render.com/docs
- **API Status:** https://status.render.com
- **Chat Support:** Available in Render dashboard

---

**✅ Backend deployed and ready for frontend integration!** 🎉

---

## Notas operativas (actualizado 2026-09-20)

### Supabase: Network Restrictions
Si están activadas, la lista debe incluir las IP de salida de Render (`74.220.48.0/24`, `74.220.56.0/24`) y la IP de cada
desarrollador (un desarrollo local sin su IP falla con `address not in tenant allow_list`).

### Render: comprobar que el servicio corre el último commit
- `GET /api/v1/openapi.json` debe listar `/causes/{id}/publish`, `/causes/{id}/donations/confirm` y `/users/me/dashboard`; si no, el
  servicio corre código anterior: *Manual Deploy → Deploy latest commit* (rama `main`).
- Variables que deben existir: `PYTHON_VERSION=3.12.4`, `OPENROUTER_URL=https://openrouter.ai/api/v1/chat/completions`
  y `ALLOWED_ORIGINS` con la URL del frontend en Vercel.
- El *Start Command* del panel debe ser `uvicorn app.main:app --host 0.0.0.0 --port $PORT` (un servicio creado a mano no
  lee `render.yaml`). La tabla `evidences` se crea sola al arrancar.

### Frontend en Vercel
Root Directory `frontend`, Build Command `npm run build` (sin punto final), variable `NEXT_PUBLIC_API_URL` con la URL del
backend. Nada secreto en variables `NEXT_PUBLIC_*`.

### Entorno de desarrollo en macOS
Con iCloud Drive sincronizando el Escritorio aparecen copias de archivos con sufijo ` 2`, ` 3` que pueden pisar código
(`chain 2.py`, `test_agent 2.py`). Mantén el repositorio fuera de carpetas sincronizadas (por ejemplo `~/dev`).
