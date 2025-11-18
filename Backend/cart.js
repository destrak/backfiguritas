// cart.js — Handlers Express para /api/cart
//  CAMBIO: Importamos nuestro nuevo cliente 'query'
import { query } from "./postgresClient.js";

const CAR_ID = 1; // Carrito demo global

// ==============================
//  GET /api/cart
// ==============================
export async function getCart(req, res) {
  try {
    
    
    const sql = `
      SELECT 
        o.id_objeto, 
        o.titulo, 
        o.precio, 
        o.imagen, 
        ci.cantidad
      FROM carrito_items ci
      JOIN objetos o ON ci.id_objeto = o.id_objeto
      WHERE ci.id_car = $1
      ORDER BY o.titulo;
    `;
    const { rows } = await query(sql, [CAR_ID]);

    const items = rows.map((p) => ({
      id: p.id_objeto,
      name: p.titulo || `Producto ${p.id_objeto}`,
      price: Number(p.precio ?? 0),
      qty: Number(p.cantidad ?? 0),
      image: p.imagen || null,
    }));

    res.json(items);
  } catch (err) {
    console.error("getCart error:", err);
    res.status(500).json({ ok: false, message: "Error al listar carrito" });
  }
}

// ==============================
//  POST /api/cart  body: { id_objeto }
// ==============================
export async function addToCart(req, res) {
  try {
    const raw = req.body?.id_objeto;
    const id_objeto = Number.parseInt(String(raw), 10);
    
    if (!Number.isFinite(id_objeto))
      return res.status(400).json({ ok: false, message: "id_objeto inválido" });

    
    
    
    const sql = `
      INSERT INTO carrito_items (id_car, id_objeto, cantidad)
      VALUES ($1, $2, 1)
      ON CONFLICT (id_car, id_objeto) 
      DO UPDATE SET cantidad = carrito_items.cantidad + 1;
    `;
    await query(sql, [CAR_ID, id_objeto]);
    
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error("addToCart error:", err);
    res.status(500).json({ ok: false, message: "Error al agregar al carrito" });
  }
}

// ==============================
//  PATCH /api/cart/items/:id  body: { qty }
// ==============================
export async function setQty(req, res) {
  try {
    const id_objeto = Number.parseInt(String(req.params.id), 10);
    const qty = Number.parseInt(String(req.body?.qty), 10);

    if (!Number.isFinite(id_objeto) || !Number.isFinite(qty) || qty < 0)
      return res.status(400).json({ ok: false, message: "id o qty inválidos" });

    if (qty === 0) {
      // Si la cantidad es 0, simplemente lo borramos.
      return await removeFromCart(req, res);
    }

    
    // Intenta insertar la nueva cantidad. Si ya existe, actualízala.
    const sql = `
      INSERT INTO carrito_items (id_car, id_objeto, cantidad)
      VALUES ($1, $2, $3)
      ON CONFLICT (id_car, id_objeto) 
      DO UPDATE SET cantidad = $3;
    `;
    await query(sql, [CAR_ID, id_objeto, qty]);

    res.json({ ok: true });
  } catch (err) {
    console.error("setQty error:", err);
    res.status(500).json({ ok: false, message: "Error al actualizar cantidad" });
  }
}

// ==============================
//  DELETE /api/cart/items/:id
// ==============================
export async function removeFromCart(req, res) {
  try {
    const id_objeto = Number.parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id_objeto))
      return res.status(400).json({ ok: false, message: "id inválido" });

    
    const sql = `
      DELETE FROM carrito_items 
      WHERE id_car = $1 AND id_objeto = $2
    `;
    await query(sql, [CAR_ID, id_objeto]);

    res.status(204).end();
  } catch (err)
 {
    console.error("removeFromCart error:", err);
    res.status(500).json({ ok: false, message: "Error al eliminar ítem" });
  }
}

// ==============================
//  DELETE /api/cart
// ==============================
export async function clearCart(_req, res) {
  try {
    //  CAMBIO: SQL estándar
    const sql = `DELETE FROM carrito_items WHERE id_car = $1`;
    await query(sql, [CAR_ID]);

    res.status(204).end();
  } catch (err) {
    console.error("clearCart error:", err);
    res.status(500).json({ ok: false, message: "Error al vaciar carrito" });
  }
}