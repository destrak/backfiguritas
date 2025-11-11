// index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { supabase } from "./supabaseClient.js";

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
    origin: ["http://localhost:5173", "http://localhost:3000"],
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
    message: "Backend carrito activo",
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
    const { data, error } = await supabase.rpc("checkout_carrito", {
      p_id_car: cartId,
    });

    if (error) {
      return res.status(500).json({ ok: false, message: error.message });
    }

    const ok = !!data?.ok;
    const message =
      data?.message ?? (ok ? "Compra realizada" : "No se pudo completar la compra");
    const total = typeof data?.total !== "undefined" ? data.total : undefined;

    return res.status(ok ? 200 : 400).json({ ok, message, total });
  })
);

/* --------- TEST DE CARGA: checkout + reseed --------- */
/* Requiere tu función SQL:
create or replace function checkout_then_seed(p_id_car int, p_n_items int default 3)
returns jsonb
language plpgsql
as $$
declare
  v_res jsonb;
begin
  v_res := checkout_carrito(p_id_car);
  if (v_res->>'ok')::boolean is true then
    perform seed_cart(p_id_car, p_n_items);
  end if;
  return v_res;
end;
$$;
y una seed_cart(p_id_car, p_n_items) que llene carrito_items con n ítems válidos.
*/
app.post(
  "/api/test/checkout",
  asyncHandler(async (req, res) => {
    const { n = 3 } = req.body || {};

    const { data, error } = await supabase.rpc("checkout_then_seed", {
      p_id_car: 1,
      p_n_items: Number(n),
    });

    if (error) {
      console.error("checkout_then_seed error:", error);
      return res.status(500).json({ ok: false, message: error.message });
    }

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

    const { data, error } = await supabase
      .from("objetos")
      .select("id_objeto,titulo,precio,stock,imagen,estado")
      .eq("estado", estado)
      .order("id_objeto", { ascending: true });

    if (error) throw error;

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

    const { data, error } = await supabase
      .from("objetos")
      .select("id_objeto,titulo,descripcion,precio,stock,imagen,estado")
      .eq("id_objeto", id)
      .maybeSingle();

    if (error) throw error;
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
  console.error("❌ Unhandled error:", err);
  const msg =
    typeof err?.message === "string" ? err.message : "Error interno del servidor";
  res.status(500).json({ ok: false, message: msg });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
