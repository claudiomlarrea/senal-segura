# Señal Segura

App web instalable (PWA) para detectar **indicios** de grooming en chats y capturas, con educación y guía de ayuda.

**Sitio online:** https://señal-segura.com.ar/  
**Mientras propaga DNS:** https://claudiomlarrea.github.io/senal-segura/

## Publicación

1. Repo público `senal-segura` en GitHub.
2. `npm run deploy` → rama `gh-pages`.
3. Settings → Pages → Custom domain: `señal-segura.com.ar` + Enforce HTTPS.

## DNS en Cloudflare (señal-segura.com.ar)

| Tipo | Nombre | Valor | Proxy |
|------|--------|--------|--------|
| A | `@` | `185.199.108.153` | Proxied (naranja) o DNS only |
| A | `@` | `185.199.109.153` | igual |
| A | `@` | `185.199.110.153` | igual |
| A | `@` | `185.199.111.153` | igual |
| CNAME | `www` | `claudiomlarrea.github.io` | Proxied o DNS only |

Si el candado HTTPS falla, poné las nubes en **gris** (DNS only).


## Desarrollo local

```bash
npm install
npm run dev
```

```bash
npm run build && npm run preview
```
