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
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-muted">
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground w-16">Orden</th>
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
          <SortableContext
            items={items}
            strategy={verticalListSortingStrategy}
          >
            <tbody className="divide-y divide-border">
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
            </tbody>
          </SortableContext>
        </table>
        
        {properties.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No hay propiedades registradas. Crea una nueva propiedad para comenzar.
          </div>
        )}
      </div>
    </DndContext>
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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: isDragging ? 'var(--muted)' : undefined,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="hover:bg-muted/50 transition-colors"
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className="p-1 rounded cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Arrastra para reordenar"
          >
            <GripVertical className="h-5 w-5" />
          </button>
          <span className="text-sm text-muted-foreground">#{index + 1}</span>
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
  );
}
