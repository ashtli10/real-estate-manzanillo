import { useEffect, useState } from 'react';
import { MapPin, Users, TrendingUp, ChevronLeft, ChevronRight, Star, Building2, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../integrations/supabase/client';
import type { Property } from '../types/property';
import { PropertyCard } from '../components/PropertyCard';
import { SearchBar, SearchFilters } from '../components/SearchBar';
import { transformProperty } from '../lib/propertyTransform';
import { updateMetaTags, getHomeSEO } from '../lib/seo';

interface HomeProps {
  onNavigate: (path: string) => void;
  onUpdateWhatsappMessage: (message: string) => void;
}

export function Home({ onNavigate, onUpdateWhatsappMessage }: HomeProps) {
  const { t } = useTranslation();
  const [featuredProperties, setFeaturedProperties] = useState<Property[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeaturedProperties();
    updateMetaTags(getHomeSEO());
  }, []);

  useEffect(() => {
    onUpdateWhatsappMessage(t('whatsapp.defaultMessage'));
  }, [onUpdateWhatsappMessage, t]);

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
        .eq('status', 'active')
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

  const handleSearch = (filters: SearchFilters) => {
    const params = new URLSearchParams();
    if (filters.query) params.set('q', filters.query);
    if (filters.propertyType !== 'all') params.set('type', filters.propertyType);
    if (filters.listingType !== 'all') params.set('listing', filters.listingType);
    if (filters.location !== 'all') params.set('location', filters.location);
    
    onNavigate(`/propiedades${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % featuredProperties.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + featuredProperties.length) % featuredProperties.length);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section
        className="relative min-h-[90vh] md:min-h-[85vh] flex items-center justify-center bg-cover bg-center"
        style={{
          backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.6)), url(https://images.pexels.com/photos/1268871/pexels-photo-1268871.jpeg?auto=compress&cs=tinysrgb&w=1920)',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 via-transparent to-black/40" />
        
        <div className="relative container mx-auto px-4 py-12 md:py-20 z-10">
          <div className="text-center max-w-4xl mx-auto mb-8 md:mb-12">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              {t('landing.hero.title')}
            </h1>
            <p className="text-lg md:text-xl text-gray-200 mb-8 max-w-2xl mx-auto leading-relaxed">
              {t('landing.hero.subtitle')}
            </p>
          </div>

          <SearchBar onSearch={handleSearch} variant="hero" />

          <div className="flex flex-wrap justify-center gap-6 md:gap-12 mt-12 text-white">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold">100+</div>
              <div className="text-sm text-gray-300">{t('agent.properties')}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold">50+</div>
              <div className="text-sm text-gray-300">{t('landing.features.trusted.title').split(' ')[0]}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold">10+</div>
              <div className="text-sm text-gray-300">Colonias</div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex items-start justify-center p-1">
            <div className="w-1.5 h-3 bg-white/70 rounded-full" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 group">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <MapPin className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{t('landing.features.location.title')}</h3>
              <p className="text-gray-600 leading-relaxed">{t('landing.features.location.description')}</p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 group">
              <div className="bg-gradient-to-br from-cyan-500 to-teal-500 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{t('landing.features.trusted.title')}</h3>
              <p className="text-gray-600 leading-relaxed">{t('landing.features.trusted.description')}</p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 group">
              <div className="bg-gradient-to-br from-emerald-500 to-green-500 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{t('landing.features.investment.title')}</h3>
              <p className="text-gray-600 leading-relaxed">{t('landing.features.investment.description')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Properties Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{t('landing.featured.title')}</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">{t('landing.featured.subtitle')}</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
          ) : featuredProperties.length > 0 ? (
            <>
              {/* Featured Carousel for Desktop */}
              <div className="hidden md:block relative mb-12">
                <div className="relative h-[500px] rounded-3xl overflow-hidden shadow-2xl">
                  {featuredProperties.map((property, index) => (
                    <div
                      key={property.id}
                      className={`absolute inset-0 transition-all duration-700 ${
                        index === currentSlide ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
                      }`}
                    >
                      <div
                        className="h-full bg-cover bg-center cursor-pointer"
                        style={{
                          backgroundImage: `url(${property.images[0] || 'https://images.pexels.com/photos/186077/pexels-photo-186077.jpeg?auto=compress&cs=tinysrgb&w=1600'})`,
                        }}
                        onClick={() => onNavigate(`/propiedad/${property.slug}`)}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex gap-2 mb-3">
                                {property.is_for_sale && (
                                  <span className="bg-blue-600 text-white text-sm font-semibold px-4 py-1.5 rounded-full">
                                    {t('propertyCard.forSale')}
                                  </span>
                                )}
                                {property.is_for_rent && (
                                  <span className="bg-emerald-600 text-white text-sm font-semibold px-4 py-1.5 rounded-full">
                                    {t('propertyCard.forRent')}
                                  </span>
                                )}
                              </div>
                              <h3 className="text-3xl font-bold mb-2">{property.title}</h3>
                              <p className="text-gray-300 flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                {property.location_neighborhood && `${property.location_neighborhood}, `}
                                {property.location_city}
                              </p>
                            </div>
                            <div className="text-right">
                              {property.is_for_sale && (
                                <div className="text-3xl font-bold text-white">
                                  ${property.price?.toLocaleString()} {property.currency}
                                </div>
                              )}
                              {property.is_for_rent && (
                                <div className="text-xl text-gray-300">
                                  ${property.rent_price?.toLocaleString()}/mo
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <button
                    onClick={prevSlide}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white p-3 rounded-full transition-all"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={nextSlide}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white p-3 rounded-full transition-all"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>

                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {featuredProperties.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentSlide(index)}
                        className={`w-2.5 h-2.5 rounded-full transition-all ${
                          index === currentSlide ? 'bg-white w-8' : 'bg-white/50 hover:bg-white/70'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredProperties.slice(0, 6).map((property) => (
                  <PropertyCard key={property.id} property={property} onNavigate={onNavigate} />
                ))}
              </div>

              <div className="text-center mt-12">
                <button
                  onClick={() => onNavigate('/propiedades')}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:shadow-lg hover:shadow-blue-500/25"
                >
                  {t('common.viewAll')}
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">{t('landing.featured.empty')}</p>
            </div>
          )}
        </div>
      </section>

      {/* About Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">{t('landing.about.title')}</h2>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">{t('landing.about.description')}</p>
              <ul className="space-y-4">
                {[t('landing.about.point1'), t('landing.about.point2'), t('landing.about.point3'), t('landing.about.point4')].map((point, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=800"
                  alt="Real Estate"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-100 p-3 rounded-xl">
                    <Star className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">4.9/5</div>
                    <div className="text-sm text-gray-500">Client Rating</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section for Agents */}
      <section className="py-16 md:py-24 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{t('landing.cta.title')}</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">{t('landing.cta.subtitle')}</p>
          <button
            onClick={() => window.open('https://wa.me/523321831999', '_blank')}
            className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-all hover:shadow-lg"
          >
            {t('landing.cta.button')}
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </section>
    </div>
  );
}
