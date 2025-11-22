import { NextRequest, NextResponse } from 'next/server'

export function authenticate(request: NextRequest): NextResponse | null {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.substring(7)
  if (token !== process.env.API_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}

export function validateId(id: string | null): NextResponse | null {
  if (!id) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 })
  }

  if (id.includes('../') || id.includes('./') || id.includes('\0')) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  return null
}
