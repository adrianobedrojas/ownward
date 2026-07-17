CREATE TABLE documents (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    filename TEXT NOT NULL,
    filesize BIGINT NOT NULL,
    filetype TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
