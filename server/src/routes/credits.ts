import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { creditCalc } from '../core/logic.js';

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Неверная дата');

const idParam = (params: unknown) =>
  z.coerce.number().int().positive().safeParse((params as { id: string }).id);

export const creditsRoutes: FastifyPluginAsync = async (app) => {
  // ── GET /api/credits?today=YYYY-MM-DD ─────────────────────────────────────
  app.get('/api/credits', async (req, reply) => {
    const q = z.object({ today: dateStr }).safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: q.error.issues[0].message });
    const { today } = q.data;
    const todayMonth = today.slice(0, 7);

    const obligations = await app.db<{
      id: number; name: string; default_amount: number; due_day: number; owner: string;
      credit_id: number | null; bank: string | null; contract_number: string | null;
      opened_date: string | null; purpose: string | null; principal: number | null;
      total_payout: number | null; months_total: number | null;
      payments_before: number | null; rate_percent: number | null;
    }[]>`
      SELECT o.id, o.name, o.default_amount, o.due_day, o.owner,
             c.id AS credit_id, c.bank, c.contract_number, c.opened_date, c.purpose,
             c.principal, c.total_payout, c.months_total, c.payments_before, c.rate_percent
      FROM obligations o
      LEFT JOIN credits c ON c.obligation_id = o.id
      WHERE o.is_active = 1 AND o.kind = 'credit'
      ORDER BY o.id
    `;

    if (obligations.length === 0) {
      return { summary: { totalLeftToPay: 0, monthlyLoad: 0, count: 0 }, items: [] };
    }

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

    type DataItem = {
      id: number; name: string; defaultAmount: number; dueDay: number; owner: string;
      noData: false; bank: string; contractNumber: string | null; openedDate: string | null;
      purpose: string | null; principal: number; totalPayout: number; monthsTotal: number;
      paymentsBefore: number; ratePercent: number | null;
      paymentsMade: number; paymentsLeft: number; paidSum: number;
      leftToPay: number; overpay: number; progress: number; closeMonth: string | null;
    };
    type NoDataItem = {
      id: number; name: string; defaultAmount: number; dueDay: number; owner: string;
      noData: true;
    };

    const items: (DataItem | NoDataItem)[] = obligations.map((o) => {
      const oblPays = paysByObl.get(o.id) ?? [];

      if (o.credit_id === null) {
        return {
          id: o.id, name: o.name, defaultAmount: o.default_amount,
          dueDay: o.due_day, owner: o.owner, noData: true as const,
        };
      }

      const paidTx = oblPays.map((p) => p.amount);
      const paidThisMonth = oblPays.some((p) => p.month === todayMonth);

      const calc = creditCalc(
        {
          monthly: o.default_amount,
          principal: o.principal!,
          totalPayout: o.total_payout!,
          monthsTotal: o.months_total!,
          paymentsBefore: o.payments_before ?? 0,
          paidTx,
          paidThisMonth,
        },
        todayMonth,
      );

      return {
        id: o.id, name: o.name, defaultAmount: o.default_amount,
        dueDay: o.due_day, owner: o.owner, noData: false as const,
        bank: o.bank!, contractNumber: o.contract_number,
        openedDate: o.opened_date, purpose: o.purpose,
        principal: o.principal!, totalPayout: o.total_payout!,
        monthsTotal: o.months_total!, paymentsBefore: o.payments_before ?? 0,
        ratePercent: o.rate_percent,
        ...calc,
      };
    });

    // Сортировка: ближайший к закрытию первым, noData — в конце
    items.sort((a, b) => {
      if (a.noData && !b.noData) return 1;
      if (!a.noData && b.noData) return -1;
      if (!a.noData && !b.noData) return a.paymentsLeft - b.paymentsLeft;
      return 0;
    });

    const dataItems = items.filter((i): i is DataItem => !i.noData);
    const totalLeftToPay = dataItems.reduce((s, i) => s + i.leftToPay, 0);
    const monthlyLoad = dataItems
      .filter((i) => i.paymentsLeft > 0)
      .reduce((s, i) => s + i.defaultAmount, 0);

    return {
      summary: { totalLeftToPay, monthlyLoad, count: obligations.length },
      items,
    };
  });

  // ── PUT /api/obligations/:id/credit ───────────────────────────────────────
  const creditBody = z
    .object({
      bank: z.string().min(1, 'Укажите банк'),
      contractNumber: z.string().optional(),
      openedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Неверная дата').optional(),
      purpose: z.string().optional(),
      principal: z.number().int().positive('Сумма кредита должна быть положительной'),
      totalPayout: z.number().int(),
      monthsTotal: z.number().int().positive('Срок должен быть положительным'),
      paymentsBefore: z.number().int().nonnegative().default(0),
      ratePercent: z.number().positive().optional(),
    })
    .refine((d) => d.totalPayout >= d.principal, {
      message: 'Сумма к возврату не может быть меньше суммы кредита',
    })
    .refine((d) => d.paymentsBefore <= d.monthsTotal, {
      message: 'Платежей до учёта больше, чем срок кредита',
    });

  app.put('/api/obligations/:id/credit', async (req, reply) => {
    const id = idParam(req.params);
    if (!id.success) return reply.code(400).send({ error: 'Неверный id' });

    const p = creditBody.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: p.error.issues[0].message });
    const b = p.data;

    const [obl] = await app.db<{ kind: string; is_active: number }[]>`
      SELECT kind, is_active FROM obligations WHERE id = ${id.data}
    `;
    if (!obl) return reply.code(400).send({ error: 'Обязательство не найдено' });
    if (!obl.is_active) return reply.code(400).send({ error: 'Обязательство неактивно' });
    if (obl.kind !== 'credit') {
      return reply.code(400).send({
        error: `Обязательство имеет тип «${obl.kind}», а не «credit»`,
      });
    }

    await app.db`
      INSERT INTO credits
        (obligation_id, bank, contract_number, opened_date, purpose,
         principal, total_payout, months_total, payments_before, rate_percent)
      VALUES
        (${id.data}, ${b.bank}, ${b.contractNumber ?? null}, ${b.openedDate ?? null},
         ${b.purpose ?? null}, ${b.principal}, ${b.totalPayout}, ${b.monthsTotal},
         ${b.paymentsBefore}, ${b.ratePercent ?? null})
      ON CONFLICT (obligation_id) DO UPDATE SET
        bank             = EXCLUDED.bank,
        contract_number  = EXCLUDED.contract_number,
        opened_date      = EXCLUDED.opened_date,
        purpose          = EXCLUDED.purpose,
        principal        = EXCLUDED.principal,
        total_payout     = EXCLUDED.total_payout,
        months_total     = EXCLUDED.months_total,
        payments_before  = EXCLUDED.payments_before,
        rate_percent     = EXCLUDED.rate_percent
    `;

    return { ok: true };
  });
};
