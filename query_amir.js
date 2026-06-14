import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function run() {
  const { data, error } = await supabase.from('profiles').select('id, first_name, last_name, email').ilike('first_name', '%amir%')
  console.log(JSON.stringify(data, null, 2))
}
run()
