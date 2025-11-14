import { describe, it, expect } from 'vitest'
import {
  parseJSONSchema,
  detectSchemaComplexity,
  validateSchemaInput,
  generateDefaultValues
} from '../schemaParser'

describe('schemaParser', () => {
  describe('parseJSONSchema', () => {
    it('should parse simple string field', () => {
      const schema = {
        properties: {
          name: {
            type: 'string',
            title: 'Name',
            description: 'User name'
          }
        },
        required: ['name']
      }

      const result = parseJSONSchema(schema)

      expect(result.fields).toHaveLength(1)
      expect(result.fields[0]).toMatchObject({
        name: 'name',
        type: 'string',
        label: 'Name',
        description: 'User name',
        required: true
      })
    })

    it('should parse enum field', () => {
      const schema = {
        properties: {
          status: {
            type: 'string',
            enum: ['active', 'inactive', 'pending']
          }
        }
      }

      const result = parseJSONSchema(schema)

      expect(result.fields[0].type).toBe('enum')
      expect(result.fields[0].options).toHaveLength(3)
      expect(result.fields[0].options?.[0]).toEqual({
        label: 'active',
        value: 'active'
      })
    })

    it('should parse number field with validation', () => {
      const schema = {
        properties: {
          age: {
            type: 'number',
            minimum: 0,
            maximum: 120
          }
        }
      }

      const result = parseJSONSchema(schema)

      expect(result.fields[0].type).toBe('number')
      expect(result.fields[0].validation).toEqual({
        min: 0,
        max: 120
      })
    })

    it('should detect textarea for long strings', () => {
      const schema = {
        properties: {
          description: {
            type: 'string',
            maxLength: 500
          }
        }
      }

      const result = parseJSONSchema(schema)

      expect(result.fields[0].type).toBe('textarea')
    })

    it('should parse nested object fields', () => {
      const schema = {
        properties: {
          address: {
            type: 'object',
            properties: {
              street: { type: 'string' },
              city: { type: 'string' }
            }
          }
        }
      }

      const result = parseJSONSchema(schema)

      expect(result.fields[0].type).toBe('object')
      expect(result.fields[0].properties).toHaveLength(2)
      expect(result.fields[0].properties?.[0].name).toBe('street')
    })

    it('should parse array fields', () => {
      const schema = {
        properties: {
          tags: {
            type: 'array',
            items: {
              type: 'string'
            }
          }
        }
      }

      const result = parseJSONSchema(schema)

      expect(result.fields[0].type).toBe('array')
      expect(result.fields[0].items?.type).toBe('string')
    })

    it('should handle null or undefined schema', () => {
      expect(parseJSONSchema(null).fields).toHaveLength(0)
      expect(parseJSONSchema(undefined).fields).toHaveLength(0)
    })
  })

  describe('detectSchemaComplexity', () => {
    it('should detect simple schema', () => {
      const schema = {
        properties: {
          name: { type: 'string' },
          age: { type: 'number' }
        }
      }

      const result = detectSchemaComplexity(schema)

      expect(result.isSimple).toBe(true)
      expect(result.hasComplexTypes).toBe(false)
    })

    it('should detect complex schema with objects', () => {
      const schema = {
        properties: {
          user: {
            type: 'object',
            properties: {
              name: { type: 'string' }
            }
          }
        }
      }

      const result = detectSchemaComplexity(schema)

      expect(result.isSimple).toBe(false)
      expect(result.hasComplexTypes).toBe(true)
    })

    it('should detect complex schema with many fields', () => {
      const schema = {
        properties: {
          field1: { type: 'string' },
          field2: { type: 'string' },
          field3: { type: 'string' },
          field4: { type: 'string' }
        }
      }

      const result = detectSchemaComplexity(schema)

      expect(result.isSimple).toBe(false)
    })
  })

  describe('validateSchemaInput', () => {
    it('should validate required fields', () => {
      const schema = parseJSONSchema({
        properties: {
          name: { type: 'string' }
        },
        required: ['name']
      })

      const result = validateSchemaInput({}, schema)

      expect(result.valid).toBe(false)
      expect(result.errors.name).toBeDefined()
    })

    it('should validate number type', () => {
      const schema = parseJSONSchema({
        properties: {
          age: { type: 'number' }
        },
        required: ['age']
      })

      const result = validateSchemaInput({ age: 'not a number' }, schema)

      expect(result.valid).toBe(false)
      expect(result.errors.age).toContain('number')
    })

    it('should validate min/max constraints', () => {
      const schema = parseJSONSchema({
        properties: {
          age: {
            type: 'number',
            minimum: 18,
            maximum: 65
          }
        },
        required: ['age']
      })

      const result1 = validateSchemaInput({ age: 10 }, schema)
      expect(result1.valid).toBe(false)
      expect(result1.errors.age).toContain('at least 18')

      const result2 = validateSchemaInput({ age: 70 }, schema)
      expect(result2.valid).toBe(false)
      expect(result2.errors.age).toContain('at most 65')

      const result3 = validateSchemaInput({ age: 30 }, schema)
      expect(result3.valid).toBe(true)
    })

    it('should validate string length', () => {
      const schema = parseJSONSchema({
        properties: {
          code: {
            type: 'string',
            minLength: 3,
            maxLength: 10
          }
        },
        required: ['code']
      })

      const result1 = validateSchemaInput({ code: 'ab' }, schema)
      expect(result1.valid).toBe(false)

      const result2 = validateSchemaInput({ code: 'abcdefghijk' }, schema)
      expect(result2.valid).toBe(false)

      const result3 = validateSchemaInput({ code: 'abc123' }, schema)
      expect(result3.valid).toBe(true)
    })

    it('should validate enum values', () => {
      const schema = parseJSONSchema({
        properties: {
          status: {
            type: 'string',
            enum: ['active', 'inactive']
          }
        },
        required: ['status']
      })

      const result1 = validateSchemaInput({ status: 'pending' }, schema)
      expect(result1.valid).toBe(false)

      const result2 = validateSchemaInput({ status: 'active' }, schema)
      expect(result2.valid).toBe(true)
    })
  })

  describe('generateDefaultValues', () => {
    it('should generate defaults from schema', () => {
      const schema = parseJSONSchema({
        properties: {
          name: {
            type: 'string',
            default: 'John'
          },
          age: {
            type: 'number',
            default: 25
          }
        }
      })

      const defaults = generateDefaultValues(schema)

      expect(defaults).toEqual({
        name: 'John',
        age: 25
      })
    })

    it('should generate sensible defaults for required fields', () => {
      const schema = parseJSONSchema({
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
          active: { type: 'boolean' }
        },
        required: ['name', 'age', 'active']
      })

      const defaults = generateDefaultValues(schema)

      expect(defaults.name).toBe('')
      expect(defaults.age).toBe(0)
      expect(defaults.active).toBe(false)
    })
  })
})
