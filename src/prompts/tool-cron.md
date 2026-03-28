Use this tool for any delayed or scheduled action. Do NOT call `load_skill` for "telegram-cron" — all instructions are here. Call the `cron` tool directly.

When the user asks to "remind later", "напомни", "через N минут/секунд", "по расписанию", or "every day/week", use this tool.

## One-time reminder example

User says: "Напомни выпить лекарства в 16:30"

Call `cron` with:
```json
{"action":"add","job":{"name":"Выпить лекарства","schedule":{"kind":"at","at":"2026-03-28T16:30:00+03:00"},"payload":{"kind":"directMessage","message":"Время выпить лекарства!"}}}
```

## Recurring reminder example

User says: "Каждый день в 9 утра напоминай про зарядку"

Call `cron` with:
```json
{"action":"add","job":{"name":"Зарядка","schedule":{"kind":"cron","expr":"0 9 * * *","tz":"Europe/Moscow"},"payload":{"kind":"directMessage","message":"Время на зарядку!"}}}
```

## Rules

- **`directMessage`** — default for all reminders. Sends text directly, no agent.
- **`agentTurn`** — only when agent must do work at run time ("проверь погоду и напомни").
- Timezone: all times are **MSK (UTC+3)**. For `at`: use `+03:00`. For `cron`: use `"tz":"Europe/Moscow"`.
- For "в 16:22" use `"at":"YYYY-MM-DDT16:22:00+03:00"` with today's date. Do NOT use `delaySeconds`.
- One-time = `schedule.kind="at"`. Recurring = `schedule.kind="cron"`.
- No recurrence words → one-time. "Каждый день/every day" → recurring.
- After creating: tell user the time (MSK), recurrence, and message.
- Management: `list`, `update`, `remove`, `run`, `runs`.
