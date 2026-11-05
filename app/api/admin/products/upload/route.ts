import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin-auth';
import { createClient } from '@/lib/supabase/server';
import { logAuditEvent } from '@/lib/audit';

const ALLOWED_MIME_TYPES = ['image/webp', 'image/jpeg', 'image/png'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(request: Request) {
  const auth = await requireAdminApi(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.errorResponse.error },
      { status: auth.errorResponse.status }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'Valid image file is required' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only WebP, JPEG, and PNG images are permitted (SVG is rejected for XSS protection)' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext = file.type === 'image/webp' ? 'webp' : file.type === 'image/png' ? 'png' : 'jpg';
    const filename = `product-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

    const supabase = await createClient();
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('[Storage Upload Error]', uploadError);
      return NextResponse.json(
        { error: uploadError.message || 'Storage upload failed' },
        { status: 500 }
      );
    }

    const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${filename}`;

    const ip = request.headers.get('x-forwarded-for') || null;
    await logAuditEvent({
      adminId: auth.user.id,
      action: 'product_image_uploaded',
      entityType: 'storage.objects',
      entityId: filename,
      newValue: { filename, size: file.size, url: publicUrl },
      ip,
    });

    return NextResponse.json({ success: true, url: publicUrl, filename });
  } catch (err: unknown) {
    console.error('[Admin Upload Exception]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload processing failed' },
      { status: 500 }
    );
  }
}

