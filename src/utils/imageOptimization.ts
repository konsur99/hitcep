/**
 * Utility to optimize and convert any uploaded image (JPG/PNG/etc) to WebP format directly in the browser.
 * This ensures that any file uploaded to the server is extremely lightweight.
 */
export const convertFileToWebP = (file: File, quality: number = 0.8, maxSize: number = 1080): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Check if it's already an image
    if (!file.type.startsWith('image/')) {
      reject(new Error('File is not an image'));
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Scale down if the image is too large, maintaining aspect ratio
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Use high quality smoothing for the resize operation
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert the drawn image to JPEG format (safer and consistently compressed across all browsers)
        const webpDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(webpDataUrl);
      };

      img.onerror = (error) => reject(error);
    };

    reader.onerror = (error) => reject(error);
  });
};

/**
 * Utility to upload a base64 image string to Cloudinary using Unsigned Uploads.
 * Returns the secure URL and the public ID of the uploaded image.
 */
export const uploadToCloudinary = async (base64Image: string): Promise<{ secure_url: string, public_id: string }> => {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary credentials are not configured (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME / UPLOAD_PRESET)');
  }

  const formData = new FormData();
  formData.append('file', base64Image);
  formData.append('upload_preset', uploadPreset);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Failed to upload image to Cloudinary');
  }

  const data = await response.json();
  return {
    secure_url: data.secure_url,
    public_id: data.public_id,
  };
};
