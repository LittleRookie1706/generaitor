import { GoogleGenAI, Type } from "@google/genai";

export const setupAIf = (apiKey) => {
  const genAI = new GoogleGenAI({ apiKey });

  const schema = {
    type: Type.OBJECT,
    properties: {
      selector: { type: Type.STRING },
      action: { type: Type.STRING },
      value: { type: Type.STRING },
      isSelect2: { type: Type.BOOLEAN },
      optionValue: { type: Type.STRING },
      index: { type: Type.INTEGER },
      positionHint: { type: Type.STRING },
      isEnabled: { type: Type.BOOLEAN },
      jsCode: { type: Type.STRING },
    },
    required: ["selector", "action", "isEnabled", "jsCode"],
  };

  return async (prompt) => {
    const result = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const rawText = result.text;
    console.log("Raw AI response:", rawText);
    return JSON.parse(rawText);
  };
};

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
      selector: { type: Type.STRING },
      action: { type: Type.STRING },
      value: { type: Type.STRING },
      isSelect2: { type: Type.BOOLEAN },
      optionValue: { type: Type.STRING },
      index: { type: Type.INTEGER },
      positionHint: { type: Type.STRING },
      isEnabled: { type: Type.BOOLEAN },
      jsCode: { type: Type.STRING },
    },
    required: ["selector", "action", "isEnabled", "jsCode"],
  };

  const result = await genAI.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  const rawText = result.text;
  return JSON.parse(rawText);
};

export const useAI_genCypress = async (genAI, prompt) => {

  const result = await genAI.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  const rawText = result.text;
  return rawText;
};
