'use server';
/**
 * @fileOverview An AI tool that automatically prioritizes and highlights tasks based on their deadlines.
 *
 * - prioritizeTasksByDeadline - A function that prioritizes tasks based on deadlines.
 * - PrioritizeTasksInput - The input type for the prioritizeTasksByDeadline function.
 * - PrioritizeTasksOutput - The return type for the prioritizeTasksByDeadline function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PrioritizeTasksInputSchema = z.object({
  tasks: z.array(
    z.object({
      id: z.string().describe('The unique identifier of the task.'),
      description: z.string().describe('A brief description of the task.'),
      deadline: z.string().describe('The deadline of the task in ISO format (YYYY-MM-DD).'),
    })
  ).describe('A list of tasks to prioritize.'),
});
export type PrioritizeTasksInput = z.infer<typeof PrioritizeTasksInputSchema>;

const PrioritizeTasksOutputSchema = z.object({
  prioritizedTasks: z.array(
    z.object({
      id: z.string().describe('The unique identifier of the task.'),
      description: z.string().describe('A brief description of the task.'),
      deadline: z.string().describe('The deadline of the task in ISO format (YYYY-MM-DD).'),
      priority: z.string().describe('The priority of the task (e.g., High, Medium, Low).'),
      reason: z.string().describe('The reason for the assigned priority.'),
    })
  ).describe('A list of tasks with assigned priorities and reasons.'),
});
export type PrioritizeTasksOutput = z.infer<typeof PrioritizeTasksOutputSchema>;

export async function prioritizeTasksByDeadline(input: PrioritizeTasksInput): Promise<PrioritizeTasksOutput> {
  return prioritizeTasksFlow(input);
}

const prompt = ai.definePrompt({
  name: 'prioritizeTasksPrompt',
  input: {schema: PrioritizeTasksInputSchema},
  output: {schema: PrioritizeTasksOutputSchema},
  prompt: `You are a project management assistant. Your task is to prioritize a list of tasks based on their deadlines. Provide a priority (High, Medium, Low) and a brief reason for each task.\n\nTasks:\n{{#each tasks}}\n- ID: {{id}}, Description: {{description}}, Deadline: {{deadline}}\n{{/each}}`,
});

const prioritizeTasksFlow = ai.defineFlow(
  {
    name: 'prioritizeTasksFlow',
    inputSchema: PrioritizeTasksInputSchema,
    outputSchema: PrioritizeTasksOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
