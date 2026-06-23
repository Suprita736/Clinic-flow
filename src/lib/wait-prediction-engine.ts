import type { QueueEntryRow } from "@/hooks/useQueue";

/**
 * Wait Prediction Engine
 * Reusable service for dynamic wait time modeling.
 * Future phases can extend this with time-of-day or peak-hour adjustments.
 */
export const WaitPredictionEngine = {
  /**
   * Calculates the estimated wait time in minutes for a patient in the queue.
   * 
   * @param peopleAhead Number of people ahead of this patient
   * @param rollingAverage The rolling average consultation duration in minutes
   * @param activeConsultation The entry currently 'in_progress' (if any)
   * @returns Estimated wait time in minutes
   */
  calculateEstimatedWait(
    peopleAhead: number,
    rollingAverage: number,
    activeConsultation?: QueueEntryRow
  ): number {
    let remainingCurrent = 0;

    if (activeConsultation && activeConsultation.served_at) {
      const elapsedMs = Date.now() - new Date(activeConsultation.served_at).getTime();
      const elapsedMinutes = elapsedMs / 60000;
      remainingCurrent = Math.max(rollingAverage - elapsedMinutes, 0);
    }

    return remainingCurrent + (peopleAhead * rollingAverage);
  }
};
