import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1"
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.36.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, messages, match_count = 5 } = await req.json()
    
    // Auth Check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!supabaseUrl || !supabaseAnonKey) throw new Error('Missing Supabase environment variables')
      
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) throw new Error('Unauthorized')

    // Generate OpenAI Embedding for Query
    const openAiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAiKey) throw new Error('Missing OPENAI_API_KEY')
    
    const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAiKey}`
      },
      body: JSON.stringify({
        input: query,
        model: "text-embedding-ada-002"
      })
    });
    const embeddingData = await embeddingResponse.json();
    if (!embeddingResponse.ok) throw new Error(embeddingData.error?.message || "Failed to generate embedding");
    
    const queryEmbedding = embeddingData.data[0].embedding;

    // Vector Search
    const { data: matchedStructures, error: matchError } = await supabase.rpc('match_structures', {
      query_embedding: queryEmbedding,
      match_threshold: 0.70, // Adjust as needed
      match_count: match_count,
      p_user_id: user.id
    })
    
    if (matchError) throw matchError

    let contextText = "";
    if (matchedStructures && matchedStructures.length > 0) {
      contextText = "Here is some information about the user's uploaded molecular structures from their repository that matched the query:\n\n";
      matchedStructures.forEach((s: any) => {
         contextText += `---\nStructure Information:\n${s.content}\n---\n`;
      })
    } else {
      contextText = "No specific molecular structures from the user's repository were found matching this query.";
    }

    // Anthropic Chat
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) throw new Error('Missing ANTHROPIC_API_KEY')
    
    const anthropic = new Anthropic({ apiKey: anthropicKey })
    
    // We append the context to the last user message dynamically instead of creating a huge system prompt.
    const latestMessage = messages[messages.length - 1];
    const augmentedContent = `${contextText}\n\nUser Question:\n${latestMessage.content}`;
    
    const augmentedMessages = [
        ...messages.slice(0, -1),
        { role: 'user', content: augmentedContent }
    ]

    const stream = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1024,
      system: "You are Quercus AI, a helpful assistant expert in structural biology and chemistry. You help the user analyze their 3D structures.",
      messages: augmentedMessages,
      stream: true,
    });

    const body = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
                const text = chunk.delta.text;
                controller.enqueue(new TextEncoder().encode(JSON.stringify({ text }) + '\n'));
            }
          }
        } catch (e: any) {
            console.error(e)
            controller.enqueue(new TextEncoder().encode(JSON.stringify({ error: e.message }) + '\n'));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/x-ndjson',
      },
    })
    
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
