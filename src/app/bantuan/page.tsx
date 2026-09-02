import Link from 'next/link';

export default function PusatBantuan() {
  return (
    <main className="min-h-[100vh] bg-gray-50 pb-6">
      {/* Header */}
      <div className="bg-white px-5 py-4 flex items-center shadow-sm sticky top-0 z-50">
        <Link href="/profil" className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
          <i className="fa-solid fa-arrow-left text-lg"></i>
        </Link>
        <h1 className="font-extrabold text-gray-800 text-lg ml-2">Pusat Bantuan</h1>
      </div>

      <div className="px-5 mt-6 max-w-3xl mx-auto w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-md">
            <i className="fa-solid fa-headset text-3xl text-orange-500"></i>
          </div>
          <h2 className="text-xl font-extrabold text-gray-800">Butuh Bantuan?</h2>
          <p className="text-sm text-gray-500 mt-2">
            Silakan hubungi tim dukungan kami jika Anda mengalami kendala teknis atau pertanyaan seputar sistem.
          </p>
        </div>

        {/* Contact Cards */}
        <div className="space-y-4">
          
          {/* WhatsApp */}
          <a 
            href="https://wa.me/6287888266699" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center p-4 bg-white rounded-2xl shadow-card border border-gray-100 hover:border-green-200 hover:shadow-lg transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-green-50 text-green-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <i className="fa-brands fa-whatsapp text-2xl"></i>
            </div>
            <div className="ml-4 flex-1">
              <h4 className="text-sm font-bold text-gray-800">Hubungi via WhatsApp</h4>
              <p className="text-xs font-medium text-gray-500 mt-0.5">0878-8826-6699</p>
            </div>
            <i className="fa-solid fa-chevron-right text-gray-300 text-xs"></i>
          </a>

          {/* Email */}
          <a 
            href="mailto:anantawijaya212@gmail.com" 
            className="flex items-center p-4 bg-white rounded-2xl shadow-card border border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <i className="fa-solid fa-envelope text-xl"></i>
            </div>
            <div className="ml-4 flex-1">
              <h4 className="text-sm font-bold text-gray-800">Kirim Email</h4>
              <p className="text-xs font-medium text-gray-500 mt-0.5 break-all">anantawijaya212@gmail.com</p>
            </div>
            <i className="fa-solid fa-chevron-right text-gray-300 text-xs"></i>
          </a>

        </div>

        {/* Jam Operasional */}
        <div className="mt-8 bg-gray-100 rounded-xl p-4 text-center border border-gray-200">
          <i className="fa-regular fa-clock text-gray-400 mb-2 text-lg"></i>
          <p className="text-xs font-medium text-gray-600">
            Layanan bantuan aktif dari <br />
            <strong className="text-gray-800">Senin - Jumat (08:00 - 17:00 WIB)</strong>
          </p>
        </div>
      </div>
    </main>
  );
}
