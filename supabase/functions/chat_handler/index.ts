import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2"
import Anthropic from "npm:@anthropic-ai/sdk"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, messages, match_count = 5, viewerContext, attachments } = await req.json()

    // Auth
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

    // Generate OpenAI embedding for vector search
    const openAiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAiKey) throw new Error('Missing OPENAI_API_KEY')

    const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openAiKey}` },
      body: JSON.stringify({ input: query, model: "text-embedding-ada-002" })
    })
    const embeddingData = await embeddingResponse.json()
    if (!embeddingResponse.ok) throw new Error(embeddingData.error?.message || "Failed to generate embedding")

    const queryEmbedding = embeddingData.data[0].embedding

    // Vector search against saved library
    const { data: matchedStructures, error: matchError } = await supabase.rpc('match_structures', {
      query_embedding: queryEmbedding,
      match_threshold: 0.70,
      match_count,
      p_user_id: user.id
    })
    if (matchError) throw matchError

    // Build context text
    let contextText = ""
    if (viewerContext) {
      contextText += `${viewerContext}\n\n`
    }
    if (matchedStructures && matchedStructures.length > 0) {
      contextText += "Additionally, here are related structures from the user's saved library:\n\n"
      matchedStructures.forEach((s: any) => {
        contextText += `---\nStructure Information:\n${s.content}\n---\n`
      })
    } else if (!viewerContext) {
      contextText = "No specific molecular structures were found matching this query."
    }

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) throw new Error('Missing ANTHROPIC_API_KEY')

    const anthropic = new Anthropic({ apiKey: anthropicKey })

    // Build the augmented user message content
    const augmentedText = `${contextText}\n\nUser Question:\n${messages[messages.length - 1].content}`

    // If attachments are present, build a multi-part content array
    let currentMessageContent: any
    if (attachments && attachments.length > 0) {
      let textPart = augmentedText

      // Inject CSV/TSV text directly into the text part
      for (const att of attachments) {
        if (att.attachmentType === 'text' && att.textContent) {
          textPart = `File: ${att.name}\n\`\`\`\n${att.textContent}\n\`\`\`\n\n${textPart}`
        }
      }

      const parts: any[] = [{ type: 'text', text: textPart }]

      for (const att of attachments) {
        if (att.attachmentType === 'image' && att.data) {
          parts.push({
            type: 'image',
            source: { type: 'base64', media_type: att.mimeType, data: att.data }
          })
        } else if (att.attachmentType === 'pdf' && att.data) {
          parts.push({
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: att.data }
          })
        }
      }

      currentMessageContent = parts
    } else {
      currentMessageContent = augmentedText
    }

    const augmentedMessages = [
      ...messages.slice(0, -1),
      { role: 'user', content: currentMessageContent }
    ]

    // Anthropic requires messages to start with 'user'
    while (augmentedMessages.length > 0 && augmentedMessages[0].role !== 'user') {
      augmentedMessages.shift()
    }

    const stream = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system: "You are Quercus AI, a helpful assistant expert in structural biology and chemistry. You help the user analyze their 3D molecular structures. When structure context is provided, use it to give specific, accurate answers. When files are attached, analyze them carefully.",
      messages: augmentedMessages,
      stream: true,
    })

    const body = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              controller.enqueue(new TextEncoder().encode(JSON.stringify({ text: chunk.delta.text }) + '\n'))
            }
          }
        } catch (e: any) {
          controller.enqueue(new TextEncoder().encode(JSON.stringify({ error: e.message }) + '\n'))
        } finally {
          controller.close()
        }
      }
    })

    return new Response(body, {
      headers: { ...corsHeaders, 'Content-Type': 'application/x-ndjson' }
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
