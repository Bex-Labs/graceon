const SUPABASE_URL = 'https://pvzabostsjzxnmnbqvul.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2emFib3N0c2p6eG5tbmJxdnVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTYyMTU1MywiZXhwIjoyMDk3MTk3NTUzfQ.NILql7a6c8Jg6UaV5yt2iyyswhUz3UoD_FClGX3OTa0';

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);