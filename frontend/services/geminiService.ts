import { GoogleGenAI } from "@google/genai";
import { Booking, ChartData } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const generateDashboardInsights = async (
  bookings: Booking[],
  earnings: ChartData[]
): Promise<string> => {
  if (!apiKey) {
    return "API Key not configured. Please set a valid Gemini API Key to receive insights.";
  }

  try {
    const bookingSummary = bookings.map(b => `${b.time}: ${b.status} (${b.price})`).join(', ');
    const earningSummary = earnings.map(e => `${e.name}: ${e.value}`).join(', ');

    const prompt = `
      You are an AI assistant for a sports turf manager. 
      Analyze the following data and provide a concise, professional summary of the day's performance and one actionable suggestion to improve revenue.
      
      Recent Bookings: ${bookingSummary}
      Weekly Earnings Trend: ${earningSummary}

      Keep the tone professional, encouraging, and brief (max 3 sentences).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "No insights available at the moment.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Unable to generate insights at this time. Please try again later.";
  }
};

export const generateMarketingCopy = async (offerName: string, discount: string): Promise<string> => {
   if (!apiKey) return "API Key missing.";
   
   try {
     const prompt = `Write a short, catchy push notification (under 100 characters) for a football turf booking app. Offer: ${offerName}, Discount: ${discount}. Use emojis.`;
     const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
     });
     return response.text || "";
   } catch (error) {
     return "Error generating copy.";
   }
};