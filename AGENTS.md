# Project Structure and File Plan Analysis

This document provides a detailed breakdown of the project structure, outlining the purpose of each key directory and file.

## 1. Root Directory

The root contains configuration files for various tools used in the project.

- **`.babelrc`**: Babel configuration for transpiling JavaScript.
- **`.eslintrc.js`, `.eslintignore`**: ESLint configuration for code linting and rules.
- **`.gitignore`**: Specifies files and folders to be ignored by Git.
- **`.prettierrc`, `.prettierignore`**: Prettier configuration for code formatting.
- **`gatsby-config.js`**: Main configuration file for the Gatsby site, including plugins and site metadata.
- **`gatsby-node.js`**: Gatsby Node.js APIs for building the site (e.g., creating pages dynamically).
- **`package.json`**: Defines project metadata, dependencies, and scripts.
- **`tsconfig.json`**: TypeScript compiler configuration.
- **`i18n.config.js`**: Configuration for internationalization (i18n).

## 2. `src` Directory - Application Source Code

This is the heart of the application, containing all the React components, pages, and business logic.

- **`src/components/`**: Contains reusable React components.
  - `AISummaryPanel/`: A component likely for displaying AI-generated summaries.
  - `Avatar/`: Component for displaying a user avatar.
  - `Drawer/`: A drawer component, possibly for settings or navigation.
  - `ExperienceTable/`: Component to display work or project experience in a table format.
  - `FormCreator/`: A component to dynamically create forms for editing resume sections.
  - `LangSwitcher/`: Component for switching the application's language.
  - `Resume/`: The main component that assembles and renders the resume, likely using different templates (`Template1/`).

- **`src/data/`**: Holds static data and resume content.
  - `resume.ts`: The core data model for the resume content.
  - `constant.ts`: Application-wide constants.

- **`src/helpers/`**: Utility functions used across the application.
  - `ai.ts`: Functions related to AI features (e.g., summary generation).
  - `export-to-local.ts`: Logic for exporting the resume (e.g., as PDF or JSON).
  - `fetch-resume.ts`: Functions for fetching resume data.
  - `store-to-local.ts`: Logic for saving data to local storage.

- **`src/hooks/`**: Custom React hooks for shared logic.
  - `useModeSwitcher/`: A hook to manage application modes (e.g., light/dark mode, edit/view mode).

- **`src/i18n/`**: Internationalization setup.
  - `locales/`: Contains JSON files for different languages (`en-US.json`, `zh-CN.json`).

- **`src/layout/`**: Components that define the overall page structure.
  - `header.tsx`, `footer.tsx`: The main site header and footer.

- **`src/pages/`**: Gatsby pages, which automatically become routes.
  - `index.tsx`: The landing page.
  - `editor.tsx`: The main page for editing the resume.
  - `resume.tsx`: The page for viewing the final resume.
  - `settings.tsx`: A page for application settings.

## 3. Other Key Directories

- **`.github/workflows/`**: CI/CD pipelines using GitHub Actions (`deploy.yml`).
- **`.husky/`**: Git hooks configuration (`pre-commit`).
- **`scripts/`**: Node.js scripts for utility tasks (`i18n-pick.js`).
- **`static/`**: Static assets that are copied directly to the `public` folder, like `favicon.ico` and images.

This structure separates concerns effectively, with clear distinctions between configuration, components, data, and pages, making the project maintainable and scalable.
