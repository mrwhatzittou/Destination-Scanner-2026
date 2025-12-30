
import { GoogleGenAI } from "@google/genai";

// Always use named parameter and process.env.API_KEY directly.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getTravelInsight = async (countryName: string, monthName: string, price: number, stops: number) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Explain briefly (2 sentences max) why ${countryName} is a great choice in ${monthName} 2026, considering the price is $${price} with ${stops} stops. Focus on weather or events.`,
      config: {
        temperature: 0.7,
      },
    });
    // The .text property is used correctly here as a property, not a method.
    return response.text || "A perfect balance of cost and experience for this season.";
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return "Great value for this destination during this time of year.";
  }
};
