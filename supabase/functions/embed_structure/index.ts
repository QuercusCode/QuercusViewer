import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { structure_id } = await req.json()
    
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

    // Fetch Structure to build content
    const { data: structure, error: structError } = await supabase
      .from('structures')
      .select('*')
      .eq('id', structure_id)
      .single()

    if (structError || !structure) throw new Error('Structure not found')

    // Build the content text for embedding
    let contentParts = []
    contentParts.push(`Name: ${structure.name}`)
    contentParts.push(`File Type: ${structure.file_type}`)
    if (structure.notes) contentParts.push(`Notes/Description: ${structure.notes}`)
    if (structure.tags && structure.tags.length > 0) contentParts.push(`Tags: ${structure.tags.join(', ')}`)
    if (structure.metadata) {
      if (structure.metadata.title) contentParts.push(`Metadata Title: ${structure.metadata.title}`)
      if (structure.metadata.method) contentParts.push(`Method: ${structure.metadata.method}`)
      if (structure.metadata.organism) contentParts.push(`Organism: ${structure.metadata.organism}`)
    }

    const contentText = contentParts.join('\n')

    // Generate OpenAI Embedding
    const openAiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAiKey) throw new Error('Missing OPENAI_API_KEY')
    
    const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAiKey}`
      },
      body: JSON.stringify({
        input: contentText,
        model: "text-embedding-ada-002"
      })
    });
    
    const embeddingData = await embeddingResponse.json();
    if (!embeddingResponse.ok) throw new Error(embeddingData.error?.message || "Failed to generate embedding");
    
    const embedding = embeddingData.data[0].embedding;

    // Delete existing embedding for this structure if any
    await supabase.from('structure_embeddings').delete().eq('structure_id', structure_id)

    // Insert new embedding
    const { error: insertError } = await supabase.from('structure_embeddings').insert({
      structure_id,
      content: contentText,
      embedding
    })

    if (insertError) throw insertError

    return new Response(JSON.stringify({ success: true, message: 'Embedding generated and saved.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
