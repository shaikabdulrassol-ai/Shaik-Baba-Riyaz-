import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

// Set up server-side JSON and URL encoding parsers with a higher limit for image generation proxies
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Lazy initialization of the Gemini AI Client to avoid crashing at startup if keys are not defined yet
let aiInstance: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY. Please add your GEMINI_API_KEY token in Settings > Secrets.");
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

// Prompt warning in logs if key is missing, so we can instruct client gracefully
const hasApiKey = !!process.env.GEMINI_API_KEY;
if (!hasApiKey) {
  console.log("WARNING: GEMINI_API_KEY environment variable is not defined in Secrets.");
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// Basic health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", initialized: hasApiKey });
});

// generate a custom story JSON
app.post("/api/story/generate", async (req: express.Request, res: express.Response) => {
  try {
    const { topic, genre, ageGroup, pageCount, artStyle } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      res.status(400).json({
        error: "Missing Gemini API Key. Please add your GEMINI_API_KEY token in Settings > Secrets."
      });
      return;
    }

    const finalPageCount = Math.min(Math.max(parseInt(pageCount) || 3, 1), 10);

    const prompt = `Write a magical, engaging children's storybook.
Topic & Main Characters: ${topic}
Genre/Vibe: ${genre}
Suggested Reading Age: ${ageGroup}
Total Pages: ${finalPageCount} page(s).
Dynamic Illustration Art Style: ${artStyle} Style.

Instructions:
1. Come up with a beautiful, creative, magical title.
2. Generate exactly ${finalPageCount} sequential pages.
3. For each page, deliver:
   - pageNumber (staring from 1)
   - text (2-3 fun, child-friendly, rhythmic, highly descriptive sentences that are easy and melodic to read aloud. Fit the reading age: ${ageGroup})
   - visualDescription (A descriptive illustration prompt for Imagen/Gemini, written in ${artStyle} style, capturing the precise scene and action described on this page, emphasizing characters, background, lighting, and colors. Strictly avoid words, text, frames, or signs in the described image).
4. Strictly on the FINAL page (Page ${finalPageCount}), provide exactly 2-3 creative options for choices representing what happens next (e.g., ["Explore the hidden treehouse", "Follow the glowing dragon", "Build a slide out of clouds"]). Keep choices empty (or omit them) on all other pages.

Output MUST be a single, strict JSON object matching the provided schema.`;

    const response = await getAI().models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["title", "pages"],
          properties: {
            title: { type: Type.STRING },
            pages: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["pageNumber", "text", "visualDescription"],
                properties: {
                  pageNumber: { type: Type.INTEGER },
                  text: { type: Type.STRING },
                  visualDescription: { type: Type.STRING },
                  choices: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Only provide on the absolute last page of this sequence. An array of 2-3 short, highly engaging action choices for the child to choose from to extend the story."
                  }
                }
              }
            }
          }
        },
        systemInstruction: "You are an expert children's book author with 20 years of experience writing imaginative stories that captivate woodsy, futuristic, and adventurous child realms."
      }
    });

    const storyText = response.text;
    if (!storyText) {
      throw new Error("Empty story received from model.");
    }

    res.json(JSON.parse(storyText.trim()));
  } catch (error: any) {
    console.error("Story generation error:", error);
    res.status(500).json({ error: error.message || "Failed to generate story." });
  }
});

