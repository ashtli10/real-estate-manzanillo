import { Phone, MessageCircle, MapPin, Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface AgentInfo {
  id: string;
  username: string;
  full_name: string;
  company_name?: string;
  avatar_url?: string;
  cover_image?: string;
  bio?: string;
  phone?: string;
  whatsapp_number?: string;
  location?: string;
  created_at: string;
  properties_count?: number;
  member_since?: string;
}

interface AgentCardProps {
  agent: AgentInfo;
  onNavigate?: (path: string) => void;
  variant?: 'compact' | 'full' | 'property';
  propertyTitle?: string;
}

export function AgentCard({ agent, onNavigate, variant = 'compact', propertyTitle }: AgentCardProps) {
  const { t } = useTranslation();

  const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.full_name || 'Agent')}&background=3b82f6&color=fff&size=128`;
  
  const buildWhatsappUrl = (message: string) => {
    if (!agent.whatsapp_number) return '';
    const phone = agent.whatsapp_number.replace(/\D/g, '');
    return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
  };

  const handleCall = () => {
    if (agent.phone) {
      window.location.href = `tel:${agent.phone}`;
    }
  };

  const handleWhatsapp = () => {
    const message = propertyTitle 
      ? t('whatsapp.propertyMessage', { title: propertyTitle })
      : t('whatsapp.agentMessage');
    const url = buildWhatsappUrl(message);
    if (url) {
      window.open(url, '_blank');
    }
  };

  const handleProfileClick = () => {
    if (onNavigate && agent.username) {
      onNavigate(`/${agent.username}`);
    }
  };

  if (variant === 'property') {
    // Compact version for property cards
    return (
      <div 
        className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={handleProfileClick}
      >
        <img
          src={agent.avatar_url || defaultAvatar}
          alt={agent.full_name}
          className="w-8 h-8 rounded-full object-cover ring-2 ring-white shadow-sm"
        />
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-700 truncate">{agent.full_name}</p>
          {agent.company_name && (
            <p className="text-xs text-gray-500 truncate">{agent.company_name}</p>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
        <div className="flex items-center gap-4">
          <img
            src={agent.avatar_url || defaultAvatar}
            alt={agent.full_name}
            className="w-16 h-16 rounded-full object-cover ring-2 ring-blue-100 cursor-pointer hover:ring-blue-300 transition-all"
            onClick={handleProfileClick}
          />
          <div className="flex-1 min-w-0">
            <h3 
              className="font-semibold text-gray-900 hover:text-blue-600 cursor-pointer transition-colors"
              onClick={handleProfileClick}
            >
              {agent.full_name}
            </h3>
            {agent.company_name && (
              <p className="text-sm text-gray-600 flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {agent.company_name}
              </p>
            )}
            {agent.location && (
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {agent.location}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          {agent.whatsapp_number && (
            <button
              onClick={handleWhatsapp}
              className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-2.5 px-4 rounded-lg font-medium transition-colors"
            >
              <MessageCircle className="h-5 w-5" />
              <span>WhatsApp</span>
            </button>
          )}
          {agent.phone && (
            <button
              onClick={handleCall}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-2.5 px-4 rounded-lg font-medium transition-colors"
            >
              <Phone className="h-5 w-5" />
              <span>{t('common.call')}</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Full variant for agent profile page
  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* Cover Image */}
      <div 
        className="h-32 md:h-48 bg-gradient-to-r from-blue-600 to-cyan-500"
        style={agent.cover_image ? {
          backgroundImage: `url(${agent.cover_image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : undefined}
      />
      
      {/* Profile Content */}
      <div className="relative px-6 pb-6">
        {/* Avatar */}
        <div className="absolute -top-12 left-6">
          <img
            src={agent.avatar_url || defaultAvatar}
            alt={agent.full_name}
            className="w-24 h-24 rounded-full object-cover ring-4 ring-white shadow-lg"
          />
        </div>

        {/* Info */}
        <div className="pt-16">
          <h1 className="text-2xl font-bold text-gray-900">{agent.full_name}</h1>
          {agent.company_name && (
            <p className="text-lg text-gray-600 flex items-center gap-2 mt-1">
              <Building2 className="h-5 w-5 text-blue-500" />
              {agent.company_name}
            </p>
          )}
          {agent.location && (
            <p className="text-gray-500 flex items-center gap-2 mt-1">
              <MapPin className="h-4 w-4" />
              {agent.location}
            </p>
          )}
          {agent.bio && (
            <p className="text-gray-600 mt-4">{agent.bio}</p>
          )}

          {/* Contact Buttons */}
          <div className="flex gap-3 mt-6">
            {agent.whatsapp_number && (
              <button
                onClick={handleWhatsapp}
                className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-3 px-6 rounded-xl font-semibold transition-all hover:shadow-lg"
              >
                <MessageCircle className="h-5 w-5" />
                <span>WhatsApp</span>
              </button>
            )}
            {agent.phone && (
              <button
                onClick={handleCall}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-3 px-6 rounded-xl font-semibold transition-all hover:shadow-lg"
              >
                <Phone className="h-5 w-5" />
                <span>{t('common.call')}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
