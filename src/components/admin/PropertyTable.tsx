import type React from 'react';
import { useMemo } from 'react';
import { Edit2, Trash2, Eye, EyeOff, Star, StarOff, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import type { Property } from '../../types/property';
import { formatPrice, propertyTypeLabels } from '../../types/property';

interface PropertyTableProps {
  properties: Property[];
  onEdit: (property: Property) => void;
  onDelete: (property: Property) => void;
  onTogglePublish: (property: Property) => void;
  onToggleFeatured: (property: Property) => void;
  onReorder: (properties: Property[]) => void;
}

export function PropertyTable({
  properties,
  onEdit,
  onDelete,
  onTogglePublish,
  onToggleFeatured,
  onReorder,
}: PropertyTableProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Memoize the items array to prevent unnecessary re-renders
  const items = useMemo(() => properties.map((p) => p.id), [properties]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = properties.findIndex((p) => p.id === active.id);
      const newIndex = properties.findIndex((p) => p.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(properties, oldIndex, newIndex);
        onReorder(reordered);
      }
    }
  };

  return (
    <div className="overflow-x-auto">
      {/* Header */}
      <div className="grid grid-cols-[60px_80px_1fr] sm:grid-cols-[60px_80px_1fr_100px_140px_140px_80px_80px_100px] gap-2 bg-muted px-4 py-3 min-w-full sm:min-w-[900px]">
        <div className="text-left text-sm font-semibold text-foreground">Orden</div>
        <div className="text-left text-sm font-semibold text-foreground">Imagen</div>
        <div className="text-left text-sm font-semibold text-foreground">Título</div>
        <div className="hidden text-left text-sm font-semibold text-foreground sm:block">Tipo</div>
        <div className="hidden text-left text-sm font-semibold text-foreground sm:block">Precio</div>
        <div className="hidden text-left text-sm font-semibold text-foreground sm:block">Ubicación</div>
        <div className="hidden text-center text-sm font-semibold text-foreground sm:block">Estado</div>
        <div className="hidden text-center text-sm font-semibold text-foreground sm:block">Destacado</div>
        <div className="hidden text-right text-sm font-semibold text-foreground sm:block">Acciones</div>
      </div>

      {/* Body */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <div className="divide-y divide-border min-w-full sm:min-w-[900px]">
            {properties.map((property, index) => (
              <SortableRow
                key={property.id}
                property={property}
                index={index}
                onEdit={onEdit}
                onDelete={onDelete}
                onTogglePublish={onTogglePublish}
                onToggleFeatured={onToggleFeatured}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      
      {properties.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No hay propiedades registradas. Crea una nueva propiedad para comenzar.
        </div>
      )}
    </div>
  );
}

interface SortableRowProps {
  property: Property;
  index: number;
  onEdit: (property: Property) => void;
  onDelete: (property: Property) => void;
  onTogglePublish: (property: Property) => void;
  onToggleFeatured: (property: Property) => void;
}

function SortableRow({
  property,
  index,
  onEdit,
  onDelete,
  onTogglePublish,
  onToggleFeatured,
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: property.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    backgroundColor: isDragging ? 'hsl(var(--muted))' : undefined,
    boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.15)' : undefined,
    zIndex: isDragging ? 10 : 0,
    position: 'relative',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="grid grid-cols-[60px_80px_1fr] sm:grid-cols-[60px_80px_1fr_100px_140px_140px_80px_80px_100px] gap-2 items-center px-4 py-3 hover:bg-muted/50 transition-colors"
    >
      {/* Order / Drag Handle */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="p-1 rounded cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground hover:bg-muted transition-colors touch-none"
          title="Arrastra para reordenar"
        >
          <GripVertical className="h-5 w-5" />
        </button>
        <span className="text-sm text-muted-foreground">#{index + 1}</span>
      </div>

      {/* Image */}
      <div className="w-16 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
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

      {/* Title */}
      <div className="min-w-0">
        <p className="font-medium text-foreground line-clamp-1">{property.title}</p>
        <p className="text-sm text-muted-foreground truncate">{property.slug}</p>
      </div>

      {/* Type */}
      <div className="hidden sm:block">
        <span className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full whitespace-nowrap">
          {propertyTypeLabels[property.property_type]}
        </span>
      </div>

      {/* Price */}
      <div className="hidden font-semibold text-foreground text-sm sm:block">
        <div className="space-y-1">
          {property.is_for_sale && (
            <div className="text-foreground">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">V: </span>
              {formatPrice(property.price, property.currency)}
            </div>
          )}
          {property.is_for_rent && (
            <div className="text-emerald-700">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">R: </span>
              {formatPrice(property.rent_price, property.rent_currency)}
            </div>
          )}
        </div>
      </div>

      {/* Location */}
      <div className="hidden text-sm text-muted-foreground truncate sm:block">
        {property.location_neighborhood && `${property.location_neighborhood}, `}
        {property.location_city}
      </div>

      {/* Status */}
      <div className="hidden text-center sm:block">
        {property.status === 'paused' ? (
          <div
            className="p-2 rounded-lg bg-amber-100 text-amber-600 cursor-not-allowed"
            title="Pausado - requiere suscripción activa"
          >
            <EyeOff className="h-4 w-4" />
          </div>
        ) : (
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
        )}
      </div>

      {/* Featured */}
      <div className="hidden text-center sm:block">
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
      </div>

      {/* Actions */}
      <div className="hidden items-center justify-end space-x-1 sm:flex">
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

      {/* Mobile actions tucked under title */}
      <div className="col-span-3 mt-2 flex items-center gap-2 sm:hidden">
        <button
          onClick={() => onEdit(property)}
          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
        >
          <Edit2 className="h-3 w-3" />
          Editar
        </button>
        <button
          onClick={() => onDelete(property)}
          className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors"
        >
          <Trash2 className="h-3 w-3" />
          Eliminar
        </button>
      </div>
    </div>
  );
}
