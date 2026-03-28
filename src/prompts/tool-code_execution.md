# Code Execution Tool

Execute code in a specified runtime environment. The code runs on the user's machine.

## Available Runtimes

- **python** — Python 3. Use for: data processing, calculations, automation.
- **nodejs** — Node.js. Use for: JS/TS tasks, web APIs, JSON processing.
- **terminal** — Bash shell. Use for: system commands, file ops, process management.

## Best Practices

1. Print outputs explicitly — always `print()` / `console.log()` results
2. Use session 0 by default; reuse the same session to keep working-directory state
3. Prefer dedicated file tools (`read_text_file`, `write_text_file`, `copy_file`) over code_execution for simple file tasks
4. For long-running jobs use `background=true` then poll with the `process` tool
5. Use `npx -y <package>` to avoid interactive prompts

## Blocker Handling (auto-resolve, do not stop)

If execution fails, fix and retry autonomously (up to 2 retries):
- Missing Python module → `install_packages(kind="python", ...)` then retry
- Missing Node module → `install_packages(kind="node", ...)` then retry
- Missing system command → `install_packages(kind="apt", ...)` then retry
- Playwright missing deps → `install_packages(kind="apt")` or `npx playwright install-deps` then retry
- `playwright-cli` not found → switch to `npx -y @playwright/cli ...`
- Interactive npx prompt → rerun with `npx -y ...`
- `externally-managed-environment` (pip) → install into `.venv` then retry

Report blocker to user only after 2 failed corrected attempts.

## Limitations

- Execution timeout: configurable (default 600s)
- Output truncated at configurable max length
- No GUI — terminal only
- Network access depends on system configuration
