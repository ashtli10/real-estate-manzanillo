import { useEffect, useState, useCallback } from 'react';
import { Building2, MapPin, Calendar, Grid, List } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../integrations/supabase/client';
import type { Property } from '../types/property';
import { PropertyCard } from '../components/PropertyCard';
import { AgentCard, AgentInfo } from '../components/AgentCard';
import { transformProperty } from '../lib/propertyTransform';
import { updateMetaTags, getAgentProfileSEO } from '../lib/seo';

interface AgentProfileProps {
  username: string;
  onNavigate: (path: string) => void;
  onUpdateWhatsappNumber?: (number: string | undefined) => void;
}

export function AgentProfile({ username, onNavigate, onUpdateWhatsappNumber }: AgentProfileProps) {
  const { t } = useTranslation();
  const [agent, setAgent] = useState<AgentInfo | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'sale' | 'rent'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const loadAgentProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load agent profile - using type assertion since profiles table may not be in generated types
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profileData, error: profileError } = await (supabase as unknown as any)
        .from('profiles')
        .select('*')
        .eq('username', username)
        .eq('is_visible', true)
        .single();

      if (profileError || !profileData) {
        setError('AGENT_NOT_FOUND');
        return;
      }

      const agentData: AgentInfo = {
        id: profileData.id,
        username: profileData.username,
        full_name: profileData.full_name || profileData.username,
        avatar_url: profileData.profile_image,
        bio: profileData.bio,
        whatsapp_number: profileData.whatsapp_number,
        company_name: profileData.company_name,
        location: profileData.location,
        cover_image: profileData.cover_image,
        properties_count: 0,
        member_since: profileData.created_at,
        created_at: profileData.created_at,
      };

      setAgent(agentData);

      // Update WhatsApp number
      if (agentData.whatsapp_number && onUpdateWhatsappNumber) {
        onUpdateWhatsappNumber(agentData.whatsapp_number);
      }

      // Load agent's properties
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select('*')
        .eq('user_id', profileData.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (!propertiesError && propertiesData) {
        setProperties(propertiesData.map(transformProperty));
        const updatedAgent = { ...agentData, properties_count: propertiesData.length };
        setAgent(updatedAgent);
        
        // Update SEO with full agent data including property count
        const seoConfig = getAgentProfileSEO({
          id: updatedAgent.id,
          username: updatedAgent.username,
          full_name: updatedAgent.full_name,
          bio: updatedAgent.bio,
          company_name: updatedAgent.company_name,
          location: updatedAgent.location,
          avatar_url: updatedAgent.avatar_url,
          cover_image: updatedAgent.cover_image,
          whatsapp_number: updatedAgent.whatsapp_number,
          created_at: updatedAgent.created_at,
          properties_count: updatedAgent.properties_count,
        });
        updateMetaTags(seoConfig);
      }
    } catch (err) {
      console.error('Error loading agent profile:', err);
      setError('GENERIC_ERROR');
    } finally {
      setLoading(false);
    }
  }, [username, onUpdateWhatsappNumber]);

  useEffect(() => {
    loadAgentProfile();
  }, [loadAgentProfile]);

  const filteredProperties = properties.filter(p => {
    if (filterType === 'sale') return p.is_for_sale;
    if (filterType === 'rent') return p.is_for_rent;
    return true;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Get translated error message based on error code
  const getErrorMessage = () => {
    if (error === 'AGENT_NOT_FOUND') return t('errors.agentNotFound');
    if (error === 'GENERIC_ERROR') return t('errors.genericError');
    return t('errors.genericError');
  };

  if (error || !agent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">{getErrorMessage()}</h1>
          <p className="text-gray-600 mb-6">{t('errors.tryAgain')}</p>
          <button
            onClick={() => onNavigate('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('common.back')}
          </button>
        </div>
      </div>
    );
  }

  const defaultCover = 'https://images.pexels.com/photos/1268871/pexels-photo-1268871.jpeg?auto=compress&cs=tinysrgb&w=1920';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cover Image */}
      <div
        className="h-48 md:h-64 lg:h-80 bg-cover bg-center relative"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.5)), url(${agent.cover_image || defaultCover})`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent" />
      </div>

      <div className="container mx-auto px-4">
        {/* Profile Card - Overlapping */}
        <div className="relative -mt-24 md:-mt-32 mb-8">
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-end gap-6">
              {/* Avatar */}
              <div className="flex-shrink-0 -mt-20 md:-mt-24">
                <img
                  src={agent.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.full_name)}&background=3b82f6&color=fff&size=192`}
                  alt={agent.full_name}
                  className="w-32 h-32 md:w-40 md:h-40 rounded-2xl object-cover ring-4 ring-white shadow-lg"
                />
              </div>

              {/* Info */}
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{agent.full_name}</h1>
                {agent.company_name && (
                  <p className="text-lg text-gray-600 flex items-center gap-2 mt-1">
                    <Building2 className="h-5 w-5 text-blue-500" />
                    {agent.company_name}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-4 mt-3 text-gray-500">
                  {agent.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {agent.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {t('agent.memberSince')} {formatDate(agent.created_at)}
                  </span>
                </div>
                {agent.bio && (
                  <p className="text-gray-600 mt-4 max-w-2xl">{agent.bio}</p>
                )}
              </div>

              {/* Contact Buttons */}
              <div className="flex-shrink-0">
                <AgentCard agent={agent} onNavigate={onNavigate} variant="compact" />
              </div>
            </div>
          </div>
        </div>

        {/* Properties Section */}
        <div className="pb-16">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{t('agent.properties')}</h2>
              <p className="text-gray-600">
                {filteredProperties.length} {filteredProperties.length === 1 ? 'property' : 'properties'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Filter Tabs */}
              <div className="flex bg-gray-100 rounded-xl p-1">
                {(['all', 'sale', 'rent'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      filterType === type
                        ? type === 'sale'
                          ? 'bg-blue-600 text-white'
                          : type === 'rent'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white text-gray-800 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {type === 'all' ? t('properties.filters.all') : 
                     type === 'sale' ? t('properties.filters.forSale') : 
                     t('properties.filters.forRent')}
                  </button>
                ))}
              </div>

              {/* View Mode Toggle */}
              <div className="hidden md:flex bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'
                  }`}
                >
                  <Grid className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'
                  }`}
                >
                  <List className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {filteredProperties.length > 0 ? (
            <div className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                : 'space-y-4'
            }>
              {filteredProperties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
              <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">{t('agent.noProperties')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
