import { useState, useCallback } from 'react';
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
export function useFormValidation<TSchema extends z.ZodObject<any>>(
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
    setFormData((prev) => ({ ...prev, [field]: value }) as z.infer<TSchema>);

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

        // Extract error messages for each field (Zod v4 uses .issues)
        const issues = (err as any).issues || (err as any).errors || [];
        issues.forEach((issue: any) => {
          if (issue.path && issue.path[0]) {
            const fieldName = issue.path[0].toString();
            newErrors[fieldName] = issue.message;
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
    setFormData((prev) => ({ ...prev, [field]: value }) as z.infer<TSchema>);
  };

  /**
   * Validates a single field on blur
   * Provides immediate feedback when user leaves a field
   *
   * @param field - Name of the field to validate
   */
  const validateField = useCallback((field: string) => {
    try {
      // Create partial data with just this field
      const partialData = { [field]: formData[field as keyof typeof formData] };

      // Try to parse just this field using pick if it's an object schema
      if (schema instanceof z.ZodObject) {
        const fieldSchema = (schema as z.ZodObject<any>).shape[field];
        if (fieldSchema) {
          fieldSchema.parse(partialData[field]);
          // Clear error on success
          if (errors[field]) {
            setErrors((prev) => {
              const newErrors = { ...prev };
              delete newErrors[field];
              return newErrors;
            });
          }
        }
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        const issues = (err as any).issues || (err as any).errors || [];
        const fieldError = issues[0];
        if (fieldError) {
          setErrors((prev) => ({
            ...prev,
            [field]: fieldError.message,
          }));
        }
      }
    }
  }, [schema, formData, errors]);

  /**
   * Handler for blur events that validates the field
   *
   * @param field - Name of the field
   */
  const handleBlur = useCallback((field: string) => {
    validateField(field);
  }, [validateField]);

  /**
   * Check if form has any errors
   */
  const hasErrors = Object.keys(errors).length > 0;

  /**
   * Check if form has been modified from initial state
   */
  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialData);

  return {
    formData,
    errors,
    hasErrors,
    isDirty,
    handleInputChange,
    handleBlur,
    validateForm,
    validateField,
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
