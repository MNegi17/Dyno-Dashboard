import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vvruwxrhwppozvrprcix.supabase.co';
const supabaseKey = 'sb_publishable_wEN47XUvThFsrpIZcPX35A_xkPbdJQ1';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache'
    }
  }
});
