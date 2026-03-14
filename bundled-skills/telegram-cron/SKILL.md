---
name: telegram-cron
description: "Create scheduled cron jobs that send Telegram messages. Use when: user asks to set up a reminder, scheduled notification, or recurring message via Telegram. NOT for: one-time messages, non-Telegram notifications."
metadata: { "eggent": { "emoji": "⏰" } }
---

# Telegram Cron Skill

Create cron jobs that deliver scheduled messages to a Telegram chat.

## How It Works

When the user asks from **within a Telegram chat**, `telegramChatId` is injected automatically from context — you do NOT need to ask for it or pass it manually.

When called from the **web UI**, you must include `payload.telegramChatId` explicitly (numeric Telegram chat ID).

## One-Time Reminder vs Recurring — Pick One

### One-time reminder (fires once after a delay)

Use `delaySeconds` — compute the number of seconds from now (current UTC time) until the target time.

```json
{
  "action": "add",
  "job": {
    "name": "Reminder at 18:00",
    "delaySeconds": 3600,
    "payload": {
      "prompt": "Send the user a reminder: 'Time to submit the report!'"
    }
  }
}
```

> Example: if it is now 17:00 UTC and the user wants a reminder at 18:00 UTC, set `delaySeconds: 3600`.

### Recurring reminder (fires on a cron schedule)

Use `schedule: { "kind": "cron", "expr": "<5-field cron>" }` — **`schedule` must be an object, NOT a plain string**.

```json
{
  "action": "add",
  "job": {
    "name": "Daily standup reminder",
    "schedule": { "kind": "cron", "expr": "0 9 * * 1-5" },
    "payload": {
      "prompt": "Send the user a reminder: 'Time for standup!'"
    }
  }
}
```

**WRONG** — do NOT pass schedule as a plain string:
```json
{ "schedule": "0 9 * * 1-5" }
```

## Cron Expr Field Order

`minute hour day-of-month month day-of-week`

| Example | Meaning |
|---|---|
| `0 9 4 * *` | 4th of every month at 9:00 UTC |
| `0 8 * * 1` | Every Monday at 8:00 UTC |
| `30 18 * * 1-5` | Weekdays at 18:30 UTC |
| `0 10 * * *` | Every day at 10:00 UTC |

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
