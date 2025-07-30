export default {
    async fetch(request, env) {
          const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
      'Content-Type': 'application/json'
    };
  
      // Handle CORS preflight requests
      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }
  
      const apiKey = env.MISTRAL_API;
      const apiUrl = 'https://api.mistral.ai/v1/chat/completions';
      const userInput = await request.json();
  
      const requestBody = {
        model: 'mistral-small-latest', // Using Mistral's small model
        messages: userInput.messages,
        max_tokens: 1000,
        temperature: 0.7
      };
  
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
  
      const data = await response.json();
  
      return new Response(JSON.stringify(data), { headers: corsHeaders });
    }
  };