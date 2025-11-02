import { supabase } from './supabaseClient.js';

const CAR_ID = 1; // carrito demo global

/**
 * Devuelve un array de objetos: [{id, name, price, qty}]
 */
export async function getCartDetail() {
  const { data, error } = await supabase
    .from('carrito_items')
    .select('id_item,id_objeto,cantidad, objetos (id_objeto,titulo,precio)')
    .eq('id_car', CAR_ID)
    .order('id_item', { ascending: true });

  if (error) throw error;
  const rows = data ?? [];

  return rows
    .filter(r => r.objetos) // Se asegura de que solo pasen items con un objeto relacionado
    .map(r => ({
      id: r.id_objeto,
      name: r.objetos.titulo,
      price: Number(r.objetos.precio ?? 0),
      qty: r.cantidad,
    }));
}

export async function removeFromCartDB(id_objeto) {
  const { error } = await supabase
    .from('carrito_items')
    .delete()
    .match({ id_car: CAR_ID, id_objeto });
  if (error) throw error;
}

export async function addOneToCart(id_objeto) {
  const { data: found, error: e1 } = await supabase
    .from('carrito_items')
    .select('id_item,cantidad')
    .eq('id_car', CAR_ID)
    .eq('id_objeto', id_objeto)
    .maybeSingle();
  if (e1) throw e1;

  if (found) {
    // Si el item ya existe, incrementa la cantidad
    const { error } = await supabase
      .from('carrito_items')
      .update({ cantidad: found.cantidad + 1 })
      .eq('id_item', found.id_item);
    if (error) throw error;
  } else {
    // Si no existe, lo inserta con cantidad 1
    const { error } = await supabase
      .from('carrito_items')
      .insert({ id_car: CAR_ID, id_objeto, cantidad: 1 });
    if (error) throw error;
  }
}

export async function setQtyDB(id_objeto, qty) {
  if (qty <= 0) {
    // Si la cantidad es 0 o menos, elimina el item
    const { error } = await supabase
      .from('carrito_items')
      .delete()
      .match({ id_car: CAR_ID, id_objeto });
    if (error) throw error;
  } else {
    // De lo contrario, actualiza la cantidad
    const { error } = await supabase
      .from('carrito_items')
      .update({ cantidad: qty })
      .match({ id_car: CAR_ID, id_objeto });
    if (error) throw error;
  }
}

export async function clearCartDB() {
  const { error } = await supabase
    .from('carrito_items')
    .delete()
    .eq('id_car', CAR_ID);
  if (error) throw error;
}