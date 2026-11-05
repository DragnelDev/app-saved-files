# Frontend — Archivo Municipal (Vue 3 + Tailwind)

Ver el [README principal](../README.md).

```bash
npm install
npm run dev        # desarrollo (proxy /api -> http://localhost:3000)
npm run build      # type-check + build de producción en dist/
```

Modo claro/oscuro con el botón del menú lateral (se recuerda en el navegador). Si el frontend se sirve
separado del backend, define `VITE_API_URL` (ver `.env.example`).
