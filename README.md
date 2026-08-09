# Señal Segura

App web instalable (PWA) para detectar **indicios** de grooming en chats y capturas, con educación y guía de ayuda.

**Dominio:** https://senal-segura.com.ar/

## Cómo funciona

1. Instalála en el teléfono (pantalla de inicio).
2. Pegá un chat, subí/sacá una captura (OCR en el dispositivo) o compartí texto hacia la app (Android).
3. Ves un nivel de riesgo, señales detectadas y pasos sugeridos.

No monitorea WhatsApp u otras apps en segundo plano: el usuario elige qué contenido revisar.

## Publicación (igual que Plan AURA)

Repositorio GitHub Pages independiente + dominio `.com.ar`.

1. Repo público `senal-segura` en GitHub.
2. El sitio publicado sale de la rama `gh-pages` (`npm run deploy`).
3. Settings → Pages → Branch `gh-pages` / root.
4. Settings → Pages → Custom domain: `senal-segura.com.ar` (HTTPS).

```bash
npm run deploy
```

## DNS en NIC.ar (después del registro)

En el panel del dominio `senal-segura.com.ar` → **Delegación / DNS**:

### Opción recomendada (dominio raíz)

Registros **A** para `@` / `senal-segura.com.ar`:

| Tipo | Nombre | Valor |
|------|--------|--------|
| A | @ (o senal-segura.com.ar) | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |

Y **CNAME** para `www`:

| Tipo | Nombre | Valor |
|------|--------|--------|
| CNAME | www | claudiomlarrea.github.io |

Luego en GitHub Pages marcá “Enforce HTTPS”.

La propagación DNS puede demorar minutos u horas.

## Desarrollo local

```bash
npm install
npm run dev
```

```bash
npm run build && npm run preview
```
