import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Só tenta criar o cliente se a URL for minimamente válida e não for o placeholder
const isValidUrl = supabaseUrl && supabaseUrl.startsWith('http') && !supabaseUrl.includes('YOUR_SUPABASE_URL');

export const supabase = isValidUrl 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : createClient('https://placeholder.supabase.co', 'placeholder-key');

