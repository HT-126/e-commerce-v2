import * as reviewsService from '../services/reviews.service.js';

export async function list(req, res) {
  res.json({ data: await reviewsService.listReviews(req.valid.params.slug, req.valid.query) });
}

export async function mine(req, res) {
  res.json({ data: await reviewsService.getMyReview(req.user.id, req.valid.params.slug) });
}

export async function save(req, res) {
  res.json({ data: await reviewsService.saveReview(req.user.id, req.valid.params.slug, req.valid.body) });
}

export async function remove(req, res) {
  res.json({ data: await reviewsService.deleteReview(req.user.id, req.valid.params.slug) });
}
