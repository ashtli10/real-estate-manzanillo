/**
 * User Property List
 * Displays the user's properties with actions
 */

import { useState } from 'react';
import { 
  Building2, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  MoreVertical,
  Play,
  Pause,
  Archive,
  ExternalLink,
  Loader2,
  AlertCircle,
  MapPin,
  Bed,
  Bath,
  Square
} from 'lucide-react';
import type { UserProperty } from '../../types/userProperty';
import { PROPERTY_STATUS_CONFIG, PROPERTY_TYPE_LABELS, LISTING_TYPE_LABELS } from '../../types/userProperty';

interface UserPropertyListProps {
  properties: UserProperty[];
  loading: boolean;
  error: string | null;
  onAdd: () => void;
  onEdit: (property: UserProperty) => void;
  onDelete: (id: string) => void;
  onPublish: (id: string) => void;
  onPause: (id: string) => void;
  onArchive: (id: string) => void;
  onView?: (property: UserProperty) => void;
}

export function UserPropertyList({
  properties,
  loading,
  error,
  onAdd,
  onEdit,
  onDelete,
  onPublish,
  onPause,
  onArchive,
  onView,
}: UserPropertyListProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const formatPrice = (price: number, currency: string = 'MXN') => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-red-800 font-medium">Error al cargar propiedades</p>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="text-center py-12">
        <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No tienes propiedades aún
        </h3>
        <p className="text-gray-500 mb-6">
          Comienza a publicar tus propiedades para que los compradores las encuentren
        </p>
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-2 bg-sky-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-sky-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Publicar mi primera propiedad
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {properties.map((property) => {
        const statusConfig = PROPERTY_STATUS_CONFIG[property.status];
        const isMenuOpen = activeMenu === property.id;

        return (
          <div
            key={property.id}
            className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="flex flex-col sm:flex-row">
              {/* Image */}
              <div className="sm:w-48 h-40 sm:h-auto bg-gray-100 relative flex-shrink-0">
                {property.images.length > 0 ? (
                  <img
                    src={property.images[0]}
                    alt={property.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Building2 className="h-12 w-12 text-gray-300" />
                  </div>
                )}
                {/* Status badge */}
                <span className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color} ${statusConfig.bgColor}`}>
                  {statusConfig.label}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {property.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                        {PROPERTY_TYPE_LABELS[property.propertyType]}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-sky-100 text-sky-600 rounded">
                        {LISTING_TYPE_LABELS[property.listingType]}
                      </span>
                    </div>
                    {property.neighborhood && (
                      <p className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {property.neighborhood}, {property.city}
                      </p>
                    )}
                  </div>

                  {/* Actions menu */}
                  <div className="relative ml-4">
                    <button
                      onClick={() => setActiveMenu(isMenuOpen ? null : property.id)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <MoreVertical className="h-5 w-5 text-gray-400" />
                    </button>
                    
                    {isMenuOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-10"
                          onClick={() => setActiveMenu(null)}
                        />
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                          <button
                            onClick={() => {
                              onEdit(property);
                              setActiveMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Edit className="h-4 w-4" />
                            Editar
                          </button>
                          
                          {onView && (
                            <button
                              onClick={() => {
                                onView(property);
                                setActiveMenu(null);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Eye className="h-4 w-4" />
                              Ver publicación
                            </button>
                          )}

                          {property.status === 'draft' || property.status === 'paused' ? (
                            <button
                              onClick={() => {
                                onPublish(property.id);
                                setActiveMenu(null);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-green-50"
                            >
                              <Play className="h-4 w-4" />
                              Publicar
                            </button>
                          ) : property.status === 'active' && (
                            <button
                              onClick={() => {
                                onPause(property.id);
                                setActiveMenu(null);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-orange-600 hover:bg-orange-50"
                            >
                              <Pause className="h-4 w-4" />
                              Pausar
                            </button>
                          )}

                          <button
                            onClick={() => {
                              onArchive(property.id);
                              setActiveMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                          >
                            <Archive className="h-4 w-4" />
                            Archivar
                          </button>

                          <hr className="my-1" />

                          <button
                            onClick={() => {
                              setDeleteConfirm(property.id);
                              setActiveMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            Eliminar
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Property stats */}
                <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-600">
                  {property.bedrooms !== null && property.bedrooms > 0 && (
                    <span className="flex items-center gap-1">
                      <Bed className="h-4 w-4" />
                      {property.bedrooms}
                    </span>
                  )}
                  {property.bathrooms !== null && property.bathrooms > 0 && (
                    <span className="flex items-center gap-1">
                      <Bath className="h-4 w-4" />
                      {property.bathrooms}
                    </span>
                  )}
                  {property.squareMetersBuilt !== null && property.squareMetersBuilt > 0 && (
                    <span className="flex items-center gap-1">
                      <Square className="h-4 w-4" />
                      {property.squareMetersBuilt} m²
                    </span>
                  )}
                </div>

                {/* Price and metrics */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <p className="text-lg font-bold text-sky-600">
                    {formatPrice(property.price, property.currency)}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      {property.viewsCount} vistas
                    </span>
                    {property.slug && property.status === 'active' && (
                      <a
                        href={`/propiedad/${property.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sky-600 hover:text-sky-700"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Ver
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Delete confirmation */}
            {deleteConfirm === property.id && (
              <div className="bg-red-50 border-t border-red-200 p-4 flex items-center justify-between">
                <p className="text-red-800 text-sm">
                  ¿Estás seguro de que quieres eliminar esta propiedad?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:bg-red-100 rounded"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      onDelete(property.id);
                      setDeleteConfirm(null);
                    }}
                    className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
