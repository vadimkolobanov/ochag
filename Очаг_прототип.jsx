import { useState, useEffect, useRef } from "react";

/* ════════════════════════════════════════════════════════════════
   «ОЧАГ» — интерактивный прототип всего приложения
   Брендбук: Лён/Хвоя/Янтарь · Golos Text + Unbounded · дуга 270°
   Сегодня = 11 июня 2026. Все данные — демонстрационные.
   ════════════════════════════════════════════════════════════════ */

const T = {
  bg: "#F2F1EC", surface: "#FFFFFF", ink: "#26282B", muted: "#7A7E83",
  primary: "#1E5C46", amber: "#D9A441", him: "#3D5A80", her: "#A8466B",
  danger: "#C0492F", ok: "#5E8C61", line: "#ECEAE3",
};
const NBSP = "\u00A0", THIN = "\u202F";
const fmt = (n) => Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, THIN);
const money = (n, c = "₽") => `${n < 0 ? "−" : ""}${fmt(n)}${NBSP}${c}`;

/* ── Демоданные ─────────────────────────────────────────────── */
const USERS = { him: { label: "Он", color: T.him }, her: { label: "Она", color: T.her } };
const CATS = [
  ["Продукты", "🧺"], ["Транспорт", "🚌"], ["Кафе", "☕"], ["Дом", "🏠"],
  ["Здоровье", "💚"], ["Одежда", "👕"], ["Материалы", "🖌️"], ["Другое", "•••"],
];
const START = {
  him: { balance: 18540, payday: "19 июня", daysLeft: 8, fill: 0.62 },
  her: { balance: 9870, payday: "25 июня", daysLeft: 14, fill: 0.41 },
};
const EXPENSES0 = [
  { id: 1, cat: "Продукты", icon: "🧺", date: "сегодня", amount: 1240, user: "him" },
  { id: 2, cat: "Кафе", icon: "☕", date: "вчера", amount: 460, user: "him" },
  { id: 3, cat: "Транспорт", icon: "🚌", date: "вчера", amount: 120, user: "him" },
  { id: 4, cat: "Продукты", icon: "🧺", date: "9 июня", amount: 2180, user: "her" },
  { id: 5, cat: "Здоровье", icon: "💚", date: "8 июня", amount: 890, user: "her" },
];
const BILLS = [
  { id: 1, name: "МТС", due: 10, amount: 450, status: "overdue" },
  { id: 2, name: "Телефон · Т-Банк", due: 15, amount: 4990, status: "due_soon", credit: 1 },
  { id: 3, name: "Коммуналка", due: 20, amount: 4200, status: "upcoming" },
  { id: 4, name: "Ремонт кухни · Сбер", due: 25, amount: 10833, status: "upcoming", credit: 2 },
  { id: 5, name: "Интернет", due: 5, amount: 600, status: "paid", paid: 600 },
];
const CREDITS = [
  { id: 1, name: "Телефон", bank: "Т-Банк", num: "0042-КН", opened: "сен 2024", purpose: "iPhone жене",
    monthly: 4990, total: 24, made: 21, principal: 89990, payout: 119760, close: "авг 2026", status: "due_soon" },
  { id: 2, name: "Ремонт кухни", bank: "Сбер", num: "39-117", opened: "мар 2024", purpose: "гарнитур и техника",
    monthly: 10833, total: 36, made: 14, principal: 300000, payout: 389988, close: "мар 2028", status: "upcoming" },
  { id: 3, name: "Дача — материалы", bank: "Альфа", num: "7711-Д", opened: "ноя 2025", purpose: "брус, кровля",
    monthly: 6250, total: 18, made: 6, principal: 95000, payout: 112500, close: "май 2027", status: "upcoming" },
  { id: 4, name: "Холодильник", bank: "Почта Банк", num: null, opened: "сен 2025", purpose: "рассрочка 0%",
    monthly: 3100, total: 12, made: 9, principal: 37200, payout: 37200, close: "авг 2026", status: "paid" },
];
const CAR = {
  name: "DongFeng Vigo", trim: "480 Max", plate: "0480 KH-7",
  bought: "фев 2026", odo: 8320,
  toEveryKm: 15000, toEveryLabel: "раз в 15 000 км или год",
  warrantyKm: 100000, warrantyTill: "фев 2029",
  tires: "215/55 R18", battery: 51.87,
};
const CHARGES = [
  { id: 1, date: "10 июня", place: "Дом", kwh: 32, sum: 8.6 },
  { id: 2, date: "6 июня", place: "Malanka", kwh: 35, sum: 22.8 },
  { id: 3, date: "2 июня", place: "Дом", kwh: 28, sum: 7.5 },
  { id: 4, date: "29 мая", place: "Дом", kwh: 30, sum: 8.1 },
  { id: 5, date: "24 мая", place: "Malanka", kwh: 38, sum: 24.7 },
];
const CAR_DATES = [
  { id: 1, name: "ТО у дилера", hint: "при 15 000 км · осталось 6 680 км", status: "due_soon" },
  { id: 2, name: "Гостехосмотр", hint: "первый — к июлю 2027", status: "upcoming" },
  { id: 3, name: "Страховка", hint: "до 24 фев 2027", status: "upcoming" },
  { id: 4, name: "Шины на зиму", hint: "≈ 15 октября · зимние в гараже", status: "upcoming" },
];

const SAVINGS = [
  { id: 1, label: "Из зарплаты Его", date: "19 мая", amount: 5000, dep: true },
  { id: 2, label: "Маме, лекарства", date: "14 мая", amount: -1800, dep: false },
  { id: 3, label: "Из зарплаты Её", date: "10 мая", amount: 2000, dep: true },
  { id: 4, label: "Дача, саженцы", date: "2 мая", amount: -3400, dep: false },
];
const HIST_CATS = [
  ["Продукты", 12400], ["Дом", 5100], ["Транспорт", 3200], ["Кафе", 2850], ["Здоровье", 1900],
];
const STATUS = { paid: T.ok, due_soon: T.amber, overdue: T.danger, upcoming: "#C9C7BF" };
const STATUS_LABEL = { paid: "оплачен", due_soon: "скоро срок", overdue: "просрочен", upcoming: "впереди" };

