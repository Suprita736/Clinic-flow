import { toast } from "sonner";
import { formatWait } from "./queue";

/**
 * Mock Notification Service
 * In a production environment, this would integrate with Twilio, Fast2SMS, MSG91, or WhatsApp Business API.
 * For the hackathon, we simulate it via toasts to demonstrate the UX.
 */
export const NotificationService = {
  sendTokenCreated(patientName: string, tokenNumber: number, trackingCode: string, doctorName: string) {
    const link = `${window.location.origin}/track/${trackingCode}`;
    const msg = `Hi ${patientName}, your token is #${tokenNumber} for ${doctorName}. Track live: ${link}`;
    console.log(`[SMS] To ${patientName}:`, msg);
    toast("📱 SMS Sent", {
      description: msg,
      duration: 6000,
    });
  },

  sendThreeAway(patientName: string, waitTimeMinutes: number, doctorName: string) {
    const msg = `Hi ${patientName}, you are 3 patients away for ${doctorName}. Estimated wait: ${waitTimeMinutes} minutes.`;
    console.log(`[SMS] To ${patientName}:`, msg);
    toast("📱 SMS Sent: Almost there", {
      description: msg,
      duration: 6000,
    });
  },

  sendYouAreNext(patientName: string, doctorName: string) {
    const msg = `Hi ${patientName}, you are NEXT for ${doctorName}. Please proceed to the consultation room.`;
    console.log(`[SMS] To ${patientName}:`, msg);
    toast.success("📱 SMS Sent: You are next!", {
      description: msg,
      duration: 8000,
    });
  }
};