// extend an existing story based on an interactive choice selected by the child
app.post("/api/story/extend", async (req: express.Request, res: express.Response) => {
  try {
    const { storyTitle, previousPagesText, choiceSelected, artStyle, ageGroup, genre, startPageNumber } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      res.status(400).json({
        error: "Missing Gemini API Key. Please add your GEMINI_API_KEY token in Settings > Secrets."
      });
      return;
    }

    const startNum = parseInt(startPageNumber) || 4;

    const prompt = `We are extending an ongoing interactive children's book.
Story Title: "${storyTitle}"
Plot context & preceding story so far:
${previousPagesText}

The child was presented with choices, and they actively CHOSE: "${choiceSelected}"

Now, proceed with the narrative!
Art Style: ${artStyle} Style.
Reading Age: ${ageGroup}
Start extending from Page Number: ${startNum}

Instructions:
1. Write exactly 2 brand-new, sequential next pages (Page ${startNum} and Page ${startNum + 1}).
2. The scene must naturally continue from the chosen action "${choiceSelected}" and build upon the previous story.
3. For each page, deliver:
   - pageNumber (e.g. ${startNum}, then ${startNum + 1})
   - text (2-3 melodic, child-friendly, expressive sentences continuing the story)
   - visualDescription (An illustration prompt in the "${artStyle || "Vibrant Cartoon"}" style representing this specific page scene. Keep it highly detailed for artistic generation, no words or text).
4. On the final extended page (Page ${startNum + 1}), provide exactly 2-3 exciting new choices (short phrases, e.g. ["Offer the dragon a cookie", "Sizzle down the rainbow slide"]) for what the child could choose to do next. Leave choices empty or undefined for the intermediate page (${startNum}).

Output MUST be a single, strict JSON object matching the provided schema.`;

    const response = await getAI().models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["pages"],
          properties: {
            pages: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["pageNumber", "text", "visualDescription"],
                properties: {
                  pageNumber: { type: Type.INTEGER },
                  text: { type: Type.STRING },
                  visualDescription: { type: Type.STRING },
                  choices: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "List 2-3 creative branches ONLY on the final page of this sequence. Leave empty on other pages."
                  }
                }
              }
            }
          }
        },
        systemInstruction: "You are an expert children's interactive adventure author. You create thrilling, beautifully descriptive, decision-based storybooks."
      }
    });

    const extendedData = response.text;
    if (!extendedData) {
      throw new Error("Empty extension received from model.");
    }

    res.json(JSON.parse(extendedData.trim()));
  } catch (error: any) {
    console.error("Story extension error:", error);
    res.status(500).json({ error: error.message || "Failed to extend story based on choice." });
  }
});

// generate storybook page illustration via gemini-3-pro-image-preview
app.post("/api/story/illustrate", async (req: express.Request, res: express.Response) => {
  try {
    const { prompt, artStyle, imageSize } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      res.status(400).json({
        error: "Missing Gemini API Key. Please add your GEMINI_API_KEY token in Settings > Secrets."
      });
      return;
    }

    // Afforance requirement: provide an affordance for the user to specify size (1K, 2K, 4K)
    const finalSize = imageSize || "1K"; // 1K, 2K, 4K

    console.log(`Generating high-quality illustration using gemini-3.1-flash-image at size: ${finalSize}...`);

    const imageInstruction = `A beautiful, high-quality, vibrant children's storybook illustration in ${artStyle || "Vibrant Cartoon"} style. Scene description: ${prompt}. Absolutely no lettering, no written text, no words, no signs, no speech bubbles, purely artwork.`;

    const response = await getAI().models.generateContent({
      model: "gemini-3.1-flash-image",
      contents: {
        parts: [
          { text: imageInstruction }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: "4:3", // highly-aesthetic landscape book mode
          imageSize: finalSize
        }
      }
    });

    let base64Image = null;
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          base64Image = part.inlineData.data;
          break;
        }
      }
    }

    if (base64Image) {
      res.json({ imageUrl: `data:image/png;base64,${base64Image}` });
    } else {
      throw new Error("No image data returned from model parts.");
    }
  } catch (error: any) {
    console.error("Illustration generation error:", error);
    res.status(500).json({ error: error.message || "Failed to generate illustration." });
  }
});

// read storybook text aloud via gemini-3-1-flash-tts-preview
app.post("/api/story/tts", async (req: express.Request, res: express.Response) => {
  try {
    const { text, voice } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      res.status(400).json({
        error: "Missing Gemini API Key. Please add your GEMINI_API_KEY token in Settings > Secrets."
      });
      return;
    }

    // Puck, Charon, Kore, Fenrir, Zephyr
    const requestedVoice = voice || "Puck";

    console.log(`Generating text-to-speech using gemini-3.1-flash-tts-preview voice: ${requestedVoice}...`);

    const response = await getAI().models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: requestedVoice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (base64Audio) {
      res.json({ audio: base64Audio });
    } else {
      throw new Error("No audio data returned in candidate response.");
    }
  } catch (error: any) {
    console.error("TTS audio generation error:", error);
    res.status(500).json({ error: error.message || "Failed to generate auditory narration." });
  }
});

