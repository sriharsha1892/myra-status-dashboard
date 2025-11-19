import { useState } from 'react';
import { z } from 'zod';

/**
 * Custom hook for form validation using Zod schemas
 *
 * Provides a standardized way to manage form state, validation, and errors
 * across all modal forms in the application.
 *
 * @template TSchema - Zod schema type
 * @param schema - Zod schema for validation
 * @param initialData - Initial form data matching the schema type
 *
 * @returns Object containing:
 * - formData: Current form state
 * - errors: Field-level validation errors
 * - handleInputChange: Handler for input changes with automatic error clearing
 * - validateForm: Function to validate entire form
 * - resetForm: Function to reset form to initial state
 * - setFieldValue: Function to set individual field value
 * - setFormData: Direct setter for form data (use sparingly)
 *
 * @example
 * ```typescript
 * const schema = z.object({
 *   title: z.string().min(1, 'Title is required'),
 *   description: z.string().optional(),
 * });
 *
 * function MyModal() {
 *   const {
 *     formData,
 *     errors,
 *     handleInputChange,
 *     validateForm,
 *     resetForm,
 *   } = useFormValidation(schema, {
 *     title: '',
 *     description: '',
 *   });
 *
 *   const handleSubmit = (e: React.FormEvent) => {
 *     e.preventDefault();
 *     if (!validateForm()) return;
 *     // Submit formData...
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <input
 *         value={formData.title}
 *         onChange={(e) => handleInputChange('title', e.target.value)}
 *       />
 *       {errors.title && <span>{errors.title}</span>}
 *       // ...
 *     </form>
 *   );
 * }
 * ```
 */
export function useFormValidation<TSchema extends z.ZodSchema>(
  schema: TSchema,
  initialData: z.infer<TSchema>
) {
  // Form state
  const [formData, setFormData] = useState<z.infer<TSchema>>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Handles input changes and automatically clears field-specific errors
   *
   * @param field - Name of the field being changed
   * @param value - New value for the field
   */
  const handleInputChange = (field: string, value: any) => {
    // Update form data
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error for this field if it exists
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  /**
   * Validates the entire form using the provided Zod schema
   *
   * @returns true if validation passes, false if there are errors
   *
   * Side effects:
   * - Clears all errors if validation passes
   * - Sets field-level errors if validation fails
   */
  const validateForm = (): boolean => {
    try {
      // Attempt to parse form data with schema
      schema.parse(formData);

      // Clear all errors on successful validation
      setErrors({});
      return true;
    } catch (err) {
      // Handle Zod validation errors
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};

        // Extract error messages for each field
        err.errors.forEach((error) => {
          if (error.path[0]) {
            const fieldName = error.path[0].toString();
            newErrors[fieldName] = error.message;
          }
        });

        setErrors(newErrors);
      }

      return false;
    }
  };

  /**
   * Resets the form to its initial state
   *
   * Clears both form data and all validation errors
   */
  const resetForm = () => {
    setFormData(initialData);
    setErrors({});
  };

  /**
   * Sets a specific field value without triggering error clearing
   *
   * Useful for programmatic updates (e.g., from API, pre-filling)
   *
   * @param field - Name of the field to update
   * @param value - New value for the field
   */
  const setFieldValue = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return {
    formData,
    errors,
    handleInputChange,
    validateForm,
    resetForm,
    setFieldValue,
    setFormData, // Exposed for advanced use cases
  };
}

/**
 * Type helper to extract form data type from a Zod schema
 *
 * @example
 * ```typescript
 * const schema = z.object({ name: z.string() });
 * type FormData = FormDataFromSchema<typeof schema>;
 * // FormData = { name: string }
 * ```
 */
export type FormDataFromSchema<TSchema extends z.ZodSchema> = z.infer<TSchema>;
