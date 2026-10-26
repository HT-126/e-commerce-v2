import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreateProduct, useUpdateProduct } from '../../../hooks/use-admin-products.js';
import { useCategories } from '../../../hooks/use-catalog.js';
import { ApiError } from '../../../lib/api.js';
import {
  EMPTY_PRODUCT,
  formFieldFor,
  productFormSchema,
  slugify,
  toFormValues,
  toPayload,
} from './product-form.js';

const MAX_PHOTOS = 10;

// A label, the input and the message under it.
function Field({ label, htmlFor, error, hint, children, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error && <p className="text-sm text-muted-foreground">{hint}</p>}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function Card({ title, children }) {
  return (
    <section className="space-y-4 rounded-xl border bg-white p-6">
      <h2 className="font-medium">{title}</h2>
      {children}
    </section>
  );
}

// Create or edit a product. React Hook Form + Zod for the checks the owner sees at once; the server checks
// everything again, and what it refuses (a slug that is taken, ...) is shown under the field.
export default function ProductForm({ product }) {
  const isEdit = Boolean(product);
  const navigate = useNavigate();
  const categories = useCategories();
  const create = useCreateProduct();
  const update = useUpdateProduct(product?.id);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    reset,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm({
    resolver: zodResolver(productFormSchema),
    defaultValues: product ? toFormValues(product) : EMPTY_PRODUCT,
  });
  const photos = useFieldArray({ control, name: 'images' });
  const saving = isSubmitting || create.isPending || update.isPending;

  // While creating, the slug follows the title until the owner types in the slug box.
  const titleField = register('title', {
    onChange: (event) => {
      if (!isEdit && !dirtyFields.slug) setValue('slug', slugify(event.target.value));
    },
  });

  function showServerError(error) {
    if (error instanceof ApiError && error.code === 'SLUG_TAKEN') {
      setError('slug', { message: 'This slug is already used by another product' });
      return;
    }
    if (error instanceof ApiError && error.code === 'VALIDATION_ERROR' && error.details?.length) {
      for (const issue of error.details) setError(formFieldFor(issue.path), { message: issue.message });
      toast.error('Please check the form');
      return;
    }
    toast.error('Could not save the product. Please try again.');
  }

  async function persist(values) {
    try {
      const payload = toPayload(values);
      // A new product is created shown in the shop. The edit page has the button to hide it.
      const saved = isEdit ? await update.mutateAsync(payload) : await create.mutateAsync({ ...payload, isActive: true });
      if (isEdit) {
        toast.success('Product saved');
        reset(toFormValues(saved));
      } else {
        toast.success('Product created. Add its colors and sizes below.');
        navigate(`/admin/products/${saved.id}`, { replace: true });
      }
    } catch (error) {
      showServerError(error);
    }
  }

  const photosError = errors.images?.root?.message ?? errors.images?.message;

  return (
    <form onSubmit={handleSubmit(persist)} noValidate className="space-y-6">
      <Card title="Basics">
        <Field label="Title" htmlFor="title" error={errors.title?.message}>
          <Input id="title" aria-invalid={Boolean(errors.title)} {...titleField} />
        </Field>
        <Field
          label="Slug"
          htmlFor="slug"
          error={errors.slug?.message}
          hint={
            isEdit
              ? 'Locked: old orders and shop links use this address.'
              : "The end of the product's web address, like linen-midi-dress."
          }
        >
          {/* Once a product exists its slug is fixed: old orders link to /products/<slug>, and a new slug would
              make those links, and the "Write a review" link on them, open Not found. */}
          <Input
            id="slug"
            readOnly={isEdit}
            className={isEdit ? 'bg-muted text-muted-foreground' : undefined}
            aria-invalid={Boolean(errors.slug)}
            {...register('slug')}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" htmlFor="categoryId" error={errors.categoryId?.message}>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="categoryId" aria-invalid={Boolean(errors.categoryId)} className="w-full">
                    <SelectValue placeholder="Choose a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {(categories.data ?? []).map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {categories.isError && (
              <p role="alert" className="text-sm text-destructive">
                Could not load the categories.{' '}
                <button type="button" onClick={() => categories.refetch()} className="underline underline-offset-4">
                  Try again
                </button>
              </p>
            )}
          </Field>
          <Field label="Price (USD)" htmlFor="price" error={errors.price?.message}>
            <Input
              id="price"
              inputMode="decimal"
              placeholder="59.99"
              aria-invalid={Boolean(errors.price)}
              {...register('price')}
            />
          </Field>
        </div>
      </Card>

      <Card title="Description">
        <Field label="Description" htmlFor="description" error={errors.description?.message}>
          <Textarea id="description" rows={3} {...register('description')} />
        </Field>
        <Field
          label="Highlights"
          htmlFor="highlights"
          error={errors.highlights?.message}
          hint="One highlight per line."
        >
          <Textarea id="highlights" rows={4} {...register('highlights')} />
        </Field>
        <Field label="Wear it with" htmlFor="stylingNote" error={errors.stylingNote?.message}>
          <Textarea id="stylingNote" rows={2} {...register('stylingNote')} />
        </Field>
        <Field label="Fit and sizing" htmlFor="sizingNotes" error={errors.sizingNotes?.message}>
          <Textarea id="sizingNotes" rows={2} {...register('sizingNotes')} />
        </Field>
      </Card>

      <Card title="Details">
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ['material', 'Material'],
            ['care', 'Care'],
            ['fit', 'Fit'],
            ['length', 'Length'],
            ['closure', 'Closure'],
            ['season', 'Season'],
            ['pattern', 'Pattern'],
          ].map(([name, label]) => (
            <Field key={name} label={label} htmlFor={name} error={errors[name]?.message}>
              <Input id={name} {...register(name)} />
            </Field>
          ))}
        </div>
      </Card>

      <Card title="Photos">
        <p className="text-sm text-muted-foreground">
          The addresses of the photos (https://...). The first one is the main photo.
        </p>
        <ul className="space-y-4">
          {photos.fields.map((photo, index) => (
            <li key={photo.id} className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-start">
              <Field
                label={`Photo ${index + 1} address`}
                htmlFor={`images.${index}.url`}
                error={errors.images?.[index]?.url?.message}
              >
                <Input
                  id={`images.${index}.url`}
                  aria-invalid={Boolean(errors.images?.[index]?.url)}
                  {...register(`images.${index}.url`)}
                />
              </Field>
              <Field
                label={`Photo ${index + 1} description`}
                htmlFor={`images.${index}.alt`}
                error={errors.images?.[index]?.alt?.message}
              >
                <Input id={`images.${index}.alt`} {...register(`images.${index}.alt`)} />
              </Field>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="sm:mt-8"
                aria-label={`Remove photo ${index + 1}`}
                disabled={photos.fields.length === 1}
                onClick={() => photos.remove(index)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
        {photosError && (
          <p role="alert" className="text-sm text-destructive">
            {photosError}
          </p>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={photos.fields.length >= MAX_PHOTOS}
          onClick={() => photos.append({ url: '', alt: '' })}
        >
          Add photo
        </Button>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create product'}
        </Button>
        <Button asChild variant="ghost">
          <Link to="/admin/products">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
