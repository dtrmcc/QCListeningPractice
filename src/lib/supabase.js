import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://smnnpzqwfuovejlllmfy.supabase.co'
const supabaseAnonKey = 'sb_publishable_7di5kXIvrTrqaBj3pnM-NQ_8oxuRQHc'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
