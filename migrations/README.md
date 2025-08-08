# Database Migrations

Folder ini berisi file migrasi database untuk aplikasi anime scraper.

## Struktur Database

Database terdiri dari 3 tabel utama:

### 1. anime
Menyimpan informasi anime yang telah di-scrape:
- `id`: UUID primary key
- `title`: Judul anime
- `japanese_title`: Judul dalam bahasa Jepang
- `slug`: URL-friendly identifier
- `poster`: URL gambar poster
- `synopsis`: Sinopsis anime
- `rating`: Rating anime
- `type`: Jenis anime (tv, movie, ova, ona, special)
- `status`: Status anime (ongoing, completed, upcoming)
- `episode_count`: Jumlah episode
- `duration`: Durasi per episode
- `release_date`: Tanggal rilis
- `studio`: Studio pembuat
- `genres`: Array genre
- `mal_id`: MyAnimeList ID
- `mal_data`: Data tambahan dari MyAnimeList
- `otakudesu_url`: URL sumber Otakudesu
- `anoboy_url`: URL sumber Anoboy

### 2. episodes
Menyimpan informasi episode anime:
- `id`: UUID primary key
- `anime_id`: Foreign key ke tabel anime
- `episode_number`: Nomor episode
- `title`: Judul episode
- `slug`: URL-friendly identifier
- `otakudesu_url`: URL episode di Otakudesu
- `anoboy_url`: URL episode di Anoboy
- `download_links`: JSON data link download
- `streaming_links`: JSON data link streaming

### 3. scrape_jobs
Menyimpan informasi job scraping:
- `id`: UUID primary key
- `type`: Jenis job (anime, episode, batch)
- `status`: Status job (pending, processing, completed, failed)
- `source`: Sumber scraping (otakudesu, anoboy)
- `target_url`: URL target untuk di-scrape
- `target_slug`: Slug target
- `anime_id`: Foreign key ke tabel anime (opsional)
- `progress`: Progress job (0-100)
- `error_message`: Pesan error jika gagal
- `result_data`: Data hasil scraping
- `created_by`: ID user yang membuat job

## Cara Menjalankan Migrasi

### Menggunakan Supabase CLI

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login ke Supabase:
   ```bash
   supabase login
   ```

3. Link project:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

4. Jalankan migrasi:
   ```bash
   supabase db push
   ```

### Menggunakan SQL Editor di Supabase Dashboard

1. Buka Supabase Dashboard
2. Pilih project Anda
3. Buka SQL Editor
4. Copy dan paste isi file `001_initial_schema.sql`
5. Jalankan query

### Menggunakan psql (PostgreSQL CLI)

```bash
psql -h YOUR_DB_HOST -p 5432 -U postgres -d postgres -f migrations/001_initial_schema.sql
```

## Security

Migrasi ini sudah termasuk:
- Row Level Security (RLS) policies
- Indexes untuk performa yang optimal
- Triggers untuk auto-update timestamp
- Constraints untuk validasi data

## Catatan

- Pastikan environment variables sudah diset dengan benar
- Backup database sebelum menjalankan migrasi di production
- Test migrasi di development environment terlebih dahulu