# Cloudflare Setup Guide

## 1. Add Domain to Cloudflare

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click "Add a Site"
3. Enter your domain: `haominhnguyen.shop`
4. Choose a plan (Free plan is sufficient)

## 2. Update DNS Records

1. Go to DNS tab in Cloudflare
2. Add/Update these records:

```
Type: A
Name: @
Content: 51.120.247.250
Proxy: ✅ (Orange cloud)

Type: A  
Name: www
Content: 51.120.247.250
Proxy: ✅ (Orange cloud)
```

## 3. SSL/TLS Configuration

1. Go to SSL/TLS tab
2. Set encryption mode to "Full (strict)"
3. Enable "Always Use HTTPS"
4. Enable "HTTP Strict Transport Security (HSTS)"

## 4. Page Rules (Optional)

1. Go to Page Rules tab
2. Add rule: `haominhnguyen.shop/*`
3. Settings:
   - Always Use HTTPS: ON
   - Cache Level: Standard

## 5. Test HTTPS

After setup, test these URLs:
- https://haominhnguyen.shop/health
- https://haominhnguyen.shop/webhook
- https://haominhnguyen.shop/api/

## 6. Verify Setup

```bash
# Test HTTP (should work)
curl http://haominhnguyen.shop/health

# Test HTTPS (should work via Cloudflare)
curl https://haominhnguyen.shop/health
```

## Notes

- Your server only needs to run on HTTP (port 80)
- Cloudflare handles HTTPS termination
- No SSL certificates needed on server
- Cloudflare provides free SSL certificates
