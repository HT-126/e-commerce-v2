import * as ordersService from '../services/orders.service.js';

export async function place(req, res) {
  res.status(201).json({ data: await ordersService.placeOrder(req.user) });
}

export async function list(req, res) {
  res.json({ data: await ordersService.listOrders(req.user.id, req.valid.query) });
}

export async function getOne(req, res) {
  res.json({ data: await ordersService.getOrder(req.user.id, req.valid.params.orderNumber) });
}
