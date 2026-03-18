---
name: telegram-cron
description: "Create scheduled cron jobs that send Telegram messages. Use when: user asks to set up a reminder, scheduled notification, or recurring message via Telegram. NOT for: one-time messages, non-Telegram notifications."
metadata: { "eggent": { "emoji": "⏰" } }
---

# Telegram Cron Skill

Create cron jobs that deliver scheduled messages to a Telegram chat.

## Timezone

**All times are Moscow Time (MSK, UTC+3).** Always use `"Europe/Moscow"` as the timezone.

- For `at` schedules: always include `+03:00` offset in the ISO string (e.g. `"2026-03-18T15:00:00+03:00"`).
- For `cron` schedules: always set `"tz": "Europe/Moscow"` in the schedule object.
- For `delaySeconds`: compute seconds from current MSK time to target MSK time — no offset needed.

## How It Works

When the user asks from **within a Telegram chat**, `telegramChatId` is injected automatically from context — you do NOT need to ask for it or pass it manually.

When called from the **web UI**, you must include `payload.telegramChatId` explicitly (numeric Telegram chat ID).

## One-Time vs Recurring — How to Choose

- **No recurrence mentioned** ("напомни в 16:00", "remind me at 5pm") → one-time (`kind: "at"` or `delaySeconds`)
- **Recurrence mentioned** ("каждый день", "every weekday", "ежедневно", "по утрам") → recurring (`kind: "cron"`)
- **When unsure** — create one-time and ask the user if they want it repeated

## One-Time Reminder vs Recurring — Pick One

### One-time reminder (fires once at a specific MSK time)

Use `schedule: { "kind": "at", "at": "<ISO with +03:00>" }` with the exact MSK datetime.

```json
{
  "action": "add",
  "job": {
    "name": "Reminder at 18:00 MSK",
    "schedule": { "kind": "at", "at": "2026-03-18T18:00:00+03:00" },
    "payload": {
      "prompt": "Send the user a reminder: 'Time to submit the report!'"
    }
  }
}
```

Alternatively, use `delaySeconds` — compute the number of seconds from now (current MSK time) until the target MSK time.

> Example: if it is now 17:00 MSK and the user wants a reminder at 18:00 MSK, set `delaySeconds: 3600`.

### Recurring reminder (fires on a cron schedule in MSK)

Use `schedule: { "kind": "cron", "expr": "<5-field cron>", "tz": "Europe/Moscow" }` — **`schedule` must be an object with `tz`, NOT a plain string**.

```json
{
  "action": "add",
  "job": {
    "name": "Daily standup reminder",
    "schedule": { "kind": "cron", "expr": "0 9 * * 1-5", "tz": "Europe/Moscow" },
    "payload": {
      "prompt": "Send the user a reminder: 'Time for standup!'"
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

`minute hour day-of-month month day-of-week` (all values in MSK)

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
{ "action": "update", "jobId": "<id>", "patch": { "schedule": { "kind": "cron", "expr": "0 10 * * *" } } }
{ "action": "run", "jobId": "<id>" }
```

## Notes

- `payload.prompt` is the instruction the agent executes at run time — the result is sent back to Telegram
- The Telegram bot token must be configured in Settings → Integrations for delivery to work
- All times in cron expressions are **UTC**
