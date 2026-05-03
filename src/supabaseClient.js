import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gooakuaduaurmlatgqoh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdvb2FrdWFkdWF1cm1sYXRncW9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3ODc0NjUsImV4cCI6MjA5MzM2MzQ2NX0.hem8Wx8MlLjr7s1JcWcyNdgM8j4EYu9vOR08_sbIz7g';

export const supabase = createClient(supabaseUrl, supabaseKey);
