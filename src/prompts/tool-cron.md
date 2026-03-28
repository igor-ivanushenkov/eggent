Use this tool for any delayed or scheduled action.

When the user asks to "remind later", "напомни", "через N минут/секунд", "по расписанию", or "every day/week", prefer `cron` instead of `code_execution`.

Payload kind — which to choose:
- **`directMessage`** — for simple reminders ("напомни выпить лекарства", "remind me at 5pm"). Sends text directly to Telegram, no agent involved. **This is the default for reminders.**
- **`agentTurn`** — only when the task requires the agent to do work at run time ("проверь погоду и напомни", "посмотри курс и сообщи"). The agent runs a full turn and sends the result.
- When unsure, use `directMessage`. Only use `agentTurn` if the user explicitly needs agent processing at the time of the reminder.

Timezone rules:
- The user's default timezone is **MSK (UTC+3)**. When the user says a time without specifying a timezone, treat it as MSK.
- Use `schedule.kind="at"` with an absolute ISO timestamp for specific-time reminders — do NOT use `delaySeconds` when the user names a clock time.
- **NEVER compute `delaySeconds` by subtracting UTC from MSK** — for "в 16:22" use `schedule: { "kind": "at", "at": "YYYY-MM-DDT16:22:00+03:00" }` with today's date.
- For recurring cron: always set `"tz": "Europe/Moscow"` in the schedule object.
- Current UTC and MSK times are in the system prompt under "Current Information".

Schedule rules:
- **One-time** (default when no recurrence mentioned): `schedule.kind="at"` with ISO timestamp. Jobs auto-delete after run.
- **Recurring** (only when user says "каждый день", "every day", "ежедневно", etc.): `schedule.kind="cron"` (expr) with `tz: "Europe/Moscow"`, or `schedule.kind="every"` (everyMs).
- Put reminder text in `payload.message`. Never put code strings or function calls in the job field.
- `delaySeconds` is one-shot only — do not use for recurring jobs.
- On preflight error: retry once with normalized args, do not repeat identical invalid arguments.
- After creating: report the scheduled time (in MSK), recurrence (one-time or pattern), and message text.
- Management: `status`, `list`, `update`, `run`, `runs`, `remove`.

Do not emulate scheduling with terminal `at`, `cron` shell files, or `time.sleep`.
