# Let's Encrypt Gen-Y trust anchors (Android)

Used by `plugins/withLetsEncryptGenYTrust.js`:
- copied to `res/raw/*.crt`
- loaded by `GenYTrustOkHttp` into OkHttp TrustManager

Sources: https://letsencrypt.org/certs/gen-y/

```bash
curl -fsSL -o isrg_root_ye.pem https://letsencrypt.org/certs/gen-y/root-ye.pem
curl -fsSL -o isrg_root_yr.pem https://letsencrypt.org/certs/gen-y/root-yr.pem
cp isrg_root_ye.pem isrg_root_ye.crt
cp isrg_root_yr.pem isrg_root_yr.crt
```

Commit the `.crt` files — `android/` is gitignored; prebuild copies from here.
