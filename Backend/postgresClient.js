import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Lee la URL de tu base de datos (en la VM 2) desde el archivo .env
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("FATAL: DATABASE_URL no está definida en el archivo .env");
}

// Crea un "pool" de conexiones, que es la forma eficiente
// de manejar múltiples peticiones a la base de datos.
export const pool = new Pool({
  connectionString: connectionString,
});

// Exportamos una función 'query' simple para no tener que
// escribir 'pool.query' en todos lados.
export const query = (text, params) => pool.query(text, params);