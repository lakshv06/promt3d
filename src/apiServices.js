import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from 'openai';
const _ = require('lodash');

// --- API KEYS ---
const GEMINI_API_KEY = process.env.REACT_APP_BARD_API_KEY;
const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;

// === GEMINI VOICE OPTIONS ===
const GEMINI_VOICE_OPTIONS = [
    { name: 'Kore (Firm)', value: 'Kore' },
    { name: 'Puck (Upbeat)', value: 'Puck' },
    { name: 'Zephyr (Bright)', value: 'Zephyr' },
    { name: 'Charon (Informative)', value: 'Charon' },
    { name: 'Fenrir (Excitable)', value: 'Fenrir' },
    { name: 'Leda (Youthful)', value: 'Leda' },
    { name: 'Orus (Firm)', value: 'Orus' },
    { name: 'Aoede (Breezy)', value: 'Aoede' },
    { name: 'Callirrhoe (Easy-going)', value: 'Callirrhoe' },
    { name: 'Autonoe (Bright)', value: 'Autonoe' },
    { name: 'Enceladus (Breathy)', value: 'Enceladus' },
    { name: 'Iapetus (Clear)', value: 'Iapetus' },
    { name: 'Umbriel (Easy-going)', value: 'Umbriel' },
    { name: 'Algieba (Smooth)', value: 'Algieba' },
    { name: 'Despina (Smooth)', value: 'Despina' },
    { name: 'Erinome (Clear)', value: 'Erinome' },
    { name: 'Algenib (Gravelly)', value: 'Algenib' },
    { name: 'Rasalgethi (Informative)', value: 'Rasalgethi' },
    { name: 'Laomedeia (Upbeat)', value: 'Laomedeia' },
    { name: 'Achernar (Soft)', value: 'Achernar' },
    { name: 'Alnilam (Firm)', value: 'Alnilam' },
    { name: 'Schedar (Even)', value: 'Schedar' },
    { name: 'Gacrux (Mature)', value: 'Gacrux' },
    { name: 'Pulcherrima (Forward)', value: 'Pulcherrima' },
    { name: 'Achird (Friendly)', value: 'Achird' },
    { name: 'Zubenelgenubi (Casual)', value: 'Zubenelgenubi' },
    { name: 'Vindemiatrix (Gentle)', value: 'Vindemiatrix' },
    { name: 'Sadachbia (Lively)', value: 'Sadachbia' },
    { name: 'Sadaltager (Knowledgeable)', value: 'Sadaltager' },
    { name: 'Sulafat (Warm)', value: 'Sulafat' },
];

// === OPENAI VOICE OPTIONS ===
const OPENAI_VOICE_OPTIONS = [
    { name: 'Alloy', value: 'alloy' },
    { name: 'Echo', value: 'echo' },
    { name: 'Fable', value: 'fable' },
    { name: 'Onyx', value: 'onyx' },
    { name: 'Nova', value: 'nova' },
    { name: 'Shimmer', value: 'shimmer' },
];

// === GEMINI API SERVICES ===
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const pcmToWav = (pcmData, sampleRate) => {
    const pcm16 = new Int16Array(pcmData);
    const buffer = new ArrayBuffer(44 + pcm16.length * 2);
    const view = new DataView(buffer);
    const writeString = (view, offset, string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + pcm16.length * 2, true);
    writeString(view, 8, 'WAVE');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, pcm16.length * 2, true);
    for (let i = 0; i < pcm16.length; i++) {
        view.setInt16(44 + i * 2, pcm16[i], true);
    }
    return new Blob([view], { type: 'audio/wav' });
};

export const callGeminiTextApi = async (prompt) => {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
};

export const callGeminiTtsApi = async (text, voice) => {
    const payload = {
        contents: [{ parts: [{ text: text }] }],
        generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } },
        model: 'gemini-2.5-flash-preview-tts',
    };
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const result = await response.json();
    const part = result?.candidates?.[0]?.content?.parts?.[0];
    const audioData = part?.inlineData?.data;
    const mimeType = part?.inlineData?.mimeType;
    if (audioData && mimeType && mimeType.startsWith('audio/')) {
        const sampleRateMatch = mimeType.match(/rate=(\d+)/);
        const sampleRate = sampleRateMatch ? parseInt(sampleRateMatch[1], 10) : 16000;
        const pcmData = Uint8Array.from(atob(audioData), c => c.charCodeAt(0)).buffer;
        const wavBlob = pcmToWav(pcmData, sampleRate);
        return URL.createObjectURL(wavBlob);
    } else {
        throw new Error('Unexpected response structure from Gemini TTS API.');
    }
};

// === OPENAI API SERVICES ===
const openai = new OpenAI({ apiKey: OPENAI_API_KEY, dangerouslyAllowBrowser: true });

export const callOpenAITextApi = async (prompt) => {
    const chatCompletion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ "role": "user", "content": prompt }],
    });
    return chatCompletion.choices[0].message.content;
};

export const callOpenAITtsApi = async (text, voice) => {
    const speechResponse = await openai.audio.speech.create({
        model: "tts-1",
        voice: voice,
        input: text,
    });
    const blob = await speechResponse.blob();
    return URL.createObjectURL(blob);
};

// === EXPORTING SERVICES ===
export const getServices = (serviceName) => {
    switch (serviceName) {
        case 'gemini':
            return {
                text: callGeminiTextApi,
                tts: callGeminiTtsApi,
                voices: GEMINI_VOICE_OPTIONS,
            };
        case 'openai':
            return {
                text: callOpenAITextApi,
                tts: callOpenAITtsApi,
                voices: OPENAI_VOICE_OPTIONS,
            };
        default:
            throw new Error('Invalid service name provided.');
    }
};