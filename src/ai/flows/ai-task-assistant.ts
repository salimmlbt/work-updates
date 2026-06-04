'use server';
/**
 * @fileOverview AI Task Assistant Flow.
 * 
 * - getAITaskHelp - Generates professional guidance for a specific task.
 * - AITaskAssistantInput - Task context and user question.
 * - AITaskAssistantOutput - The AI's response.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AITaskAssistantInputSchema = z.object({
  taskDescription: z.string().describe('The details of the task.'),
  projectTitle: z.string().optional().describe('The project title.'),
  clientName: z.string().optional().describe('The client name.'),
  question: z.string().describe('The user question about the task.'),
});
export type AITaskAssistantInput = z.infer<typeof AITaskAssistantInputSchema>;

const AITaskAssistantOutputSchema = z.object({
  answer: z.string().describe('The AI generated answer.'),
});
export type AITaskAssistantOutput = z.infer<typeof AITaskAssistantOutputSchema>;

export async function getAITaskHelp(input: AITaskAssistantInput): Promise<AITaskAssistantOutput> {
  return aiTaskAssistantFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiTaskAssistantPrompt',
  input: { schema: AITaskAssistantInputSchema },
  output: { schema: AITaskAssistantOutputSchema },
  prompt: `You are an expert creative director and project manager at FALAQ Studio.
  A team member needs assistance with a specific task.
  
  CONTEXT:
  Task: {{{taskDescription}}}
  {{#if projectTitle}}Project: {{{projectTitle}}}{{/if}}
  {{#if clientName}}Client: {{{clientName}}}{{/if}}
  
  QUESTION:
  {{{question}}}
  
  Provide a professional, actionable, and encouraging response. Keep it concise. Focus on studio standards and creative excellence.`,
});

const aiTaskAssistantFlow = ai.defineFlow(
  {
    name: 'aiTaskAssistantFlow',
    inputSchema: AITaskAssistantInputSchema,
    outputSchema: AITaskAssistantOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
