import { describe, it, expect } from 'vitest'

// Extract template generation function for testing
const generateTemplateFromSchema = (schema: Record<string, any>): Record<string, any> => {
    const template: Record<string, any> = {}

    if (!schema.properties) {
        return {message: ''}
    }

    for (const [key, value] of Object.entries(schema.properties)) {
        const prop = value as any

        if (prop.type === 'string') {
            template[key] = prop.default || ''
        } else if (prop.type === 'array') {
            template[key] = prop.default || []
        } else if (prop.type === 'object') {
            template[key] = prop.default || {}
        } else if (prop.type === 'boolean') {
            template[key] = prop.default || false
        } else if (prop.type === 'number' || prop.type === 'integer') {
            template[key] = prop.default || 0
        } else {
            template[key] = prop.default || null
        }
    }

    return template
}

describe('generateTemplateFromSchema', () => {
    it('should return default message object when no properties', () => {
        const result = generateTemplateFromSchema({})
        expect(result).toEqual({ message: '' })
    })

    it('should generate string field with empty default', () => {
        const schema = {
            properties: {
                name: { type: 'string' }
            }
        }
        const result = generateTemplateFromSchema(schema)
        expect(result).toEqual({ name: '' })
    })

    it('should use provided default for string', () => {
        const schema = {
            properties: {
                name: { type: 'string', default: 'John' }
            }
        }
        const result = generateTemplateFromSchema(schema)
        expect(result).toEqual({ name: 'John' })
    })

    it('should generate number field with 0 default', () => {
        const schema = {
            properties: {
                age: { type: 'number' }
            }
        }
        const result = generateTemplateFromSchema(schema)
        expect(result).toEqual({ age: 0 })
    })

    it('should use provided default for number', () => {
        const schema = {
            properties: {
                age: { type: 'number', default: 25 }
            }
        }
        const result = generateTemplateFromSchema(schema)
        expect(result).toEqual({ age: 25 })
    })

    it('should generate integer field with 0 default', () => {
        const schema = {
            properties: {
                count: { type: 'integer' }
            }
        }
        const result = generateTemplateFromSchema(schema)
        expect(result).toEqual({ count: 0 })
    })

    it('should generate boolean field with false default', () => {
        const schema = {
            properties: {
                active: { type: 'boolean' }
            }
        }
        const result = generateTemplateFromSchema(schema)
        expect(result).toEqual({ active: false })
    })

    it('should use provided default for boolean', () => {
        const schema = {
            properties: {
                active: { type: 'boolean', default: true }
            }
        }
        const result = generateTemplateFromSchema(schema)
        expect(result).toEqual({ active: true })
    })

    it('should generate array field with empty array default', () => {
        const schema = {
            properties: {
                tags: { type: 'array' }
            }
        }
        const result = generateTemplateFromSchema(schema)
        expect(result).toEqual({ tags: [] })
    })

    it('should use provided default for array', () => {
        const schema = {
            properties: {
                tags: { type: 'array', default: ['a', 'b'] }
            }
        }
        const result = generateTemplateFromSchema(schema)
        expect(result).toEqual({ tags: ['a', 'b'] })
    })

    it('should generate object field with empty object default', () => {
        const schema = {
            properties: {
                config: { type: 'object' }
            }
        }
        const result = generateTemplateFromSchema(schema)
        expect(result).toEqual({ config: {} })
    })

    it('should use provided default for object', () => {
        const schema = {
            properties: {
                config: { type: 'object', default: { key: 'value' } }
            }
        }
        const result = generateTemplateFromSchema(schema)
        expect(result).toEqual({ config: { key: 'value' } })
    })

    it('should handle unknown types with null default', () => {
        const schema = {
            properties: {
                unknown: { type: 'custom' }
            }
        }
        const result = generateTemplateFromSchema(schema)
        expect(result).toEqual({ unknown: null })
    })

    it('should generate template with multiple fields', () => {
        const schema = {
            properties: {
                name: { type: 'string' },
                age: { type: 'number' },
                active: { type: 'boolean' },
                tags: { type: 'array' },
                meta: { type: 'object' }
            }
        }
        const result = generateTemplateFromSchema(schema)
        expect(result).toEqual({
            name: '',
            age: 0,
            active: false,
            tags: [],
            meta: {}
        })
    })

    it('should respect all provided defaults', () => {
        const schema = {
            properties: {
                name: { type: 'string', default: 'John' },
                age: { type: 'number', default: 30 },
                active: { type: 'boolean', default: true },
                tags: { type: 'array', default: ['admin'] },
                meta: { type: 'object', default: { role: 'user' } }
            }
        }
        const result = generateTemplateFromSchema(schema)
        expect(result).toEqual({
            name: 'John',
            age: 30,
            active: true,
            tags: ['admin'],
            meta: { role: 'user' }
        })
    })
})
