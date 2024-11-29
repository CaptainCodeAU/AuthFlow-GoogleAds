-- Create oauth_error_logs table
CREATE TABLE IF NOT EXISTS oauth_error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES google_ads_clients(id),
    error_type VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    error_stack TEXT,
    additional_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance optimization
CREATE INDEX idx_oauth_error_logs_client_id ON oauth_error_logs(client_id);
CREATE INDEX idx_oauth_error_logs_error_type ON oauth_error_logs(error_type);
CREATE INDEX idx_oauth_error_logs_created_at ON oauth_error_logs(created_at);
