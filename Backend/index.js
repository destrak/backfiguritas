import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { query } from "./postgresClient.js"; 

import {
  getCart,
  addToCart,
  setQty,
  removeFromCart,
  clearCart,
} from "./cart.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Helper para handlers async
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// CORS + JSON
app.use(
  cors({
    //  NOTA: Tu frontend ahora corre en localhost:5173
    origin: ["http://localhost:5173", "http://localhost:4000"],
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.options("*", cors());
app.use(express.json());

// Home
app.get("/", (_req, res) => {
  res.json({
    ok: true,
    message: "Backend carrito activo (con PostgreSQL directo)",
    docs: [
      "/api/cart",
      "/api/checkout",
      "/api/test/checkout",
      "/api/products",
      "/api/products/:id",
    ],
  });
});

/* --------- API /api/cart --------- */
app.get("/api/cart", asyncHandler(getCart));
app.post("/api/cart", asyncHandler(addToCart));
app.patch("/api/cart/items/:id", asyncHandler(setQty));
app.delete("/api/cart/items/:id", asyncHandler(removeFromCart));
app.delete("/api/cart", asyncHandler(clearCart));

/* --------- Checkout (RPC) --------- */
app.post(
  "/api/checkout",
  asyncHandler(async (req, res) => {
    const { cartId = 1 } = req.body || {};
    
    //  CAMBIO: Reemplazamos supabase.rpc por pool.query
    const { rows, error } = await query("SELECT * FROM checkout_carrito($1)", [
      cartId,
    ]);

    if (error) {
      return res.status(500).json({ ok: false, message: error.message });
    }

    // El resultado de la función SQL está en la primera fila
    const data = rows[0]?.checkout_carrito;
    const ok = !!data?.ok;
    const message =
      data?.message ?? (ok ? "Compra realizada" : "No se pudo completar la compra");
    const total = typeof data?.total !== "undefined" ? data.total : undefined;

    return res.status(ok ? 200 : 400).json({ ok, message, total });
  })
);

/* --------- TEST DE CARGA: checkout + reseed --------- */
app.post(
  "/api/test/checkout",
  asyncHandler(async (req, res) => {
    const { n = 3 } = req.body || {};

    const { rows, error } = await query("SELECT * FROM checkout_then_seed($1, $2)", [
      1,
      Number(n),
    ]);

    if (error) {
      console.error("checkout_then_seed error:", error);
      return res.status(500).json({ ok: false, message: error.message });
    }

    const data = rows[0]?.checkout_then_seed;
    const ok = !!data?.ok;
    const message =
      data?.message ?? (ok ? "Compra realizada" : "Fallo de stock o validación");
    const total = typeof data?.total !== "undefined" ? data.total : undefined;

    return res.status(ok ? 200 : 400).json({ ok, message, total });
  })
);

/* --------- Productos --------- */
app.get(
  "/api/products",
  asyncHandler(async (req, res) => {
    const { estado = "disponible" } = req.query;

    //  CAMBIO: Reemplazamos supabase.from por SQL
    const sql = `
      SELECT id_objeto, titulo, precio, stock, imagen, estado 
      FROM objetos 
      WHERE estado = $1 
      ORDER BY id_objeto ASC
    `;
    const { rows: data } = await query(sql, [estado]);

    const rows = (data ?? []).map((p) => ({
      id: p.id_objeto,
      name: p.titulo,
      price: Number(p.precio ?? 0),
      stock: Number(p.stock ?? 0),
      image: p.imagen || null,
      estado: p.estado ?? null,
    }));

    res.json(rows);
  })
);

app.get(
  "/api/products/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "ID inválido" });

    //  CAMBIO: Reemplazamos supabase.from por SQL
    const sql = `
      SELECT id_objeto, titulo, descripcion, precio, stock, imagen, estado 
      FROM objetos 
      WHERE id_objeto = $1
    `;
    const { rows } = await query(sql, [id]);
    const data = rows[0]; // Obtenemos el primer resultado

    if (!data) return res.status(404).json({ message: "No encontrado" });

    res.json({
      id: data.id_objeto,
      name: data.titulo,
      descripcion: data.descripcion ?? "",
      price: Number(data.precio ?? 0),
      stock: Number(data.stock ?? 0),
      image: data.imagen || null,
      estado: data.estado ?? null,
    });
  })
);

// Middleware de errores
app.use((err, req, res, _next) => {
  console.error("Unhandled error:", err);
  const msg =
    typeof err?.message === "string" ? err.message : "Error interno del servidor";
  res.status(500).json({ ok: false, message: msg });
});

app.listen(PORT, () => {
  //  CAMBIO: Actualizamos el puerto a 4000 (el que usas en Docker)
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});