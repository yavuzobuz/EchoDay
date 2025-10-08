# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**EchoDay** (also known as "Sesli Günlük Planlayıcı" - Voice Daily Planner) is a React-TypeScript application that serves as an AI-powered task management and note-taking assistant. The application supports voice commands, image analysis, PDF processing, and real-time AI assistance using Google's Gemini AI.

## Development Environment & Build Commands

### Prerequisites
- Node.js (for package management)
- Gemini API key (set in `.env.local` as `GEMINI_API_KEY`)

### Common Development Commands

**Development**
```powershell
# Start development server (web)
npm run dev

# Start Electron development (desktop app)
npm run electron:dev

# Preview production build
npm run preview
```

**Building & Distribution**
```powershell
# Build for web deployment
npm run build

# Build Electron desktop app
npm run electron:build

# Sync with Capacitor (for mobile)
npm run sync
```

**Environment Setup**
- Copy `.env.example` to `.env.local` and configure `GEMINI_API_KEY`
- For Supabase integration, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

## Architecture Overview

### Core Application Structure

**Multi-Platform Architecture**
- **Web**: React SPA with Vite bundler
- **Desktop**: Electron wrapper with native file system access
- **Mobile**: Capacitor integration for iOS/Android (configured but build files not included in main repo)

**Entry Points**
- `src/App.tsx` - Main application router and theme management
- `src/Main.tsx` - Core application logic and state management  
- `index.html` - Web entry point
- `index-cyberpunk.html` - Alternative cyberpunk-themed entry point
- `electron/main.cjs` - Electron main process
- `electron/preload.cjs` - Electron preload script for secure context bridging

### Data Architecture

**Storage Systems**
1. **Local Storage**: User preferences, themes, and offline data persistence
2. **IndexedDB (Dexie)**: Local database for offline-first operation
3. **Supabase**: Optional cloud synchronization and user authentication
4. **File System**: Electron-specific file operations (images, PDFs)

**Key Data Types** (defined in `src/types.ts`)
- `Todo`: Tasks with AI metadata, reminders, and recurrence
- `Note`: Rich notes with image support and PDF analysis results
- `ChatMessage`: AI conversation history
- `ReminderConfig`: Flexible reminder system with snooze functionality
- `UserContext`: AI-powered user behavior analysis and insights

### AI Integration Architecture

**Gemini AI Service** (`src/services/geminiService.ts`)
- Task analysis and smart scheduling
- Natural language processing for voice commands
- Image-to-text extraction (OCR)
- PDF document analysis and extraction
- Conversational AI chat interface
- Daily briefing and productivity insights

**AI Features**
- Voice command recognition (disabled in Electron due to API limitations)
- Smart task categorization and priority detection
- Timezone-aware scheduling with UTC conversion
- Contextual memory system for user patterns
- Proactive suggestions based on user behavior

### Component Architecture

**Core Layout Components**
- `Header` - Navigation and theme controls
- `ActionBar` - Quick action buttons for common tasks
- `TodoList` - Task management interface
- `DailyNotepad` - Rich note-taking with image/PDF support
- `TimelineView` - Calendar-style task visualization

**Modal Components**
- `TaskModal` - Voice-powered task creation
- `ChatModal` - AI conversation interface  
- `ImageTaskModal` - Camera/image-based task creation
- `LocationPromptModal` - Location-based task routing
- `ArchiveModal` - Historical data browser
- `SuggestionsModal` - Daily briefing and AI recommendations

### Authentication & User Management

**Context System**
- `AuthContext` - Supabase-based authentication
- User-specific data isolation with `userId` prefixing
- Guest mode support for offline usage

**Multi-User Support**
- User-scoped localStorage keys (`key_${userId}`)
- Supabase user management and data sync
- Offline-first with cloud sync when available

### Real-Time Features

**Reminder System** (`src/services/reminderService.ts`)
- Flexible reminder scheduling (relative/absolute)
- Browser notification integration
- Snooze functionality with configurable intervals
- Recurring task automation

**Auto-Archive System**
- Daily midnight archival of completed tasks
- Automatic cleanup and data organization
- Historical data preservation for analytics

## Key Services & Utilities

### Speech Recognition
- Unified speech recognition service supporting web and mobile
- Wake word detection (configurable assistant name)
- Continuous listening with keyword-based stopping
- Platform-specific implementations (disabled in Electron)

### File Processing
- PDF text extraction and intelligent parsing
- Image analysis with OCR capabilities
- File system integration for Electron
- Base64 encoding for cross-platform compatibility

### Context Memory System
- User behavior pattern recognition
- Working hours analysis and optimization
- Task completion analytics
- Proactive productivity suggestions

## Platform-Specific Considerations

### Web Deployment
- Vite-based SPA with code splitting
- Service worker support for offline functionality
- Web Speech API integration
- Responsive design for mobile browsers

### Electron Desktop
- Native file system access
- Secure context bridging via preload scripts
- Windows installer (NSIS) and portable builds
- Auto-updater support configured
- Speech recognition disabled due to network restrictions

### Mobile (Capacitor)
- Cross-platform iOS/Android support
- Native speech recognition integration
- Camera and file access permissions
- Push notification capabilities

## Development Guidelines

### State Management Patterns
- React hooks and context for global state
- User-specific localStorage with automatic prefixing
- Optimistic updates with error handling
- Background sync for cloud integration

### Error Handling
- Graceful degradation when AI services unavailable
- Network connectivity resilience
- Platform-specific capability detection
- User-friendly error notifications

### Performance Considerations
- Lazy loading for large components
- Debounced API calls for real-time features
- Optimized rendering for large task lists
- Background sync to minimize UI blocking

### Security Practices
- Client-side API key management (user-provided)
- Secure Electron context isolation
- Content Security Policy compliance
- XSS protection through DOMPurify

## Theme & Styling System

**Multi-Theme Support**
- Light/Dark mode with system preference detection
- Accent color customization (Blue, Green, Red)
- CSS custom properties for dynamic theming
- Cyberpunk theme variant support
- Font theme integration with color schemes

**Responsive Design**
- Mobile-first approach with desktop enhancements
- Tailwind CSS utility framework
- Custom gradient backgrounds for dark mode
- Accessible color contrast ratios

## API Integration Patterns

### Gemini AI Integration
- User-provided API keys for privacy
- Structured JSON schema responses
- Timezone-aware prompt engineering
- Rate limiting and error recovery
- Multi-language support (Turkish primary, English fallback)

### Supabase Integration
- Optional cloud sync (app works offline-first)
- Real-time authentication state management
- Row Level Security (RLS) for multi-tenant data
- Automatic conflict resolution for sync

This architecture enables a robust, cross-platform productivity application with AI-powered assistance while maintaining user privacy and offline functionality.