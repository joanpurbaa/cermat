# Cermat — AI CCTV Route Safety

Cermat adalah platform AI-powered route safety yang membantu pengguna memilih rute perjalanan
berdasarkan kondisi keamanan jalan secara real-time — bukan hanya jarak dan waktu tempuh.

- **Deteksi anomali jalan** (kemacetan, pohon tumbang, konstruksi, kecelakaan) dari CCTV kota
  Semarang menggunakan YOLO11 di backend *Semarang Vision AI*.
- **3 rekomendasi rute** dengan label Teraman / Tercepat / Seimbang, dihitung dari skor anomali
  yang dikembalikan backend.
- **Peta interaktif** (Leaflet + OpenStreetMap) dengan polyline rute, posisi GPS, dan marker
  anomali lengkap dengan popup bukti visual.
- **Live CCTV** (HLS.js) untuk memverifikasi kondisi jalan di titik yang sama.

## Stack

| Bagian      | Teknologi                                     |
| ----------- | -------------------------------------------- |
| Frontend    | React 19 + Vite + TypeScript                 |
| Styling     | Tailwind CSS 4                               |
| Map         | Leaflet + React Leaflet + OpenStreetMap tiles |
| Video       | HLS.js                                       |
| AI / Backend | FastAPI + YOLO11 (Semarang Vision AI)        |

## Menjalankan

```bash
npm install
npm run dev      # http://localhost:5173
npm run lint
npm run build
```

## Integrasi API — Semarang Vision AI v0.1.0

Base URL dikonfigurasi lewat environment variable (lihat `.env`):

```
VITE_VISION_AI_URL=https://semarangvision.chevalierlabsas.org
```

Seluruh client API ada di `src/lib/visionApi.ts`.

### `GET /api/health`

Dipakai untuk status badge "Semarang Vision AI online/offline" di halaman navigasi.
Respons: `{ success, message, data: { message } }`.

### `POST /api/routes`

Request:

```json
{
  "origin": { "lat": -6.9826, "lng": 110.4091 },
  "destination": { "lat": -6.9801, "lng": 110.4078 }
}
```

Respons `200` berisi `data` dengan `origin`, `destination`, `threshold_m`,
`recommended_route_index`, dan `routes[]` (tiap rute: `index`, `length_in_meters`,
`travel_time_in_seconds`, `traffic_delay_in_seconds`, `points` `[lat, lng]`, `guidance[]`,
`anomalies[]`, `score`, `recommended`).

Anomali memuat `name` (kamera), `latitude`, `longitude`, `anomaly_type`, `label`, `confidence`,
`count`, dan `stream_url` (HLS `.m3u8`) yang langsung dipakai untuk memutar CCTV.

### Error handling

Semua error mengikuti envelope `{ success: false, message, data: null }` dan dipetakan ke
pesan ramah berbahasa Indonesia:

| HTTP | `code`         | Arti                                |
| ---- | -------------- | ----------------------------------- |
| 401  | `unauthorized` | `TOM_API_KEY` belum diset di server |
| 422  | `validation`   | Body/coordinat tidak valid         |
| 502  | `upstream`     | TomTom Routing API tidak bisa dihubungi |
| 5xx  | `server`       | Gangguan server                    |
| —    | `network`      | Tidak ada koneksi ke backend       |
| —    | `timeout`      | Perhitungan rute melewati batas 60 detik |

`VisionApiError` menyimpan `status`, `code`, dan `serverMessage` (pesan asli server ditampilkan
sebagai detail kecil di UI), plus tombol **Coba lagi**.

### Layer view model

`visionApi.ts` memisahkan tipe wire (mencerminkan OpenAPI) dari view model yang dipakai UI:
`summary` (jalan utama), `anomaly_count`, `anomaly_summary`, `risk`
(`safe` / `caution` / `risk`), `tags` (Teraman / Tercepat / Seimbang, dihitung dari
`recommended_route_index` dan `travel_time_in_seconds`), serta `cctv` (kamera pertama yang punya
`stream_url`).

## Peta

Tiles memakai OpenStreetMap (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`) tanpa API key,
dengan atribusi `© OpenStreetMap contributors`. Geocoding memakai Photon (Komoot).
