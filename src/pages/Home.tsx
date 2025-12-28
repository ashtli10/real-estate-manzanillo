import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Home as HomeIcon, Shield, TrendingUp, Search, CheckCircle, Users, MessageCircle } from 'lucide-react';
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
  const { t } = useTranslation();
  const [featuredProperties, setFeaturedProperties] = useState<Property[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Search filters
  const [searchFilters, setSearchFilters] = useState({
    listingType: 'both', // 'sale', 'rent', 'both'
    propertyType: 'all',
    priceRange: 'all',
  });

  useEffect(() => {
    loadFeaturedProperties();
    // Update SEO meta tags for home page
    updateMetaTags(getHomeSEO());
  }, []);

  useEffect(() => {
    onUpdateWhatsappMessage(t('home.whatsappMessage'));
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

  const handleSearch = () => {
    // Build query params based on filters
    const params = new URLSearchParams();
    if (searchFilters.listingType !== 'both') {
      params.set('type', searchFilters.listingType);
    }
    if (searchFilters.propertyType !== 'all') {
      params.set('propertyType', searchFilters.propertyType);
    }
    if (searchFilters.priceRange !== 'all') {
      params.set('price', searchFilters.priceRange);
    }
    
    const queryString = params.toString();
    onNavigate(`/propiedades${queryString ? `?${queryString}` : ''}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section with Search */}
      <div
        className="relative bg-cover bg-center text-white"
        style={{
          backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.6)), url(https://images.pexels.com/photos/1268871/pexels-photo-1268871.jpeg?auto=compress&cs=tinysrgb&w=1600)',
        }}
      >
        <div className="container mx-auto px-4 py-20 md:py-28">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              {t('home.heroTitle')}
            </h1>
            <p className="text-xl md:text-2xl mb-10 text-gray-200 leading-relaxed max-w-3xl mx-auto">
              {t('home.heroSubtitle')}
            </p>
            
            {/* Search Bar */}
            <div className="bg-white rounded-2xl shadow-2xl p-4 md:p-6 max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Listing Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                    {t('property.type')}
                  </label>
                  <select
                    value={searchFilters.listingType}
                    onChange={(e) => setSearchFilters({ ...searchFilters, listingType: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="both">{t('home.both')}</option>
                    <option value="sale">{t('home.forSale')}</option>
                    <option value="rent">{t('home.forRent')}</option>
                  </select>
                </div>
                
                {/* Property Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                    {t('propertiesPage.propertyType')}
                  </label>
                  <select
                    value={searchFilters.propertyType}
                    onChange={(e) => setSearchFilters({ ...searchFilters, propertyType: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">{t('common.all')}</option>
                    <option value="casa">{t('property.types.casa')}</option>
                    <option value="departamento">{t('property.types.departamento')}</option>
                    <option value="terreno">{t('property.types.terreno')}</option>
                    <option value="comercial">{t('property.types.comercial')}</option>
                    <option value="bodega">{t('property.types.bodega')}</option>
                  </select>
                </div>
                
                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                    {t('propertiesPage.priceRange')}
                  </label>
                  <select
                    value={searchFilters.priceRange}
                    onChange={(e) => setSearchFilters({ ...searchFilters, priceRange: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">{t('common.all')}</option>
                    <option value="0-1000000">{t('propertiesPage.upTo')} $1,000,000</option>
                    <option value="1000000-3000000">$1,000,000 - $3,000,000</option>
                    <option value="3000000-5000000">$3,000,000 - $5,000,000</option>
                    <option value="5000000+">{t('propertiesPage.moreThan')} $5,000,000</option>
                  </select>
                </div>
                
                {/* Search Button */}
                <div className="flex items-end">
                  <button
                    onClick={handleSearch}
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transform transition-all hover:scale-105 flex items-center justify-center gap-2"
                  >
                    <Search className="h-5 w-5" />
                    {t('home.searchButton')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-8 rounded-xl shadow-lg text-center transform transition-all hover:scale-105">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">{t('home.strategicLocation')}</h3>
            <p className="text-gray-600">
              {t('home.strategicLocationDesc')}
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-lg text-center transform transition-all hover:scale-105">
            <div className="bg-cyan-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-cyan-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">{t('home.trustAndSecurity')}</h3>
            <p className="text-gray-600">
              {t('home.trustAndSecurityDesc')}
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-lg text-center transform transition-all hover:scale-105">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">{t('home.smartInvestment')}</h3>
            <p className="text-gray-600">
              {t('home.smartInvestmentDesc')}
            </p>
          </div>
        </div>

        {/* About Us / Marketplace Section */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl shadow-xl p-8 md:p-12 mb-16 text-white">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('home.aboutUsTitle')}</h2>
            <p className="text-xl mb-6 text-blue-100">{t('home.aboutUsSubtitle')}</p>
            <p className="text-lg text-blue-100 mb-10 leading-relaxed">{t('home.aboutUsDesc')}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <div className="bg-white/20 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-7 w-7 text-white" />
                </div>
                <h4 className="font-bold text-lg mb-2">{t('home.marketplaceFeature1')}</h4>
                <p className="text-blue-100 text-sm">{t('home.marketplaceFeature1Desc')}</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <div className="bg-white/20 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-7 w-7 text-white" />
                </div>
                <h4 className="font-bold text-lg mb-2">{t('home.marketplaceFeature2')}</h4>
                <p className="text-blue-100 text-sm">{t('home.marketplaceFeature2Desc')}</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <div className="bg-white/20 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="h-7 w-7 text-white" />
                </div>
                <h4 className="font-bold text-lg mb-2">{t('home.marketplaceFeature3')}</h4>
                <p className="text-blue-100 text-sm">{t('home.marketplaceFeature3Desc')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Featured Properties Section */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
              {t('home.featuredProperties')}
            </h2>
            <p className="text-lg text-gray-600">
              {t('home.featuredPropertiesDesc')}
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
                            {t('common.viewDetails')}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {featuredProperties.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                    {featuredProperties.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentSlide(index)}
                        aria-label={`Go to slide ${index + 1}`}
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
                  {t('common.viewAll')}
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl shadow-lg">
              <HomeIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">{t('home.noFeaturedProperties')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
