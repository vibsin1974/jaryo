# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a web-based file management system (자료실) with full CRUD functionality. It's a hybrid application built with vanilla HTML, CSS, and JavaScript that supports both Supabase cloud database and localStorage for data persistence, providing seamless offline/online capabilities.

### Key Features
- Create, Read, Update, Delete operations for file records
- File upload with multiple file support (local + cloud storage)
- User authentication and authorization
- Search and filtering by title, description, tags, and category
- Categorization system (문서, 이미지, 동영상, 프레젠테이션, 기타)
- Tag-based organization
- Responsive design for mobile and desktop
- Modal-based editing interface
- Cloud database with real-time synchronization
- Offline support with localStorage fallback
- Cross-device data synchronization

## File Structure

```
자료실/
├── index.html              # Main HTML file with UI structure and auth components
├── styles.css              # Complete styling with responsive design and auth styles
├── script.js               # Core JavaScript with FileManager class and Supabase integration
├── supabase-config.js      # Supabase configuration and helper functions
├── supabase-schema.sql     # Database schema for Supabase setup
├── setup-guide.md          # Comprehensive Supabase setup guide
└── CLAUDE.md              # This documentation file
```

## Architecture

### Core Components

1. **FileManager Class** (`script.js`)
   - Main application controller with hybrid storage support
   - Handles all CRUD operations (Supabase + localStorage fallback)
   - Manages user authentication and session state
   - Contains event handling and UI updates
   - Real-time synchronization capabilities

2. **Supabase Integration** (`supabase-config.js`)
   - Database configuration and connection management
   - Authentication helper functions (signup, login, logout)
   - CRUD helper functions for files and attachments
   - Storage helper functions for file uploads/downloads
   - Real-time subscription management

3. **Data Model**
   ```javascript
   // Files table
   {
     id: UUID,            // Primary key
     title: string,       // File title (required)
     description: string, // Optional description
     category: string,    // Required category
     tags: string[],      // Array of tags
     user_id: UUID,       // Foreign key to auth.users
     created_at: timestamp,
     updated_at: timestamp
   }
   
   // File attachments table
   {
     id: UUID,
     file_id: UUID,       // Foreign key to files
     original_name: string,
     storage_path: string, // Supabase Storage path
     file_size: integer,
     mime_type: string,
     created_at: timestamp
   }
   ```

4. **UI Components**
   - Authentication section (login/signup/logout)
   - Sync status indicator
   - Search and filter section
   - Add new file form with cloud upload
   - File list display with sorting
   - Edit modal for updates
   - Responsive card-based layout
   - Offline mode notifications

### Development Commands

This is a hybrid web application supporting both online and offline modes:

1. **Local Development**
   ```bash
   # Open index.html in a web browser
   # OR use a simple HTTP server:
   python -m http.server 8000
   # OR
   npx serve .
   ```

2. **Supabase Setup (Required for online features)**
   ```bash
   # 1. Follow setup-guide.md for complete setup
   # 2. Create Supabase project and database
   # 3. Run supabase-schema.sql in SQL Editor
   # 4. Create Storage bucket named 'files'
   # 5. Update supabase-config.js with your credentials
   ```

3. **File Access**
   - Open `index.html` directly in browser
   - Works offline with localStorage (limited functionality)
   - Full features available with Supabase configuration

### Technical Implementation

- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Storage**: Supabase Storage for files + localStorage fallback
- **Authentication**: Supabase Auth with email/password
- **Real-time**: Supabase Realtime for live synchronization
- **File Handling**: FileReader API + Supabase Storage API
- **UI Updates**: Vanilla JavaScript DOM manipulation
- **Styling**: CSS Grid and Flexbox for responsive layouts
- **Animations**: CSS transitions and keyframe animations
- **Offline Support**: Automatic fallback to localStorage when offline

### Data Management

- **Online Mode**: Files stored in Supabase PostgreSQL + Storage
- **Offline Mode**: Files stored as base64 strings in localStorage
- **Hybrid Sync**: Automatic synchronization when connection restored
- User-specific data isolation with RLS policies
- Search works across title, description, and tags
- Sorting available by date, title, or category
- Categories are predefined but can be extended
- Real-time updates across devices for same user

### Browser Compatibility

- Modern browsers with ES6+ support
- localStorage API support required
- FileReader API for file uploads
- Fetch API for Supabase communication
- WebSocket support for real-time features
- External dependency: Supabase JavaScript client library