
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    name TEXT NOT NULL,
    avatar TEXT NOT NULL,
    industry TEXT NOT NULL,
    contact TEXT NOT NULL,
    whatsapp TEXT,
    projects_count INT,
    tasks_count INT
);
