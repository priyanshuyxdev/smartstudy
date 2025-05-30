
'use server';
/**
 * @fileOverview A simple chatbot flow for StudySmarts.
 *
 * - chatWithBot - A function that handles a user's message and gets a bot response.
 * - ChatWithBotInput - The input type for the chatWithBot function.
 * - ChatWithBotOutput - The return type for the chatWithBot function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ChatWithBotInputSchema = z.object({
  userInput: z.string().describe('The message sent by the user to the chatbot.'),
});
export type ChatWithBotInput = z.infer<typeof ChatWithBotInputSchema>;

const ChatWithBotOutputSchema = z.object({
  botResponse: z.string().describe('The response generated by the chatbot.'),
});
export type ChatWithBotOutput = z.infer<typeof ChatWithBotOutputSchema>;

export async function chatWithBot(input: ChatWithBotInput): Promise<ChatWithBotOutput> {
  return chatFlow(input);
}

const chatPrompt = ai.definePrompt({
  name: 'studySmartsChatPrompt',
  input: {schema: ChatWithBotInputSchema},
  output: {schema: ChatWithBotOutputSchema},
  prompt: `You are StudySmarts, a friendly and helpful AI study assistant.
  The user has sent you a message. Respond clearly and concisely.

  User's message: "{{{userInput}}}"

  Your response:`,
  config: {
    temperature: 0.7, // Allow for slightly more creative/natural responses
    safetySettings: [
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
    ],
  },
});

const chatFlow = ai.defineFlow(
  {
    name: 'chatWithBotFlow',
    inputSchema: ChatWithBotInputSchema,
    outputSchema: ChatWithBotOutputSchema,
  },
  async (input: ChatWithBotInput) => {
    // Check for the specific hardcoded question
    if (input.userInput.toLowerCase().trim() === "how many people received heads from lakshay") {
      return { botResponse: "69" };
    }

    // Otherwise, proceed with the AI prompt
    const {output} = await chatPrompt(input);
    return output!;
  }
);

