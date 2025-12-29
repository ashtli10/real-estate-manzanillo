import { Edit2, Trash2, Eye, EyeOff, Star, StarOff, ChevronUp, ChevronDown } from 'lucide-react';
import type { Property } from '../../types/property';
import { formatPrice, propertyTypeLabels } from '../../types/property';

interface PropertyTableProps {
  properties: Property[];
  onEdit: (property: Property) => void;
  onDelete: (property: Property) => void;
  onTogglePublish: (property: Property) => void;
  onToggleFeatured: (property: Property) => void;
  onMoveUp: (property: Property) => void;
  onMoveDown: (property: Property) => void;
}

export function PropertyTable({
  properties,
  onEdit,
  onDelete,
  onTogglePublish,
  onToggleFeatured,
  onMoveUp,
  onMoveDown,
}: PropertyTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-muted">
            <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Orden</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Imagen</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Título</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Tipo</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Precio</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Ubicación</th>
            <th className="px-4 py-3 text-center text-sm font-semibold text-foreground">Estado</th>
            <th className="px-4 py-3 text-center text-sm font-semibold text-foreground">Destacado</th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {properties.map((property, index) => (
            <tr key={property.id} className="hover:bg-muted/50 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onMoveUp(property)}
                    disabled={index === 0}
                    className={`p-1 rounded transition-colors ${
                      index === 0
                        ? 'text-muted-foreground/30 cursor-not-allowed'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                    title="Mover arriba"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onMoveDown(property)}
                    disabled={index === properties.length - 1}
                    className={`p-1 rounded transition-colors ${
                      index === properties.length - 1
                        ? 'text-muted-foreground/30 cursor-not-allowed'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                    title="Mover abajo"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-muted-foreground ml-1">#{index + 1}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="w-16 h-12 rounded-lg overflow-hidden bg-muted">
                  {property.images[0] ? (
                    <img
                      src={property.images[0]}
                      alt={property.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                      Sin imagen
                    </div>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <p className="font-medium text-foreground line-clamp-1">{property.title}</p>
                <p className="text-sm text-muted-foreground">{property.slug}</p>
              </td>
              <td className="px-4 py-3">
                <span className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
                  {propertyTypeLabels[property.property_type]}
                </span>
              </td>
              <td className="px-4 py-3 font-semibold text-foreground">
                <div className="space-y-1">
                  {property.is_for_sale && (
                    <div className="text-foreground">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">Venta: </span>
                      {formatPrice(property.price, property.currency)}
                    </div>
                  )}
                  {property.is_for_rent && (
                    <div className="text-emerald-700">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">Renta: </span>
                      {formatPrice(property.rent_price, property.rent_currency)}
                    </div>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {property.location_neighborhood && `${property.location_neighborhood}, `}
                {property.location_city}
              </td>
              <td className="px-4 py-3 text-center">
                <button
                  onClick={() => onTogglePublish(property)}
                  className={`p-2 rounded-lg transition-colors ${
                    property.status === 'active'
                      ? 'bg-green-100 text-green-600 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                  }`}
                  title={property.status === 'active' ? 'Publicado' : 'No publicado'}
                >
                  {property.status === 'active' ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </td>
              <td className="px-4 py-3 text-center">
                <button
                  onClick={() => onToggleFeatured(property)}
                  className={`p-2 rounded-lg transition-colors ${
                    property.is_featured
                      ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                  }`}
                  title={property.is_featured ? 'Destacado' : 'No destacado'}
                >
                  {property.is_featured ? <Star className="h-4 w-4" /> : <StarOff className="h-4 w-4" />}
                </button>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end space-x-2">
                  <button
                    onClick={() => onEdit(property)}
                    className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(property)}
                    className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {properties.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No hay propiedades registradas. Crea una nueva propiedad para comenzar.
        </div>
      )}
    </div>
  );
}
