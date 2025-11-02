import { supabase } from './supabaseClient.js' // Asegúrate de que la ruta sea correcta

const CART_ID = 1 // ID del carrito hardcodeado por ahora

// --- Funciones que interactúan directamente con Supabase ---

export const getCartDetails = async () => {
  const { data, error } = await supabase
    .from('carrito_items')
    .select('...productos(id, nombre, precio), cantidad') // Ajusta tus tablas y columnas
    .eq('id_car', CART_ID)

  if (error) throw new Error(error.message)
  
  // Transforma los datos si es necesario para que coincidan con el formato del frontend
  return data.map(item => ({
    id: item.productos.id,
    name: item.productos.nombre,
    price: item.productos.precio,
    qty: item.cantidad
  }))
}

export const addItemToCart = async (productId) => {
  const { error } = await supabase.rpc('add_one_to_cart', { p_id: productId }) // Suponiendo un procedimiento almacenado
  if (error) throw new Error(error.message)
  return { success: true }
}

export const setItemQuantity = async (productId, quantity) => {
  if (quantity <= 0) {
    return removeItemFromCart(productId) // Si la cantidad es 0 o menos, elimínalo
  }
  const { error } = await supabase
    .from('carrito_items')
    .update({ cantidad: quantity })
    .match({ id_car: CART_ID, id_prod: productId })

  if (error) throw new Error(error.message)
  return { success: true }
}

export const removeItemFromCart = async (productId) => {
  const { error } = await supabase
    .from('carrito_items')
    .delete()
    .match({ id_car: CART_ID, id_prod: productId })
  
  if (error) throw new Error(error.message)
  return { success: true }
}

export const clearCart = async () => {
  const { error } = await supabase
    .from('carrito_items')
    .delete()
    .eq('id_car', CART_ID)

  if (error) throw new Error(error.message)
  return { success: true }
}