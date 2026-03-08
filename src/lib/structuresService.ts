import { supabase } from './supabase';

export interface Structure {
    id: string;
    user_id: string;
    name: string;
    file_path: string;
    file_type: string;
    file_size: number | null;
    starred: boolean;
    notes: string | null;
    created_at: string;
}

/** Upload a file to Supabase Storage and insert a row in the structures table */
export async function uploadStructure(file: File, userId: string): Promise<Structure> {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'pdb';
    const uuid = crypto.randomUUID();
    const filePath = `${userId}/${uuid}.${ext}`;

    // 1. Upload to storage
    const { error: storageError } = await supabase.storage
        .from('structures')
        .upload(filePath, file, { contentType: 'application/octet-stream', upsert: false });

    if (storageError) throw new Error(`Upload failed: ${storageError.message}`);

    // 2. Insert metadata row
    const { data, error: dbError } = await supabase
        .from('structures')
        .insert({
            user_id: userId,
            name: file.name.replace(/\.[^/.]+$/, ''),
            file_path: filePath,
            file_type: ext.toUpperCase(),
            file_size: file.size,
        })
        .select()
        .single();

    if (dbError) throw new Error(`DB insert failed: ${dbError.message}`);
    return data as Structure;
}

/** List all structures for the current user, newest first */
export async function listStructures(userId: string): Promise<Structure[]> {
    const { data, error } = await supabase
        .from('structures')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as Structure[];
}

/** Toggle the starred field */
export async function toggleStar(id: string, starred: boolean): Promise<void> {
    const { error } = await supabase.from('structures').update({ starred }).eq('id', id);
    if (error) throw new Error(error.message);
}

/** Delete a structure row and its file from storage */
export async function deleteStructure(id: string, filePath: string): Promise<void> {
    await supabase.storage.from('structures').remove([filePath]);
    const { error } = await supabase.from('structures').delete().eq('id', id);
    if (error) throw new Error(error.message);
}

/** Rename a structure */
export async function renameStructure(id: string, name: string): Promise<void> {
    const { error } = await supabase.from('structures').update({ name }).eq('id', id);
    if (error) throw new Error(error.message);
}

/** Update the notes for a structure */
export async function updateNotes(id: string, notes: string): Promise<void> {
    const { error } = await supabase.from('structures').update({ notes }).eq('id', id);
    if (error) throw new Error(error.message);
}

/** Fetch a PDB file from RCSB and upload it directly to Supabase Storage */
export async function importFromRCSB(pdbId: string, userId: string): Promise<Structure> {
    const id = pdbId.trim().toUpperCase();
    if (!/^[A-Z0-9]{4}$/.test(id)) throw new Error('Invalid PDB ID — must be 4 characters (e.g. 1CRN)');

    const url = `https://files.rcsb.org/download/${id}.pdb`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`PDB ID "${id}" not found on RCSB`);

    const blob = await res.blob();
    const file = new File([blob], `${id}.pdb`, { type: 'chemical/x-pdb' });
    return uploadStructure(file, userId);
}

/** Get a short-lived signed URL for a private file */
export async function getDownloadUrl(filePath: string): Promise<string> {
    const { data, error } = await supabase.storage
        .from('structures')
        .createSignedUrl(filePath, 3600); // 1-hour expiry

    if (error || !data?.signedUrl) throw new Error('Could not generate download URL');
    return data.signedUrl;
}

