export const uploadImageToCloudinary = async (fileOrBase64: string | File): Promise<{ secure_url: string, public_id: string }> => {
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!uploadPreset) {
    throw new Error("Upload Preset belum diatur di Environment Variables (.env.local).");
  }

  // Determine if it's a File or base64
  let fileData = fileOrBase64;
  if (typeof fileOrBase64 !== 'string') {
    // If it's a File object, we need to convert it to base64 first to send as JSON
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
    reader.readAsDataURL(fileOrBase64);
    fileData = await base64Promise;
  }

  try {
    // Gunakan internal API Route untuk mem-bypass pemblokiran koneksi (AdBlocker/ISP) di browser client
    const response = await fetch('/api/upload', {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: fileData,
        uploadPreset: uploadPreset
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Gagal mengunggah gambar ke server perantara.");
    }

    return {
      secure_url: data.secure_url,
      public_id: data.public_id,
    };
  } catch (error) {
    console.error("Internal upload proxy error:", error);
    throw error;
  }
};

/**
 * Transforms a raw Cloudinary URL to automatically negotiate the best format (f_auto)
 * and optimize quality (q_auto). This ensures WebP/AVIF is served to modern browsers,
 * while safely falling back to JPEG/PNG on older browsers (like old Safari or old iOS).
 */
export const getOptimizedUrl = (url: string | null | undefined, width?: number): string => {
  if (!url) return '';
  if (!url.includes('cloudinary.com') || !url.includes('/upload/')) return url;
  
  const transformations = ['f_auto', 'q_auto:eco'];
  if (width) {
    transformations.push(`w_${width}`);
    transformations.push('c_limit');
  }
  
  // Replace the first occurrence of '/upload/' to inject transformations
  // And rewrite any trailing extension to .jpg to prevent older Safari from preemptively blocking .webp URLs
  let optimized = url.replace('/upload/', `/upload/${transformations.join(',')}/`);
  optimized = optimized.replace(/\.[^/.]+$/, '.jpg');
  return optimized;
};
