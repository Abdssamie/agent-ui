# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development Commands

### Core Commands
- **Development**: `pnpm dev` - Starts Next.js dev server on port 3000
- **Build**: `pnpm build` - Creates production build
- **Start**: `pnpm start` - Runs production build
- **Linting**: `pnpm lint` - Run ESLint checks, `pnpm lint:fix` - Auto-fix linting issues
- **Formatting**: `pnpm format` - Check Prettier formatting, `pnpm format:fix` - Auto-format files
- **Type Checking**: `pnpm typecheck` - Run TypeScript compiler checks

### Testing
- **Run Tests**: `pnpm test` - Interactive test runner (Vitest)
- **Run All Tests**: `pnpm test:run` - Run all tests once
- **Test UI**: `pnpm test:ui` - Open Vitest UI
- **Full Validation**: `pnpm validate` - Run linting, formatting, type checking, and tests

### Single Test Execution
To run a specific test file:
```bash
pnpm test src/hooks/__tests__/useVoiceCommands.test.ts
```

## Project Architecture

### Core Technology Stack
- **Framework**: Next.js 15.2.3 with App Router
- **State Management**: Zustand with persistence
- **Styling**: Tailwind CSS with shadcn/ui components
- **Testing**: Vitest + React Testing Library
- **Type System**: TypeScript with strict mode

### Application Structure
This is an **Agent UI** for connecting to and interacting with AgentOS instances through the Agno platform. It provides a modern chat interface with support for:

- Real-time agent communication via streaming
- Multi-modal content (images, videos, audio)
- Tool calls visualization
- Agent reasoning steps display
- Knowledge base management
- Session management
- Voice commands integration

### Key Directories
- `src/app/` - Next.js App Router pages and layouts
- `src/components/` - React components organized by feature:
  - `chat/` - Chat interface components (ChatArea, Sidebar, Messages)
  - `knowledge/` - Knowledge base management components
  - `ui/` - Reusable UI components (shadcn/ui based)
- `src/api/` - API client functions for AgentOS integration
- `src/types/` - TypeScript type definitions
- `src/hooks/` - Custom React hooks
- `src/store.ts` - Zustand global state management

### State Management Architecture
- **Zustand Store**: Centralized state with persistence for:
  - Chat messages and streaming state
  - Agent/Team selection and configuration
  - File attachments and knowledge content
  - Session management
  - Endpoint configuration
- **Persistent State**: Selected endpoint and validation config stored in localStorage
- **URL State**: Uses `nuqs` for URL-based state management (view routing, db_id)

### API Integration
- **Base Endpoint**: Configurable AgentOS URL (default: http://localhost:7777)
- **Key APIs**:
  - Agent/Team management (`/agents`, `/teams`)
  - Chat streaming (`/agents/{id}/runs`, `/teams/{id}/runs`)
  - Session management (`/sessions`)
  - Knowledge API (`/knowledge/content`)

### Component Patterns
- **Feature-based organization**: Components grouped by functionality (chat, knowledge, navigation)
- **shadcn/ui integration**: Consistent design system with customizable components
- **Responsive design**: Mobile-first approach with Tailwind breakpoints
- **Error boundaries**: Proper error handling for streaming and API failures

### Testing Strategy
- **Unit Tests**: Vitest with jsdom environment
- **Component Tests**: React Testing Library integration
- **Hook Tests**: Custom hooks tested with renderHook
- **Voice Commands**: Comprehensive test coverage for voice interaction patterns
- **Test Location**: Tests co-located with components in `__tests__` directories

### Environment Configuration
- **Development URL**: Uses `NEXT_PUBLIC_AGENTOS_URL` or defaults to localhost:7777
- **No environment files**: Configuration handled through runtime environment variables
- **Endpoint Management**: Users can configure endpoints through the UI

### File Upload & Knowledge Management
- **Supported Formats**: Images, PDFs, documents, audio, video
- **Upload Validation**: File size (10MB max per file, 50MB total), type restrictions
- **Knowledge Integration**: Direct integration with AgentOS knowledge API
- **Progress Tracking**: Real-time upload progress with error handling

## Development Guidelines

### Code Style
- Uses Prettier for formatting with Tailwind CSS plugin
- ESLint configured for Next.js best practices
- Strict TypeScript with path aliases (`@/*` for `src/*`)

### Testing Approach
- Write tests for complex hooks and utility functions
- Focus on user interactions and edge cases
- Use descriptive test names and group related tests with `describe`

### Component Development
- Follow existing patterns in the codebase
- Use TypeScript interfaces for props
- Implement proper error handling for async operations
- Maintain responsive design principles

## Design System & Theming Guidelines

### Consistent Theming is Critical
**ALWAYS follow the established design system** - this app uses a modern, cohesive theme that must be maintained across all components.

### Core Theme Patterns
- **Colors**: Use semantic color tokens (`text-primary`, `text-muted`, `text-muted-foreground`, `bg-accent`, `border-primary/15`)
- **Typography**: Consistent hierarchy with `text-xs font-medium uppercase` for headers/labels
- **Borders**: Always use `rounded-xl` and `border-primary/15` for consistency
- **Backgrounds**: Prefer `bg-accent` over `bg-card` or hardcoded backgrounds
- **Spacing**: Follow existing gap and padding patterns

### What NOT to Do
- ❌ **No hardcoded styles** - avoid inline styles or arbitrary values
- ❌ **No mixing border radii** - don't use `rounded-lg` when everything else is `rounded-xl`
- ❌ **No custom color values** - use the design tokens, not hex codes
- ❌ **No inconsistent typography** - follow the established font weight and size patterns

### Reference Components
For theming consistency, reference these well-themed components:
- `src/components/chat/Sidebar/Sidebar.tsx` - Perfect example of the design system
- `src/components/knowledge/KnowledgeBaseManager.tsx` - Recently updated to match consistency
- `src/components/chat/ViewToolbar/ViewToolbar.tsx` - Modern interaction patterns

### Modern Design Principles
- **Subtle animations**: Use Framer Motion for smooth, spring-based transitions
- **Semantic spacing**: Consistent gap-2, gap-3, p-4 patterns
- **Accessible contrast**: Proper text-primary/text-muted hierarchy
- **Glass morphism**: `bg-background/95 backdrop-blur-sm` for overlays
- **Micro-interactions**: Hover states, scale effects, and smooth transitions
