---
name: telegram-cron
description: "Create scheduled cron jobs that send Telegram messages. Use when: user asks to set up a reminder (one-time or recurring), scheduled notification, or recurring message via Telegram. NOT for: immediate (non-scheduled) messages or non-Telegram channels."
metadata: { "eggent": { "emoji": "⏰" } }
---

# Telegram Cron Skill

Create cron jobs that deliver scheduled messages to a Telegram chat.

## Timezone

**All times are Moscow Time (MSK, UTC+3).** Always use `"Europe/Moscow"` as the timezone.

- For `at` schedules: always include `+03:00` offset in the ISO string (e.g. `"2026-03-18T15:00:00+03:00"`).
- For `cron` schedules: always set `"tz": "Europe/Moscow"` in the schedule object. Cron expressions are then interpreted in MSK.
- For `delaySeconds`: compute seconds from current MSK time to target MSK time — no offset needed.

## How It Works

When the user asks from **within a Telegram chat**, `telegramChatId` is injected automatically from context — you do NOT need to ask for it or pass it manually.

When called from the **web UI**, you must include `payload.telegramChatId` explicitly (numeric Telegram chat ID).

## Payload kind — which to choose

| Situation | kind | Field |
|---|---|---|
| Simple reminder — just send text to the user | `directMessage` | `message` — the exact text to send |
| Complex task — agent needs to do something (search, calculate, etc.) | `agentTurn` | `message` — instruction for the agent |

**Use `directMessage` for almost all reminders.** The message is sent directly to Telegram without running the agent — no formatting, no extra text, exactly what the user asked.

**Use `agentTurn` only** when the task requires the agent to do work at the time of the reminder (e.g. "check weather and remind me", "look up exchange rate and notify").

## One-Time vs Recurring — How to Choose

- **No recurrence mentioned** ("напомни в 16:00", "remind me at 5pm") → one-time (`kind: "at"` or `delaySeconds`)
- **Recurrence mentioned** ("каждый день", "every weekday", "ежедневно", "по утрам") → recurring (`kind: "cron"`)
- **When unsure** — create one-time and ask the user if they want it repeated

## One-time reminder (fires once at a specific MSK time)

Use `schedule: { "kind": "at", "at": "<ISO with +03:00>" }` with the exact MSK datetime.

```json
{
  "action": "add",
  "job": {
    "name": "Напоминание в 18:00",
    "schedule": { "kind": "at", "at": "2026-03-18T18:00:00+03:00" },
    "payload": {
      "kind": "directMessage",
      "message": "Пора сдать отчёт!"
    }
  }
}
```

Alternatively, use `delaySeconds` — compute the number of seconds from now (current MSK time) until the target MSK time.

## Recurring reminder (fires on a cron schedule in MSK)

Use `schedule: { "kind": "cron", "expr": "<5-field cron>", "tz": "Europe/Moscow" }`.

```json
{
  "action": "add",
  "job": {
    "name": "Ежедневный стендап",
    "schedule": { "kind": "cron", "expr": "0 9 * * 1-5", "tz": "Europe/Moscow" },
    "payload": {
      "kind": "directMessage",
      "message": "Время стендапа!"
    }
  }
}
```

**WRONG** — do NOT omit `tz` or pass schedule as a plain string:
```json
{ "schedule": "0 9 * * 1-5" }
{ "schedule": { "kind": "cron", "expr": "0 9 * * 1-5" } }
```

## Cron Expr Field Order

`minute hour day-of-month month day-of-week` (all values in MSK when `tz: "Europe/Moscow"` is set)

| Example | Meaning |
|---|---|
| `0 9 4 * *` | 4th of every month at 9:00 MSK |
| `0 8 * * 1` | Every Monday at 8:00 MSK |
| `30 18 * * 1-5` | Weekdays at 18:30 MSK |
| `0 10 * * *` | Every day at 10:00 MSK |

## Managing Jobs

```json
{ "action": "list" }
{ "action": "remove", "jobId": "<id>" }
{ "action": "update", "jobId": "<id>", "patch": { "schedule": { "kind": "cron", "expr": "0 10 * * *", "tz": "Europe/Moscow" } } }
{ "action": "run", "jobId": "<id>" }
```

## Notes

- The Telegram bot token must be configured in Settings → Integrations for delivery to work
- `directMessage` sends the text as-is — the agent is not involved at run time
- `agentTurn` runs the agent at scheduled time; use only when real work is needed
