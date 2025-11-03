// cart.js — Handlers Express para /api/cart
import { supabase } from "./supabaseClient.js";

const CAR_ID = 1; // Carrito demo global

// ==============================
// 🛒 GET /api/cart
// ==============================
export async function getCart(req, res) {
  try {
    const { data: items, error: errItems } = await supabase
      .from("carrito_items")
      .select("id_objeto,cantidad")
      .eq("id_car", CAR_ID);

    if (errItems) throw errItems;
    if (!items || items.length === 0) return res.json([]);

    // Agrupa por producto y suma cantidades (por si existen duplicados)
    const qtyById = new Map();
    for (const r of items) {
      const id = r.id_objeto;
      const qty = Number(r.cantidad ?? 0);
      qtyById.set(id, (qtyById.get(id) ?? 0) + qty);
    }

    const ids = Array.from(qtyById.keys());
    const { data: prods, error: errProds } = await supabase
      .from("objetos")
      .select("id_objeto,titulo,precio,imagen")
      .in("id_objeto", ids);

    if (errProds) throw errProds;

    const mapProd = new Map((prods ?? []).map((p) => [p.id_objeto, p]));
    const rows = ids.map((id) => {
      const p = mapProd.get(id) || {};
      return {
        id,
        name: p.titulo || `Producto ${id}`,
        price: Number(p.precio ?? 0),
        qty: qtyById.get(id) ?? 0,
        image: p.imagen || null,
      };
    });

    res.json(rows);
  } catch (err) {
    console.error("getCart error:", err);
    res.status(500).json({ ok: false, message: "Error al listar carrito" });
  }
}

// ==============================
// ➕ POST /api/cart  body: { id_objeto }
// ==============================
export async function addToCart(req, res) {
  try {
    const raw = req.body?.id_objeto;
    const id_objeto = Number.parseInt(
      String(typeof raw === "object" && raw !== null ? (raw.id ?? raw.value ?? "") : raw),
      10
    );
    if (!Number.isFinite(id_objeto))
      return res.status(400).json({ ok: false, message: "id_objeto inválido (debe ser entero)" });

    // Trae todas las filas (tolerar duplicados)
    const { data: rows, error: selErr } = await supabase
      .from("carrito_items")
      .select("id_item,cantidad")
      .eq("id_car", CAR_ID)
      .eq("id_objeto", id_objeto);

    if (selErr) throw selErr;

    if (!rows || rows.length === 0) {
      // No existe → insertar
      const { error: insErr } = await supabase
        .from("carrito_items")
        .insert([{ id_car: CAR_ID, id_objeto, cantidad: 1 }]);
      if (insErr) throw insErr;
      return res.status(201).json({ ok: true });
    }

    // Consolidar duplicados: dejar 1 fila con cantidad total + 1
    const totalActual = rows.reduce((s, r) => s + Number(r.cantidad ?? 0), 0);
    const totalNuevo = totalActual + 1;
    const keepId = rows[0].id_item;
    const toDelete = rows.slice(1).map((r) => r.id_item);

    if (toDelete.length > 0) {
      const { error: delErr } = await supabase
        .from("carrito_items")
        .delete()
        .in("id_item", toDelete);
      if (delErr) throw delErr;
    }

    const { error: updErr } = await supabase
      .from("carrito_items")
      .update({ cantidad: totalNuevo })
      .eq("id_item", keepId);
    if (updErr) throw updErr;

    res.status(201).json({ ok: true });
  } catch (err) {
    console.error("addToCart error:", err);
    res.status(500).json({ ok: false, message: "Error al agregar al carrito" });
  }
}

// ==============================
// 🔁 PATCH /api/cart/items/:id  body: { qty }
// ==============================
export async function setQty(req, res) {
  try {
    const id_objeto = Number.parseInt(String(req.params.id), 10);
    const qty = Number.parseInt(String(req.body?.qty), 10);

    if (!Number.isFinite(id_objeto) || !Number.isFinite(qty) || qty < 0)
      return res.status(400).json({ ok: false, message: "id o qty inválidos" });

    // Trae todas las filas de ese producto
    const { data: rows, error: selErr } = await supabase
      .from("carrito_items")
      .select("id_item,cantidad")
      .eq("id_car", CAR_ID)
      .eq("id_objeto", id_objeto);
    if (selErr) throw selErr;

    // qty = 0 → borra todas las filas
    if (qty === 0) {
      if (rows?.length) {
        const ids = rows.map((r) => r.id_item);
        const { error: delErr } = await supabase
          .from("carrito_items")
          .delete()
          .in("id_item", ids);
        if (delErr) throw delErr;
      }
      return res.json({ ok: true });
    }

    if (!rows || rows.length === 0) {
      // No existe → insertar con la qty pedida
      const { error: insErr } = await supabase
        .from("carrito_items")
        .insert([{ id_car: CAR_ID, id_objeto, cantidad: qty }]);
      if (insErr) throw insErr;
      return res.json({ ok: true });
    }

    // Consolidar duplicados: deja 1 fila y borra el resto
    const keepId = rows[0].id_item;
    const toDelete = rows.slice(1).map((r) => r.id_item);
    if (toDelete.length > 0) {
      const { error: delErr } = await supabase
        .from("carrito_items")
        .delete()
        .in("id_item", toDelete);
      if (delErr) throw delErr;
    }

    const { error: updErr } = await supabase
      .from("carrito_items")
      .update({ cantidad: qty })
      .eq("id_item", keepId);
    if (updErr) throw updErr;

    res.json({ ok: true });
  } catch (err) {
    console.error("setQty error:", err);
    res.status(500).json({ ok: false, message: "Error al actualizar cantidad" });
  }
}

// ==============================
// ❌ DELETE /api/cart/items/:id
// ==============================
export async function removeFromCart(req, res) {
  try {
    const id_objeto = Number.parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id_objeto))
      return res.status(400).json({ ok: false, message: "id inválido" });

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

// ==============================
// 🧹 DELETE /api/cart
// ==============================
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
