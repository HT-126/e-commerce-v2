import * as service from '../services/admin-products.service.js';

export async function list(req, res) {
  res.json({ data: await service.listProducts(req.valid.query) });
}

export async function getOne(req, res) {
  res.json({ data: await service.getProduct(req.valid.params.id) });
}

export async function create(req, res) {
  res.status(201).json({ data: await service.createProduct(req.valid.body) });
}

export async function update(req, res) {
  res.json({ data: await service.updateProduct(req.valid.params.id, req.valid.body) });
}

export async function createVariant(req, res) {
  res.status(201).json({ data: await service.createVariant(req.valid.params.id, req.valid.body) });
}

export async function updateVariant(req, res) {
  res.json({ data: await service.updateVariant(req.valid.params.id, req.valid.body) });
}
