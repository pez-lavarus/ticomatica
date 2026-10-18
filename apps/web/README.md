# BXM Question Pilot App

A premium Next.js 15 application for the Bachillerato por Madurez Suficiente (BXM) 2026 practice assessment.

## Features

- **60-Question Full Assessment**: Comprehensive coverage of Geometry, Functions, and Statistics.
- **Dynamic Navigator**: Real-time progress tracking and easy section navigation.
- **Premium UX**: Smooth transitions, glassmorphism UI, and responsive layouts.
- **KaTeX Integration**: High-quality mathematical formula rendering.
- **Image Zoom**: Double-click any image to view it in full detail.
- **Localized Persistence**: Automatically saves your progress to your browser.

## Getting Started

1. **Install dependencies**:
   ```bash
   pnpm install
   ```
2. **Run the development server**:
   ```bash
   npm run dev
   ```
3. **Build for production**:
   ```bash
   npm run build
   ```

## Data Management

The application uses a consolidated JSON manifest located at `data/BXM_Math_Full_02_2026_questions_answers.json`. All images are stored in `public/images/bxm_math_images/`.

## Architecture

This project follows the Next.js App Router architecture. Key directories:
- `/app`: Routing and layout.
- `/components`: Modular UI elements.
- `/lib`: Shared utilities and type definitions.
- `/data`: Quiz content and metadata.
