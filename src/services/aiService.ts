import { supabase } from '../lib/supabase';

export interface ChatMessageRequest {
    role: 'user' | 'assistant';
    content: string;
}

export async function sendChatMessage(query: string, messages: ChatMessageRequest[], match_count: number = 5) {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) throw new Error('User not authenticated');

    // The chat_handler uses fetch directly since we need to handle streaming.
    // Supabase JS client doesn't fully support native fetch streaming easily out of the box via .invoke()
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    const url = `${supabaseUrl}/functions/v1/chat_handler`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.session.access_token}`,
            'apikey': anonKey
        },
        body: JSON.stringify({
            query,
            messages,
            match_count
        })
    });

    if (!response.ok) {
        let errStr = response.statusText;
        try { const errObj = await response.json(); if (errObj.error) errStr = errObj.error; } catch {}
        throw new Error(errStr);
    }

    if (!response.body) throw new Error("No ReadableStream returned");
    
    return response.body; // Return stream
}

export async function triggerStructureEmbedding(structureId: string): Promise<void> {
    const { error } = await supabase.functions.invoke('embed_structure', {
        body: { structure_id: structureId }
    });

    if (error) {
        console.error("Embedding generation failed:", error);
        throw new Error(error.message);
    }
}
