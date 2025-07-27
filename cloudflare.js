export default {
    async fetch(request, env) {
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
      };
  
      // Handle CORS preflight requests
      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }
  
      const apiKey = env.OPENAI_API_KEY;
      const apiUrl = 'https://api.openai.com/v1/chat/completions';
      const userInput = await request.json();
  
      const requestBody = {
        model: 'gpt-4o', // Using GPT-4o which supports web search
        messages: userInput.messages,
        max_tokens: 1000,
        tools: [
          {
            type: "web_search"
          }
        ],
        tool_choice: "auto" // Let the model decide when to use web search
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