import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Helper to reliably parse JSON strings returned by LLMs, stripping markdown blocks if present
function cleanAndParseJSON(rawText: string) {
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-zA-Z0-9]*\r?\n?/, "");
    cleaned = cleaned.replace(/\r?\n?```$/, "");
  }
  return JSON.parse(cleaned.trim());
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Gemini Integration (Nutrition & Recipe)
  app.post("/api/gemini/analyze-ingredients", async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
         return res.status(500).json({ error: "Gemini API key is not configured" });
      }
      
      const { selectedItems } = req.body;
      
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      
      const prompt = `Analisis bahan-bahan makanan berikut dengan berat porsi yang ditentukan setelah masing-masing bahan dan berikan perkiraan nilai gizi total dari bahan-bahan tersebut (sesuai jumlah gramnya), serta berikan pula satu ide resep masakan sehat yang menggunakan bahan-bahan ini beserta nilai nutrisi porsi resep tersebut: ${selectedItems.map((item: any) => `${item.name} (${(item.quantity || 1) * 100} gram)`).join(', ')}. Pastikan resep menggunakan takaran gram yang sesuai dengan bahan yang dipilih. Response dalam Bahasa Indonesia.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              calories: { type: Type.INTEGER, description: "Total kalori yang diperkirakan (hanya angka)" },
              protein: { type: Type.STRING, description: "Total protein, contoh: '25g'" },
              carbs: { type: Type.STRING, description: "Total karbohidrat, contoh: '30g'" },
              fat: { type: Type.STRING, description: "Total lemak, contoh: '10g'" },
              sugar: { type: Type.STRING, description: "Total gula, contoh: '5g'" },
              micronutrients: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Daftar mikronutrisi/vitamin utama yang terkandung, contoh: ['Vitamin C', 'Kalsium', 'Zat Besi']"
              },
              recipeIdea: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "Judul resep" },
                  prepTime: { type: Type.STRING, description: "Waktu persiapan, contoh: '20 Menit'" },
                  instructions: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Array panduan langkah memasak"
                  },
                  nutrition: {
                    type: Type.OBJECT,
                    description: "Informasi gizi untuk resep tersebut (per porsi)",
                    properties: {
                      calories: { type: Type.INTEGER, description: "Total kalori per porsi" },
                      protein: { type: Type.STRING, description: "Total protein, e.g. '20g'" },
                      carbs: { type: Type.STRING, description: "Total karbohidrat, e.g. '30g'" },
                      fat: { type: Type.STRING, description: "Total lemak, e.g. '15g'" }
                    },
                    required: ["calories", "protein", "carbs", "fat"]
                  }
                },
                required: ["title", "prepTime", "instructions", "nutrition"]
              }
            },
            required: ["calories", "protein", "carbs", "fat", "sugar", "micronutrients", "recipeIdea"]
          }
        }
      });
      
      if (!response.text) {
        throw new Error("No text response from Gemini");
      }
      
      let parsed = cleanAndParseJSON(response.text);
      res.json(parsed);
    } catch (e: any) {
      console.error("Gemini API Error:", e);
      res.status(500).json({ error: e.message || "Failed to analyze ingredients" });
    }
  });

  // API Route for Virtual Kitchen ("Dapur Virtual NutriAI") - leftovers matching & product matching
  app.post("/api/gemini/kitchen-leftovers", async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
         return res.status(500).json({ error: "Gemini API key is not configured" });
      }
      
      const { leftovers, storeProducts } = req.body;
      
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const catalogDesc = storeProducts && storeProducts.length > 0
        ? storeProducts.map((p: any) => `- ID: ${p.id}, Nama: "${p.name}", Kategori: "${p.category}", Harga: Rp ${p.price || 0}, Deskripsi: "${p.description || ''}"`).join('\n')
        : "(Katalog tidak tersedia)";
      
      const prompt = `Pengguna memiliki bahan-bahan sisa makanan berikut di rumah/kulkas mereka: "${leftovers}".
Katalog produk bumbu dapur, sayuran segar, daging, dan bahan pendukung lainnya yang tersedia di toko kami "DailyFresh Market" adalah sebagai berikut:
${catalogDesc}

Tugas Anda:
1. Hubungkan bahan sisa tersebut dengan kemauan spesifik pengguna di prompt (misalnya jika pengguna menyebutkan masakan luar negeri, barat, western, china, jepang, korea, eropa, atau masakan regional lainnya, ikuti instruksi spesifik tersebut). Jika TIDAK ADA instruksi khusus dari pengguna mengenai daerah/kategori masakan di dalam tulisannya, maka PRIORITASKAN untuk merekomendasikan 1-2 menu makanan tradisional khas/asli Indonesia (misal: tumisan/oseng-oseng khas Indonesia, semur, balado, sayur sop, soto daerah, orak-arik tempe/tahu, lodeh, pepes, sambal goreng, bakwan sayur sehat, dll.) yang sehat dan paling cocok dibuat menggunakan sisa bahan tersebut sebagai pilar utama masakan.
2. Identifikasi bumbu dasar, bumbu pelengkap, jamur, sayur pendukung, daging pendukung, atau cemilan pelengkap dari daftar katalog toko kami ("DailyFresh Market") di atas yang TIDAK dimiliki atau tidak ditulis oleh pengguna namun jika ditambahkan akan membuat masakan tersebut menjadi jauh lebih lengkap, seimbang secara gizi, dan lezat.
3. Untuk setiap resep, cantumkan daftar produk rekomendasi toko yang SANGAT RELEVAN dari katalog toko dengan mencantumkan "productId" (harus sama persis dengan ID produk di katalog kami), "productName" (nama produk kami), dan "reason" (alasan mengapa bahan pelengkap ini diperlukan untuk menyempurnakan resep masakan tersebut).

Response harus dalam Bahasa Indonesia dan berformat JSON yang valid sesuai skema yang disediakan.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recipes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING, description: "Judul resep masakan (khas Indonesia secara default, atau sesuai pesanan pengguna)" },
                    description: { type: Type.STRING, description: "Penjelasan mengapa resep ini cocok dibuat berdasarkan sisa bahan yang dimiliki" },
                    prepTime: { type: Type.STRING, description: "Waktu persiapan dan pembuatan, misal: '20 Menit'" },
                    instructions: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "Langkah-langkah instruksi memasak secara runut dan jelas"
                    },
                    neededStoreProducts: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          productId: { type: Type.STRING, description: "ID produk yang dicocokkan langsung dari katalog toko kami (Wajib ada jika itu produk dari katalog, misal: '1' atau '12')" },
                          productName: { type: Type.STRING, description: "Nama produk persis dari katalog toko kami" },
                          reason: { type: Type.STRING, description: "Alasan mengapa bumbu atau bahan tambahan ini sangat disarankan untuk dibeli demi menyempurnakan masakan tersebut" }
                        },
                        required: ["productId", "productName", "reason"]
                      },
                      description: "Daftar bumbu dapur, sayuran premium, atau daging pelengkap terpilih yang tersedia langsung di toko kami."
                    }
                  },
                  required: ["title", "description", "prepTime", "instructions", "neededStoreProducts"]
                }
              }
            },
            required: ["recipes"]
          }
        }
      });
      
      if (!response.text) {
        throw new Error("No text response from Gemini");
      }
      
      let parsed = cleanAndParseJSON(response.text);
      res.json(parsed);
    } catch (e: any) {
      console.error("Gemini Dapur Virtual API Error:", e);
      res.status(500).json({ error: e.message || "Failed to process virtual kitchen leftovers" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: any, res: any) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
