import type { TrainingModule } from "../../packages/shared/src/index.js";

const now = new Date().toISOString();

export const TRAINING_MODULES: TrainingModule[] = [
    {
      id: "train-react-next",
    slug: "react-nextjs",
    skill: "React",
    title: "React & Next.js for Modern Frontends",
    subtitle: "Components, hooks, data fetching, and routes",
    description:
      "Learn how to build fast, maintainable web UIs with React and Next.js — from components and state to server-side rendering and API routes. The same stack used across IntoreAI and most hiring teams in East Africa.",
    level: "intermediate",
    estimatedMinutes: 150,
    relatedSkills: ["React", "Next.js", "JavaScript", "TypeScript", "Tailwind CSS"],
    tags: ["frontend", "web", "components", "SSR"],
    units: [
      {
        id: "u1",
        title: "Thinking in Components",
        minutes: 40,
        content:
          "A React UI is a tree of small, reusable components. Every component receives data through props and returns JSX. The golden rule is single responsibility: one component, one job. Keep presentational components separate from stateful containers so your UI is easy to test and reuse.\n\nStart by mapping a page into boxes: header, filters, list, cards. Each box becomes a component. Props flow down, events flow up via callbacks. When a parent needs to react to child events, the parent passes a function and the child calls it.\n\nData that must be shared between distant components belongs in a shared state or context. Avoid deep prop drilling by composing children instead of threading props through every layer.",
        checklist: [
          "Break a page into a component tree before writing code",
          "Name components after what they render, not what they do",
          "Pass data down with props and notify parents with callbacks",
          "Keep side effects out of the render body",
        ],
        quiz: {
          question: "How should a child component communicate state changes to its parent?",
          options: ["By mutating parent props directly", "By calling a callback prop provided by the parent", "By using global variables", "By re-rendering automatically"],
          answerIndex: 1,
          explanation: "Props are read-only. Children notify their parent by invoking a callback prop, and the parent updates its own state.",
        },
      },
      {
        id: "u2",
        title: "State, Hooks, and Effects",
        minutes: 45,
        content:
          "useState holds local state, useEffect runs code after render, and useMemo/useCallback guard expensive recomputation. A common bug is running the same fetch every render — effects need dependency arrays.\n\nWhen you write useEffect(fn, []), it runs once after mount. With dependencies, it re-runs only when they change. Cleanup functions cancel timers, remove listeners, or abort in-flight requests so you don't leak memory.\n\nBetter still, prefer data fetching libraries or framework loaders (like Next.js server fetching) that remove the need for client effects entirely.",
        checklist: [
          "List every external value useEffect reads in its dependency array",
          "Return a cleanup function for subscriptions and timers",
          "Derive values directly in render instead of storing them in state",
          "Batch related state into one object when it changes together",
        ],
        quiz: {
          question: "When does a useEffect with an empty dependency array run?",
          options: ["After every render", "Only after the first mount", "Only when the page URL changes", "Before the component renders"],
          answerIndex: 1,
          explanation: "An empty dependency array registers the effect to run exactly once, after the component mounts.",
        },
      },
      {
        id: "u3",
        title: "Next.js App Router: Routes and Data",
        minutes: 65,
        content:
          "The Next.js App Router uses the file system for routing: app/jobs/page.tsx is /jobs and app/jobs/[id]/page.tsx is /jobs/:id. Layouts wrap child pages and persist across navigation.\n\nPages can be server components (default) that fetch directly, or client components ('use client') that use hooks. Prefer fetching on the server so data is ready before the page paints, and pass the result down as props.\n\nDynamic routes read their params with useParams() on the client or as a prop in server pages. Forms and mutations use server actions or API routes. Remember loading.tsx for suspense fallbacks and error.tsx for graceful failures.",
        checklist: [
          "Create routes with folders named after the URL segment",
          "Fetch on the server whenever the data is not interactive-specific",
          "Use dynamic segments ([id]) for detail pages",
          "Add loading and error boundaries for routed pages",
        ],
        quiz: {
          question: "Where do server components in the App Router fetch their data?",
          options: ["In useEffect on the client", "Directly inside the component before render", "In the browser console", "In a global mutable store"],
          answerIndex: 1,
          explanation: "Server components run on the server and can await data directly before the JSX is sent to the client.",
        },
      },
    ],
    externalResources: [
      { id: "r1", title: "React Quick Start", url: "https://react.dev/learn", type: "documentation" },
      { id: "r2", title: "Next.js Learn", url: "https://nextjs.org/learn", type: "tutorial" },
      { id: "r3", title: "React Patterns (roadmap.sh)", url: "https://roadmap.sh/react", type: "article" },
    ],
  },
  {
    id: "train-typescript",
    slug: "typescript",
    skill: "TypeScript",
    title: "TypeScript: Safe JavaScript at Scale",
    subtitle: "Types, generics, and everyday productivity",
    description:
      "TypeScript adds static types on top of JavaScript so errors surface at compile time instead of production. This module covers structural typing, unions, generics, and practical patterns for daily work.",
    level: "beginner",
    estimatedMinutes: 120,
    relatedSkills: ["TypeScript", "JavaScript", "Node.js"],
    tags: ["language", "types", "compiler"],
    units: [
      {
        id: "u1",
        title: "Core Types and Inference",
        minutes: 35,
        content:
          "TypeScript infers types from your code, and you annotate where helpful. The core types are string, number, boolean, arrays (T[]), objects (interfaces), functions, null/undefined, and any.\n\nPrefer explicit interfaces for shapes passed across module boundaries. Use union types to model choices (type Status = 'draft' | 'published' | 'closed') and literal types to constrain values. Avoid any in production code — unknown is the safe alternative when you truly don't know the shape.",
        checklist: [
          "Annotate function parameters and return types",
          "Model finite options with string literal unions",
          "Use unknown instead of any for untyped data",
          "Run tsc --noEmit in CI for every change",
        ],
        quiz: {
          question: "Which type is the safe version of 'any' for data you don't trust yet?",
          options: ["unknown", "object", "never", "void"],
          answerIndex: 0,
          explanation: "unknown forces you to narrow before use, while any disables checking entirely.",
        },
      },
      {
        id: "u2",
        title: "Interfaces, Unions, and Narrowing",
        minutes: 45,
        content:
          "Interfaces describe object shapes and can extend each other. Unions let a value be one of several types, and narrowing (typeof, instanceof, discriminated unions) refines the type inside if-branches.\n\nDiscriminated unions use a shared literal field (kind: 'job' | 'applicant') so TypeScript narrows automatically after a switch. This pattern is used across the IntoreAI API for applicants, submissions, and notifications.",
        checklist: [
          "Extend interfaces instead of duplicating fields",
          "Use discriminated unions with a literal tag field",
          "Narrow before accessing type-specific fields",
          "Keep types in one shared package for front and back end",
        ],
        quiz: {
          question: "What field makes a discriminated union easy to narrow automatically?",
          options: ["A brand-new unique symbol per branch", "A shared literal field like kind", "A boolean flag", "An optional id"],
          answerIndex: 1,
          explanation: "A shared literal tag (kind) is how TypeScript collapses all branches to the one you matched.",
        },
      },
      {
        id: "u3",
        title: "Generics and Utility Types",
        minutes: 40,
        content:
          "Generics parameterize types over other types: function identity<T>(value: T): T. They let you write reusable collections and helpers without losing type safety.\n\nUtility types cover the common transformations: Partial<T> makes fields optional, Pick<T,K> selects a subset, Omit<T,K> removes fields, and Record<K,V> builds object maps. Readonly<T> prevents mutation. Combine them with interfaces to derive API request/response types from a single source of truth.",
        checklist: [
          "Write one generic function instead of copying for each type",
          "Use Pick and Omit to derive smaller types from larger ones",
          "Use Partial for patch-style update payloads",
          "Use Record for dynamic maps with a fixed key set",
        ],
        quiz: {
          question: "Which utility type makes every field of an object optional?",
          options: ["Optional<T>", "Partial<T>", "Nullable<T>", "Loose<T>"],
          answerIndex: 1,
          explanation: "Partial<T> maps every property to an optional one, ideal for update payloads.",
        },
      },
    ],
    externalResources: [
      { id: "r1", title: "TypeScript Handbook", url: "https://www.typescriptlang.org/docs/handbook/intro.html", type: "documentation" },
      { id: "r2", title: "TypeScript Playground", url: "https://www.typescriptlang.org/play", type: "example" },
      { id: "r3", title: "TypeScript Deep Dive (chapters)", url: "https://basarat.gitbook.io/typescript", type: "tutorial" },
    ],
  },
  {
    id: "train-nodejs",
    slug: "nodejs-apis",
    skill: "Node.js",
    title: "Node.js & REST API Design",
    subtitle: "Servers, routing, validation, and testing",
    description:
      "Build production Node.js APIs: request handling, JSON routing, auth, validation, and testing. Everything you need to ship the backend behind a job platform like this one.",
    level: "intermediate",
    estimatedMinutes: 150,
    relatedSkills: ["Node.js", "JavaScript", "TypeScript", "REST API", "Express", "REST APIs"],
    tags: ["backend", "api", "server"],
    units: [
      {
        id: "u1",
        title: "HTTP Servers and Routing",
        minutes: 40,
        content:
          "A Node server listens for requests and routes them by method and path. With no framework, you parse the URL, split segments, and match handlers — exactly how the IntoreAI API is built (node:http). Frameworks like Express or Fastify wrap this in nicer ergonomics.\n\nRoute design basics: keep resources plural (/jobs, /applications), use :id segments for individual items, and match REST verbs to actions (GET read, POST create, PUT update, DELETE remove). Return meaningful status codes: 200/201/204, 400 for bad input, 401 unauth, 403 forbidden, 404 not found, 409 conflicts.",
        checklist: [
          "Map each action to a REST method and path",
          "Set proper status codes for success and errors",
          "Use consistent JSON error shape ({ error })",
          "Split route handlers into small functions",
        ],
        quiz: {
          question: "Which status code should an API return for a duplicate application submission?",
          options: ["200 OK", "409 Conflict", "500 Server Error", "302 Found"],
          answerIndex: 1,
          explanation: "409 Conflict signals the resource already exists or is in a conflicting state.",
        },
      },
      {
        id: "u2",
        title: "Validation and Auth",
        minutes: 50,
        content:
          "Never trust the client. Validate every payload: required fields, length limits, allowed values, and types. Reject early with a 400 and a clear message.\n\nAuth in this stack uses a JWT Bearer token (HS256). The server signs a token at login, the client sends Authorization: Bearer <token>, and every protected route verifies it before responding. Passwords are salted and hashed before storage — never store plaintext.\n\nSeparate identity (who you are) from authorization (what you can do): recruiters can create jobs, applicants can apply. Enforce role checks on each route.",
        checklist: [
          "Validate inputs before touching storage",
          "Hash passwords with salt before saving",
          "Verify the JWT on every protected route",
          "Enforce role checks server-side, not just in the UI",
        ],
        quiz: {
          question: "Where should role checks like 'recruiters only' be enforced?",
          options: ["In the browser buttons", "On the server per route", "In the database schema only", "In CSS classes"],
          answerIndex: 1,
          explanation: "Client checks are cosmetic. Real enforcement must happen on the server for every request.",
        },
      },
      {
        id: "u3",
        title: "Persisting Data (Mongo + In-Memory)",
        minutes: 60,
        content:
          "Repositories hide storage behind interfaces so the same service works with MongoDB and an in-memory Map. Each repo exposes create/find/update/delete. In-memory storage is perfect for demos and tests; MongoDB scales to real data.\n\nKeep storage logic out of route handlers. A handler should parse input, call a repo method, and write the response. This keeps the API testable and the data layer swappable.",
        checklist: [
          "Define repository interfaces for every entity",
          "Swap storage behind the interface without touching routes",
          "Make all repo methods asynchronous",
          "Never expose raw passwords or hashes in responses",
        ],
        quiz: {
          question: "What is the main benefit of a repository interface?",
          options: ["It runs faster", "Storage is swappable without changing callers", "It removes the need for validation", "It generates the database automatically"],
          answerIndex: 1,
          explanation: "Interfaces decouple services from storage, so you can swap in-memory for MongoDB without rewriting callers.",
        },
      },
    ],
    externalResources: [
      { id: "r1", title: "Node.js Docs", url: "https://nodejs.org/en/docs", type: "documentation" },
      { id: "r2", title: "Express Getting Started", url: "https://expressjs.com/en/starter/installing.html", type: "tutorial" },
      { id: "r3", title: "REST API Best Practices", url: "https://github.com/microsoft/api-guidelines", type: "article" },
    ],
  },
  {
    id: "train-python",
    slug: "python",
    skill: "Python",
    title: "Python Foundations",
    subtitle: "Syntax, data structures, and scripting",
    description:
      "Python is the lingua franca of data, AI, and automation in the region. Learn the fundamentals: data structures, functions, files, and writing clean scripts.",
    level: "beginner",
    estimatedMinutes: 120,
    relatedSkills: ["Python", "Data Analysis", "Automation", "Scripting"],
    tags: ["language", "data", "automation"],
    units: [
      {
        id: "u1",
        title: "Basics and Data Structures",
        minutes: 40,
        content:
          "Python reads almost like pseudocode. Variables, if/else, for and while loops, and functions (def) are the building blocks. Indentation defines blocks — keep it consistent (4 spaces).\n\nBuilt-in structures: list (ordered, mutable), tuple (ordered, immutable), dict (key: value map), and set (unique values). List comprehensions build lists in one expressive line. Strings support slicing and formatting with f-strings.",
        checklist: [
          "Choose the right structure: list, dict, set, tuple",
          "Use f-strings for readable output",
          "Write functions for repeated logic",
          "Keep indentation consistent",
        ],
        quiz: {
          question: "Which built-in type maps unique keys to values?",
          options: ["list", "dict", "set", "tuple"],
          answerIndex: 1,
          explanation: "A dict stores key/value pairs, like a lookup table.",
        },
      },
      {
        id: "u2",
        title: "Files, Error Handling, and Modules",
        minutes: 45,
        content:
          "Read and write files with built-in open() and the with context manager, which closes files automatically. Wrap risky operations in try/except to fail gracefully.\n\nOrganize code by importing modules. A Python file is a module; a folder with __init__.py is a package. Use if __name__ == '__main__' to guard script entry points so imported helpers don't run on import.",
        checklist: [
          "Use with open(...) for file I/O",
          "Catch specific exceptions, not bare except",
          "Split logic into importable modules",
          "Guard entry points with if __name__ == '__main__'",
        ],
        quiz: {
          question: "Why use 'with open(...)' for reading files?",
          options: ["It reads faster", "It closes the file automatically", "It compresses data", "It prevents read-only files"],
          answerIndex: 1,
          explanation: "Context managers guarantee cleanup—files close even when an error interrupts the block.",
        },
      },
      {
        id: "u3",
        title: "Virtual Environments and Dependencies",
        minutes: 35,
        content:
          "Every project gets its own environment. python -m venv .venv creates one; activate it, then pip install packages. requirements.txt pins dependencies so another machine can reproduce your setup exactly.\n\nFor data work, pandas, numpy, and matplotlib are the standard trio. Install them into the venv, never globally. The IntoreAI resume parser is a Python service (FastAPI) that runs a local model — a real-world example of Python behind an API.",
        checklist: [
          "Create a venv per project",
          "Pin dependencies in requirements.txt",
          "Keep data libraries (pandas/numpy) in the venv",
          "Record how to run the project in a README",
        ],
        quiz: {
          question: "What is the purpose of requirements.txt?",
          options: ["Marketing notes", "Reproducible dependency list", "Compiled bytecode", "Test logs"],
          answerIndex: 1,
          explanation: "It lists exact packages so anyone can rebuild the same environment.",
        },
      },
    ],
    externalResources: [
      { id: "r1", title: "Python Official Tutorial", url: "https://docs.python.org/3/tutorial/", type: "tutorial" },
      { id: "r2", title: "Real Python", url: "https://realpython.com/", type: "article" },
      { id: "r3", title: "freeCodeCamp Python", url: "https://www.freecodecamp.org/learn/scientific-computing-with-python/", type: "tutorial" },
    ],
  },
  {
    id: "train-sql",
    slug: "sql-databases",
    skill: "SQL",
    title: "SQL & Data Modeling",
    subtitle: "Queries that write themselves once you know the shape",
    description:
      "Query relational databases with confidence: SELECTs, joins, aggregates, indexes, and modeling normal forms that every data-driven role expects.",
    level: "intermediate",
    estimatedMinutes: 140,
    relatedSkills: ["SQL", "PostgreSQL", "MySQL", "Databases", "MongoDB"],
    tags: ["database", "query", "analytics"],
    units: [
      {
        id: "u1",
        title: "SELECT, WHERE, ORDER BY, LIMIT",
        minutes: 35,
        content:
          "Every SQL query starts with SELECT: which columns, FROM which table, WHERE filters rows, ORDER BY sorts, and LIMIT caps results. Read queries out loud: 'Select name and score from candidates, where score is at least 70, ordered by score descending, limit 10.'\n\nString filters use LIKE with % wildcards. Deduplicate with DISTINCT. Alias columns with AS for cleaner output.",
        checklist: [
          "Always specify columns after SELECT",
          "Filter with WHERE before sorting",
          "Use DESC/ASC explicitly with ORDER BY",
          "Limit exploration queries",
        ],
        quiz: {
          question: "Which keyword removes duplicate rows from a result set?",
          options: ["UNIQUE", "DISTINCT", "GROUP", "ONLY"],
          answerIndex: 1,
          explanation: "SELECT DISTINCT returns one row per unique combination.",
        },
      },
      {
        id: "u2",
        title: "Joins and Aggregation",
        minutes: 50,
        content:
          "Relations connect through foreign keys. INNER JOIN returns only matches, LEFT JOIN keeps all left-side rows. Then GROUP BY folds rows together while aggregate functions (COUNT, SUM, AVG, MIN, MAX) summarize each group. HAVING filters groups after grouping — WHERE cannot reference aggregates.",
        checklist: [
          "Match join keys to their foreign-key relationships",
          "Choose INNER vs LEFT join deliberately",
          "Aggregate the right grain before joining",
          "Filter grouped results with HAVING",
        ],
        quiz: {
          question: "Why use HAVING instead of WHERE for a condition on COUNT(*)?",
          options: ["It runs faster always", "WHERE can't filter aggregates", "HAVING sorts first", "It removes duplicates"],
          answerIndex: 1,
          explanation: "WHERE filters rows before grouping; aggregate conditions must go in HAVING.",
        },
      },
      {
        id: "u3",
        title: "Indexes and Performance Basics",
        minutes: 55,
        content:
          "Indexes are lookup structures on columns that appear in WHERE/JOIN/ORDER. They speed reads but slow writes and take space, so index what your queries actually filter on.\n\nEXPLAIN shows the query plan. Watch for full table scans on large tables, and add indexes on foreign keys used in joins. Avoid SELECT * for wide tables and avoid wrapping indexed columns in functions (WHERE year(created_at) = 2026) because the index can't be used.",
        checklist: [
          "Index foreign keys and frequent filter columns",
          "Use EXPLAIN to inspect query plans",
          "Don't wrap indexed columns in functions in WHERE",
          "Measure before adding exotic indexes",
        ],
        quiz: {
          question: "What happens when you call a function on an indexed column in WHERE?",
          options: ["The index speeds it up further", "The query errors", "The index may not be usable", "It duplicates rows"],
          answerIndex: 2,
          explanation: "Transforming the column hides it from the index, often forcing a full scan.",
        },
      },
    ],
    externalResources: [
      { id: "r1", title: "W3Schools SQL", url: "https://www.w3schools.com/sql/", type: "tutorial" },
      { id: "r2", title: "PostgreSQL Exercises", url: "https://pgexercises.com/", type: "tutorial" },
      { id: "r3", title: "SQL Style Guide", url: "https://www.sqlstyle.guide/", type: "article" },
    ],
  },
  {
    id: "train-data-analysis",
    slug: "data-analysis",
    skill: "Data Analysis",
    title: "Data Analysis & Visualization",
    subtitle: "From raw tables to decisions people trust",
    description:
      "Clean, explore, and visualize data with pandas and basic statistics. Build dashboards and tell a story that hiring managers for data roles actually check.",
    level: "intermediate",
    estimatedMinutes: 160,
    relatedSkills: ["Data Analysis", "Python", "SQL", "Excel", "Power BI", "pandas"],
    tags: ["data", "analytics", "statistics"],
    units: [
      {
        id: "u1",
        title: "Cleaning Data with pandas",
        minutes: 50,
        content:
          "Real data is messy: missing values (NaN), duplicates, inconsistent formats. The pandas workflow: load with read_csv, inspect with head() and info(), drop or fill missing values with dropna()/fillna(), deduplicate, and normalize strings and dates.\n\nAlways keep a notebook trail of transforms so numbers are reproducible. Document every assumption you make while cleaning.",
        checklist: [
          "Inspect data shape and dtypes first",
          "Decide explicitly: drop, fill, or flag missing values",
          "Deduplicate before aggregating",
          "Reproduce the pipe with a recorded script",
        ],
        quiz: {
          question: "What does df.fillna(0) do?",
          options: ["Deletes all rows with zeros", "Replaces missing values with 0", "Fills the dataset with zeros", "Rounds to zero decimals"],
          answerIndex: 1,
          explanation: "fillna replaces NaN entries with the provided value (0 here).",
        },
      },
      {
        id: "u2",
        title: "Grouping and Pivot Basics",
        minutes: 55,
        content:
          "groupby is the pandas engine room: split data by categories, apply aggregation, combine results. groupby('department')['salary'].mean() gives one summary per department.\n\nPivot tables reshape data between long and wide forms—useful when colleagues (or Power BI) need a cross-tab. Always label units and round cleverly: means without context mislead.",
        checklist: [
          "Group the exact grain you need",
          "Aggregate with the statistic that answers the question",
          "Use pivot for readable cross-tabs",
          "Add units and context to every number",
        ],
        quiz: {
          question: "What does df.groupby('team')['score'].count() return?",
          options: ["Sum of scores per team", "Row count per team", "Mean score per player", "Unique teams"],
          answerIndex: 1,
          explanation: "count() aggregates the number of non-null entries in the score column per team.",
        },
      },
      {
        id: "u3",
        title: "Visualization that Communicates",
        minutes: 55,
        content:
          "The chart must answer the question. Trends: line charts. Comparisons: bars. Composition: stacked bars or pie (small slices only). Distribution: histograms and box plots. Relationships: scatter.\n\nLabel axes, title the chart with the takeaway, and never rely on 3D. Choose color purposefully and keep the chart honest about scale—truncated y-axes distort.",
        checklist: [
          "Match chart type to the message",
          "Title every figure with its conclusion",
          "Label axes with units",
          "Keep dimensions and colors minimal",
        ],
        quiz: {
          question: "Which chart best shows the distribution of a single variable?",
          options: ["Pie chart", "Histogram", "Scatter plot", "Waterfall"],
          answerIndex: 1,
          explanation: "Histograms bin one variable and reveal shape, spread, and outliers.",
        },
      },
    ],
    externalResources: [
      { id: "r1", title: "pandas Getting Started", url: "https://pandas.pydata.org/docs/getting_started/index.html", type: "documentation" },
      { id: "r2", title: "Kaggle Learn: Python & Data", url: "https://www.kaggle.com/learn", type: "tutorial" },
      { id: "r3", title: "Charting principles (data-to-viz)", url: "https://www.data-to-viz.com/", type: "article" },
    ],
  },
  {
    id: "train-ml",
    slug: "machine-learning",
    skill: "Machine Learning",
    title: "Machine Learning End to End",
    subtitle: "Data prep, models, evaluation, and deployment",
    description:
      "Ship your first models: clean features, train classic algorithms, evaluate honestly, and wrap them in an API. Built for engineers moving from scripts to real ML products.",
    level: "advanced",
    estimatedMinutes: 180,
    relatedSkills: ["Machine Learning", "Python", "scikit-learn", "TensorFlow", "AI"],
    tags: ["ai", "models", "data science"],
    units: [
      {
        id: "u1",
        title: "Features and Baseline",
        minutes: 55,
        content:
          "Models learn from features: engineered inputs. Start with a sane baseline (majority class, simple heuristic) before training anything fancy — it sets the bar you must beat.\n\nSplit data into train and test (ideally train/validation/test). Scale numeric features (StandardScaler) and encode categories. Leakage—test information slipping into training—is the classic silent bug.",
        checklist: [
          "Build a trivial baseline before modeling",
          "Split data before any preprocessing fit",
          "Encode and scale features systematically",
          "Watch for leakage across the split",
        ],
        quiz: {
          question: "Why build a trivial baseline model first?",
          options: ["It wins every competition", "It defines the performance you must beat", "It replaces feature engineering", "It removes the need for testing"],
          answerIndex: 1,
          explanation: "A baseline quantifies how much real modeling adds over a dumb rule.",
        },
      },
      {
        id: "u2",
        title: "Classic Models and Evaluation",
        minutes: 60,
        content:
          "Linear models (regression/logistic), trees (decision, random forest, gradient boosting like XGBoost) cover most tabular problems. Evaluate classification with accuracy, precision, recall, F1, and ROC; regression with MAE/RMSE. Accuracy lies on imbalanced data—precision and recall tell the real story.\n\nUse cross-validation to estimate how the model generalizes, and always compare against your baseline.",
        checklist: [
          "Tune one model family before combining ensembles",
          "Read precision and recall, not just accuracy",
          "Cross-validate to estimate generalization",
          "Compare every model to the baseline",
        ],
        quiz: {
          question: "Why is accuracy misleading for rare-class problems?",
          options: ["It is always 99%", "Always-predict-majority can score high", "It measures only speed", "It ignores evaluation time"],
          answerIndex: 1,
          explanation: "When one class dominates, guessing the majority class yields high accuracy despite poor real performance.",
        },
      },
      {
        id: "u3",
        title: "Serving a Model Behind an API",
        minutes: 65,
        content:
          "Export a trained model (joblib for scikit-learn, a saved TensorFlow model), load it in a small web service, and predict on request. Preprocess input exactly like training: same encoding, same scaling.\n\nLog predictions and request shapes to catch drift. Keep a version tag on models so you can roll back. The IntoreAI resume parser does exactly this: a Python FastAPI service hosting a local Qwen model.",
        checklist: [
          "Persist preprocessing with the model",
          "Version models and data together",
          "Log service predictions for monitoring",
          "Gracefully handle malformed inputs",
        ],
        quiz: {
          question: "What must a serving pipeline replicate from training?",
          options: ["Only the model weights", "The exact preprocessing transforms", "The training computer", "The dataset size"],
          answerIndex: 1,
          explanation: "If encoding or scaling differs, predictions silently degrade.",
        },
      },
    ],
    externalResources: [
      { id: "r1", title: "scikit-learn User Guide", url: "https://scikit-learn.org/stable/user_guide.html", type: "documentation" },
      { id: "r2", title: "Fast.ai Practical Deep Learning", url: "https://course.fast.ai/", type: "tutorial" },
      { id: "r3", title: "Machine Learning Crash Course", url: "https://developers.google.com/machine-learning/crash-course", type: "tutorial" },
    ],
  },
  {
    id: "train-devops",
    slug: "devops-docker",
    skill: "DevOps",
    title: "DevOps: Docker, CI/CD & Cloud",
    subtitle: "Containers, pipelines, and deployments that ship",
    description:
      "Package apps in containers, automate builds, and deploy safely. The practical skills behind modern infrastructure roles.",
    level: "advanced",
    estimatedMinutes: 170,
    relatedSkills: ["DevOps", "Docker", "CI/CD", "Kubernetes", "AWS", "Linux"],
    tags: ["infrastructure", "containers", "pipelines"],
    units: [
      {
        id: "u1",
        title: "Containers with Docker",
        minutes: 55,
        content:
          "A Dockerfile describes an image: base, deps, source, command. Build once, run anywhere. Images are layered; every line is a cache layer, so order matters (deps before code = fast rebuilds).\n\nRun with -p to publish ports, -v to mount volumes, and --name to label. Use .dockerignore to keep secrets and node_modules out. Multi-stage builds (builder → slim runtime) shrink images dramatically.",
        checklist: [
          "Order Dockerfile steps for cache efficiency",
          "Add a .dockerignore file",
          "Avoid running as root in containers",
          "Pin base image versions",
        ],
        quiz: {
          question: "Why put dependency installs before copying source code in a Dockerfile?",
          options: ["It produces smaller files", "Layer caching makes rebuilds faster", "It prevents security scans", "It is required syntax"],
          answerIndex: 1,
          explanation: "If the source layer changes but deps don't, the deps layer stays cached and the build is fast.",
        },
      },
      {
        id: "u2",
        title: "CI/CD Pipelines",
        minutes: 60,
        content:
          "Continuous integration runs checks on every push: lint, typecheck, tests, build. Continuous deployment releases automatically to staging, then optionally production. Pipelines are code (GitHub Actions YAML, GitLab CI) so changes are reviewed like application code.\n\nDesign: one pipeline per repo; jobs with clear steps and caches; secrets from the platform vault, never hardcoded; gate deploys on green tests. Rollbacks are just redeploying the previous artifact.",
        checklist: [
          "Run typecheck and tests on every PR",
          "Store credentials in secret vaults only",
          "Cache dependencies between runs",
          "Make deploys reproducible from one artifact",
        ],
        quiz: {
          question: "Where should pipeline secrets live?",
          options: ["In the repository README", "In the platform's secret storage", "In test files", "In the image registry name"],
          answerIndex: 1,
          explanation: "Secrets belong in vaults rotated per environment, never in code or logs.",
        },
      },
      {
        id: "u3",
        title: "Monitoring and Safe Deploys",
        minutes: 55,
        content:
          "Observe before optimizing: logs (structured JSON), metrics (error rate, latency, memory), and health endpoints (/health checks that the service reports). Heal the system: a load balancer probes health endpoints and routes away from failing replicas.\n\nDeploy incrementally: blue/green switches traffic, canary rolls out to a small percentage, feature flags decouple release from deploy. Alert on symptoms (error rate), not causes.",
        checklist: [
          "Expose and probe a health endpoint",
          "Log structured JSON with request ids",
          "Use blue/green or canary deploys",
          "Alert on user-visible symptoms",
        ],
        quiz: {
          question: "What does a health check endpoint let load balancers do?",
          options: ["Serve static assets", "Route traffic away from failing instances", "Compress responses", "Schedule cron jobs"],
          answerIndex: 1,
          explanation: "Health probes let balancers detect dead replicas and stop sending them traffic.",
        },
      },
    ],
    externalResources: [
      { id: "r1", title: "Docker Docs", url: "https://docs.docker.com/get-started/", type: "documentation" },
      { id: "r2", title: "GitHub Actions Docs", url: "https://docs.github.com/en/actions", type: "documentation" },
      { id: "r3", title: "roadmap.sh DevOps", url: "https://roadmap.sh/devops", type: "article" },
    ],
  },
  {
    id: "train-uiux",
    slug: "ui-ux-design",
    skill: "UI/UX Design",
    title: "UI/UX Design Thinking",
    subtitle: "From problem to polished interface",
    description:
      "Design products people actually use: research, wireframes, prototypes, and a UI that respects accessibility. No drawing skill required to start.",
    level: "beginner",
    estimatedMinutes: 150,
    relatedSkills: ["UI/UX", "Figma", "Design", "Research", "Prototyping"],
    tags: ["design", "ux", "figma"],
    units: [
      {
        id: "u1",
        title: "Problem Framing and Research",
        minutes: 50,
        content:
          "Design starts before pixels. Define the user, the task, and the success metric. Interview 3-5 real users and listen for friction. Build a journey map to spot pain points.\n\nState the problem as a sentence: 'Applicants cannot tell if they match a job.' Then the solution targets that sentence. Write a quick usability test script and observe one user before you build anything.",
        checklist: [
          "Write a one-sentence problem statement",
          "Interview real or representative users",
          "Map the user journey and pain points",
          "Test one prototype with one user early",
        ],
        quiz: {
          question: "What should a problem statement focus on?",
          options: ["The coolest feature", "A specific user need", "The tech stack", "Competitor logos"],
          answerIndex: 1,
          explanation: "A good problem statement names a concrete user need you will design against.",
        },
      },
      {
        id: "u2",
        title: "Wireframes and Prototypes",
        minutes: 55,
        content:
          "Sketch low-fidelity wireframes to agree on structure before visuals. Turn them into clickable prototypes in Figma to test flow. Keep interactions chosen deliberately, not decorative.\n\nDesign the happy path fully (apply → done), then the edge cases (empty states, errors, slow internet). Prototypes are for learning, not pixel-perfection.",
        checklist: [
          "Wireframe flows before styling them",
          "Prototype the happy path first",
          "Design empty and error states too",
          "Validate the prototype with a user",
        ],
        quiz: {
          question: "Why prototype before full visual design?",
          options: ["To test interactions cheaply", "It replaces development", "To bill more hours", "It is mandatory branding"],
          answerIndex: 0,
          explanation: "Cheap clickable prototypes surface flow problems before heavy visual work.",
        },
      },
      {
        id: "u3",
        title: "Visual System and Accessibility",
        minutes: 45,
        content:
          "One design language: tokens for color, spacing, and type; consistent components; a clear hierarchy. Build with contrast: body text at least 4.5:1 against background. Support keyboard navigation and screen readers (labels, alt text, focus states).\n\nDesign responsive layouts from small screens up. Limit the palette: a primary, a neutral scale, and one accent. Typography: max 2-3 families, readable sizes (16px base), generous line height.",
        checklist: [
          "Define tokens for color, space, and type",
          "Meet WCAG contrast thresholds",
          "Ensure full keyboard operability",
          "Design mobile-first",
        ],
        quiz: {
          question: "What contrast ratio should body text meet (WCAG AA)?",
          options: ["1.5:1", "3:1", "4.5:1", "10:1"],
          answerIndex: 2,
          explanation: "Normal body text needs at least 4.5:1 contrast to be readable.",
        },
      },
    ],
    externalResources: [
      { id: "r1", title: "Figma Learn", url: "https://help.figma.com/hc/en-us/categories/1500008574413", type: "tutorial" },
      { id: "r2", title: "Nielsen Norman Group", url: "https://www.nngroup.com/articles/", type: "article" },
      { id: "r3", title: "WCAG 2.2 Guidelines", url: "https://www.w3.org/WAI/WCAG22/quickref/", type: "documentation" },
    ],
  },
  {
    id: "train-product",
    slug: "product-management",
    skill: "Product Management",
    title: "Product Management Basics",
    subtitle: "Priorities, specs, and working with engineers",
    description:
      "Understanding how good products get shipped: outcomes, roadmaps, specs, and communication with the teams that build them.",
    level: "intermediate",
    estimatedMinutes: 140,
    relatedSkills: ["Product Management", "Agile", "Roadmapping", "Prioritization"],
    tags: ["product", "roadmap", "agile"],
    units: [
      {
        id: "u1",
        title: "Outcomes over Output",
        minutes: 45,
        content:
          "Features are outputs; outcomes are changes in user or business metrics you can measure. Before scoping a feature, write the outcome: 'reduce time-to-apply by 30%' beats 'build a new form'.\n\nDefine success metrics that move if the feature works, baseline them, and revisit after launch. Say no by tying decisions to those metrics, not to opinions.",
        checklist: [
          "Write the outcome before the feature",
          "Define measurable success metrics",
          "Baseline metrics before shipping",
          "Use metrics to justify scope choices",
        ],
        quiz: {
          question: "Which framing is an outcome?",
          options: ["Add a dark mode toggle", "Cut support tickets per user by 20%", "Build a settings page", "Use the new icon library"],
          answerIndex: 1,
          explanation: "Outcomes describe measurable user/business change; the others are outputs.",
        },
      },
      {
        id: "u2",
        title: "Roadmaps and Prioritization",
        minutes: 50,
        content:
          "A roadmap communicates what you will tackle and why. Prioritize with impact vs. effort: quick wins (high impact, low effort) go soon; big bets get scheduled. Use frameworks like RICE (Reach, Impact, Confidence, Effort) to defuse arguments with numbers.\n\nKeep the roadmap to themes and goals rather than a long feature wishlist, and revisit every quarter. Ties to strategy are the tool for saying no.",
        checklist: [
          "Prioritize with an explicit framework",
          "Keep roadmap focused on goals and themes",
          "Revisit priorities after every launch",
          "Say no with evidence, not energy",
        ],
        quiz: {
          question: "What does RICE stand for?",
          options: ["Risk, Investment, Cost, Effort", "Reach, Impact, Confidence, Effort", "Rate, Iterate, Calibrate, Evaluate", "Request, Implement, Check, Export"],
          answerIndex: 1,
          explanation: "RICE scores each candidate feature for prioritization debates.",
        },
      },
      {
        id: "u3",
        title: "Working with Engineers",
        minutes: 45,
        content:
          "Write specs that answer the why and the boundaries: the problem, the user, acceptance criteria, edge cases, and explicitly what is out of scope. Then let engineers drive the how.\n\nTrust the estimates: slice work small, demo frequently, and treat deadlines as estimates that sharpen with data. When engineers flag risk, resolve it together rather than pushing scope. Celebrate shipped value, not shipped code.",
        checklist: [
          "Write specs with acceptance criteria and out-of-scope",
          "Discuss the why, let engineers own the how",
          "Slice work into small shippable pieces",
          "Resolve technical risk together",
        ],
        quiz: {
          question: "What belongs in a good spec?",
          options: ["The exact implementation code", "Problem, acceptance criteria, edge cases, out-of-scope", "The engineer's full-time plan", "Screenshots of competitors only"],
          answerIndex: 1,
          explanation: "Specs define the why and the boundaries, leaving the how open to the team.",
        },
      },
    ],
    externalResources: [
      { id: "r1", title: "Product Management (Lenny's Newsletter)", url: "https://www.lennysnewsletter.com/", type: "article" },
      { id: "r2", title: "intercom on Product", url: "https://www.intercom.com/blog/product/", type: "article" },
      { id: "r3", title: "RICE prioritization (Intercom)", url: "https://www.intercom.com/blog/rice-simple-prioritization-for-product-managers/", type: "article" },
    ],
  },
  {
    id: "train-react-native",
    slug: "react-native",
    skill: "React Native",
    title: "React Native & Mobile UX",
    subtitle: "Ship real mobile apps from React skills",
    description:
      "Use your React knowledge to build iOS and Android apps: navigation, lists, styling, and talking to APIs. Mobile-first is a core ask across East African product teams.",
    level: "intermediate",
    estimatedMinutes: 150,
    relatedSkills: ["React Native", "React", "Mobile", "Expo", "JavaScript"],
    tags: ["mobile", "react", "cross-platform"],
    units: [
      {
        id: "u1",
        title: "Components Without the DOM",
        minutes: 45,
        content:
          "React Native replaces HTML tags with native components: View, Text, TextInput, Pressable, FlatList, ScrollView. There is no web DOM — styling uses inline objects (StyleSheet.create) and flexbox.\n\nLayout is flexbox by default (column). Remember padding/margin, resizeMode on images, and that many web libraries don't exist here. Your shared state hooks still work exactly as in React.",
        checklist: [
          "Use native components instead of div/span",
          "Style with StyleSheet and flexbox",
          "Use FlatList for long lists",
          "Reuse hook and data logic from React",
        ],
        quiz: {
          question: "Which component renders a scrolling long list efficiently?",
          options: ["View", "FlatList", "ScrollView", "Text"],
          answerIndex: 1,
          explanation: "FlatList renders only visible rows and reuses components.",
        },
      },
      {
        id: "u2",
        title: "Navigation and State",
        minutes: 55,
        content:
          "Expo Router or React Navigation handles screens: stacks push/pop, tabs switch sections, and params carry arguments between screens. Async logic lives in hooks, and global state uses Context or a library like Zustand.\n\nHandle loading and error states in every screen: show a spinner, an empty state, and a retry action. Keep business logic in reusable hooks independent of the screen.",
        checklist: [
          "Model screens as stack or tabs deliberately",
          "Pass small params between routes",
          "Add loading, empty, and error states",
          "Extract logic into custom hooks",
        ],
        quiz: {
          question: "What do screen params carry between routes?",
          options: ["Compiled code", "Small arguments like ids", "The whole database", "CSS classes"],
          answerIndex: 1,
          explanation: "Params pass ids and small values; fetch the rest by id on the target screen.",
        },
      },
      {
        id: "u3",
        title: "Talking to APIs and Offline",
        minutes: 50,
        content:
          "Fetch JSON from your backend with the same fetch/Axios you use on web. Add error handling, timeouts, and a base URL per environment. For rough networks—the norm across the region—cache recently loaded data so screens work offline.\n\nPull-to-refresh, retry buttons, and optimistic updates make apps feel trustworthy. Respect the platform: permissions, back behavior, and touch targets of at least 44px.",
        checklist: [
          "Centralize the API base URL and token handling",
          "Add offline caching for key screens",
          "Build retry and refresh into every fetch",
          "Keep touch targets and platform habits in mind",
        ],
        quiz: {
          question: "Why is offline caching important for mobile apps?",
          options: ["It looks modern", "Poor connections are common", "It removes the backend need", "It improves code style"],
          answerIndex: 1,
          explanation: "Caching keeps apps usable on flaky networks, which is common for mobile users.",
        },
      },
    ],
    externalResources: [
      { id: "r1", title: "React Native Docs", url: "https://reactnative.dev/docs/getting-started", type: "documentation" },
      { id: "r2", title: "Expo Docs", url: "https://docs.expo.dev/", type: "documentation" },
      { id: "r3", title: "React Navigation", url: "https://reactnavigation.org/docs/getting-started/", type: "tutorial" },
    ],
  },
  {
    id: "train-qa",
    slug: "qa-automation",
    skill: "QA",
    title: "QA & Test Automation",
    subtitle: "Catch real bugs, not just the demo cases",
    description:
      "Software quality beyond clicking around: test strategy, writing clear bug reports, and automating regression with Cypress and Playwright.",
    level: "intermediate",
    estimatedMinutes: 150,
    relatedSkills: ["QA", "Testing", "Cypress", "Playwright", "Automation"],
    tags: ["quality", "automation", "testing"],
    units: [
      {
        id: "u1",
        title: "Test Strategy and Thinking",
        minutes: 45,
        content:
          "Test like an adversary. Prioritize risk over coverage percentages: test the flows users actually depend on and the data that breaks them (empty, null, huge, unknown, duplicate).\n\nMap a feature to: happy path, edge cases, failure modes, backward compatibility, and performance. The strategy is the list of questions; the tests are the answers. A bug report that can't be reproduced is a mystery — always include steps, expected vs actual, environment, and evidence.",
        checklist: [
          "Prioritize tests by risk and user impact",
          "Design tests around edge and failure cases",
          "Write reproducible bug reports with expected vs actual",
          "Test what users touch, not just what is easy",
        ],
        quiz: {
          question: "What makes a bug report actually actionable?",
          options: ["Angry tone", "Reproduction steps plus expected vs actual", "Only the error log", "A screenshot with no context"],
          answerIndex: 1,
          explanation: "Reproducible steps and the expected/actual gap let developers fix it directly.",
        },
      },
      {
        id: "u2",
        title: "Automation with Cypress/Playwright",
        minutes: 55,
        content:
          "E2E tools drive a real browser: select elements by accessible role/text (getByRole, cy.contains), act, assert. Selectors should be stable — prefer data-testid or roles over brittle CSS classes.\n\nWrite tests that read as the user's story: 'the recruiter sees the ranked shortlist'. Run them in CI on every PR. Keep suites fast: parallelize, stub third-party calls, and avoid flaky waits (use explicit waits for elements).",
        checklist: [
          "Use stable selectors (roles, testids)",
          "Write tests as user journeys",
          "Run browser tests in CI",
          "Stub external services; avoid arbitrary sleep",
        ],
        quiz: {
          question: "Why prefer getByRole over CSS class selectors?",
          options: ["It is shorter", "It stays stable across refactors", "It runs faster", "It replaces assertions"],
          answerIndex: 1,
          explanation: "Role-based queries reflect intent and survive design/class refactors.",
        },
      },
      {
        id: "u3",
        title: "Unit and API Testing Practices",
        minutes: 50,
        content:
          "Automation isn't only E2E. Unit tests verify logic in isolation (Jest/Vitest); API tests verify contracts — status codes, shapes, and auth guarantees — the fast layer of the pyramid.\n\nTest behavior, not implementation: input → expected outcome. Keep one assertion-set per test and name tests like sentences. Watch coverage for the seams that matter (auth, scoring, money) rather than chasing 100%.",
        checklist: [
          "Cover scoring, auth, and contract seams with fast tests",
          "Name tests as sentences of behavior",
          "Assert outcomes, not implementation details",
          "Layer slow E2E behind fast unit/API suites",
        ],
        quiz: {
          question: "What should a unit test assert?",
          options: ["Internal variable names", "Observable input-to-outcome behavior", "The exact number of lines", "Nothing, it is documentation"],
          answerIndex: 1,
          explanation: "Assert outcomes users and systems see, so refactors don't break tests for the wrong reasons.",
        },
      },
    ],
    externalResources: [
      { id: "r1", title: "Cypress Docs", url: "https://docs.cypress.io/", type: "documentation" },
      { id: "r2", title: "Playwright Docs", url: "https://playwright.dev/docs/intro", type: "documentation" },
      { id: "r3", title: "Testing Pyramid (Martin Fowler)", url: "https://martinfowler.com/articles/practical-test-pyramid.html", type: "article" },
    ],
  },
  {
    id: "train-marketing",
    slug: "digital-marketing",
    skill: "Digital Marketing",
    title: "Digital Marketing Fundamentals",
    subtitle: "Channels, content, and measuring what matters",
    description:
      "Build a marketing channel mix that actually moves numbers: audience, content, paid/viral channels, and analytics. Ideal for applicants targeting marketing and growth roles.",
    level: "beginner",
    estimatedMinutes: 130,
    relatedSkills: ["Digital Marketing", "Content", "SEO", "Social Media", "Analytics"],
    tags: ["marketing", "growth", "content"],
    units: [
      {
        id: "u1",
        title: "Audience and Positioning",
        minutes: 40,
        content:
          "Marketing starts with a precise audience: demographics, jobs-to-be-done, and objections. A positioning statement answers: for (audience), (product) is (category) that (benefit) unlike (alternative).\n\nOne audience per campaign. If you market to 'everyone', you compete with everyone. Write where your audience already reads and speak in their terms.",
        checklist: [
          "Define one concrete audience per campaign",
          "Write a positioning statement",
          "List audience objections and answers",
          "Pick channels where the audience already is",
        ],
        quiz: {
          question: "What is the risk of targeting 'everyone'?",
          options: ["Budgets grow faster", "The message fits no one closely", "It is always illegal", "It reduces reach"],
          answerIndex: 1,
          explanation: "A generic audience produces a generic message that persuades no one.",
        },
      },
      {
        id: "u2",
        title: "Channels: Content, SEO, Paid, Social",
        minutes: 50,
        content:
          "Owned media (site, newsletter, blog) compounds; earned (shares, press, referrals) builds trust; paid (ads) scales what works. Organic content loop: useful article → reader → subscriber → conversion.\n\nSEO basics: target one primary keyword per page, match search intent, write for humans with good structure. Social: be present on the platform your audience uses daily and adapt content to that format.",
        checklist: [
          "Build an owned channel (email or site) early",
          "Match one keyword to each key page",
          "Adapt content to each platform's format",
          "Reinvest budget into what measurably converts",
        ],
        quiz: {
          question: "What does matching search intent mean in SEO?",
          options: ["Mirroring competitors exactly", "Delivering the content the query implies", "Using many keywords per page", "Buying backlinks"],
          answerIndex: 1,
          explanation: "Match intent: a 'how to' query deserves a tutorial, not a product page.",
        },
      },
      {
        id: "u3",
        title: "Analytics and Experimentation",
        minutes: 40,
        content:
          "Measure beyond vanity: the funnel (impressions → clicks → leads → conversion) and unit economics (CAC, LTV). If you can't measure it, you can't improve it.\n\nRun one experiment at a time with one metric. Google Analytics shows where traffic drops; conversion tracking shows what works. Present numbers as stories: what changed, by how much, and why it matters.",
        checklist: [
          "Track the full funnel, not just clicks",
          "Know your CAC vs LTV",
          "Run single-variable experiments",
          "Report changes with magnitude and context",
        ],
        quiz: {
          question: "What does CAC measure?",
          options: ["Amount of content", "Cost to acquire one customer", "Click attraction cap", "Community activity count"],
          answerIndex: 1,
          explanation: "Customer acquisition cost is total marketing spend divided by new customers.",
        },
      },
    ],
    externalResources: [
      { id: "r1", title: "Google's SEO Starter Guide", url: "https://developers.google.com/search/docs/fundamentals/seo-starter-guide", type: "tutorial" },
      { id: "r2", title: "Google Analytics Academy", url: "https://analytics.google.com/analytics/academy/", type: "tutorial" },
      { id: "r3", title: "HubSpot Marketing Blog", url: "https://blog.hubspot.com/marketing", type: "article" },
    ],
  },
].map((module) => ({ ...module, createdAt: now, updatedAt: now })) as TrainingModule[];

export const TRAINING_MODULES_BY_SKILL: Record<string, TrainingModule> = Object.fromEntries(
  TRAINING_MODULES.map((module) => [module.skill.toLowerCase(), module]),
);

export function findTrainingModuleForSkill(skill: string): TrainingModule | null {
  const normalized = skill.trim().toLowerCase();
  if (TRAINING_MODULES_BY_SKILL[normalized]) {
    return TRAINING_MODULES_BY_SKILL[normalized];
  }

  for (const module of TRAINING_MODULES) {
    const matches = [module.skill, ...module.relatedSkills].some(
      (candidate) => candidate.trim().toLowerCase() === normalized,
    );
    if (matches) {
      return module;
    }
  }

  return null;
}