import { useEffect, useRef, useState } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import LightboxVideo from 'yet-another-react-lightbox/plugins/video';
import 'yet-another-react-lightbox/styles.css';
import {
  ChevronLeft,
  ChevronRight,
  Bed,
  Bath,
  Square,
  Car,
  Home as HomeIcon,
  MapPin,
  Calendar,
  Layers,
  Check,
  Tag,
  Phone,
  User,
  Fence,
  DoorOpen,
  Warehouse,
  BedDouble,
  Monitor,
  TreePine,
  ShieldAlert,
  Camera,
  Zap,
  Shield,
  Lock,
  Waves,
  Thermometer,
  Flower2,
  Flame,
  Palmtree,
  Wind,
  AirVent,
  Sun,
  Droplets,
  Container,
  Plug,
  Wifi,
  Cable,
  ChefHat,
  UtensilsCrossed,
  PackageOpen,
  Shirt,
  ArrowUpDown,
  Accessibility,
  Sunset,
  Mountain,
  Building2,
  Anchor,
  ParkingCircle,
  Dumbbell,
  Tv,
  Wine,
  Gamepad2,
  Dog,
  Baby,
  Heater,
  WashingMachine,
  Fan,
  Coffee,
  Star,
  Eye,
  Flag,
  Cloud,
  Sofa,
  BookOpen,
  Minus,
  ArrowDown,
  ArrowRight,
  Speaker,
  Lightbulb,
  KeyRound,
  Video,
  Users,
  PartyPopper,
  Briefcase,
  Wrench,
  Key,
  Store,
  Truck,
  GraduationCap,
  Moon,
  Heart,
  Sparkles,
  Circle,
  LayoutGrid,
  type LucideIcon,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { useTranslation } from 'react-i18next';
import { supabase } from '../integrations/supabase/client';
import type { Property, PropertyCharacteristic, CharacteristicCategory } from '../types/property';
import { formatPrice, CHARACTERISTIC_DEFINITIONS, CHARACTERISTIC_CATEGORY_LABELS } from '../types/property';
import { transformProperty } from '../lib/propertyTransform';
import { buildWhatsappUrl } from '../lib/whatsapp';
import { updateMetaTags, getPropertySEO } from '../lib/seo';
import { Breadcrumb } from '../components/Breadcrumb';

const FALLBACK_IMAGE_URL = 'https://images.pexels.com/photos/186077/pexels-photo-186077.jpeg?auto=compress&cs=tinysrgb&w=1600';
type MediaItem = { type: 'image' | 'video'; url: string };

// Icon mapping for characteristics - comprehensive list
const CHARACTERISTIC_ICONS: Record<string, LucideIcon> = {
  // Core property stats
  bedrooms: Bed,
  bathrooms: Bath,
  half_bathrooms: Bath,
  size_total: Square,
  size_construction: HomeIcon,
  parking_spaces: Car,
  levels: Layers,
  age_years: Calendar,
  floor_number: Building2,
  // Premium
  ocean_view: Sunset,
  beachfront: Anchor,
  beach_access: Waves,
  mountain_view: Mountain,
  city_view: Building2,
  lake_view: Waves,
  golf_view: Flag,
  panoramic_view: Eye,
  pool: Waves,
  heated_pool: Thermometer,
  infinity_pool: Waves,
  jacuzzi: Bath,
  sauna: Flame,
  steam_room: Cloud,
  private_dock: Anchor,
  // Outdoor
  garden: Flower2,
  large_garden: TreePine,
  front_yard: Flower2,
  backyard: TreePine,
  terraces: Fence,
  balconies: DoorOpen,
  roof_garden: Palmtree,
  patios: TreePine,
  pergola: HomeIcon,
  palapa: Palmtree,
  outdoor_kitchen: ChefHat,
  bbq_area: Flame,
  fire_pit: Flame,
  fountain: Droplets,
  irrigation_system: Droplets,
  // Spaces
  living_room: Sofa,
  dining_room: UtensilsCrossed,
  family_room: Sofa,
  offices: Monitor,
  library: BookOpen,
  storage_rooms: Warehouse,
  service_rooms: BedDouble,
  laundry_room: WashingMachine,
  walk_in_closet: Shirt,
  closets: Shirt,
  attic: HomeIcon,
  basement: ArrowDown,
  loft: Layers,
  double_height: ArrowUpDown,
  // Parking
  covered_parking: Warehouse,
  uncovered_parking: ParkingCircle,
  garage: Warehouse,
  electric_gate: Zap,
  visitor_parking: Car,
  ev_charger: Zap,
  // Kitchen
  equipped_kitchen: ChefHat,
  integral_kitchen: ChefHat,
  kitchen_island: UtensilsCrossed,
  breakfast_bar: Coffee,
  pantry: PackageOpen,
  stove: Flame,
  oven: Square,
  microwave: Square,
  refrigerator: Square,
  dishwasher: Droplets,
  hood: Wind,
  // Climate
  air_conditioning: Wind,
  central_ac: AirVent,
  mini_splits: AirVent,
  heating: Heater,
  central_heating: Heater,
  fireplace: Flame,
  ceiling_fans: Fan,
  natural_ventilation: Wind,
  // Entertainment
  gym: Dumbbell,
  home_theater: Tv,
  game_room: Gamepad2,
  bar: Wine,
  wine_cellar: Wine,
  spa: Sparkles,
  tennis_court: Circle,
  sports_court: Circle,
  // Utilities
  water_heater: Flame,
  solar_heater: Sun,
  boiler: Flame,
  solar_panels: Sun,
  cistern: Droplets,
  water_tank: Container,
  water_softener: Droplets,
  water_purifier: Droplets,
  emergency_plant: Plug,
  natural_gas: Flame,
  lp_gas: Flame,
  septic_tank: Container,
  city_water: Droplets,
  well_water: Droplets,
  // Technology
  smart_home: Wifi,
  fiber_optic: Cable,
  high_speed_internet: Wifi,
  wired_network: Cable,
  sound_system: Speaker,
  led_lighting: Lightbulb,
  // Security
  gated_community: Lock,
  security_guard: Shield,
  guardhouse: HomeIcon,
  alarm_system: ShieldAlert,
  security_cameras: Camera,
  electric_fence: Zap,
  perimeter_fence: Fence,
  intercom: Phone,
  video_doorbell: Video,
  access_control: KeyRound,
  safe_room: ShieldAlert,
  safe: Lock,
  // Building
  common_pool: Waves,
  common_gym: Dumbbell,
  common_terrace: Fence,
  lobby: Building2,
  doorman: User,
  concierge: User,
  elevator: ArrowUpDown,
  service_elevator: ArrowUpDown,
  common_areas: Users,
  rooftop: Building2,
  party_room: PartyPopper,
  business_center: Briefcase,
  maintenance_included: Wrench,
  // Rental
  furnished: Sofa,
  semi_furnished: Sofa,
  utilities_included: Plug,
  internet_included: Wifi,
  cable_included: Tv,
  washer_dryer: WashingMachine,
  linens_included: Bed,
  cleaning_included: Sparkles,
  long_term: Calendar,
  short_term: Calendar,
  vacation_rental: Palmtree,
  // Commercial
  commercial_use: Store,
  mixed_use: Building2,
  street_front: MapPin,
  loading_dock: Truck,
  warehouse_space: Warehouse,
  office_space: Briefcase,
  high_ceilings: ArrowUpDown,
  three_phase_power: Zap,
  // Accessibility
  wheelchair_accessible: Accessibility,
  ground_floor: HomeIcon,
  ramp_access: ArrowRight,
  wide_doorways: DoorOpen,
  grab_bars: Minus,
  // Family
  pet_friendly: Dog,
  playground: Baby,
  kids_pool: Waves,
  near_schools: GraduationCap,
  near_parks: TreePine,
  quiet_neighborhood: Moon,
};

// Category icons mapping
const CATEGORY_ICONS: Record<CharacteristicCategory, LucideIcon> = {
  core: LayoutGrid,
  premium: Star,
  outdoor: TreePine,
  spaces: DoorOpen,
  parking: Car,
  kitchen: ChefHat,
  climate: Thermometer,
  entertainment: Gamepad2,
  utilities: Plug,
  technology: Wifi,
  security: Shield,
  building: Building2,
  rental: Key,
  commercial: Store,
  accessibility: Accessibility,
  family: Heart,
};

// Helper function to get colors based on the definition
// Tailwind color mapping (for dynamic classes)
const COLOR_CLASSES: Record<string, { bg: string; text: string; icon: string }> = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'text-blue-500' },
  cyan: { bg: 'bg-cyan-50', text: 'text-cyan-700', icon: 'text-cyan-500' },
  teal: { bg: 'bg-teal-50', text: 'text-teal-700', icon: 'text-teal-500' },
  green: { bg: 'bg-green-50', text: 'text-green-700', icon: 'text-green-500' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'text-emerald-500' },
  lime: { bg: 'bg-lime-50', text: 'text-lime-700', icon: 'text-lime-500' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', icon: 'text-purple-500' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', icon: 'text-indigo-500' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-700', icon: 'text-violet-500' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', icon: 'text-amber-500' },
  yellow: { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: 'text-yellow-500' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-700', icon: 'text-orange-500' },
  red: { bg: 'bg-red-50', text: 'text-red-700', icon: 'text-red-500' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-700', icon: 'text-rose-500' },
  pink: { bg: 'bg-pink-50', text: 'text-pink-700', icon: 'text-pink-500' },
  slate: { bg: 'bg-slate-50', text: 'text-slate-700', icon: 'text-slate-500' },
  gray: { bg: 'bg-gray-50', text: 'text-gray-700', icon: 'text-gray-500' },
  sky: { bg: 'bg-sky-50', text: 'text-sky-700', icon: 'text-sky-500' },
};

const DEFAULT_COLOR = { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'text-blue-500' };

// Get color classes from definition
const getColors = (key: string) => {
  const def = CHARACTERISTIC_DEFINITIONS.find(d => d.key === key);
  return COLOR_CLASSES[def?.color || 'blue'] || DEFAULT_COLOR;
};
interface PropertyDetailProps {
  propertySlug: string;
  onNavigate: (path: string) => void;
  onUpdateWhatsappMessage: (message: string) => void;
  onUpdateWhatsappNumber?: (number: string | undefined) => void;
  referrer?: string;
}

export function PropertyDetail({ propertySlug, onNavigate, onUpdateWhatsappMessage, onUpdateWhatsappNumber, referrer }: PropertyDetailProps) {
  const { t } = useTranslation();
  const [property, setProperty] = useState<Property | null>(null);
  
  // Determine back navigation path - if referred from agent profile, go back there
  const agentUsername = propertySlug.includes('/') ? propertySlug.split('/')[0] : null;
  const backPath = referrer || (agentUsername ? `/${agentUsername}` : '/propiedades');
  const isBackToAgent = backPath !== '/propiedades' && agentUsername;
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [agentPhone, setAgentPhone] = useState<string | undefined>(undefined);
  const thumbnailRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const thumbnailListRef = useRef<HTMLDivElement | null>(null);

  const propertyImages = property?.images ?? [];
  const propertyVideos = property?.videos ?? [];
  const images = propertyImages.length > 0 ? propertyImages : (propertyVideos.length > 0 ? [] : [FALLBACK_IMAGE_URL]);
  const videos = propertyVideos;
  const mediaItems: MediaItem[] = [
    ...images.map<MediaItem>((url) => ({ type: 'image', url })),
    ...videos.map<MediaItem>((url) => ({ type: 'video', url })),
  ];
  const videoPoster = propertyImages[0] ?? FALLBACK_IMAGE_URL;

  useEffect(() => {
    setCurrentMediaIndex(0);
  }, [propertySlug]);

  useEffect(() => {
    const targetThumb = thumbnailRefs.current[currentMediaIndex];
    if (targetThumb) {
      targetThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [currentMediaIndex]);

  useEffect(() => {
    loadProperty();
  }, [propertySlug]);

  useEffect(() => {
    // Update SEO meta tags when property is loaded
    if (property) {
      updateMetaTags(getPropertySEO(property));
    }
  }, [property]);

  const loadProperty = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('slug', propertySlug)
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        const transformedProperty = transformProperty(data);
        setProperty(transformedProperty);
        
        // Fetch agent's WhatsApp number from profiles table
        if (transformedProperty.user_id && onUpdateWhatsappNumber) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('whatsapp_number')
            .eq('id', transformedProperty.user_id)
            .single();
          
          if (profileData?.whatsapp_number) {
            setAgentPhone(profileData.whatsapp_number);
            onUpdateWhatsappNumber(profileData.whatsapp_number);
          }
        }
      } else {
        setProperty(null);
      }
    } catch (error) {
      console.error('Error loading property:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildPageWhatsappMessage = (currentProperty: Property | null) => {
    if (!currentProperty) return t('whatsapp.defaultMessage');

    const location = currentProperty.location_neighborhood || currentProperty.location_city || 'México';
    const priceParts: string[] = [];

    if (currentProperty.is_for_sale) {
      priceParts.push(`${t('whatsapp.saleLabel')} ${formatPrice(currentProperty.price, currentProperty.currency)}`);
    }

    if (currentProperty.is_for_rent) {
      priceParts.push(`${t('whatsapp.rentLabel')} ${formatPrice(currentProperty.rent_price, currentProperty.rent_currency)}`);
    }

    const priceText = priceParts.length > 0 ? priceParts.join(' | ') : t('whatsapp.priceAskingPrice');
    const typeLabel = t(`propertyTypes.${currentProperty.property_type}`);

    return t('whatsapp.propertyDetailMessage', {
      type: typeLabel,
      title: currentProperty.title,
      location: location,
      price: priceText
    });
  };

  useEffect(() => {
    onUpdateWhatsappMessage(buildPageWhatsappMessage(property));
  }, [property, onUpdateWhatsappMessage, t]);



  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">{t('propertyDetail.loadingProperty')}</p>
        </div>
      </div>
    );
  }

  const whatsappMessage = buildPageWhatsappMessage(property);
  const whatsappUrl = buildWhatsappUrl(whatsappMessage, agentPhone);

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <HomeIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('propertyDetail.propertyNotFound')}</h2>
          <button
            onClick={() => onNavigate('/propiedades')}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            {t('propertyDetail.backToProperties')}
          </button>
        </div>
      </div>
    );
  }

  const openLightbox = (index: number) => {
    setCurrentMediaIndex(index);
    setIsLightboxOpen(true);
  };

  const nextMedia = () => {
    setCurrentMediaIndex((prev) => (prev + 1) % mediaItems.length);
  };

  const prevMedia = () => {
    setCurrentMediaIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <Breadcrumb 
          items={[
            isBackToAgent 
              ? { label: agentUsername!, path: backPath }
              : { label: t('nav.properties'), path: '/propiedades' },
            { label: property.title }
          ]} 
          onNavigate={onNavigate}
        />
        
        <button
          onClick={() => onNavigate(backPath)}
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 mb-6 font-medium"
        >
          <ChevronLeft className="h-5 w-5" />
          <span>{isBackToAgent ? t('propertyDetail.backToAgent') : t('propertyDetail.backToProperties')}</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="relative h-96 md:h-[500px]">
                {mediaItems[currentMediaIndex]?.type === 'image' ? (
                  <button
                    type="button"
                    onClick={() => openLightbox(currentMediaIndex)}
                    className="w-full h-full focus:outline-none cursor-zoom-in"
                  >
                    <img
                      src={mediaItems[currentMediaIndex]?.url}
                      alt={`${property.title} - ${t('propertyDetail.image')} ${currentMediaIndex + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => openLightbox(currentMediaIndex)}
                    className="w-full h-full bg-black relative flex items-center justify-center focus:outline-none cursor-zoom-in"
                  >
                    <video
                      key={mediaItems[currentMediaIndex]?.url}
                      src={mediaItems[currentMediaIndex]?.url}
                      poster={videoPoster}
                      className="h-full w-full object-contain"
                      controls
                      controlsList="nodownload"
                      preload="metadata"
                      autoPlay
                      muted
                      playsInline
                      onClick={(e) => e.stopPropagation()}
                    />
                  </button>
                )}
                {mediaItems.length > 1 && (
                  <>
                    <button
                      onClick={prevMedia}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 text-gray-800 p-3 rounded-full shadow-lg transition-all"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                      onClick={nextMedia}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 text-gray-800 p-3 rounded-full shadow-lg transition-all"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-50 text-white px-4 py-2 rounded-full">
                      {currentMediaIndex + 1} / {mediaItems.length}
                    </div>
                  </>
                )}
              </div>

              {mediaItems.length > 1 && (
                <div className="p-4 bg-gray-50">
                  <div
                    ref={thumbnailListRef}
                    className="flex gap-3 overflow-x-auto py-1 px-1 thumb-scroll"
                  >
                    {mediaItems.map((item, index) => (
                      <button
                        key={index}
                        ref={(el) => { thumbnailRefs.current[index] = el; }}
                        onClick={() => setCurrentMediaIndex(index)}
                        className={`relative h-20 w-20 flex-shrink-0 rounded-lg overflow-visible focus:outline-none ${
                          index === currentMediaIndex ? 'ring-4 ring-blue-500' : ''
                        }`}
                      >
                        <div className="h-full w-full rounded-lg overflow-hidden bg-white">
                          {item.type === 'image' ? (
                            <img
                              src={item.url}
                              alt={`${t('propertyDetail.thumbnail')} ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full relative">
                              <img
                                src={videoPoster}
                                alt={`${t('propertyDetail.videoThumbnail')} ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white">
                                <div className="flex items-center gap-2 text-sm">
                                  <Video className="h-4 w-4" />
                                  {t('propertyDetail.video')}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
                {property.title}
              </h1>
              <div className="flex items-center text-gray-600 mb-6">
                <MapPin className="h-5 w-5 mr-2 text-blue-500" />
                <span className="text-lg">
                  {property.location_address && `${property.location_address}, `}
                  {property.location_neighborhood && `${property.location_neighborhood}, `}
                  {property.location_city}, {property.location_state}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 mb-6">
                {property.is_for_sale && (
                  <div className="bg-blue-50 text-blue-700 px-4 py-3 rounded-lg border border-blue-200">
                    <p className="text-xs uppercase font-semibold">{t('propertyDetail.sale')}</p>
                    <p className="text-3xl font-bold">{formatPrice(property.price, property.currency)}</p>
                  </div>
                )}
                {property.is_for_rent && (
                  <div className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-lg border border-emerald-200">
                    <p className="text-xs uppercase font-semibold">{t('propertyDetail.monthlyRent')}</p>
                    <p className="text-3xl font-bold">{formatPrice(property.rent_price, property.rent_currency)}</p>
                  </div>
                )}
              </div>

              {/* Quick Stats from Characteristics - Priority items shown first */}
              {property.characteristics && property.characteristics.length > 0 && (() => {
                const coreKeys = ['bedrooms', 'bathrooms', 'size_total', 'size_construction', 'parking_spaces'];
                const coreChars = (property.characteristics as PropertyCharacteristic[])
                  .filter(c => coreKeys.includes(c.key) && c.value && (typeof c.value === 'boolean' || (c.value as number) > 0))
                  .sort((a, b) => coreKeys.indexOf(a.key) - coreKeys.indexOf(b.key));
                
                if (coreChars.length === 0) return null;
                
                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {coreChars.slice(0, 4).map((char) => {
                      const IconComponent = CHARACTERISTIC_ICONS[char.key] || Check;
                      const colors = getColors(char.key);
                      const displayValue = char.key === 'size_total' || char.key === 'size_construction' 
                        ? `${char.value}` 
                        : char.value;
                      const displayUnit = char.key === 'size_total' || char.key === 'size_construction' 
                        ? 'm²' 
                        : '';
                      
                      return (
                        <div key={char.key} className={`${colors.bg} rounded-lg p-4 text-center`}>
                          <IconComponent className={`h-8 w-8 ${colors.icon} mx-auto mb-2`} />
                          <p className="text-2xl font-bold text-gray-800">{displayValue}{displayUnit && <span className="text-lg"> {displayUnit}</span>}</p>
                          <p className="text-sm text-gray-600">{t(`characteristics.${char.key}`)}</p>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {property.custom_bonuses && property.custom_bonuses.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-3 flex items-center">
                    <Tag className="h-6 w-6 mr-2 text-cyan-500" />
                    {t('propertyDetail.specialFeatures')}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {property.custom_bonuses.map((bonus: string, index: number) => (
                      <span
                        key={index}
                        className="bg-gradient-to-r from-cyan-50 to-blue-50 text-cyan-700 px-4 py-2 rounded-full border border-cyan-200 font-medium"
                      >
                        {bonus}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="prose max-w-none">
                <h3 className="text-xl font-bold text-gray-800 mb-3">{t('propertyDetail.description')}</h3>
                <ReactMarkdown
                  className="prose max-w-none text-gray-700 leading-relaxed prose-headings:text-gray-800 prose-strong:text-gray-800 prose-a:text-blue-600 hover:prose-a:text-blue-700 whitespace-pre-wrap"
                  remarkPlugins={[remarkGfm, remarkBreaks]}
                  components={{
                    p: (props) => (
                      <p {...props} className="whitespace-pre-wrap" />
                    ),
                  }}
                >
                  {property.description || ''}
                </ReactMarkdown>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">{t('propertyDetail.propertyDetails')}</h3>
              
              {/* Property Type - Always shown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <HomeIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">{t('propertyDetail.type')}</p>
                    <p className="font-bold text-gray-800 text-lg">{t(`propertyTypes.${property?.property_type}`)}</p>
                  </div>
                </div>
              </div>

              {/* All Characteristics - Grouped by Category */}
              {property.characteristics && property.characteristics.length > 0 && (() => {
                const activeChars = (property.characteristics as PropertyCharacteristic[])
                  .filter(c => c.value && (typeof c.value === 'boolean' || (c.value as number) > 0));
                
                // Group characteristics by category
                const charsByCategory: Record<CharacteristicCategory, PropertyCharacteristic[]> = {} as any;
                
                activeChars.forEach(char => {
                  const def = CHARACTERISTIC_DEFINITIONS.find(d => d.key === char.key);
                  const category = def?.category || 'core';
                  if (!charsByCategory[category]) {
                    charsByCategory[category] = [];
                  }
                  charsByCategory[category].push(char);
                });
                
                // Sort categories by their defined order
                const sortedCategories = Object.keys(charsByCategory)
                  .sort((a, b) => {
                    const orderA = CHARACTERISTIC_CATEGORY_LABELS[a as CharacteristicCategory]?.order || 99;
                    const orderB = CHARACTERISTIC_CATEGORY_LABELS[b as CharacteristicCategory]?.order || 99;
                    return orderA - orderB;
                  }) as CharacteristicCategory[];
                
                return (
                  <div className="space-y-6">
                    {sortedCategories.map(category => {
                      const chars = charsByCategory[category];
                      const categoryInfo = CHARACTERISTIC_CATEGORY_LABELS[category];
                      const CategoryIcon = CATEGORY_ICONS[category] || LayoutGrid;
                      
                      return (
                        <div key={category}>
                          {/* Category Header */}
                          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
                            <CategoryIcon className="h-5 w-5 text-gray-500" />
                            <h4 className="font-semibold text-gray-700">{t(`characteristicCategories.${category}`)}</h4>
                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                              {chars.length}
                            </span>
                          </div>
                          
                          {/* Category Items */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {chars.map((char, index) => {
                              const IconComponent = CHARACTERISTIC_ICONS[char.key] || Check;
                              const colors = getColors(char.key);
                              const hasDescription = char.description && char.description.trim().length > 0;
                              
                              // Compact row layout for all items without description
                              if (!hasDescription) {
                                return (
                                  <div
                                    key={index}
                                    className={`group relative py-2 px-3 rounded-lg ${colors.bg} border border-opacity-50 hover:shadow-sm transition-all duration-200 flex items-center gap-2`}
                                  >
                                    <div className={`p-1.5 rounded-md bg-white shadow-sm flex-shrink-0`}>
                                      <IconComponent className={`h-4 w-4 ${colors.icon}`} />
                                    </div>
                                    <span className={`font-medium text-sm ${colors.text} flex-1`}>
                                      {t(`characteristics.${char.key}`)}
                                    </span>
                                    {char.type === 'number' && (
                                      <span className={`px-2 py-0.5 text-sm font-bold rounded-full bg-white shadow-sm ${colors.text}`}>
                                        {char.value}
                                      </span>
                                    )}
                                    {char.type === 'boolean' && (
                                      <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                                    )}
                                  </div>
                                );
                              }
                              
                              // Expanded layout with description
                              return (
                                <div
                                  key={index}
                                  className={`group relative p-3 rounded-lg ${colors.bg} border border-opacity-50 hover:shadow-sm transition-all duration-200`}
                                >
                                  <div className="flex items-start gap-2">
                                    <div className={`p-1.5 rounded-md bg-white shadow-sm flex-shrink-0`}>
                                      <IconComponent className={`h-4 w-4 ${colors.icon}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`font-medium text-sm ${colors.text}`}>
                                          {t(`characteristics.${char.key}`)}
                                        </span>
                                        {char.type === 'number' && (
                                          <span className={`px-2 py-0.5 text-xs font-bold rounded-full bg-white shadow-sm ${colors.text}`}>
                                            {char.value}
                                          </span>
                                        )}
                                        {char.type === 'boolean' && (
                                          <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                                        )}
                                      </div>
                                      <p className="mt-1 text-xs text-gray-600 leading-relaxed">
                                        {char.description}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Conditionally show map based on show_map field */}
            {property.show_map && property.location_lat && property.location_lng && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">{t('propertyDetail.location')}</h3>
                <div className="aspect-video rounded-lg overflow-hidden">
                  <iframe
                    src={`https://www.google.com/maps?q=${property.location_lat},${property.location_lng}&output=embed`}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                  ></iframe>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-24">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">{t('propertyDetail.talkToUs')}</h3>
              <p className="text-gray-600 mb-4">
                {t('propertyDetail.whatsappContactText')}
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-100 rounded-lg">
                  <Phone className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{t('propertyDetail.quickResponse')}</p>
                    <p className="text-sm text-gray-600">{t('propertyDetail.quickResponseText')}</p>
                  </div>
                </div>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-semibold shadow-lg transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-300"
                >
                  <User className="h-5 w-5" />
                  <span>{t('propertyDetail.writeOnWhatsapp')}</span>
                </a>

              </div>
            </div>
          </div>
        </div>
      </div>
      <Lightbox
        open={isLightboxOpen}
        close={() => setIsLightboxOpen(false)}
        index={currentMediaIndex}
        slides={mediaItems.map((item) =>
          item.type === 'video'
            ? {
                type: 'video' as const,
                sources: [{ src: item.url, type: 'video/mp4' }],
                poster: videoPoster,
              }
            : { src: item.url, alt: property.title }
        )}
        plugins={[LightboxVideo]}
        carousel={{ finite: false }}
        controller={{ closeOnBackdropClick: true }}
        on={{
          view: ({ index }) => setCurrentMediaIndex(index),
        }}
        video={{
          controls: true,
          playsInline: true,
          autoPlay: true,
          muted: true,
        }}
      />
    </div>
  );
}

