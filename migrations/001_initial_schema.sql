-- Create anime table
CREATE TABLE IF NOT EXISTS anime (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  japanese_title TEXT,
  slug TEXT UNIQUE NOT NULL,
  poster TEXT,
  synopsis TEXT,
  rating TEXT,
  type TEXT CHECK (type IN ('tv', 'movie', 'ova', 'ona', 'special')),
  status TEXT CHECK (status IN ('ongoing', 'completed', 'upcoming')),
  episode_count TEXT,
  duration TEXT,
  release_date TEXT,
  studio TEXT,
  genres TEXT[],
  mal_id INTEGER,
  mal_data JSONB,
  otakudesu_url TEXT,
  anoboy_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create episodes table
CREATE TABLE IF NOT EXISTS episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anime_id UUID NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
  episode_number INTEGER NOT NULL,
  title TEXT,
  slug TEXT NOT NULL,
  otakudesu_url TEXT,
  anoboy_url TEXT,
  download_links JSONB,
  streaming_links JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(anime_id, episode_number)
);

-- Create scrape_jobs table
CREATE TABLE IF NOT EXISTS scrape_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('anime', 'episode', 'batch')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  source TEXT NOT NULL CHECK (source IN ('otakudesu', 'anoboy')),
  target_url TEXT NOT NULL,
  target_slug TEXT,
  anime_id UUID REFERENCES anime(id) ON DELETE SET NULL,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  error_message TEXT,
  result_data JSONB,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_anime_slug ON anime(slug);
CREATE INDEX IF NOT EXISTS idx_anime_status ON anime(status);
CREATE INDEX IF NOT EXISTS idx_anime_type ON anime(type);
CREATE INDEX IF NOT EXISTS idx_anime_mal_id ON anime(mal_id);
CREATE INDEX IF NOT EXISTS idx_anime_created_at ON anime(created_at);

CREATE INDEX IF NOT EXISTS idx_episodes_anime_id ON episodes(anime_id);
CREATE INDEX IF NOT EXISTS idx_episodes_episode_number ON episodes(episode_number);
CREATE INDEX IF NOT EXISTS idx_episodes_created_at ON episodes(created_at);

CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status ON scrape_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_type ON scrape_jobs(type);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_source ON scrape_jobs(source);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_created_by ON scrape_jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_created_at ON scrape_jobs(created_at);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_anime_updated_at
  BEFORE UPDATE ON anime
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_episodes_updated_at
  BEFORE UPDATE ON episodes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scrape_jobs_updated_at
  BEFORE UPDATE ON scrape_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE anime ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access on anime" ON anime
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access on episodes" ON episodes
  FOR SELECT USING (true);

-- Create policies for authenticated users on scrape_jobs
CREATE POLICY "Allow authenticated users to view scrape_jobs" ON scrape_jobs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert scrape_jobs" ON scrape_jobs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update their own scrape_jobs" ON scrape_jobs
  FOR UPDATE USING (auth.uid()::text = created_by);

-- Create policies for service role (admin operations)
CREATE POLICY "Allow service role full access on anime" ON anime
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access on episodes" ON episodes
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access on scrape_jobs" ON scrape_jobs
  FOR ALL USING (auth.role() = 'service_role');