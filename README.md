# PuzzleScroll

Expo React Native prototype for a scroll-first cognitive training app.

## Run on a phone

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start Expo for a physical device on the same Wi-Fi:

   ```bash
   npm run start:phone
   ```

3. Open the QR code with Expo Go on iOS or Android.

If LAN discovery does not work, use:

```bash
npm run start:tunnel
```

## Run on web

```bash
npm run web
```

## Deploy to Vercel

Vercel should use:

```bash
npm run build
```

The static export is written to `dist/`.

## Checks

```bash
npm run typecheck
npm run build
```
