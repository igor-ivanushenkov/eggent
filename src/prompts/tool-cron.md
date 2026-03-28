Use this tool for any delayed or scheduled action.

When the user asks to "remind later", "через N минут/секунд", "по расписанию", or "every day/week", prefer `cron` instead of `code_execution`.

Timezone rules:
- The user's default timezone is **MSK (UTC+3)**. When the user says a time without specifying a timezone, treat it as MSK.
- Use `schedule.kind="at"` with an absolute ISO timestamp for specific-time reminders — do NOT use `delaySeconds` when the user names a clock time.
- **NEVER compute `delaySeconds` by subtracting UTC from MSK** — for "в 16:22" use `schedule: { "kind": "at", "at": "YYYY-MM-DDT16:22:00+03:00" }` with today's date.
- Current UTC and MSK times are in the system prompt under "Current Information".

Rules:
- One-time: `action="add"`, `schedule.kind="at"` with ISO timestamp.
- Recurring: `schedule.kind="every"` (everyMs) or `schedule.kind="cron"` (expr).
- Put reminder text in `payload.message`. Never put code strings or function calls in the job field.
- `delaySeconds` is one-shot only — do not use for recurring jobs.
- On preflight error: retry once with normalized args, do not repeat identical invalid arguments.
- After creating: report `id`, schedule, and next run time.
- Management: `status`, `list`, `update`, `run`, `runs`, `remove`.

Do not emulate scheduling with terminal `at`, `cron` shell files, or `time.sleep`.
