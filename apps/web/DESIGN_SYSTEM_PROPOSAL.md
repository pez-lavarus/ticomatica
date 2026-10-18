# Technical Report: Architectural Evolution of the BXM Question Pilot Design System

## 1. Executive Summary
This report outlines a comprehensive architectural and design system overhaul for the Bachillerato por Madurez Suficiente (BXM) practice platform. The current implementation, while functional, utilizes generic styling defaults that lack a distinct professional identity. The proposed system shifts toward an "Academic Prestige" aesthetic, prioritizing readability, mathematical precision, and long-term maintainability through standardized design tokens and a modular component architecture.

---

## 2. Repository & UI Audit Findings

### 2.1 Styling Inconsistencies
- **Typography:** The reliance on the default Inter variable across all hierarchies fails to distinguish between instructional content, mathematical formulas, and navigational metadata.
- **Color Palettes:** The current implementation uses standard Tailwind scales (Slate, Blue, Emerald). While accessible, these colors are perceived as "generic SaaS" rather than specialized educational tools.
- **Spacing Logic:** Spacing values (e.g., `p-8`, `p-12`, `p-5`) appear ad-hoc across different views, leading to a lack of rhythmic consistency in the layout.

### 2.2 Component Architecture
- **Monolithic Page Logic:** Significant UI and state management logic reside directly within `app/test/page.tsx` and `app/results/page.tsx`. This pattern complicates testing and slows down the CI/CD pipeline as components grow in complexity.
- **Incomplete Abstraction:** While some modals are extracted, core elements like the "Question Card" and "Navigator" are not reusable components, limiting the ability to implement future assessment modules.

---

## 3. Design System Proposal

### 3.1 Typography & Hierarchy
The system will adopt a **Dual-Typeface Strategy** to separate content from interface.
- **Headings & Body Text:** *Source Serif 4* or *Lora*. Serifs are mathematically proven to increase readability for long-form academic text.
- **Interface & Metadata:** *Inter* or *Public Sans*. A clean sans-serif for UI controls, labels, and progress indicators.
- **Mathematical Rendering:** Native KaTeX (Computer Modern) will remain the standard for formulas, but font sizes will be normalized to a **1.125x scale** relative to the body text.

**Scale (Modular Scale: 1.250 - Major Third):**
- Display 1: 3.052rem (48.83px)
- Heading 1: 2.441rem (39.06px)
- Heading 2: 1.953rem (31.25px)
- Body: 1rem (16px) - *Baseline*
- Small: 0.8rem (12.8px)

### 3.2 Color Theory: "Academic Prestige" Palette
Replacing the generic blue/emerald with a palette that conveys authority and focus.
- **Primary (Oxford Blue):** `#002147` — The core brand color for headers and primary actions.
- **Secondary (Academic Gold):** `#D4AF37` — Used sparingly for highlights, achievements, and focus states.
- **Success (Cambridge Blue):** `#A3C1AD` — A muted, professional green for correct answers.
- **Warning (Deep Ochre):** `#B8860B` — For flagged questions.
- **Neutral (Parchment):** `#FDFCF0` — A slight off-white background to reduce eye strain during 120-minute sessions.

### 3.3 Spacing & Grid Systems
Implementation of a strict **8px Linear Scale** (0.5rem base).
- **Layout Margins:** 32px (4 units) mobile / 64px (8 units) desktop.
- **Component Gaps:** 16px (2 units) standard / 24px (3 units) between distinct sections.
- **Grid:** 12-column fluid grid for the desktop assessment view, ensuring the Question Card maintains a 65-75 character line length for optimal reading.

---

## 4. Component Architecture Roadmap

### 4.1 Design Tokens
Establish a `lib/design-tokens.ts` file to centralize the 8px scale and color hex codes, moving away from hardcoded Tailwind classes.

### 4.2 Reusable Patterns
- **Assessment Engine:** Extract the quiz logic into a `useAssessment` hook to decouple UI from state (Timer, Progress, Persistence).
- **Atomic UI Components:**
    - `BaseButton`: Polymorphic button with academic styling.
    - `MathContent`: Wrapper for `KaTeXText` with standardized spacing.
    - `StatusBadge`: Professional indicators for "Correct", "Incorrect", and "Flagged".

---

## 5. Visual Direction: "The Digital Library"
The aesthetic direction is **Modern Academic**.
- **Elimination of "Trendy" Elements:** Remove glassmorphism (`.glass`) and playful animations. Replace with subtle borders (0.5px) and solid, high-contrast surfaces.
- **Precision:** Use square or slightly rounded (4px) corners instead of the current 3xl (24px) rounding to evoke the feeling of high-end stationery and formal documents.

---

## 6. Implementation Roadmap (Solo Developer)

### Phase 1: Foundation (1-2 Days)
1. Configure the Tailwind 4 `@theme` directive in `app/globals.css` with the new color palette and font families.
2. Refactor `app/globals.css` to remove legacy utility classes and establish the 8px baseline.

### Phase 2: Core Refactor (3-5 Days)
1. Extract the "Navigator" and "QuestionCard" from the page files into `components/assessment/`.
2. Implement the `useAssessment` custom hook.
3. Update the `results/` page to use the new "StatusBadge" and "Academic Gold" accents.

### Phase 3: Polish & QA (2 Days)
1. Audit all KaTeX rendering for size consistency.
2. Implement strict dark mode mapping (e.g., Deep Navy becomes Midnight Blue).
3. Verify layout integrity on small-screen devices.
