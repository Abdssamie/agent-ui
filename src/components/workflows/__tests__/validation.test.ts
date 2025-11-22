import { describe, it, expect } from 'vitest'

// Extract validation function for testing
const validateInput = (input: any, schema: Record<string, any>): { valid: boolean; errors: string[] } => {
    const errors: string[] = []

    if (!schema.properties) {
        return { valid: true, errors: [] }
    }

    const required = schema.required || []

    for (const field of required) {
        if (input[field] === undefined || input[field] === null || input[field] === '') {
            errors.push(`${field} is required`)
        }
    }

    for (const [key, value] of Object.entries(schema.properties)) {
        const prop = value as any
        const inputValue = input[key]

        if (inputValue === undefined || inputValue === null) continue

        if (prop.type === 'string' && typeof inputValue !== 'string') {
            errors.push(`${key} must be a string`)
        } else if (prop.type === 'number' && typeof inputValue !== 'number') {
            errors.push(`${key} must be a number`)
        } else if (prop.type === 'integer' && (!Number.isInteger(inputValue))) {
            errors.push(`${key} must be an integer`)
        } else if (prop.type === 'boolean' && typeof inputValue !== 'boolean') {
            errors.push(`${key} must be a boolean`)
        } else if (prop.type === 'array' && !Array.isArray(inputValue)) {
            errors.push(`${key} must be an array`)
        } else if (prop.type === 'object' && typeof inputValue !== 'object') {
            errors.push(`${key} must be an object`)
        }
    }

    return { valid: errors.length === 0, errors }
}

describe('validateInput', () => {
    it('should pass validation with no schema properties', () => {
        const result = validateInput({ message: 'test' }, {})
        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
    })

    it('should validate required fields', () => {
        const schema = {
            properties: {
                message: { type: 'string' }
            },
            required: ['message']
        }

        const result = validateInput({}, schema)
        expect(result.valid).toBe(false)
        expect(result.errors).toContain('message is required')
    })

    it('should pass when required fields are present', () => {
        const schema = {
            properties: {
                message: { type: 'string' }
            },
            required: ['message']
        }

        const result = validateInput({ message: 'hello' }, schema)
        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
    })

    it('should validate string type', () => {
        const schema = {
            properties: {
                name: { type: 'string' }
            }
        }

        const result = validateInput({ name: 123 }, schema)
        expect(result.valid).toBe(false)
        expect(result.errors).toContain('name must be a string')
    })

    it('should validate number type', () => {
        const schema = {
            properties: {
                age: { type: 'number' }
            }
        }

        const result = validateInput({ age: '25' }, schema)
        expect(result.valid).toBe(false)
        expect(result.errors).toContain('age must be a number')
    })

    it('should validate integer type', () => {
        const schema = {
            properties: {
                count: { type: 'integer' }
            }
        }

        const result = validateInput({ count: 3.14 }, schema)
        expect(result.valid).toBe(false)
        expect(result.errors).toContain('count must be an integer')
    })

    it('should validate boolean type', () => {
        const schema = {
            properties: {
                active: { type: 'boolean' }
            }
        }

        const result = validateInput({ active: 'true' }, schema)
        expect(result.valid).toBe(false)
        expect(result.errors).toContain('active must be a boolean')
    })

    it('should validate array type', () => {
        const schema = {
            properties: {
                items: { type: 'array' }
            }
        }

        const result = validateInput({ items: 'not an array' }, schema)
        expect(result.valid).toBe(false)
        expect(result.errors).toContain('items must be an array')
    })

    it('should validate object type', () => {
        const schema = {
            properties: {
                config: { type: 'object' }
            }
        }

        const result = validateInput({ config: 'not an object' }, schema)
        expect(result.valid).toBe(false)
        expect(result.errors).toContain('config must be an object')
    })

    it('should pass with correct types', () => {
        const schema = {
            properties: {
                name: { type: 'string' },
                age: { type: 'number' },
                count: { type: 'integer' },
                active: { type: 'boolean' },
                tags: { type: 'array' },
                meta: { type: 'object' }
            }
        }

        const result = validateInput({
            name: 'John',
            age: 25.5,
            count: 10,
            active: true,
            tags: ['a', 'b'],
            meta: { key: 'value' }
        }, schema)

        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
    })

    it('should allow optional fields to be missing', () => {
        const schema = {
            properties: {
                name: { type: 'string' },
                optional: { type: 'string' }
            },
            required: ['name']
        }

        const result = validateInput({ name: 'John' }, schema)
        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
    })

    it('should collect multiple validation errors', () => {
        const schema = {
            properties: {
                name: { type: 'string' },
                age: { type: 'number' }
            },
            required: ['name', 'age']
        }

        const result = validateInput({}, schema)
        expect(result.valid).toBe(false)
        expect(result.errors).toHaveLength(2)
        expect(result.errors).toContain('name is required')
        expect(result.errors).toContain('age is required')
    })
})
