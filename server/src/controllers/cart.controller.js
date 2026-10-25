import * as cartService from '../services/cart.service.js';

export async function quote(req, res) {
  res.json({ data: await cartService.quoteCart(req.valid.body.items) });
}

export async function get(req, res) {
  res.json({ data: await cartService.getCart(req.user.id) });
}

export async function setItem(req, res) {
  const { variantId } = req.valid.params;
  res.json({ data: await cartService.setItem(req.user.id, variantId, req.valid.body.quantity) });
}

export async function removeItem(req, res) {
  res.json({ data: await cartService.removeItem(req.user.id, req.valid.params.variantId) });
}

export async function merge(req, res) {
  res.json({ data: await cartService.mergeItems(req.user.id, req.valid.body.items) });
}
