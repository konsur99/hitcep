export const uploadImageToCloudinary = async (fileOrBase64: string | File): Promise<{ secure_url: string, public_id: string }> => {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error("Kredensial Cloudinary (Cloud Name / Upload Preset) belum diatur di Environment Variables (.env.local).");
  }

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  const formData = new FormData();
  formData.append("file", fileOrBase64);
  formData.append("upload_preset", uploadPreset);

  try {
    const response = await fetch(url, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Gagal mengunggah gambar ke Cloudinary.");
    }

    return {
      secure_url: data.secure_url,
      public_id: data.public_id,
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error);
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
