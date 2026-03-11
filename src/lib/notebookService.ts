import { supabase } from './supabase';
import type { NotebookEntry } from '../types';

export async function listNotebooks(userId: string): Promise<NotebookEntry[]> {
    const { data, error } = await supabase
        .from('notebooks')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
}

export async function createNotebook(userId: string, title: string = 'Untitled Entry', content: string = ''): Promise<NotebookEntry> {
    const { data, error } = await supabase
        .from('notebooks')
        .insert([{ user_id: userId, title, content }])
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
}

export async function updateNotebook(id: string, updates: Partial<Pick<NotebookEntry, 'title' | 'content'>>): Promise<void> {
    const { error } = await supabase
        .from('notebooks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

    if (error) throw new Error(error.message);
}

export async function deleteNotebook(id: string): Promise<void> {
    const { error } = await supabase
        .from('notebooks')
        .delete()
        .eq('id', id);

    if (error) throw new Error(error.message);
}
