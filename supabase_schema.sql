-- ============================================================
-- VAYKO FLEET | SCRIPT DE CRIAÇÃO DAS TABELAS NO SUPABASE
-- ============================================================
-- Copie e cole este script no SQL Editor do seu projeto Supabase 
-- e clique em "RUN". Ele criará as tabelas e habilitará o Realtime.

-- 1. TABELA DE VEÍCULOS
CREATE TABLE IF NOT EXISTS public.vehicles (
    id TEXT PRIMARY KEY,
    placa TEXT NOT NULL,
    modelo TEXT,
    tipo TEXT,
    propriedade TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TABELA DE MOTORISTAS
CREATE TABLE IF NOT EXISTS public.drivers (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    cnh TEXT,
    categoria TEXT,
    validade TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABELA DE VIAGENS (FRETES)
CREATE TABLE IF NOT EXISTS public.trips (
    id TEXT PRIMARY KEY,
    data TEXT,
    cliente TEXT,
    origem TEXT,
    destino TEXT,
    placa TEXT,
    motorista TEXT,
    receita NUMERIC DEFAULT 0,
    combustivel NUMERIC DEFAULT 0,
    pedagio NUMERIC DEFAULT 0,
    diarias NUMERIC DEFAULT 0,
    comissao NUMERIC DEFAULT 0,
    manutencao NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Concluída',
    pago TEXT DEFAULT 'Pago',
    dataRecebimento TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. HABILITAR SINCRONIZAÇÃO EM TEMPO REAL (REALTIME)
ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.drivers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;

-- 5. POLÍTICAS DE ACESSO (Permitir Leitura e Escrita Pública via Chave Anon)
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total vehicles" ON public.vehicles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total drivers" ON public.drivers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total trips" ON public.trips FOR ALL USING (true) WITH CHECK (true);
