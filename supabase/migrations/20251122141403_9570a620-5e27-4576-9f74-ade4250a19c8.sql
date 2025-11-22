-- Create services table
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  base_price INTEGER NOT NULL,
  duration INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create service_options table
CREATE TABLE public.service_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  price INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_options ENABLE ROW LEVEL SECURITY;

-- RLS policies for services (everyone can view and modify)
CREATE POLICY "Anyone can view services"
  ON public.services
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert services"
  ON public.services
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update services"
  ON public.services
  FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete services"
  ON public.services
  FOR DELETE
  USING (true);

-- RLS policies for service_options (everyone can view and modify)
CREATE POLICY "Anyone can view service options"
  ON public.service_options
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert service options"
  ON public.service_options
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update service options"
  ON public.service_options
  FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete service options"
  ON public.service_options
  FOR DELETE
  USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.services;
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_options;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to services table
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();