import { useEffect, useState } from 'react';
import { MapPin, Home as HomeIcon, Shield, TrendingUp } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import type { Property } from '../types/property';
import { PropertyCard } from '../components/PropertyCard';
import { transformProperty } from '../lib/propertyTransform';
import { updateMetaTags, getHomeSEO } from '../lib/seo';

interface HomeProps {
  onNavigate: (path: string) => void;
  onUpdateWhatsappMessage: (message: string) => void;
}

export function Home({ onNavigate, onUpdateWhatsappMessage }: HomeProps) {
  const [featuredProperties, setFeaturedProperties] = useState<Property[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeaturedProperties();
    // Update SEO meta tags for home page
    updateMetaTags(getHomeSEO());
  }, []);

  useEffect(() => {
    onUpdateWhatsappMessage('Hola, quiero asesoría para encontrar la mejor propiedad en Manzanillo.');
  }, [onUpdateWhatsappMessage]);

  useEffect(() => {
    if (featuredProperties.length > 1) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % featuredProperties.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [featuredProperties.length]);

  const loadFeaturedProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('is_featured', true)
        .eq('is_published', true)
        .order('display_order', { ascending: true })
        .limit(6);

      if (error) throw error;
      setFeaturedProperties((data || []).map(transformProperty));
    } catch (error) {
      console.error('Error loading featured properties:', error);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div
        className="relative bg-cover bg-center text-white"
        style={{
          backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.6)), url(https://images.pexels.com/photos/1268871/pexels-photo-1268871.jpeg?auto=compress&cs=tinysrgb&w=1600)',
        }}
      >
        <div className="container mx-auto px-4 py-24 md:py-32">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Encuentra tu hogar ideal en Manzanillo
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-200 leading-relaxed">
              Especialistas en bienes raíces con más de 10 años de experiencia. Propiedades cerca de las mejores playas, plazas comerciales y restaurantes de Manzanillo, Colima.
            </p>
            <button
              onClick={() => onNavigate('/propiedades')}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold shadow-xl transform transition-all hover:scale-105"
            >
              Explorar propiedades
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-8 rounded-xl shadow-lg text-center transform transition-all hover:scale-105">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">Ubicación estratégica</h3>
            <p className="text-gray-600">
              En Av. Manzanillo, a metros del Blvd. Costero. Acceso fácil a playas, comercios y servicios.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-lg text-center transform transition-all hover:scale-105">
            <div className="bg-cyan-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-cyan-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">Confianza y seguridad</h3>
            <p className="text-gray-600">
              Más de 10 años de experiencia respaldando cada transacción con profesionalismo y transparencia.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-lg text-center transform transition-all hover:scale-105">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">Inversión inteligente</h3>
            <p className="text-gray-600">
              Oportunidades de inversión en una de las zonas más atractivas de la costa del Pacífico.
            </p>
          </div>
        </div>

        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
              Propiedades destacadas
            </h2>
            <p className="text-lg text-gray-600">
              Descubre las mejores opciones disponibles en Manzanillo
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : featuredProperties.length > 0 ? (
            <>
              <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden mb-8">
                <div className="relative h-96 md:h-[500px]">
                  {featuredProperties.map((property, index) => (
                    <div
                      key={property.id}
                      className={`absolute inset-0 transition-opacity duration-1000 ${
                        index === currentSlide ? 'opacity-100' : 'opacity-0'
                      }`}
                    >
                      <div
                        className="h-full bg-cover bg-center relative"
                        style={{
                          backgroundImage: `url(${property.images[0] || 'https://images.pexels.com/photos/186077/pexels-photo-186077.jpeg?auto=compress&cs=tinysrgb&w=1600'})`,
                        }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                        <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                          <h3 className="text-3xl md:text-4xl font-bold mb-3">{property.title}</h3>
                          <button
                            onClick={() => onNavigate(`/propiedad/${property.slug}`)}
                            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transform transition-all hover:scale-105"
                          >
                            Ver detalles
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {featuredProperties.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                    {featuredProperties.map((_, index) => (
                      <span
                        key={index}
                        className={`w-3 h-3 rounded-full transition-all ${
                          index === currentSlide ? 'bg-white w-8' : 'bg-white bg-opacity-50'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredProperties.slice(0, 3).map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>

              <div className="text-center mt-8">
                <button
                  onClick={() => onNavigate('/propiedades')}
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-8 py-3 rounded-lg font-semibold shadow-lg transform transition-all hover:scale-105"
                >
                  Ver todas las propiedades
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl shadow-lg">
              <HomeIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No hay propiedades destacadas disponibles en este momento.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
