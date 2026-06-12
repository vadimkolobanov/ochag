import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { creditCalc } from '../core/logic.js';

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Неверная дата');

export const tilesRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/tiles?today=YYYY-MM-DD
  // Агрегирует данные для плиток «Разделы» одним запросом (§3.1).
  app.get('/api/tiles', async (req, reply) => {
    const q = z.object({ today: dateStr }).safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: q.error.issues[0].message });
    const { today } = q.data;
    const todayMonth = today.slice(0, 7);

    // ── Кредиты ──────────────────────────────────────────────────
    const obligations = await app.db<{
      id: number; default_amount: number;
      months_total: number | null; payments_before: number | null;
      total_payout: number | null; principal: number | null; rate_percent: number | null;
    }[]>`
      SELECT o.id, o.default_amount,
             c.months_total, c.payments_before, c.total_payout, c.principal, c.rate_percent
      FROM obligations o
      LEFT JOIN credits c ON c.obligation_id = o.id
      WHERE o.is_active = 1 AND o.kind = 'credit'
    `;

    let creditsTotalLeft = 0;
    let creditsCount = 0;

    if (obligations.length > 0) {
      const oblIds = obligations.map((o) => o.id);
      const payments = await app.db<{ obligation_id: number; amount: number; month: string }[]>`
        SELECT obligation_id, amount, month
        FROM obligation_payments
        WHERE obligation_id = ANY(${oblIds})
        ORDER BY month
      `;
      const paysByObl = new Map<number, { amount: number; month: string }[]>();
      for (const p of payments) {
        const arr = paysByObl.get(p.obligation_id) ?? [];
        arr.push(p);
        paysByObl.set(p.obligation_id, arr);
      }

      for (const o of obligations) {
        if (!o.months_total || !o.total_payout || !o.principal) continue;
        const paidTx = (paysByObl.get(o.id) ?? []).map((p) => p.amount);
        const paidThisMonth = (paysByObl.get(o.id) ?? []).some((p) => p.month === todayMonth);
        const calc = creditCalc({
          monthly: o.default_amount,
          principal: o.principal,
          totalPayout: o.total_payout,
          monthsTotal: o.months_total,
          paymentsBefore: o.payments_before ?? 0,
          paidTx,
          paidThisMonth,
        }, todayMonth);
        creditsTotalLeft += calc.leftToPay;
        if (calc.paymentsLeft > 0) creditsCount++;
      }
    }

    const credits = obligations.length > 0
      ? { totalLeftToPay: creditsTotalLeft, count: creditsCount }
      : null;

    // ── Авто: реализуется в Gate C ────────────────────────────────
    const car = null;

    return { credits, car };
  });
};
