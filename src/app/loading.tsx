import LoadingUI from '@/components/LoadingUI';

export default function Loading() {
  // Animasi Loading otomatis untuk transisi antar halaman (Next.js default behavior)
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <LoadingUI text="Memuat Halaman..." />
    </div>
  );
}
