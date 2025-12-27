import { Phone, Mail, Facebook } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <img 
                src="/branding/BN_full_square.png" 
                alt="BN Servicios Inmobiliarios" 
                className="h-20 w-20 object-contain"
                style={{ filter: 'brightness(0) invert(1)' }}
              />
              <div>
                <h3 className="text-xl font-bold text-cyan-300">BN Inmobiliaria</h3>
                <p className="text-sm text-gray-400 italic">La tranquilidad de acertar</p>
              </div>
            </div>
            <p className="text-gray-300 leading-relaxed">
              Especialistas en bienes raíces en Manzanillo, Colima. Encuentra tu hogar ideal cerca de las playas, plazas comerciales y restaurantes.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-4 text-cyan-300">Contacto</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-cyan-400 flex-shrink-0" />
                <p className="text-gray-300">Contáctanos para más información</p>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-cyan-400 flex-shrink-0" />
                <p className="text-gray-300">info@bninmobiliaria.com</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-4 text-cyan-300">Síguenos</h3>
            <a
              href="https://www.facebook.com/p/BN-inmobiliaria-100063636817835/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
            >
              <Facebook className="h-5 w-5" />
              <span>Facebook</span>
            </a>
          </div>
        </div>

        <div className="border-t border-gray-600 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} BN Inmobiliaria. Todos los derechos reservados.</p>
          <p className="mt-2 text-sm">Manzanillo, Colima - Tu hogar ideal te espera</p>
        </div>
      </div>
    </footer>
  );
}