/* ── Хук count-up ───────────────────────────────────────────── */
function useCountUp(target, ms = 600) {
  const [v, setV] = useState(target);
  const prev = useRef(target);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setV(target); prev.current = target; return; }
    const from = prev.current, t0 = performance.now();
    let raf;
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      setV(from + (target - from) * e);
      if (k < 1) raf = requestAnimationFrame(tick); else prev.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

/* ── Дуга 270° ──────────────────────────────────────────────── */
function polar(cx, cy, r, a) { const rad = ((a - 90) * Math.PI) / 180; return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]; }
function arcPath(cx, cy, r, a0, a1) {
  const [sx, sy] = polar(cx, cy, r, a0), [ex, ey] = polar(cx, cy, r, a1);
  const sweep = (a1 - a0 + 360) % 360;
  if (sweep < 0.6) return "";
  return `M ${sx} ${sy} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${ex} ${ey}`;
}
function Arc({ fill, perDay, low }) {
  const animFill = useCountUp(fill, 800);
  const shown = useCountUp(perDay, 800);
  const end = 225 + Math.max(0.004, Math.min(1, animFill)) * 270;
  const [tipX, tipY] = polar(110, 102, 80, end % 360);
  return (
    <svg viewBox="0 0 220 172" style={{ width: "100%", display: "block" }}>
      <path d={arcPath(110, 102, 80, 225, 135)} fill="none" stroke={T.bg} strokeWidth="14" strokeLinecap="round" />
      <path d={arcPath(110, 102, 80, 225, end % 360)} fill="none" stroke={low ? T.danger : T.amber} strokeWidth="14" strokeLinecap="round" />
      {/* искра-уголёк на конце дуги — логотипный мотив */}
      <circle cx={tipX} cy={tipY} r="4.5" fill={low ? T.danger : T.amber} className="ember" />
      <text x="110" y="86" textAnchor="middle" style={{ font: `500 13px 'Golos Text'`, fill: T.muted }}>в день</text>
      <text x="110" y="122" textAnchor="middle" style={{ font: `700 40px 'Golos Text'`, fill: low ? T.danger : T.ink, fontVariantNumeric: "tabular-nums" }}>
        {fmt(shown)}
      </text>
      <text x="110" y="146" textAnchor="middle" style={{ font: `500 13px 'Golos Text'`, fill: T.muted }}>₽</text>
    </svg>
  );
}

/* ── Мелкие детали ──────────────────────────────────────────── */
const Dot = ({ s }) => <span style={{ width: 9, height: 9, borderRadius: 9, background: STATUS[s], flexShrink: 0 }} />;
const Avatar = ({ u, onClick, size = 36 }) => (
  <button onClick={onClick} className="press" style={{
    width: size, height: size, borderRadius: size, border: "none", cursor: "pointer",
    background: USERS[u].color, color: "#fff", font: `700 ${size * 0.4}px 'Golos Text'`,
  }}>{USERS[u].label}</button>
);
const Card = ({ children, style, onClick, className }) => (
  <div onClick={onClick} className={className} style={{
    background: T.surface, borderRadius: 20, boxShadow: "0 1px 3px rgb(38 40 43 / .07)", ...style,
  }}>{children}</div>
);
const H2 = ({ children }) => (
  <h2 style={{ font: `700 12px 'Golos Text'`, letterSpacing: ".08em", textTransform: "uppercase", color: T.muted, margin: "0 0 8px 4px" }}>{children}</h2>
);
const Row = ({ children, last, onClick }) => (
  <div onClick={onClick} style={{
    display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
    borderBottom: last ? "none" : `1px solid ${T.line}`, cursor: onClick ? "pointer" : "default",
  }}>{children}</div>
);

