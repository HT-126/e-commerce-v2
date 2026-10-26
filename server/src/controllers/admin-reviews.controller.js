import * as service from '../services/admin-reviews.service.js';

export async function list(req, res) {
  res.json({ data: await service.listReviews(req.valid.query) });
}

export async function remove(req, res) {
  await service.deleteReview(req.valid.params.id);
  res.status(204).end();
}
