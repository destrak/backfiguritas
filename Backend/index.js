import express from 'express';
import cors from 'cors';

// --- Lógica original (de cart.js, ahora cart.controller.js) ---
import {
  getCartDetail,
  addOneToCart,
  setQtyDB,
  removeFromCartDB,
  clearCartDB
} from './cart.js';

// --- Lógica nueva (de cartcontext.js, ahora cart.v2.controller.js) ---
import {
  getCartDetails as getCartDetailsV2,
  addItemToCart as addItemToCartV2,
  setItemQuantity as setItemQuantityV2,
  removeItemFromCart as removeItemFromCartV2,
  clearCart as clearCartV2
} from './cartContext.js'; 
const app = express();
const PORT = process.env.PORT || 4000;

// --- Middlewares ---
app.use(cors());
app.use(express.json());

// =================================================================
// --- API v1 - Rutas para la lógica de cart.controller.js ---
// =================================================================

app.get('/api/cart', async (req, res) => {
  try {
    const cartItems = await getCartDetail();
    res.status(200).json(cartItems);
  } catch (error) {
    res.status(500).json({ message: `V1 Error: ${error.message}` });
  }
});

app.post('/api/cart', async (req, res) => {
  try {
    const { id_objeto } = req.body;
    if (!id_objeto) return res.status(400).json({ message: 'id_objeto es requerido.' });
    await addOneToCart(id_objeto);
    res.status(201).json({ message: 'Producto agregado (V1).' });
  } catch (error) {
    res.status(500).json({ message: `V1 Error: ${error.message}` });
  }
});

app.patch('/api/cart/items/:id', async (req, res) => {
    try {
        const id_objeto = parseInt(req.params.id, 10);
        const { qty } = req.body;
        if (isNaN(id_objeto)) return res.status(400).json({ message: 'ID no válido.' });
        if (qty === undefined) return res.status(400).json({ message: 'qty es requerido.' });
        await setQtyDB(id_objeto, qty);
        res.status(200).json({ message: 'Cantidad actualizada (V1).' });
    } catch (error) {
        res.status(500).json({ message: `V1 Error: ${error.message}` });
    }
});

app.delete('/api/cart/items/:id', async (req, res) => {
    try {
        const id_objeto = parseInt(req.params.id, 10);
        if (isNaN(id_objeto)) return res.status(400).json({ message: 'ID no válido.' });
        await removeFromCartDB(id_objeto);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: `V1 Error: ${error.message}` });
    }
});

app.delete('/api/cart', async (req, res) => {
    try {
        await clearCartDB();
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: `V1 Error: ${error.message}` });
    }
});


// ======================================================================
// --- API v2 - Rutas para la lógica de cart.v2.controller.js ---
// ======================================================================

app.get('/api/v2/cart', async (req, res) => {
  try {
    const cartItems = await getCartDetailsV2();
    res.status(200).json(cartItems);
  } catch (error) {
    res.status(500).json({ message: `V2 Error: ${error.message}` });
  }
});

app.post('/api/v2/cart', async (req, res) => {
  try {
    const { productId } = req.body; // Esta lógica espera 'productId'
    if (!productId) return res.status(400).json({ message: 'productId es requerido.' });
    await addItemToCartV2(productId);
    res.status(201).json({ message: 'Producto agregado (V2).' });
  } catch (error) {
    res.status(500).json({ message: `V2 Error: ${error.message}` });
  }
});

app.patch('/api/v2/cart/items/:id', async (req, res) => {
    try {
        const productId = parseInt(req.params.id, 10);
        const { quantity } = req.body; // Esta lógica espera 'quantity'
        if (isNaN(productId)) return res.status(400).json({ message: 'ID no válido.' });
        if (quantity === undefined) return res.status(400).json({ message: 'quantity es requerido.' });
        await setItemQuantityV2(productId, quantity);
        res.status(200).json({ message: 'Cantidad actualizada (V2).' });
    } catch (error) {
        res.status(500).json({ message: `V2 Error: ${error.message}` });
    }
});

app.delete('/api/v2/cart/items/:id', async (req, res) => {
    try {
        const productId = parseInt(req.params.id, 10);
        if (isNaN(productId)) return res.status(400).json({ message: 'ID no válido.' });
        await removeItemFromCartV2(productId);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: `V2 Error: ${error.message}` });
    }
});

app.delete('/api/v2/cart', async (req, res) => {
    try {
        await clearCartV2();
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: `V2 Error: ${error.message}` });
    }
});


// --- Iniciar el servidor ---
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});