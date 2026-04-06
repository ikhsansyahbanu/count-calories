# Kalori.AI — Next.js Fullstack

Aplikasi penghitung kalori dari foto berbasis Next.js 14 (App Router) + PostgreSQL + Anthropic Claude Vision.

## Struktur Project

```
kalori-nextjs/
├── app/
│   ├── api/
│   │   ├── analyze/route.ts     # POST — analisis foto via Claude
│   │   ├── history/route.ts     # GET / DELETE — riwayat makan
│   │   └── summary/route.ts     # GET — ringkasan kalori per hari
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx
│   └── page.module.css
├── components/
│   ├── AnalyzeTab.tsx           # Upload foto + hasil analisis
│   ├── AnalyzeTab.module.css
│   ├── HistoryTab.tsx           # Riwayat makan per hari
│   ├── HistoryTab.module.css
│   ├── SummaryTab.tsx           # Grafik + ringkasan mingguan
│   └── SummaryTab.module.css
├── lib/
│   ├── db.ts                    # PostgreSQL pool + init table
│   └── types.ts                 # TypeScript interfaces
├── Dockerfile
├── docker-compose.yml
└── .env.local.example
```

## Jalankan Lokal (Development)

### 1. Install dependencies
```bash
npm install
```

### 2. Setup environment
```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxx
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kalori_db
DB_USER=postgres
DB_PASSWORD=your_password
DB_SSL=false
```

### 3. Jalankan PostgreSQL lokal (via Docker)
```bash
docker run -d \
  --name kalori-postgres \
  -e POSTGRES_DB=kalori_db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=your_password \
  -p 5432:5432 \
  postgres:16-alpine
```

### 4. Jalankan Next.js
```bash
npm run dev
```

Buka http://localhost:3000

---

## Deploy ke VPS (Docker Compose)

### 1. Install Docker di VPS
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

### 2. Upload project ke VPS
```bash
scp -r kalori-nextjs/ user@IP_VPS:/home/user/
```

### 3. Buat file .env
```bash
cd kalori-nextjs
cat > .env << EOF
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxx
DB_PASSWORD=password_kuat_kamu
EOF
```

### 4. Update next.config.js untuk standalone output
Tambahkan `output: 'standalone'` di `next.config.js`:
```js
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['pg'],
  },
}
```

### 5. Deploy
```bash
docker compose up -d --build
```

### 6. Cek status
```bash
docker compose ps
docker compose logs -f app
```

App berjalan di http://IP_VPS:3000

---

## Koneksi DBeaver ke PostgreSQL

```
Host     : IP_VPS (atau localhost kalau lokal)
Port     : 5432
Database : kalori_db
User     : postgres
Password : DB_PASSWORD dari .env
```

---

## API Endpoints

| Method | Endpoint | Body / Params |
|--------|----------|---------------|
| POST | /api/analyze | `{ image_base64, media_type, target_kalori }` |
| GET | /api/history | `?limit=100&date=2026-04-06` |
| DELETE | /api/history | `?id=123` |
| GET | /api/summary | `?days=7` |

---

## Fitur

- Analisis foto makanan menggunakan Claude Vision
- Estimasi kalori, protein, karbo, lemak per makanan
- Riwayat makan tersimpan di PostgreSQL
- Ringkasan harian dengan bar chart
- Progress target kalori harian
- Hapus log makan
- Responsive, dark theme
