const { GoogleGenAI, Type } = require('@google/genai');
const { PROPERTY_CATEGORIES, BOOKING_MODELS, VACATION_TYPES, EXPERIENCE_TYPES, DIETARY_OPTIONS } = require('../constants/propertyOptions');

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = 'gemini-3.6-flash';

async function polishDescription({ name, type, location, description, images, availableAmenities }) {
  const contextLine = [
    name && `Property name: ${name}`,
    type && `Type: ${type}`,
    location && `Location: ${location}`,
    description && `Owner's rough notes: ${description}`,
  ]
    .filter(Boolean)
    .join('\n');

  const parts = [
    { text: contextLine || "No notes provided — base everything on the photos." },
    ...images.map((img) => ({ inlineData: { mimeType: img.mimeType, data: img.base64 } })),
  ];

  const system = `You help a property owner finish a short vacation-rental listing. Given their rough notes and photos:
1. Write a polished, welcoming 2-3 sentence description. Stay factual — never invent amenities, pricing, or claims you can't see or weren't told.
2. From this exact list of available amenities, pick every one you can visually confirm from the photos: ${availableAmenities.join(', ')}. Only return names from that list, verbatim.`;

  const response = await client.models.generateContent({
    model: MODEL,
    contents: [{ role: 'user', parts }],
    config: {
      systemInstruction: system,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          suggestedAmenities: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['description', 'suggestedAmenities'],
      },
    },
  });

  try {
    const parsed = JSON.parse(response.text);
    return {
      description: typeof parsed.description === 'string' ? parsed.description : '',
      suggestedAmenities: Array.isArray(parsed.suggestedAmenities) ? parsed.suggestedAmenities : [],
    };
  } catch (err) {
    console.error('[AiService] failed to parse Gemini response as JSON:', err.message, response.text);
    return { description: '', suggestedAmenities: [] };
  }
}

const EXPERIENCE_TYPE_VALUES = EXPERIENCE_TYPES.map((t) => t.value);

/**
 * Drafts a starting-point listing from whatever the owner shared (free
 * text, photos, PDFs, extracted doc/link text). Scoped to descriptive
 * fields only, by construction — this function has no parameter for
 * pricing, KYC, bank, or commission data, and never will: those fields
 * must never reach an AI provider (see AI_Integration_MTS.pdf's guardrail).
 * The caller (ai.controller.js) is responsible for never passing them in.
 */
async function draftProperty({ text, images, pdfs, docTexts, linkText, availableAmenities, availableRoomAmenities }) {
  const sourceSections = [
    text && `OWNER'S NOTES:\n${text}`,
    linkText && `TEXT EXTRACTED FROM THE PROPERTY'S LISTING LINK:\n${linkText}`,
    ...docTexts.map((docText, i) => `TEXT EXTRACTED FROM UPLOADED DOCUMENT ${i + 1}:\n${docText}`),
  ].filter(Boolean);

  const parts = [
    { text: sourceSections.length > 0 ? sourceSections.join('\n\n---\n\n') : 'No text provided — base everything on the attached files.' },
    ...images.map((img) => ({ inlineData: { mimeType: img.mimeType, data: img.base64 } })),
    ...pdfs.map((pdf) => ({ inlineData: { mimeType: 'application/pdf', data: pdf.base64 } })),
  ];

  const system = `You draft a FIRST-PASS vacation rental listing for a human owner to review and edit — you never publish anything yourself.

Only use the material provided (owner notes, extracted link/document text, photos, PDFs). Never invent specifics you can't support from that material — if something isn't clear, leave the field empty/omit it and add a short note to "warnings" explaining what you couldn't determine, rather than guessing.

Pick values ONLY from these exact vocabularies (verbatim, case-sensitive):
- category: one of ${PROPERTY_CATEGORIES.join(', ')}
- propertyType: one of ${BOOKING_MODELS.join(', ')}
- vacationType: one of ${VACATION_TYPES.join(', ')}
- experiences[].experienceType: one of ${EXPERIENCE_TYPE_VALUES.join(', ')}
- propertyAmenities: only from ${availableAmenities.join(', ')}
- roomAmenities: only from ${availableRoomAmenities.join(', ')}
- dietaryOptions: only from ${DIETARY_OPTIONS.join(', ')}

Hard rule: this listing has NO pricing, payment, ID/KYC, bank, or commission fields in your output schema. If the source material mentions prices, payment details, ID numbers, or bank details, IGNORE them completely — do not reference them anywhere, not even in warnings. This tool only ever drafts descriptive content; a human fills in pricing and compliance fields separately and manually.

For "rooms" and "experiences", only include entries the material actually supports (e.g. photos clearly showing distinct rooms, or text describing separate experiences) — an empty array is correct when there's nothing to suggest. Never include a price for a room or experience.`;

  const response = await client.models.generateContent({
    model: MODEL,
    contents: [{ role: 'user', parts }],
    config: {
      systemInstruction: system,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          category: { type: Type.STRING, enum: PROPERTY_CATEGORIES },
          propertyType: { type: Type.STRING, enum: BOOKING_MODELS },
          vacationType: { type: Type.STRING, enum: VACATION_TYPES },
          isPureVeg: { type: Type.BOOLEAN },
          city: { type: Type.STRING },
          state: { type: Type.STRING },
          locationConfidence: { type: Type.STRING, enum: ['none', 'low', 'medium', 'high'] },
          propertyAmenities: { type: Type.ARRAY, items: { type: Type.STRING } },
          roomAmenities: { type: Type.ARRAY, items: { type: Type.STRING } },
          dietaryOptions: { type: Type.ARRAY, items: { type: Type.STRING } },
          experiences: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                experienceType: { type: Type.STRING, enum: EXPERIENCE_TYPE_VALUES },
              },
              required: ['title', 'experienceType'],
            },
          },
          rooms: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                roomName: { type: Type.STRING },
                description: { type: Type.STRING },
              },
              required: ['roomName'],
            },
          },
          warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['title', 'description', 'warnings'],
      },
    },
  });

  try {
    return JSON.parse(response.text);
  } catch (err) {
    console.error('[AiService] failed to parse Gemini draft response as JSON:', err.message, response.text);
    throw new Error('AI could not produce a usable draft from what was provided.');
  }
}

module.exports = { polishDescription, draftProperty };
