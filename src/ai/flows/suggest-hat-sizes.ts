'use server';

/**
 * @fileOverview An AI agent to suggest hat sizes based on detected face dimensions.
 *
 * - suggestHatSizes - A function that suggests hat sizes based on face dimensions.
 * - SuggestHatSizesInput - The input type for the suggestHatSizes function.
 * - SuggestHatSizesOutput - The return type for the suggestHatSizes function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestHatSizesInputSchema = z.object({
  faceWidth: z.number().describe('The width of the detected face in pixels.'),
  faceHeight: z.number().describe('The height of the detected face in pixels.'),
});

export type SuggestHatSizesInput = z.infer<typeof SuggestHatSizesInputSchema>;

const SuggestHatSizesOutputSchema = z.object({
  suggestedHatSizes: z
    .array(z.string())
    .describe('An array of suggested hat sizes (e.g., small, medium, large) that would fit the detected face.'),
});

export type SuggestHatSizesOutput = z.infer<typeof SuggestHatSizesOutputSchema>;

export async function suggestHatSizes(input: SuggestHatSizesInput): Promise<SuggestHatSizesOutput> {
  return suggestHatSizesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestHatSizesPrompt',
  input: {schema: SuggestHatSizesInputSchema},
  output: {schema: SuggestHatSizesOutputSchema},
  prompt: `You are a helpful assistant that suggests hat sizes based on the dimensions of a detected face.

  Given a face width of {{faceWidth}} pixels and a face height of {{faceHeight}} pixels, suggest three hat sizes that would be a good fit. Provide the sizes as an array of strings.
  Consider that average adult head circumference is 55-60cm. Small is considered less than 55cm, medium between 55cm and 58cm, and large over 58cm. Estimate hat size based on face dimensions.
  Do not provide rationale, only emit the sizes in the form of an array of strings, for example [\'small\', \'medium\', \'large\'].`,
});

const suggestHatSizesFlow = ai.defineFlow(
  {
    name: 'suggestHatSizesFlow',
    inputSchema: SuggestHatSizesInputSchema,
    outputSchema: SuggestHatSizesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
