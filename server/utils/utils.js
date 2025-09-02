import { GoogleGenAI, Type } from "@google/genai";

export const setupAI = (apiKey) => {
  const model =  new GoogleGenAI({ apiKey });
  if(!model) {
    return res.status(500).json({ error: "Failed to initialize Gemini AI" });
  }
  return model;
};

export const useAI = async (genAI, prompt) => {
  const schema = {
    type: Type.OBJECT,
    properties: {
      success: { type: Type.BOOLEAN },
      selector: { type: Type.STRING },
      action: { type: Type.STRING },
      value: { type: Type.STRING },
      optionValue: { type: Type.STRING },
      index: { type: Type.INTEGER },
    },
    required: ["success", "selector", "action"],
  };

  const result = await genAI.models.generateContent({
    model: "gemini-2.0-flash-lite",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  const rawText = result.text;
  return JSON.parse(rawText);
};

export const useAI_generateTest = async (genAI, prompt) => {
  const result = await genAI.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  const rawText = result.text;
  return rawText;
};