/* ── Экран: Сегодня ─────────────────────────────────────────── */
function Today({ user, setUser, data, expenses, openSheet, go }) {
  const d = data[user];
  const low = d.fill < 0.2;
  const myExp = expenses.filter((e) => e.user === user).slice(0, 4);
  const perDay = Math.max(0, Math.floor(d.balance / d.daysLeft));
  return (
    <div className="screen">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 6px" }}>
        <Avatar u={user} onClick={() => setUser(user === "him" ? "her" : "him")} />
        <span style={{ font: `700 20px 'Unbounded'`, color: T.primary }}>Очаг</span>
        <button className="press iconbtn" aria-label="Настройки">⚙</button>
      </div>

      <Card style={{ margin: "8px 16px 0", padding: "8px 16px 16px" }}>
        <Arc fill={d.fill} perDay={perDay} low={low} />
        <div style={{ textAlign: "center", marginTop: -8 }}>
          <div style={{ font: `500 15px 'Golos Text'`, color: T.ink }}>
            Осталось <b style={{ color: low ? T.danger : T.primary, fontVariantNumeric: "tabular-nums" }}>{money(d.balance)}</b>
          </div>
          <div style={{ font: `500 13px 'Golos Text'`, color: T.muted, marginTop: 2 }}>
            до зарплаты <b style={{ color: T.ink }}>{d.daysLeft}{NBSP}дн</b> ({d.payday})
          </div>
        </div>
      </Card>

      {user === "him" && (
        <div style={{ margin: "12px 16px 0", background: T.primary, borderRadius: 20, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ flex: 1, font: `500 14px 'Golos Text'`, color: "#fff" }}>Скоро зарплата — 19 июня</span>
          <button className="press" onClick={() => openSheet("income")} style={{ background: "#fff", color: T.primary, border: "none", borderRadius: 12, padding: "7px 12px", font: `700 13px 'Golos Text'`, cursor: "pointer" }}>
            Распределить
          </button>
        </div>
      )}

      <div style={{ margin: "18px 16px 0" }}>
        <H2>Ближайшие платежи</H2>
        <Card>
          {BILLS.filter((b) => b.status !== "paid").slice(0, 3).map((b, i, a) => (
            <Row key={b.id} last={i === a.length - 1} onClick={() => go("bills")}>
              <Dot s={b.status} />
              <span style={{ flex: 1, font: `500 15px 'Golos Text'`, color: T.ink }}>{b.name}</span>
              <span style={{ font: `400 13px 'Golos Text'`, color: T.muted }}>до {b.due}-го</span>
              <span className="tabnum" style={{ font: `600 14px 'Golos Text'`, color: T.ink }}>{money(b.amount)}</span>
            </Row>
          ))}
        </Card>
      </div>

      <div style={{ margin: "18px 16px 0" }}>
        <H2>Разделы</H2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { icon: "🚗", bg: "rgba(61,90,128,.12)", title: "Авто", sub: <>ТО через <b className="tabnum">6 680</b> км</>, act: () => go("auto") },
            { icon: "🪵", bg: "rgba(217,164,65,.16)", title: "Кредиты", sub: <>осталось <b className="tabnum">337 596</b> ₽</>, act: () => go("credits") },
            { icon: "🛒", bg: "rgba(30,92,70,.1)", title: "Покупки", sub: "скоро", soon: true },
            { icon: "🔌", bg: "rgba(168,70,107,.1)", title: "Счётчики", sub: "скоро", soon: true },
          ].map((t) => (
            <Card key={t.title} className="press" onClick={t.act ?? (() => {})} style={{ padding: "13px 14px", cursor: t.act ? "pointer" : "default", opacity: t.soon ? 0.55 : 1 }}>
              <span style={{ width: 34, height: 34, borderRadius: 11, background: t.bg, display: "grid", placeItems: "center", fontSize: 16 }}>{t.icon}</span>
              <div style={{ font: `600 14.5px 'Golos Text'`, color: T.ink, marginTop: 8 }}>{t.title}</div>
              <div style={{ font: `400 12px 'Golos Text'`, color: T.muted, marginTop: 1 }}>{t.sub}</div>
            </Card>
          ))}
        </div>
      </div>

      <div style={{ margin: "18px 16px 0" }}>
        <H2>Последние траты</H2>
        <Card>
          {myExp.length === 0 && <div style={{ padding: "20px 16px", font: `400 14px 'Golos Text'`, color: T.muted, textAlign: "center" }}>Пока нет трат — нажмите «+»</div>}
          {myExp.map((e, i) => (
            <Row key={e.id} last={i === myExp.length - 1}>
              <span style={{ width: 34, height: 34, borderRadius: 17, background: T.bg, display: "grid", placeItems: "center", fontSize: 16 }}>{e.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ font: `500 15px 'Golos Text'`, color: T.ink }}>{e.cat}</div>
                <div style={{ font: `400 12px 'Golos Text'`, color: T.muted }}>{e.date}</div>
              </div>
              <span className="tabnum" style={{ font: `600 15px 'Golos Text'`, color: T.ink }}>−{money(e.amount)}</span>
            </Row>
          ))}
        </Card>
      </div>
    </div>
  );
}

/* ── Экран: Платежи ─────────────────────────────────────────── */
function Bills({ go }) {
  const [paidIds, setPaid] = useState(new Set([5]));
  const items = BILLS.map((b) => paidIds.has(b.id) ? { ...b, status: "paid" } : b);
  const paidSum = items.filter((b) => b.status === "paid").reduce((s, b) => s + b.amount, 0);
  const planned = items.reduce((s, b) => s + b.amount, 0);
  const creditsLeft = CREDITS.reduce((s, c) => s + (c.payout - c.made * c.monthly), 0);
  return (
    <div className="screen">
      <Header title="Платежи" />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, padding: "4px 0 10px" }}>
        <button className="press iconbtn">‹</button>
        <span style={{ font: `700 16px 'Golos Text'`, color: T.ink }}>Июнь 2026</span>
        <button className="press iconbtn" style={{ opacity: 0.3 }}>›</button>
      </div>
      <p style={{ margin: "0 20px 10px", font: `400 13px 'Golos Text'`, color: T.muted }}>
        Оплачено {items.filter((b) => b.status === "paid").length} из {items.length} · {money(paidSum)} из плановых {money(planned)} · отложено {money(16000)}
      </p>
      <Card style={{ margin: "0 16px" }}>
        {items.sort((a, b) => a.due - b.due).map((b, i, a) => (
          <Row key={b.id} last={i === a.length - 1} onClick={() => setPaid((p) => { const n = new Set(p); n.has(b.id) ? n.delete(b.id) : n.add(b.id); return n; })}>
            <Dot s={b.status} />
            <div style={{ flex: 1 }}>
              <div style={{ font: `500 15px 'Golos Text'`, color: T.ink }}>{b.name}</div>
              <div style={{ font: `400 12px 'Golos Text'`, color: b.status === "overdue" ? T.danger : T.muted }}>
                до {b.due}-го · {STATUS_LABEL[b.status]}
              </div>
            </div>
            <span className="tabnum" style={{ font: `600 14px 'Golos Text'`, color: T.ink }}>{money(b.paid ?? b.amount)}</span>
            <span style={{
              width: 26, height: 26, borderRadius: 13, display: "grid", placeItems: "center", flexShrink: 0,
              border: b.status === "paid" ? "none" : `2px solid ${T.line}`,
              background: b.status === "paid" ? T.ok : "transparent", color: "#fff", fontSize: 14,
            }}>{b.status === "paid" ? "✓" : ""}</span>
          </Row>
        ))}
      </Card>

      {/* Вход в реестр кредитов */}
      <Card className="press" onClick={() => go("credits")} style={{ margin: "14px 16px 0", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
        <span style={{ width: 36, height: 36, borderRadius: 12, background: "rgba(217,164,65,.16)", display: "grid", placeItems: "center", fontSize: 17 }}>🪵</span>
        <div style={{ flex: 1 }}>
          <div style={{ font: `600 15px 'Golos Text'`, color: T.ink }}>Кредиты</div>
          <div style={{ font: `400 13px 'Golos Text'`, color: T.muted }}>осталось выплатить <b className="tabnum" style={{ color: T.ink }}>{money(creditsLeft)}</b></div>
        </div>
        <span style={{ color: T.muted, fontSize: 18 }}>›</span>
      </Card>

      <button className="press" style={{ margin: "14px 16px 0", height: 46, borderRadius: 14, border: "none", background: T.surface, boxShadow: "0 1px 3px rgb(38 40 43/.07)", font: `500 14px 'Golos Text'`, color: T.ink, cursor: "pointer", width: "calc(100% - 32px)" }}>
        Управлять платежами
      </button>
      <p style={{ margin: "10px 24px 0", font: `400 12px 'Golos Text'`, color: T.muted, textAlign: "center" }}>
        Нажмите на строку, чтобы отметить оплату (демо)
      </p>
    </div>
  );
}

