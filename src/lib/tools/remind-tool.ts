import { tool } from "ai";
import { z } from "zod";
import type { AgentContext } from "@/lib/agent/types";
import { GLOBAL_CRON_PROJECT_ID } from "@/lib/cron/paths";
import { ensureCronSchedulerStarted } from "@/lib/cron/runtime";
import { addCronJob } from "@/lib/cron/service";

const MSK_OFFSET = "+03:00";

function parseMskTime(timeStr: string, nowMs: number): string | null {
  const trimmed = timeStr.trim();

  // Full ISO already
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    return trimmed.includes("+") || trimmed.includes("Z") ? trimmed : trimmed + MSK_OFFSET;
  }

  // HH:MM or H:MM
  const timeMatch = trimmed.match(/^(\d{1,2})[:\.](\d{2})$/);
  if (timeMatch) {
    const hour = parseInt(timeMatch[1], 10);
    const minute = parseInt(timeMatch[2], 10);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

    // Build today's date in MSK
    const mskNow = new Date(nowMs + 3 * 3600_000);
    const isoDate = mskNow.toISOString().slice(0, 10);
    const hh = String(hour).padStart(2, "0");
    const mm = String(minute).padStart(2, "0");
    let at = `${isoDate}T${hh}:${mm}:00${MSK_OFFSET}`;

    // If the time already passed today, schedule for tomorrow
    if (Date.parse(at) <= nowMs) {
      const tomorrow = new Date(mskNow.getTime() + 86400_000);
      const tomorrowDate = tomorrow.toISOString().slice(0, 10);
      at = `${tomorrowDate}T${hh}:${mm}:00${MSK_OFFSET}`;
    }
    return at;
  }

  return null;
}

function readTelegramChatId(context: AgentContext): string | undefined {
  const raw = context.data?.telegram;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const record = raw as Record<string, unknown>;
  const chatId = record.chatId;
  if (typeof chatId === "number" && Number.isFinite(chatId)) return String(Math.trunc(chatId));
  if (typeof chatId === "string" && chatId.trim()) return chatId.trim();
  return undefined;
}

export function createRemindTool(context: AgentContext) {
  return tool({
    description:
      'Set a one-time reminder. User receives the message at the specified time via Telegram. Example: remind(message="Выпить лекарства", time="18:03")',
    inputSchema: z.object({
      message: z.string().describe("Reminder text to send to the user"),
      time: z.string().describe('Time in MSK, e.g. "18:03" or "2026-03-28T18:03:00+03:00"'),
    }),
    execute: async ({ message, time }) => {
      await ensureCronSchedulerStarted();
      const projectId = context.projectId ?? GLOBAL_CRON_PROJECT_ID;
      const telegramChatId = readTelegramChatId(context);

      const nowMs = Date.now();
      const at = parseMskTime(time, nowMs);
      if (!at) {
        return `Не удалось разобрать время "${time}". Укажите в формате ЧЧ:ММ (например 18:03).`;
      }

      if (Date.parse(at) <= nowMs) {
        return `Время ${time} уже прошло.`;
      }

      const job = await addCronJob(projectId, {
        name: message.slice(0, 60),
        schedule: { kind: "at", at },
        payload: {
          kind: "directMessage",
          message,
          telegramChatId,
        },
        enabled: true,
        deleteAfterRun: true,
      });

      // Format time for confirmation
      const d = new Date(Date.parse(at));
      const mskDate = new Date(d.getTime() + 3 * 3600_000);
      const hh = String(mskDate.getUTCHours()).padStart(2, "0");
      const mm = String(mskDate.getUTCMinutes()).padStart(2, "0");

      return `✅ Напоминание создано: "${message}" в ${hh}:${mm} МСК (id: ${job.id})`;
    },
  });
}
