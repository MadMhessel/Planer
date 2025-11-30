// This service communicates with our own Cloud Run server
const API_BASE = '/api';

export const APIService = {
  aiGenerate: async (command: string, context: any) => {
    const response = await fetch(`${API_BASE}/ai/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ command, context })
    });

    if (!response.ok) {
      throw new Error('AI Generation failed');
    }
    return response.json();
  }
};