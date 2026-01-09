// src/app/actions.ts
'use server';

import { suggestHatSizes, SuggestHatSizesInput } from '@/ai/flows/suggest-hat-sizes';

export async function getHatSuggestions(input: SuggestHatSizesInput): Promise<string[] | null> {
  try {
    const result = await suggestHatSizes(input);
    return result.suggestedHatSizes;
  } catch (error) {
    console.error('AI suggestion failed:', error);
    // In a real app, you might want to return a more specific error message.
    return ['small', 'medium', 'large'];
  }
}
