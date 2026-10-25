import * as service from '../services/admin-orders.service.js';

export async function list(req, res) {
  res.json({ data: await service.listOrders(req.valid.query) });
}

export async function getOne(req, res) {
  res.json({ data: await service.getOrder(req.valid.params.orderNumber) });
}

export async function changeStatus(req, res) {
  res.json({ data: await service.changeStatus(req.valid.params.orderNumber, req.valid.body.status) });
}
