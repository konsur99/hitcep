import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { file, uploadPreset } = await req.json();

    if (!file || !uploadPreset) {
      return NextResponse.json({ error: { message: "Missing file or uploadPreset" } }, { status: 400 });
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    if (!cloudName) {
      return NextResponse.json({ error: { message: "Cloudinary credentials missing on server" } }, { status: 500 });
    }

    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    const response = await fetch(cloudinaryUrl, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: { message: data.error?.message || "Cloudinary upload failed" } }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Server upload error:", error);
    return NextResponse.json({ error: { message: error.message || "Internal server error" } }, { status: 500 });
  }
}
