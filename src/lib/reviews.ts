import { z } from 'zod';
import { pool } from '@/lib/db';

export const REVIEW_COMMENT_MAX = 1000;

export interface ContractorRating {
  average: number;
  count: number;
}

export const reviewSchema = z.object({
  rating: z.number().int('La calificación debe ser un número entero').min(1, 'La calificación mínima es 1').max(5, 'La calificación máxima es 5'),
  comment: z
    .string()
    .trim()
    .max(REVIEW_COMMENT_MAX, `El comentario no puede superar ${REVIEW_COMMENT_MAX} caracteres`)
    .nullish()
    .transform((value) => (value ? value : null)),
});

export type ReviewInput = z.infer<typeof reviewSchema>;

export async function getContractorRatings(userIds: number[]): Promise<Map<number, ContractorRating>> {
  const ratings = new Map<number, ContractorRating>();
  if (userIds.length === 0) return ratings;

  const result = await pool.query(
    `SELECT reviewee_id, AVG(rating)::float AS average, COUNT(*)::int AS count
     FROM reviews
     WHERE reviewee_id = ANY($1)
     GROUP BY reviewee_id`,
    [userIds]
  );
  for (const row of result.rows) {
    ratings.set(row.reviewee_id, { average: Number(row.average), count: Number(row.count) });
  }
  return ratings;
}
