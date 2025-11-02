// cart.js — Handlers Express para /api/cart
import { supabase } from "./supabaseClient.js";

const CAR_ID = 1; // carrito demo global

// GET /api/cart  -> [{ id, name, price, qty, image? }]
export async function getCart(req, res) {
  try {
    // 1) Items del carrito
    const { data: items, error: errItems } = await supabase
      .from("carrito_items")
      .select("id_objeto,cantidad")
      .eq("id_car", CAR_ID);

    if (errItems) throw errItems;
    if (!items || items.length === 0) return res.json([]);

    // 2) Productos relacionados
    const ids = items.map((r) => r.id_objeto);
    const { data: prods, error: errProds } = await supabase
      .from("objetos")
      .select("id_objeto,titulo,precio,imagen")
      .in("id_objeto", ids);

    if (errProds) throw errProds;

    // 3) Join en memoria
    const mapProd = new Map((prods ?? []).map((p) => [p.id_objeto, p]));
    const rows = items.map((r) => {
      const p = mapProd.get(r.id_objeto) || {};
      return {
        id: r.id_objeto,
        name: p.titulo || `Producto ${r.id_objeto}`,
        price: Number(p.precio ?? 0),
        qty: Number(r.cantidad ?? 0),
        image: p.imagen || null,
      };
    });

    res.json(rows);
  } catch (err) {
    console.error("getCart error:", err);
    res.status(500).json({ ok: false, message: "Error al listar carrito" });
  }
}

// POST /api/cart   body: { id_objeto }
export async function addToCart(req, res) {
  try {
    // Coerción robusta para evitar "[object Object]"
    const raw = req.body?.id_objeto;
    const id_objeto = Number.parseInt(
      String(typeof raw === "object" && raw !== null ? (raw.id ?? raw.value ?? "") : raw),
      10
    );

    if (!Number.isFinite(id_objeto))
      return res.status(400).json({ ok: false, message: "id_objeto inválido (debe ser entero)" });

    // ¿Existe ya?
    const { data: found, error: selErr } = await supabase
      .from("carrito_items")
      .select("id_objeto,cantidad")
      .eq("id_car", CAR_ID)
      .eq("id_objeto", id_objeto)
      .maybeSingle();
    if (selErr) throw selErr;

    if (found) {
      const next = Number(found.cantidad ?? 0) + 1;
      const { error: updErr } = await supabase
        .from("carrito_items")
        .update({ cantidad: next })
        .eq("id_car", CAR_ID)
        .eq("id_objeto", id_objeto);
      if (updErr) throw updErr;
    } else {
      const { error: insErr } = await supabase
        .from("carrito_items")
        .insert([{ id_car: CAR_ID, id_objeto, cantidad: 1 }]);
      if (insErr) throw insErr;
    }

    res.status(201).json({ ok: true });
  } catch (err) {
    console.error("addToCart error:", err);
    res.status(500).json({ ok: false, message: "Error al agregar al carrito" });
  }
}

// PATCH /api/cart/items/:id   body: { qty }
export async function setQty(req, res) {
  try {
    const id_objeto = Number.parseInt(String(req.params.id), 10);
    const qty = Number.parseInt(String(req.body?.qty), 10);

    if (!Number.isFinite(id_objeto) || !Number.isFinite(qty) || qty < 0) {
      return res.status(400).json({ ok: false, message: "id o qty inválidos" });
    }

    if (qty === 0) {
      const { error: delErr } = await supabase
        .from("carrito_items")
        .delete()
        .eq("id_car", CAR_ID)
        .eq("id_objeto", id_objeto);
      if (delErr) throw delErr;
      return res.json({ ok: true });
    }

    const { error: updErr } = await supabase
      .from("carrito_items")
      .update({ cantidad: qty })
      .eq("id_car", CAR_ID)
      .eq("id_objeto", id_objeto);
    if (updErr) throw updErr;

    res.json({ ok: true });
  } catch (err) {
    console.error("setQty error:", err);
    res.status(500).json({ ok: false, message: "Error al actualizar cantidad" });
  }
}

// DELETE /api/cart/items/:id
export async function removeFromCart(req, res) {
  try {
    const id_objeto = Number.parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id_objeto)) {
      return res.status(400).json({ ok: false, message: "id inválido" });
    }

    const { error: delErr } = await supabase
      .from("carrito_items")
      .delete()
      .eq("id_car", CAR_ID)
      .eq("id_objeto", id_objeto);
    if (delErr) throw delErr;

    res.status(204).end();
  } catch (err) {
    console.error("removeFromCart error:", err);
    res.status(500).json({ ok: false, message: "Error al eliminar ítem" });
  }
}

// DELETE /api/cart
export async function clearCart(_req, res) {
  try {
    const { error } = await supabase
      .from("carrito_items")
      .delete()
      .eq("id_car", CAR_ID);
    if (error) throw error;

    res.status(204).end();
  } catch (err) {
    console.error("clearCart error:", err);
    res.status(500).json({ ok: false, message: "Error al vaciar carrito" });
  }
}