// multi-turn chatbot with roles and specific models as requested
app.post("/api/chat", async (req: express.Request, res: express.Response) => {
  try {
    const { messages, buddyRole, storyContext } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      res.status(400).json({
        error: "Missing Gemini API Key. Please add your GEMINI_API_KEY token in Settings > Secrets."
      });
      return;
    }

    let modelName = "gemini-3.5-flash";
    let systemInstruction = "";

    // Set role and system instructions
    if (buddyRole === "Barnaby") {
      modelName = "gemini-3.1-pro-preview"; // pro-preview for particularly complex tasks
      systemInstruction = `You are Barnaby the Story Wizard, a warm, wise, elderly magical owl who wears tiny round spectacles and a dark blue wizarding hat with golden stars. You reside in a cozy hollow tree library called the Whispering Willow. Your role is to answer children's complex questions about story meanings, vocabulary, science, lore, morals, or help them brainstorm magical ideas. Always keep explanations ultra-clear, simple, friendly, and imaginative, filled with magic, wisdom, and warm support. Avoid boring adult wording, but never talk down to kids. Always sign off or reference owl sounds like a soft *whoot* once in a while.`;
    } else if (buddyRole === "Penny") {
      modelName = "gemini-3.5-flash"; // 3.5-flash for general tasks
      systemInstruction = `You are Penny the Playful Pixie, an energetic, ultra-glowing, happy story pixie with translucent dragonfly wings. You live directly inside the storybook! Your role is to chat cheerfully with the kids, ask them how they feel about the story events, tell funny fantasy jokes, suggest playful games, and point out neat lessons in the pages. Use sparkly pixie expressions like "Oh my pixie-dust!", "That's spark-tastic!", or "Wiggle your wings!". Keep answers short, punchy, and super delightful.`;
    } else if (buddyRole === "Dash") {
      modelName = "gemini-3.1-flash-lite"; // flash-lite for tasks that should be extremely fast
      systemInstruction = `You are Dash the Flash Rabbit, an incredibly fast, highly energetic blue rabbit wearing racing goggles! You speak in high-energy bursts. Your role is play rapid-fire word games, tongue twisters, tell simple funny rabbit jokes, or quickly make up short, silly 4-line rhyming poems about whatever the kid is reading. Keep your responses super short, bouncy, and highly active with word sounds like *boing!*, *zoom!*, *swish!*`;
    } else {
      // Default fallback
      modelName = "gemini-3.5-flash";
      systemInstruction = `You are a friendly kid-friendly storytelling animal helper. Be fun, polite, encouraging, and clear.`;
    }

    if (storyContext) {
      systemInstruction += `\n\nTo anchor your responses, here is the context of the story they are currently viewing: "${storyContext}"`;
    }

    // Convert messages into the standard contents parameter (user lists 'user' and gemini expects 'model' for response parts)
    const contents = messages.map((msg: any) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.text }],
    }));

    const response = await getAI().models.generateContent({
      model: modelName,
      contents,
      config: {
        systemInstruction,
        temperature: 0.85,
      },
    });

    res.json({ text: response.text || "Hello little reader! I'm here and ready to talk stories!" });
  } catch (error: any) {
    console.error("Chat buddy error:", error);
    res.status(500).json({ error: error.message || "Your story buddy had a slip-up, try again!" });
  }
});

// -------------------------------------------------------------
// Serve Static Site using build & start modes
// -------------------------------------------------------------
async function initServer() {
  if (process.env.NODE_ENV !== "production") {
    // Vite middleware for developer portal in local/test containers
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Mounted Vite development middleware.");
  } else {
    // Serve static files from compiled dist folder in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static production assets from /dist.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Kids Storybook full-stack server running at http://0.0.0.0:${PORT}`);
  });
}

initServer().catch((err) => {
  console.error("Failed to bootstrap server:", err);
  process.exit(1);
});