/* ── Лента погашения: каждый сегмент = один платёж ──────────── */
function Ribbon({ total, made, active }) {
  const segs = Array.from({ length: total });
  return (
    <div style={{ display: "flex", gap: total > 26 ? 1.5 : 2.5, margin: "10px 0 4px" }} aria-label={`выплачено ${made} из ${total}`}>
      {segs.map((_, i) => {
        const isCur = i === made && active;
        return <span key={i} className={isCur ? "ember" : ""} style={{
          flex: 1, height: 7, borderRadius: 4,
          background: i < made ? T.primary : isCur ? T.amber : "#E7E5DE",
        }} />;
      })}
    </div>
  );
}

/* ── Экран: Кредиты ─────────────────────────────────────────── */
function Credits({ go }) {
  const left = CREDITS.map((c) => ({ ...c, leftPay: c.payout - c.made * c.monthly, leftN: c.total - c.made }));
  const totalLeft = left.reduce((s, c) => s + c.leftPay, 0);
  const monthly = left.filter((c) => c.leftN > 0).reduce((s, c) => s + c.monthly, 0);
  const shown = useCountUp(totalLeft, 700);
  const [open, setOpen] = useState(null);

  /* «Станет легче»: нагрузка по месяцам до последнего закрытия */
  const closures = [["авг’26", 8090], ["май’27", 6250], ["мар’28", 10833]];
  let load = monthly;
  const steps = [{ m: "сейчас", v: load }];
  for (const [m, drop] of closures) { load -= drop; steps.push({ m: `после ${m}`, v: load }); }
  const maxV = steps[0].v;

  return (
    <div className="screen">
      <Header title="Кредиты" back onBack={() => go("bills")} />
      <div style={{ textAlign: "center", padding: "6px 0 2px" }}>
        <div style={{ font: `500 12px 'Golos Text'`, letterSpacing: ".08em", textTransform: "uppercase", color: T.muted }}>Осталось выплатить</div>
        <div className="tabnum" style={{ font: `700 42px 'Golos Text'`, color: T.ink, lineHeight: 1.15 }}>{money(shown)}</div>
        <div style={{ font: `400 13px 'Golos Text'`, color: T.muted }}>в месяц {money(monthly)} · кредитов {CREDITS.length}</div>
      </div>

      {/* Сигнатура: график «Станет легче» */}
      <Card style={{ margin: "14px 16px 0", padding: "14px 16px 12px" }}>
        <div style={{ font: `600 14px 'Golos Text'`, color: T.ink, marginBottom: 10 }}>Станет легче</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 96 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, height: "100%", justifyContent: "flex-end" }}>
              <span className="tabnum" style={{ font: `600 11px 'Golos Text'`, color: s.v === 0 ? T.ok : T.ink }}>{s.v === 0 ? "свобода" : fmt(s.v)}</span>
              <div className="grow" style={{
                width: "100%", borderRadius: "8px 8px 4px 4px",
                height: `${Math.max(6, (s.v / maxV) * 64)}px`,
                background: i === 0 ? T.amber : s.v === 0 ? T.ok : T.primary, opacity: i === 0 ? 1 : 0.92,
              }} />
              <span style={{ font: `400 10.5px 'Golos Text'`, color: T.muted, textAlign: "center", lineHeight: 1.2 }}>{s.m}</span>
            </div>
          ))}
        </div>
      </Card>

      <div style={{ margin: "16px 16px 0", display: "flex", flexDirection: "column", gap: 12 }}>
        {left.sort((a, b) => a.leftN - b.leftN).map((c) => {
          const exp = open === c.id;
          return (
            <Card key={c.id} onClick={() => setOpen(exp ? null : c.id)} style={{ padding: "13px 16px", cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <Dot s={c.status} />
                <span style={{ font: `600 15px 'Golos Text'`, color: T.ink }}>{c.name}</span>
                <span style={{ font: `400 13px 'Golos Text'`, color: T.muted }}>{c.bank}</span>
                <span className="tabnum" style={{ marginLeft: "auto", font: `700 15px 'Golos Text'`, color: T.ink }}>{money(c.leftPay)}</span>
              </div>
              <Ribbon total={c.total} made={c.made} active={c.status !== "paid"} />
              <div style={{ display: "flex", justifyContent: "space-between", font: `400 12px 'Golos Text'`, color: T.muted }}>
                <span>выплачено <b className="tabnum" style={{ color: T.ink }}>{c.made} из {c.total}</b></span>
                <span>{c.leftN === 0 ? <b style={{ color: T.ok }}>выплачен 🎉</b> : <>закроется в <b style={{ color: T.ink }}>{c.close}</b></>}</span>
              </div>
              {exp && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.line}`, display: "grid", gap: 6, font: `400 13px 'Golos Text'`, color: T.muted }}>
                  <div>Платёж — <b className="tabnum" style={{ color: T.ink }}>{money(c.monthly)}</b> в месяц</div>
                  <div>Переплата по договору — <b className="tabnum" style={{ color: c.payout === c.principal ? T.ok : T.ink }}>{c.payout === c.principal ? "0 ₽" : money(c.payout - c.principal)}</b></div>
                  <div style={{ fontSize: 12 }}>{c.num ? `№ ${c.num} · ` : ""}открыт {c.opened} · {c.purpose}</div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
      <p style={{ margin: "12px 24px 0", font: `400 12px 'Golos Text'`, color: T.muted, textAlign: "center" }}>Нажмите на кредит — раскроются детали договора</p>
    </div>
  );
}

/* ── Экран: Копилка ─────────────────────────────────────────── */
function Savings() {
  const bal = useCountUp(184500, 700);
  return (
    <div className="screen">
      <Header title="Копилка" />
      <div style={{ textAlign: "center", padding: "10px 0 4px" }}>
        <div style={{ font: `500 12px 'Golos Text'`, letterSpacing: ".08em", textTransform: "uppercase", color: T.muted }}>🐷 Накоплено</div>
        <div className="tabnum" style={{ font: `700 46px 'Golos Text'`, color: T.amber, lineHeight: 1.2 }}>{money(bal)}</div>
      </div>
      <div style={{ display: "flex", gap: 10, margin: "14px 16px 4px" }}>
        <button className="press btn-primary" style={{ flex: 1 }}>+ Пополнить</button>
        <button className="press btn-ghost" style={{ flex: 1 }}>− Снять</button>
      </div>
      <div style={{ margin: "16px 16px 0" }}>
        <H2>История</H2>
        <Card>
          {SAVINGS.map((s, i) => (
            <Row key={s.id} last={i === SAVINGS.length - 1}>
              <span style={{
                width: 32, height: 32, borderRadius: 16, display: "grid", placeItems: "center", font: `700 16px 'Golos Text'`,
                background: s.dep ? "rgba(94,140,97,.13)" : "rgba(192,73,47,.10)", color: s.dep ? T.ok : T.danger,
              }}>{s.dep ? "+" : "−"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ font: `500 14.5px 'Golos Text'`, color: T.ink }}>{s.label}</div>
                <div style={{ font: `400 12px 'Golos Text'`, color: T.muted }}>{s.date}</div>
              </div>
              <span className="tabnum" style={{ font: `600 15px 'Golos Text'`, color: s.dep ? T.ok : T.danger }}>{s.dep ? "+" : "−"}{money(s.amount)}</span>
            </Row>
          ))}
        </Card>
        <p style={{ margin: "10px 8px 0", font: `400 12px 'Golos Text'`, color: T.muted }}>
          Снятие всегда с целью — так видно, на что уходит непостоянный бюджет.
        </p>
      </div>
    </div>
  );
}

/* ── Экран: Итоги ───────────────────────────────────────────── */
function History() {
  const total = HIST_CATS.reduce((s, [, v]) => s + v, 0);
  return (
    <div className="screen">
      <Header title="Итоги" />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, padding: "4px 0 10px" }}>
        <button className="press iconbtn">‹</button>
        <span style={{ font: `700 16px 'Golos Text'`, color: T.ink }}>Июнь 2026</span>
        <button className="press iconbtn" style={{ opacity: 0.3 }}>›</button>
      </div>
      <div style={{ margin: "0 16px" }}>
        <H2>Повседневные траты · {money(total)}</H2>
        <Card style={{ padding: "14px 16px" }}>
          {HIST_CATS.map(([name, v], i) => (
            <div key={name} style={{ marginBottom: i === HIST_CATS.length - 1 ? 0 : 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, font: `500 14px 'Golos Text'`, color: T.ink }}>
                <span>{name}</span>
                <span><span className="tabnum" style={{ color: T.muted, fontSize: 13 }}>{Math.round((v / total) * 100)}%{NBSP}{NBSP}</span><b className="tabnum">{money(v)}</b></span>
              </div>
              <div style={{ height: 8, borderRadius: 8, background: "#E8E7E2", overflow: "hidden" }}>
                <div className="grow" style={{ height: "100%", width: `${(v / total) * 100}%`, background: T.primary, borderRadius: 8 }} />
              </div>
            </div>
          ))}
        </Card>
      </div>
      <div style={{ margin: "16px 16px 0" }}>
        <H2>Доходы</H2>
        <Card>
          {[["Зарплата", 47000], ["Аванс", 12000], ["Маникюр ✨", 7300]].map(([l, v], i, a) => (
            <Row key={l} last={i === a.length - 1}>
              <span style={{ flex: 1, font: `500 15px 'Golos Text'`, color: T.ink }}>{l}</span>
              <span className="tabnum" style={{ font: `600 15px 'Golos Text'`, color: T.ok }}>+{money(v)}</span>
            </Row>
          ))}
        </Card>
      </div>
      <div style={{ margin: "16px 16px 0" }}>
        <H2>Копилка и платежи</H2>
        <Card style={{ padding: "13px 16px", display: "grid", gap: 7, font: `400 14px 'Golos Text'`, color: T.ink }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: T.muted }}>В копилку</span><b className="tabnum" style={{ color: T.ok }}>+{money(7000)}</b></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: T.muted }}>Из копилки</span><b className="tabnum" style={{ color: T.danger }}>−{money(5200)}</b></div>
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 7, borderTop: `1px solid ${T.line}` }}><span style={{ color: T.muted }}>Платежи</span><span>оплачено <b className="tabnum">1 из 5</b></span></div>
        </Card>
      </div>
    </div>
  );
}

/* ── Сигнатура: дорога пробега 0 → конец гарантии ───────────── */
function Road({ odo, toKm, warrKm }) {
  const W = 320, x = (km) => 14 + (km / warrKm) * (W - 28);
  return (
    <svg viewBox={`0 0 ${W} 78`} style={{ width: "100%", display: "block" }}>
      <line x1="14" y1="40" x2={W - 14} y2="40" stroke="#E7E5DE" strokeWidth="6" strokeLinecap="round" />
      <line x1="14" y1="40" x2={x(odo)} y2="40" stroke={T.primary} strokeWidth="6" strokeLinecap="round" />
      {/* флажок ТО */}
      <line x1={x(toKm)} y1="40" x2={x(toKm)} y2="22" stroke={T.amber} strokeWidth="2" />
      <text x={x(toKm)} y="15" textAnchor="middle" style={{ font: `600 10px 'Golos Text'`, fill: T.amber }}>ТО 15 000</text>
      {/* финиш гарантии */}
      <line x1={x(warrKm)} y1="40" x2={x(warrKm)} y2="22" stroke={T.muted} strokeWidth="2" />
      <text x={x(warrKm)} y="15" textAnchor="end" style={{ font: `500 10px 'Golos Text'`, fill: T.muted }}>гарантия 100 000</text>
      {/* машинка */}
      <circle cx={x(odo)} cy="40" r="8" fill={T.primary} />
      <text x={x(odo)} y="44" textAnchor="middle" style={{ fontSize: 9, fill: "#fff" }}>🚗</text>
      <text x={x(odo)} y="64" textAnchor="middle" className="tabnum" style={{ font: `700 12px 'Golos Text'`, fill: T.ink }}>{fmt(odo)} км</text>
    </svg>
  );
}

/* ── Экран: Авто ────────────────────────────────────────────── */
function Auto({ go, showToast }) {
  const [odo, setOdo] = useState(CAR.odo);
  const [editing, setEditing] = useState(false);
  const [charges, setCharges] = useState(CHARGES);

  const kwhTotal = charges.reduce((s, c) => s + c.kwh, 0);
  const sumTotal = charges.reduce((s, c) => s + c.sum, 0);
  const kmDriven = 1100; // демо: пробег за период журнала
  const per100 = (kwhTotal / kmDriven) * 100;
  const cost100 = (sumTotal / kmDriven) * 100;
  const petrol100 = 8 * 2.36; // 8 л/100 км × АИ-95
  const saved = Math.round((petrol100 - cost100) * (odo / 100));
  const r2 = (n) => n.toFixed(n < 10 ? 1 : 0).replace(".", ",");

  const addCharge = () => {
    setCharges((c) => [{ id: Date.now(), date: "сегодня", place: "Дом", kwh: 31, sum: 8.4 }, ...c]);
    showToast("Зарядка записана ⚡");
  };

  return (
    <div className="screen">
      <Header title="Авто" back onBack={() => go("today")} />

      {/* Гараж */}
      <Card style={{ margin: "4px 16px 0", padding: "14px 16px 8px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ font: `700 16px 'Golos Text'`, color: T.ink }}>{CAR.name}</span>
          <span style={{ font: `400 13px 'Golos Text'`, color: T.muted }}>{CAR.trim} · {CAR.plate}</span>
          <span style={{ marginLeft: "auto", font: `400 12px 'Golos Text'`, color: T.muted }}>⚡ EV</span>
        </div>
        <div style={{ textAlign: "center", padding: "10px 0 2px" }} onClick={() => setEditing(true)}>
          {editing ? (
            <input autoFocus type="number" defaultValue={odo}
              onBlur={(e) => { setOdo(Math.max(0, parseInt(e.target.value || odo, 10))); setEditing(false); }}
              onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
              style={{ font: `700 34px 'Golos Text'`, color: T.ink, width: 170, textAlign: "center", border: "none", borderBottom: `2px solid ${T.amber}`, background: "none", outline: "none" }} />
          ) : (
            <>
              <span className="tabnum" style={{ font: `700 38px 'Golos Text'`, color: T.ink }}>{fmt(odo)}</span>
              <span style={{ font: `500 15px 'Golos Text'`, color: T.muted }}> км ✎</span>
            </>
          )}
          <div style={{ font: `400 11.5px 'Golos Text'`, color: T.muted, marginTop: 2 }}>нажмите, чтобы обновить пробег</div>
        </div>
        <Road odo={odo} toKm={CAR.toEveryKm} warrKm={CAR.warrantyKm} />
      </Card>

      {/* Зарядка */}
      <div style={{ margin: "16px 16px 0" }}>
        <H2>Зарядка</H2>
        <Card style={{ padding: "13px 16px" }}>
          <div style={{ display: "flex", textAlign: "center" }}>
            {[[r2(cost100) + " ₽", "стоит 100 км"], [r2(per100), "кВт·ч / 100 км"], ["+" + fmt(saved) + " ₽", "vs бензин"]].map(([v, l], i) => (
              <div key={l} style={{ flex: 1, borderLeft: i ? `1px solid ${T.line}` : "none" }}>
                <div className="tabnum" style={{ font: `700 17px 'Golos Text'`, color: i === 2 ? T.ok : T.ink }}>{v}</div>
                <div style={{ font: `400 11px 'Golos Text'`, color: T.muted }}>{l}</div>
              </div>
            ))}
          </div>
          <button className="press" onClick={addCharge} style={{ marginTop: 12, width: "100%", height: 44, borderRadius: 14, border: "none", background: "rgba(217,164,65,.16)", color: "#9A742C", font: `600 14px 'Golos Text'`, cursor: "pointer" }}>
            ⚡ Зарядился
          </button>
        </Card>
        <Card style={{ marginTop: 10 }}>
          {charges.slice(0, 4).map((c, i, a) => (
            <Row key={c.id} last={i === a.length - 1}>
              <span style={{ width: 32, height: 32, borderRadius: 16, background: c.place === "Дом" ? "rgba(30,92,70,.1)" : "rgba(217,164,65,.16)", display: "grid", placeItems: "center", fontSize: 14 }}>{c.place === "Дом" ? "🏠" : "⚡"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ font: `500 14.5px 'Golos Text'`, color: T.ink }}>{c.place}</div>
                <div style={{ font: `400 12px 'Golos Text'`, color: T.muted }}>{c.date} · {c.kwh} кВт·ч</div>
              </div>
              <span className="tabnum" style={{ font: `600 14px 'Golos Text'`, color: T.ink }}>−{c.sum.toFixed(2).replace(".", ",")} ₽</span>
            </Row>
          ))}
        </Card>
      </div>

      {/* Сроки */}
      <div style={{ margin: "16px 16px 0" }}>
        <H2>Сроки</H2>
        <Card>
          {CAR_DATES.map((d, i) => (
            <Row key={d.id} last={i === CAR_DATES.length - 1}>
              <Dot s={d.status} />
              <div style={{ flex: 1 }}>
                <div style={{ font: `500 15px 'Golos Text'`, color: T.ink }}>{d.name}</div>
                <div style={{ font: `400 12px 'Golos Text'`, color: T.muted }}>{d.hint}</div>
              </div>
              <span style={{ color: T.muted }}>›</span>
            </Row>
          ))}
        </Card>
      </div>

      {/* Батарея */}
      <div style={{ margin: "16px 16px 0" }}>
        <H2>Батарея · LFP {CAR.battery} кВт·ч</H2>
        <Card style={{ padding: "13px 16px", display: "grid", gap: 8, font: `400 13.5px 'Golos Text'`, color: T.ink }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: T.muted }}>Гарантия</span>
            <b>до {CAR.warrantyTill} · <span className="tabnum">{fmt(CAR.warrantyKm - odo)}</span> км</b>
          </div>
          <div style={{ background: "rgba(217,164,65,.13)", borderRadius: 12, padding: "9px 12px", font: `400 12.5px 'Golos Text'`, color: "#7d5e22" }}>
            💡 LFP-батарее полезно раз в 2–3 недели заряжаться до 100% — калибрует датчик заряда. Последний раз: 24 мая.
          </div>
        </Card>
      </div>

      {/* Стоимость владения */}
      <div style={{ margin: "16px 16px 0" }}>
        <H2>Июнь · во сколько обходится</H2>
        <Card style={{ padding: "13px 16px", display: "grid", gap: 7, font: `400 14px 'Golos Text'` }}>
          {[["Зарядки", 38.9], ["Мойка", 18], ["Омывайка", 9.5]].map(([l, v]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", color: T.muted }}>
              <span>{l}</span><b className="tabnum" style={{ color: T.ink }}>{v.toFixed(2).replace(".", ",")} ₽</b>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 7, borderTop: `1px solid ${T.line}`, color: T.ink }}>
            <b>Итого</b><b className="tabnum">66,40 ₽</b>
          </div>
        </Card>
      </div>
    </div>
  );
}

const Header = ({ title, back, onBack }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 16px 6px" }}>
    {back && <button className="press iconbtn" onClick={onBack} aria-label="Назад">←</button>}
    <h1 style={{ font: `700 18px 'Unbounded'`, color: T.primary, margin: 0 }}>{title}</h1>
  </div>
);

/* ── Быстрый ввод (bottom sheet + пинпад) ───────────────────── */
function QuickSheet({ open, tab0, onClose, user, addExpense }) {
  const [tab, setTab] = useState(tab0);
  const [v, setV] = useState("");
  useEffect(() => { if (open) { setTab(tab0); setV(""); } }, [open, tab0]);
  if (!open) return null;
  const amount = parseInt(v || "0", 10);
  const press = (k) => {
    if (k === "⌫") return setV(v.slice(0, -1));
    if (v.length >= 7 || (v === "" && k === "0")) return;
    setV(v + k);
  };
  const keys = ["1","2","3","4","5","6","7","8","9",",","0","⌫"];
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(38,40,43,.42)" }} />
      <div className="sheet" style={{ position: "relative", background: T.surface, borderRadius: "24px 24px 0 0", paddingBottom: 18 }}>
        <div style={{ display: "grid", placeItems: "center", padding: "10px 0 4px" }}><span style={{ width: 40, height: 4, borderRadius: 4, background: "#D0CFC9" }} /></div>
        <div style={{ display: "flex", margin: "0 16px", borderBottom: `1px solid ${T.line}` }}>
          {[["expense","Трата"],["income","Доход"],["transfer","Перевод"]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className="press" style={{
              flex: 1, padding: "8px 0 10px", border: "none", background: "none", cursor: "pointer",
              font: `600 14px 'Golos Text'`, color: tab === k ? T.primary : T.muted,
              borderBottom: tab === k ? `2px solid ${T.primary}` : "2px solid transparent",
            }}>{l}</button>
          ))}
        </div>

        <div style={{ textAlign: "center", padding: "14px 0 6px" }}>
          <span className="tabnum" style={{ font: `700 44px 'Golos Text'`, color: v ? T.ink : T.muted }}>{v ? fmt(amount) : "0"}</span>
          <span style={{ font: `500 22px 'Golos Text'`, color: T.muted }}>{NBSP}₽</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, padding: "0 16px" }}>
          {keys.map((k) => (
            <button key={k} className="press" onClick={() => press(k)} style={{
              height: 52, borderRadius: 14, border: "none", background: T.bg, cursor: "pointer",
              font: `600 21px 'Golos Text'`, color: T.ink,
            }}>{k}</button>
          ))}
        </div>

        {tab === "expense" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, padding: "14px 16px 0" }}>
            {CATS.map(([name, icon]) => (
              <button key={name} className="press" disabled={!amount} onClick={() => { addExpense(name, icon, amount); onClose(); }} style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "10px 0",
                borderRadius: 16, border: "none", background: T.bg, cursor: amount ? "pointer" : "default", opacity: amount ? 1 : 0.45,
              }}>
                <span style={{ fontSize: 21 }}>{icon}</span>
                <span style={{ font: `500 11px 'Golos Text'`, color: T.ink }}>{name}</span>
              </button>
            ))}
          </div>
        )}
        {tab === "income" && (
          <div style={{ padding: "14px 16px 0", display: "grid", gap: 10 }}>
            {[["На платежи", "16 073", "подставлено: неоплаченные платежи июня"], ["В копилку", "", ""], ["Себе на повседневные", v ? fmt(Math.max(0, amount - 16073)) : "", "остаток — считается сам"]].map(([l, val, hint]) => (
              <div key={l}>
                <div style={{ font: `500 12.5px 'Golos Text'`, color: T.muted, marginBottom: 3 }}>{l}</div>
                <div style={{ height: 46, borderRadius: 14, background: T.bg, border: `1px solid #E0DFD9`, display: "flex", alignItems: "center", padding: "0 14px", justifyContent: "space-between" }}>
                  <span className="tabnum" style={{ font: `600 16px 'Golos Text'`, color: val ? T.ink : T.muted }}>{val || "0"}</span>
                  <span style={{ font: `500 13px 'Golos Text'`, color: T.muted }}>₽</span>
                </div>
                {hint && <div style={{ font: `400 11px 'Golos Text'`, color: T.amber, marginTop: 2 }}>{hint}</div>}
              </div>
            ))}
            <button className="press btn-primary" onClick={onClose} disabled={!amount} style={{ opacity: amount ? 1 : 0.5 }}>Распределить</button>
          </div>
        )}
        {tab === "transfer" && (
          <div style={{ padding: "16px 16px 0", display: "grid", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <Avatar u={user} size={34} /><span style={{ font: `500 16px`, color: T.muted }}>→</span><Avatar u={user === "him" ? "her" : "him"} size={34} />
              <span style={{ font: `400 12px 'Golos Text'`, color: T.muted }}>поменять</span>
            </div>
            <button className="press btn-primary" onClick={onClose} disabled={!amount} style={{ opacity: amount ? 1 : 0.5 }}>Перевести</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Нижняя навигация + FAB ─────────────────────────────────── */
const TABS = [["today","⌂","Сегодня"],["bills","☑","Платежи"],["savings","🐷","Копилка"],["history","▥","Итоги"]];
function Nav({ screen, go }) {
  return (
    <nav style={{
      position: "absolute", bottom: "calc(14px + env(safe-area-inset-bottom, 0px))", left: 14, right: 14,
      background: T.surface, borderRadius: 26, display: "flex", zIndex: 30,
      boxShadow: "0 8px 28px rgb(38 40 43/.18), 0 1px 0 rgb(255 255 255/.6) inset",
    }}>
      {TABS.map(([k, icon, label]) => {
        const active = screen === k || (k === "bills" && screen === "credits") || (k === "today" && screen === "auto");
        return (
          <button key={k} className="press" onClick={() => go(k)} style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            padding: "9px 0 11px", border: "none", background: "none", cursor: "pointer",
            borderRadius: 26,
            color: active ? T.primary : T.muted,
          }}>
            <span style={{ fontSize: 19, lineHeight: 1 }}>{icon}</span>
            <span style={{ font: `500 10.5px 'Golos Text'` }}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/* ── Приложение ─────────────────────────────────────────────── */
export default function OchagPrototype() {
  const [user, setUser] = useState("him");
  const [screen, setScreen] = useState("today");
  const [sheet, setSheet] = useState(null); // null | 'expense' | 'income' | 'transfer'
  const [data, setData] = useState(START);
  const [expenses, setExpenses] = useState(EXPENSES0);
  const [toast, setToast] = useState(null);

  const addExpense = (cat, icon, amount) => {
    setExpenses((e) => [{ id: Date.now(), cat, icon, date: "сегодня", amount, user }, ...e]);
    setData((d) => ({ ...d, [user]: { ...d[user], balance: d[user].balance - amount, fill: Math.max(0, d[user].fill - amount / 30000) } }));
    setToast("Записано ✓");
    setTimeout(() => setToast(null), 1800);
    setScreen("today");
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 1800); };

  const SCREENS = {
    today: <Today user={user} setUser={setUser} data={data} expenses={expenses} openSheet={setSheet} go={setScreen} />,
    bills: <Bills go={setScreen} />,
    credits: <Credits go={setScreen} />,
    auto: <Auto go={setScreen} showToast={showToast} />,
    savings: <Savings />,
    history: <History />,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#E9E7E0", display: "grid", placeItems: "center", padding: "28px 12px", fontFamily: "'Golos Text', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600;700&family=Unbounded:wght@700&display=swap');
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        .tabnum { font-variant-numeric: tabular-nums; }
        .press { transition: opacity .12s, transform .12s; }
        .press:active { opacity: .7; transform: scale(.97); }
        .iconbtn { width: 34px; height: 34px; border: none; background: none; cursor: pointer; color: ${T.muted}; font-size: 19px; border-radius: 17px; display: grid; place-items: center; }
        .btn-primary { height: 48px; border-radius: 14px; border: none; background: ${T.primary}; color: #fff; font: 600 15px 'Golos Text'; cursor: pointer; }
        .btn-ghost { height: 48px; border-radius: 14px; border: none; background: ${T.surface}; box-shadow: 0 1px 3px rgb(38 40 43/.07); color: ${T.ink}; font: 600 15px 'Golos Text'; cursor: pointer; }
        .screen { height: 100%; overflow-y: auto; padding-bottom: calc(110px + env(safe-area-inset-bottom, 0px)); animation: fade .22s ease; }
        @keyframes fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .sheet { animation: rise .26s cubic-bezier(.2,.9,.3,1); }
        @keyframes rise { from { transform: translateY(40%); } to { transform: none; } }
        @keyframes emberPulse { 0%,100% { opacity: 1; } 50% { opacity: .45; } }
        .ember { animation: emberPulse 1.8s ease-in-out infinite; }
        .grow { transform-origin: bottom; animation: grow .6s cubic-bezier(.2,.9,.3,1); }
        @keyframes grow { from { transform: scaleY(0); } to { transform: none; } }
        @media (prefers-reduced-motion: reduce) { .ember, .grow, .screen, .sheet { animation: none !important; } }
        ::-webkit-scrollbar { width: 0; }
      `}</style>

      {/* Телефон */}
      <div style={{
        position: "relative", width: "min(400px, 100%)", height: "min(820px, calc(100vh - 56px))",
        background: T.bg, borderRadius: 32, overflow: "hidden",
        boxShadow: "0 24px 60px rgb(38 40 43/.22), 0 0 0 10px #2E3033, 0 0 0 12px #1d1f21",
      }}>
        {SCREENS[screen]}
        <Nav screen={screen} go={setScreen} />
        {/* FAB */}
        <button className="press" onClick={() => setSheet("expense")} aria-label="Добавить" style={{
          position: "absolute", bottom: "calc(88px + env(safe-area-inset-bottom, 0px))", left: "50%", transform: "translateX(calc(-50% + 124px))",
          width: 56, height: 56, borderRadius: 28, border: "none", background: T.primary, color: "#fff",
          fontSize: 30, fontWeight: 300, cursor: "pointer", boxShadow: "0 6px 16px rgb(30 92 70/.4)", zIndex: 40, lineHeight: 1,
        }}>+</button>

        <QuickSheet open={!!sheet} tab0={sheet ?? "expense"} onClose={() => setSheet(null)} user={user} addExpense={addExpense} />

        {toast && (
          <div style={{
            position: "absolute", bottom: 140, left: "50%", transform: "translateX(-50%)", zIndex: 60,
            background: T.ink, color: "#fff", borderRadius: 14, padding: "10px 18px", font: `500 14px 'Golos Text'`,
          }}>{toast}</div>
        )}
      </div>
      <p style={{ margin: "14px 0 0", font: `400 12px 'Golos Text'`, color: "#9a988f", textAlign: "center" }}>
        Прототип «Очаг» · всё кликабельно: профиль, вкладки, «+», чек-лист платежей, карточки кредитов
      </p>
    </div>
  );
}
