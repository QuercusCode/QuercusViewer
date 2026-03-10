import JSZip from 'jszip';
import { supabase } from './supabase';

// ─── Types ────────────────────────────────────────────────────────

export interface RCSBMeta {
    title: string;
    method: string;
    resolution: number | null;
    organism: string;
    is_deleted?: boolean;
    deleted_at?: string;
}

export interface Collection {
    id: string;
    user_id: string;
    name: string;
    color: string;
    parent_id?: string | null;
    is_public?: boolean;
    created_at: string;
}

export interface Structure {
    id: string;
    user_id: string;
    name: string;
    file_path: string;
    file_type: string;
    file_size: number | null;
    starred: boolean;
    notes: string | null;
    tags: string[];
    metadata: RCSBMeta | null;
    collection_id: string | null;
    view_count: number;
    created_at: string;
}

export type ActivityAction = 'upload' | 'open' | 'share' | 'delete' | 'import_rcsb' | 'duplicate';

export interface ActivityLog {
    id: string;
    user_id: string;
    structure_id: string | null;
    structure_name: string | null;
    action: ActivityAction;
    created_at: string;
}

// ─── Structure CRUD ───────────────────────────────────────────────

/** Upload a file to Supabase Storage and insert a row in the structures table */
export async function uploadStructure(
    file: File,
    userId: string,
    extra?: Partial<Pick<Structure, 'metadata' | 'collection_id'>>
): Promise<Structure> {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'pdb';
    const uuid = crypto.randomUUID();
    const filePath = `${userId}/${uuid}.${ext}`;

    const { error: storageError } = await supabase.storage
        .from('structures')
        .upload(filePath, file, { contentType: 'application/octet-stream', upsert: false });

    if (storageError) throw new Error(`Upload failed: ${storageError.message}`);

    const { data, error: dbError } = await supabase
        .from('structures')
        .insert({
            user_id: userId,
            name: file.name.replace(/\.[^/.]+$/, ''),
            file_path: filePath,
            file_type: ext.toUpperCase(),
            file_size: file.size,
            ...(extra ?? {}),
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

export async function toggleStar(id: string, starred: boolean): Promise<void> {
    const { error } = await supabase.from('structures').update({ starred }).eq('id', id);
    if (error) throw new Error(error.message);
}

export async function deleteStructure(id: string, filePath: string): Promise<void> {
    await supabase.storage.from('structures').remove([filePath]);
    const { error } = await supabase.from('structures').delete().eq('id', id);
    if (error) throw new Error(error.message);
}

export async function renameStructure(id: string, name: string): Promise<void> {
    const { error } = await supabase.from('structures').update({ name }).eq('id', id);
    if (error) throw new Error(error.message);
}

export async function moveToTrash(id: string, currentMetadata: RCSBMeta | null): Promise<void> {
    const updatedMetadata: RCSBMeta = {
        ...(currentMetadata || { title: '', method: '', resolution: null, organism: '' }),
        is_deleted: true,
        deleted_at: new Date().toISOString()
    };
    const { error } = await supabase.from('structures').update({ metadata: updatedMetadata }).eq('id', id);
    if (error) throw new Error(error.message);
}

export async function restoreFromTrash(id: string, currentMetadata: RCSBMeta | null): Promise<void> {
    if (!currentMetadata) return;
    const updatedMetadata: RCSBMeta = { ...currentMetadata };
    delete updatedMetadata.is_deleted;
    delete updatedMetadata.deleted_at;

    const { error } = await supabase.from('structures').update({ metadata: updatedMetadata }).eq('id', id);
    if (error) throw new Error(error.message);
}

export async function updateNotes(id: string, notes: string): Promise<void> {
    const { error } = await supabase.from('structures').update({ notes }).eq('id', id);
    if (error) throw new Error(error.message);
}

export async function updateTags(id: string, tags: string[]): Promise<void> {
    const { error } = await supabase.from('structures').update({ tags }).eq('id', id);
    if (error) throw new Error(error.message);
}

export async function assignCollection(id: string, collectionId: string | null): Promise<void> {
    const { error } = await supabase.from('structures').update({ collection_id: collectionId }).eq('id', id);
    if (error) throw new Error(error.message);
}

export async function duplicateStructure(s: Structure, userId: string): Promise<Structure> {
    const url = await getDownloadUrl(s.file_path);
    const res = await fetch(url);
    if (!res.ok) throw new Error('Could not fetch original file');
    const blob = await res.blob();
    const ext = s.file_type.toLowerCase();
    const file = new File([blob], `${s.name} (copy).${ext}`, { type: 'application/octet-stream' });
    return uploadStructure(file, userId);
}

/** Signed URL for a private file (1-hour expiry) */
export async function getDownloadUrl(filePath: string): Promise<string> {
    const { data, error } = await supabase.storage.from('structures').createSignedUrl(filePath, 3600);
    if (error || !data?.signedUrl) throw new Error('Could not generate download URL');
    return data.signedUrl;
}

// ─── RCSB Import + Metadata ───────────────────────────────────────

/** Fetch entry metadata from the RCSB Data API */
export async function fetchRCSBMetadata(pdbId: string): Promise<RCSBMeta> {
    const id = pdbId.toUpperCase();
    const res = await fetch(`https://data.rcsb.org/rest/v1/core/entry/${id}`);
    if (!res.ok) return { title: id, method: '', resolution: null, organism: '' };
    const d = await res.json();

    const title: string = d?.struct?.title ?? id;
    const method: string = d?.exptl?.[0]?.method ?? '';
    const resolution: number | null =
        d?.refine?.[0]?.ls_d_res_high ??
        d?.em_3d_reconstruction?.[0]?.resolution ?? null;

    // Organism: try polymer entity endpoint
    let organism = '';
    try {
        const er = await fetch(`https://data.rcsb.org/rest/v1/core/entity/${id}/1`);
        if (er.ok) {
            const ed = await er.json();
            organism = ed?.rcsb_entity_source_organism?.[0]?.scientific_name ?? '';
        }
    } catch { /* optional */ }

    return { title, method, resolution, organism };
}

/** Fetch a PDB from RCSB, auto-attach metadata, and upload to Supabase */
export async function importFromRCSB(pdbId: string, userId: string): Promise<Structure> {
    const id = pdbId.trim().toUpperCase();
    if (!/^[A-Z0-9]{4}$/.test(id)) throw new Error('Invalid PDB ID — must be 4 characters (e.g. 1CRN)');

    // Fetch file + metadata in parallel
    const [fileRes, metadata] = await Promise.all([
        fetch(`https://files.rcsb.org/download/${id}.pdb`),
        fetchRCSBMetadata(id),
    ]);
    if (!fileRes.ok) throw new Error(`PDB ID "${id}" not found on RCSB`);

    const blob = await fileRes.blob();
    const displayName = metadata.title && metadata.title !== id ? metadata.title : id;
    const file = new File([blob], `${id}.pdb`, { type: 'chemical/x-pdb' });

    // Upload and set the name to metadata title
    const s = await uploadStructure(file, userId, { metadata });
    // Rename to the RCSB title if available
    if (displayName !== id) await renameStructure(s.id, displayName.slice(0, 80));
    return { ...s, name: displayName.slice(0, 80), metadata };
}

// ─── Collections ──────────────────────────────────────────────────

export async function listCollections(userId: string): Promise<Collection[]> {
    const { data, error } = await supabase
        .from('collections')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as Collection[];
}

export async function createCollection(userId: string, name: string, color: string, parentId?: string | null): Promise<Collection> {
    const { data, error } = await supabase
        .from('collections')
        .insert({ user_id: userId, name, color, parent_id: parentId || null })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function renameCollection(id: string, name: string): Promise<void> {
    const { error } = await supabase.from('collections').update({ name }).eq('id', id);
    if (error) throw error;
}

export async function moveStructure(structureId: string, destCollectionId: string | null): Promise<void> {
    const { error } = await supabase.from('structures').update({ collection_id: destCollectionId }).eq('id', structureId);
    if (error) throw error;
}

export async function moveCollection(collectionId: string, destParentId: string | null): Promise<void> {
    const { error } = await supabase.from('collections').update({ parent_id: destParentId }).eq('id', collectionId);
    if (error) throw error;
}

export async function deleteCollection(id: string): Promise<void> {
    const { error } = await supabase.from('collections').delete().eq('id', id);
    if (error) throw new Error(error.message);
}

export async function toggleCollectionPublic(collectionId: string, is_public: boolean): Promise<void> {
    const { error } = await supabase.from('collections').update({ is_public }).eq('id', collectionId);
    if (error) throw error;
}

export async function getPublicCollection(collectionId: string): Promise<{ collection: Collection, structures: Structure[] }> {
    const [colRes, strRes] = await Promise.all([
        supabase.from('collections').select('*').eq('id', collectionId).single(),
        supabase.from('structures').select('*').eq('collection_id', collectionId).order('created_at', { ascending: false })
    ]);
    if (colRes.error) throw new Error('Collection not found or access denied.');
    if (strRes.error) throw new Error('Could not fetch structures.');

    // Auto-filter out soft-deleted structures so they are never public
    const activeStructures = ((strRes.data ?? []) as Structure[]).filter(s => !s.metadata?.is_deleted);

    return { collection: colRes.data as Collection, structures: activeStructures };
}

// ─── ZIP Export ───────────────────────────────────────────────────

/** Download every structure and pack into a ZIP file */
export async function exportAllAsZip(structures: Structure[]): Promise<void> {
    const zip = new JSZip();
    const folder = zip.folder('quercus-structures')!;

    await Promise.all(
        structures.map(async s => {
            try {
                const url = await getDownloadUrl(s.file_path);
                const res = await fetch(url);
                if (!res.ok) return;
                const blob = await res.blob();
                folder.file(`${s.name}.${s.file_type.toLowerCase()}`, blob);
            } catch { /* skip failed files */ }
        })
    );

    const content = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(content);
    a.download = `quercus-structures-${new Date().toISOString().slice(0, 10)}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
}

// ─── Analytics ────────────────────────────────────────────────────

/** Atomically increment the view_count for a structure (fire-and-forget ok) */
export async function incrementViewCount(id: string): Promise<void> {
    // Use a Postgres RPC for atomic increment if available, otherwise do a read-modify-write
    const { data } = await supabase
        .from('structures')
        .select('view_count')
        .eq('id', id)
        .single();
    const next = ((data?.view_count ?? 0) as number) + 1;
    await supabase.from('structures').update({ view_count: next }).eq('id', id);
}

/** Write an activity log entry into the activity_log table */
export async function logActivity(
    userId: string,
    action: ActivityAction,
    structureId?: string,
    structureName?: string,
): Promise<void> {
    await supabase.from('activity_log').insert({
        user_id: userId,
        action,
        structure_id: structureId ?? null,
        structure_name: structureName ?? null,
    });
}

/** Fetch the most recent activity log entries for a user */
export async function getActivityLog(userId: string, limit = 30): Promise<ActivityLog[]> {
    const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []) as ActivityLog[];
}
