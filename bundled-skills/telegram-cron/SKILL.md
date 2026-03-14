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

## Tool Call

Use the `cron` tool with `action: "add"`:

```json
{
  "action": "add",
  "job": {
    "name": "Human-readable job name",
    "schedule": "0 9 4 * *",
    "payload": {
      "prompt": "Send the user a reminder: 'Подай показания счётчиков'"
    }
  }
}
```

> When called from Telegram, `telegramChatId` is auto-set. Do not pass it as `null` or omit it from the payload — just leave it out and it will be filled in automatically.

## Schedule Format

Standard 5-field cron: `minute hour day-of-month month day-of-week`

| Example | Meaning |
|---|---|
| `0 9 4 * *` | 4th of every month at 9:00 |
| `0 8 * * 1` | Every Monday at 8:00 |
| `30 18 * * 1-5` | Weekdays at 18:30 |
| `0 10 * * *` | Every day at 10:00 |

## Managing Jobs

```json
{ "action": "list" }
{ "action": "remove", "jobId": "<id>" }
{ "action": "update", "jobId": "<id>", "patch": { "schedule": "0 10 * * *" } }
{ "action": "run", "jobId": "<id>" }
```

## Notes

- `payload.prompt` is the instruction the agent executes at run time — the result is sent back to Telegram
- The Telegram bot token must be configured in Settings → Integrations for delivery to work
