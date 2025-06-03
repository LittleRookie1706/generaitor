import { GoogleGenerativeAI } from "@google/generative-ai";

export const setupAI = (apiKey) => {
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
  //return genAI.getGenerativeModel({ model: "gemini-2.5-pro-preview-05-06" });
};
