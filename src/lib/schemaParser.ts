/**
 * JSON Schema Parser for dynamic workflow input form generation
 */

export type SchemaFieldType = 
  | 'string' 
  | 'number' 
  | 'boolean' 
  | 'object' 
  | 'array' 
  | 'enum'
  | 'textarea'
  | 'email'
  | 'url'
  | 'date'
  | 'datetime'

export interface ParsedSchemaField {
  name: string
  type: SchemaFieldType
  label: string
  description?: string
  required: boolean
  defaultValue?: any
  placeholder?: string
  validation?: {
    min?: number
    max?: number
    minLength?: number
    maxLength?: number
    pattern?: string
    format?: string
  }
  options?: Array<{ label: string; value: any }>
  properties?: ParsedSchemaField[]
  items?: ParsedSchemaField
}

export interface ParsedSchema {
  fields: ParsedSchemaField[]
  isSimple: boolean
  hasComplexTypes: boolean
}

/**
 * Detect schema complexity
 */
export function detectSchemaComplexity(schema: Record<string, any>): {
  isSimple: boolean
  hasComplexTypes: boolean
} {
  const properties = schema.properties || {}
  const hasComplexTypes = Object.values(properties).some((prop: any) => 
    prop.type === 'object' || prop.type === 'array'
  )
  
  const fieldCount = Object.keys(properties).length
  const isSimple = fieldCount <= 3 && !hasComplexTypes

  return { isSimple, hasComplexTypes }
}

/**
 * Parse JSON schema field type and format
 */
function parseFieldType(property: Record<string, any>): SchemaFieldType {
  const type = property.type
  const format = property.format

  // Handle enum
  if (property.enum) {
    return 'enum'
  }

  // Handle format-specific types
  if (format) {
    switch (format) {
      case 'email':
        return 'email'
      case 'uri':
      case 'url':
        return 'url'
      case 'date':
        return 'date'
      case 'date-time':
        return 'datetime'
    }
  }

  // Handle multiline strings
  if (type === 'string' && (property.maxLength > 100 || property.multiline)) {
    return 'textarea'
  }

  // Map basic types
  switch (type) {
    case 'string':
      return 'string'
    case 'number':
    case 'integer':
      return 'number'
    case 'boolean':
      return 'boolean'
    case 'object':
      return 'object'
    case 'array':
      return 'array'
    default:
      return 'string'
  }
}

/**
 * Generate human-readable label from field name
 */
function generateLabel(fieldName: string): string {
  return fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
    .trim()
}

/**
 * Parse a single schema property
 */
function parseSchemaProperty(
  name: string,
  property: Record<string, any>,
  required: string[] = []
): ParsedSchemaField {
  const fieldType = parseFieldType(property)
  
  const field: ParsedSchemaField = {
    name,
    type: fieldType,
    label: property.title || generateLabel(name),
    description: property.description,
    required: required.includes(name),
    defaultValue: property.default,
    placeholder: property.placeholder || property.examples?.[0]
  }

  // Add validation rules
  field.validation = {}
  if (property.minimum !== undefined) field.validation.min = property.minimum
  if (property.maximum !== undefined) field.validation.max = property.maximum
  if (property.minLength !== undefined) field.validation.minLength = property.minLength
  if (property.maxLength !== undefined) field.validation.maxLength = property.maxLength
  if (property.pattern) field.validation.pattern = property.pattern
  if (property.format) field.validation.format = property.format

  // Handle enum options
  if (property.enum) {
    field.options = property.enum.map((value: any) => ({
      label: String(value),
      value
    }))
  }

  // Handle object properties (nested fields)
  if (fieldType === 'object' && property.properties) {
    field.properties = parseSchemaProperties(
      property.properties,
      property.required || []
    )
  }

  // Handle array items
  if (fieldType === 'array' && property.items) {
    field.items = parseSchemaProperty('item', property.items, [])
  }

  return field
}

/**
 * Parse schema properties into field definitions
 */
function parseSchemaProperties(
  properties: Record<string, any>,
  required: string[] = []
): ParsedSchemaField[] {
  return Object.entries(properties).map(([name, property]) =>
    parseSchemaProperty(name, property as Record<string, any>, required)
  )
}

/**
 * Parse JSON schema into structured field definitions
 */
export function parseJSONSchema(schema: Record<string, any> | null | undefined): ParsedSchema {
  if (!schema || typeof schema !== 'object') {
    return {
      fields: [],
      isSimple: true,
      hasComplexTypes: false
    }
  }

  const properties = schema.properties || {}
  const required = schema.required || []
  
  const fields = parseSchemaProperties(properties, required)
  const complexity = detectSchemaComplexity(schema)

  return {
    fields,
    ...complexity
  }
}

/**
 * Validate input against parsed schema
 */
export function validateSchemaInput(
  input: Record<string, any>,
  schema: ParsedSchema
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {}

  for (const field of schema.fields) {
    const value = input[field.name]

    // Check required fields
    if (field.required && (value === undefined || value === null || value === '')) {
      errors[field.name] = `${field.label} is required`
      continue
    }

    // Skip validation if field is not required and empty
    if (!field.required && (value === undefined || value === null || value === '')) {
      continue
    }

    // Type validation
    if (field.type === 'number' && typeof value !== 'number') {
      errors[field.name] = `${field.label} must be a number`
    }

    if (field.type === 'boolean' && typeof value !== 'boolean') {
      errors[field.name] = `${field.label} must be a boolean`
    }

    // Validation rules
    if (field.validation) {
      const val = field.validation

      if (val.min !== undefined && value < val.min) {
        errors[field.name] = `${field.label} must be at least ${val.min}`
      }

      if (val.max !== undefined && value > val.max) {
        errors[field.name] = `${field.label} must be at most ${val.max}`
      }

      if (val.minLength !== undefined && String(value).length < val.minLength) {
        errors[field.name] = `${field.label} must be at least ${val.minLength} characters`
      }

      if (val.maxLength !== undefined && String(value).length > val.maxLength) {
        errors[field.name] = `${field.label} must be at most ${val.maxLength} characters`
      }

      if (val.pattern && !new RegExp(val.pattern).test(String(value))) {
        errors[field.name] = `${field.label} format is invalid`
      }
    }

    // Enum validation
    if (field.options && !field.options.some(opt => opt.value === value)) {
      errors[field.name] = `${field.label} must be one of the allowed values`
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  }
}

/**
 * Generate default values from schema
 */
export function generateDefaultValues(schema: ParsedSchema): Record<string, any> {
  const defaults: Record<string, any> = {}

  for (const field of schema.fields) {
    if (field.defaultValue !== undefined) {
      defaults[field.name] = field.defaultValue
    } else if (field.required) {
      // Set sensible defaults for required fields
      switch (field.type) {
        case 'string':
        case 'textarea':
        case 'email':
        case 'url':
          defaults[field.name] = ''
          break
        case 'number':
          defaults[field.name] = field.validation?.min || 0
          break
        case 'boolean':
          defaults[field.name] = false
          break
        case 'array':
          defaults[field.name] = []
          break
        case 'object':
          defaults[field.name] = {}
          break
      }
    }
  }

  return defaults
}
