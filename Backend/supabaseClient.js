// supabaseClient.js
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env");
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey);
