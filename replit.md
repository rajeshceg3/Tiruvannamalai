# Ashta Lingams - Sacred Journey Web Application

## Overview

This is a React-based web application showcasing the eight sacred Lingams of Tiruvannamalai, Tamil Nadu. The application presents a spiritual pilgrimage experience through an interactive website featuring detailed shrine information, interactive maps, and immersive visual storytelling. Built as a modern single-page application, it combines rich content about these sacred sites with elegant UI components and smooth animations to create an engaging digital pilgrimage experience.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development practices
- **Build Tool**: Vite for fast development and optimized production builds
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management and caching
- **UI Framework**: Shadcn/ui components built on Radix UI primitives for accessible, customizable components
- **Styling**: Tailwind CSS with custom spiritual color palette and design tokens
- **Animations**: Framer Motion for smooth page transitions and interactive elements
- **Maps**: Dynamic Leaflet integration for interactive shrine location mapping

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **API Design**: RESTful API architecture with clean endpoint structure
- **Data Layer**: In-memory storage using Map data structure for shrine data
- **Development**: TypeScript throughout the stack for consistency and type safety
- **Build Process**: ESBuild for fast server-side compilation

### Component Architecture
- **Design System**: Consistent component library using Radix UI primitives
- **Layout**: Responsive design with mobile-first approach
- **Navigation**: Fixed navigation with smooth scrolling between sections
- **Content Sections**: Modular hero, map, and shrine card components
- **Error Handling**: Comprehensive error boundaries and loading states

### Data Management
- **Schema Validation**: Zod schemas for type-safe data validation
- **Content Structure**: Structured shrine data with coordinates, descriptions, and metadata
- **Image Assets**: External image hosting via Unsplash for optimized delivery
- **Caching Strategy**: React Query provides automatic caching and background updates

### Development Workflow
- **Environment**: Replit-optimized configuration with development-specific tooling
- **Build Pipeline**: Separate client and server build processes
- **Development Server**: Vite dev server with HMR and Express API proxy
- **TypeScript**: Strict type checking with path aliases for clean imports

## External Dependencies

### Core Framework Dependencies
- **React Ecosystem**: React 18, React DOM, React Router (Wouter)
- **Build Tools**: Vite, ESBuild, TypeScript compiler
- **Database**: Neon Database (PostgreSQL) with Drizzle ORM configured
- **State Management**: TanStack React Query for server state

### UI and Design Dependencies  
- **Component Library**: Radix UI primitives for accessibility-first components
- **Styling**: Tailwind CSS with PostCSS for design system
- **Animations**: Framer Motion for smooth transitions
- **Icons**: Lucide React for consistent iconography
- **Maps**: Leaflet for interactive mapping functionality

### Development and Utilities
- **Form Handling**: React Hook Form with Hookform Resolvers
- **Validation**: Zod for schema validation
- **Date Handling**: Date-fns for date manipulation
- **Utilities**: Class Variance Authority, clsx, and Tailwind Merge for styling
- **Session Management**: Connect-pg-simple for PostgreSQL session storage

### Replit-Specific Integrations
- **Error Handling**: Replit runtime error modal plugin
- **Development**: Replit cartographer for enhanced development experience
- **Deployment**: Configured for Replit's hosting environment