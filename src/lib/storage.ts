import { supabase } from '@/lib/supabase';

export const STORAGE_BUCKET = 'art-requests';

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function uploadToBucket(
  file: File,
  sessionId: string,
  folder: string,
): Promise<{ path: string }> {
  const path = `${sessionId}/${folder}/${Date.now()}-${safeName(file.name)}`;
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) throw error;
  return { path };
}
