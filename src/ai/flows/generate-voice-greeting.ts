
'use server';
/**
 * @fileOverview A high-quality AI text-to-speech flow for greetings.
 *
 * - generateVoiceGreeting - Generates a WAV audio data URI from text.
 * - VoiceGreetingInput - The input type (text string).
 * - VoiceGreetingOutput - The output type (audio data URI).
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import wav from 'wav';

const VoiceGreetingInputSchema = z.object({
  text: z.string().describe('The greeting text to convert to speech.'),
});
export type VoiceGreetingInput = z.infer<typeof VoiceGreetingInputSchema>;

const VoiceGreetingOutputSchema = z.object({
  audioUri: z.string().describe('The generated audio as a data URI.'),
});
export type VoiceGreetingOutput = z.infer<typeof VoiceGreetingOutputSchema>;

export async function generateVoiceGreeting(input: VoiceGreetingInput): Promise<VoiceGreetingOutput> {
  return generateVoiceGreetingFlow(input);
}

const generateVoiceGreetingFlow = ai.defineFlow(
  {
    name: 'generateVoiceGreetingFlow',
    inputSchema: VoiceGreetingInputSchema,
    outputSchema: VoiceGreetingOutputSchema,
  },
  async (input) => {
    const { media } = await ai.generate({
      model: googleAI.model('gemini-2.5-flash-preview-tts'),
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Aoede' }, // 'Aoede' is a pleasant female voice
          },
        },
      },
      prompt: `Speak with a warm, professional Indian female accent: ${input.text}`,
    });

    if (!media || !media.url) {
      throw new Error('Failed to generate audio media.');
    }

    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );

    const wavBase64 = await toWav(audioBuffer);

    return {
      audioUri: 'data:audio/wav;base64,' + wavBase64,
    };
  }
);

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    let bufs = [] as any[];
    writer.on('error', reject);
    writer.on('data', function (d) {
      bufs.push(d);
    });
    writer.on('end', function () {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}
