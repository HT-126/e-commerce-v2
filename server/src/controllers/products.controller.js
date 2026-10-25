import * as productsService from '../services/products.service.js';

export async function list(req, res) {
  res.json({ data: await productsService.listProducts(req.valid.query) });
}

export async function getOne(req, res) {
  res.json({ data: await productsService.getProduct(req.valid.params.slug) });
}

export async function related(req, res) {
  res.json({ data: await productsService.listRelated(req.valid.params.slug) });
}
