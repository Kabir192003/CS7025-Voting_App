# Database Schema

Here is the database schema inferred from the codebase (`scripts/seed_data.js` and controllers).

## Tables

### `users`
- **Primary Key:** `user_id`
- **Columns:**
  - `username`
  - `password_hash`
- **Foreign Keys:** None

### `categories`
- **Primary Key:** `category_id`
- **Columns:**
  - `name`
- **Foreign Keys:** None

### `questions`
- **Primary Key:** `question_id`
- **Columns:**
  - `user_id` (Foreign Key -> `users.user_id`)
  - `title`
  - `description`
  - `is_anonymous`
  - `comments_enabled`
  - `created_at`
- **Foreign Keys:**
  - `user_id` references `users(user_id)`

### `question_categories`
- **Primary Key:** Composite Key (`question_id`, `category_id`)
- **Columns:**
  - `question_id` (Foreign Key -> `questions.question_id`)
  - `category_id` (Foreign Key -> `categories.category_id`)
- **Foreign Keys:**
  - `question_id` references `questions(question_id)`
  - `category_id` references `categories(category_id)`

### `options`
- **Primary Key:** `option_id`
- **Columns:**
  - `question_id` (Foreign Key -> `questions.question_id`)
  - `option_text`
- **Foreign Keys:**
  - `question_id` references `questions(question_id)`

### `responses`
- **Primary Key:** `response_id`
- **Columns:**
  - `question_id` (Foreign Key -> `questions.question_id`)
  - `user_id` (Foreign Key -> `users.user_id`)
  - `option_id` (Foreign Key -> `options.option_id`, Nullable)
  - `comment_text` (Nullable)
  - `created_at`
- **Foreign Keys:**
  - `question_id` references `questions(question_id)`
  - `user_id` references `users(user_id)`
  - `option_id` references `options(option_id)`

### `user_preferences`
- **Primary Key:** Composite Key (`user_id`, `category_id`)
- **Columns:**
  - `user_id` (Foreign Key -> `users.user_id`)
  - `category_id` (Foreign Key -> `categories.category_id`)
- **Foreign Keys:**
  - `user_id` references `users(user_id)`
  - `category_id` references `categories(category_id)`
 
