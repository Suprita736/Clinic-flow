import type { QueueEntryRow } from "@/hooks/useQueue";

export interface ConsultationAnalytics {
  patientsToday: number;
  completedToday: number;
  averageConsultationDuration: number;
  averageWaitTime: number;
  currentQueueLength: number;
}

/**
 * Reusable analytics layer for clinic operations.
 * Designed to be easily extensible for Phase 4 (no-shows, peak hours, daily trends).
 */
export const AnalyticsEngine = {
  /**
   * Calculates the rolling average consultation time based on recent completions.
   * Uses the last 10 completed consultations.
   * 
   * @param entries All entries or recent entries
   * @param fallbackAvg The default average to use if not enough data
   * @returns Average duration in minutes
   */
  calculateRollingAverage(entries: QueueEntryRow[], fallbackAvg: number): number {
    const completed = entries
      .filter((t) => t.status === "completed" && t.served_at && t.completed_at)
      .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime());

    if (completed.length < 3) {
      return fallbackAvg;
    }

    const recent = completed.slice(0, 10);
    const totalMs = recent.reduce((sum, t) => {
      const start = new Date(t.served_at!).getTime();
      const end = new Date(t.completed_at!).getTime();
      return sum + (end - start);
    }, 0);

    return (totalMs / recent.length) / 60000; // Return in minutes
  },

  /**
   * Generates a comprehensive analytics snapshot for the current day.
   */
  generateDailySnapshot(entries: QueueEntryRow[], fallbackAvg: number, averageWaitTime: number): ConsultationAnalytics {
    const patientsToday = entries.length;
    const completedToday = entries.filter(t => t.status === "completed").length;
    const currentQueueLength = entries.filter(t => t.status === "waiting").length;
    const averageConsultationDuration = this.calculateRollingAverage(entries, fallbackAvg);

    return {
      patientsToday,
      completedToday,
      averageConsultationDuration,
      averageWaitTime,
      currentQueueLength,
    };
  }
};
