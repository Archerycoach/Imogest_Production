-- Add webhook columns to user_integrations table
ALTER TABLE user_integrations 
ADD COLUMN IF NOT EXISTS webhook_channel_id TEXT,
ADD COLUMN IF NOT EXISTS webhook_resource_id TEXT,
ADD COLUMN IF NOT EXISTS webhook_expiration TIMESTAMP WITH TIME ZONE;

-- Create index for webhook lookups
CREATE INDEX IF NOT EXISTS idx_user_integrations_webhook 
ON user_integrations(webhook_channel_id, webhook_resource_id) 
WHERE webhook_channel_id IS NOT NULL;