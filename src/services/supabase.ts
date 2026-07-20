import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL =
  'https://tiplqkdmgahdeoseahsd.supabase.co'

const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpcGxxa2RtZ2FoZGVvc2VhaHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MjgyOTIsImV4cCI6MjA5NjUwNDI5Mn0.40_rGmSdhBW2SKGG8wgrGq4--n9qT578StHVzsSD_8w'

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
)