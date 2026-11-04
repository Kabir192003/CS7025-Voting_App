-- This or That: complete schema.
-- Runs on Supabase (SQL editor, `supabase db push`, or `npm run migrate`) and on any Postgres 14+.
--
-- Security model: the Node server is the only client. It connects with the database
-- owner role, which bypasses row-level security. RLS is enabled on every table with
-- NO policies, and anon/authenticated are revoked, so Supabase's auto-generated Data
-- API (PostgREST) cannot read or write anything even if the anon key leaks.

-- ---------------------------------------------------------------------------
-- users and topics
-- ---------------------------------------------------------------------------
create table public.users (
  user_id        integer generated always as identity primary key,
  username       varchar(24)  not null,
  email          varchar(254),
  password_hash  varchar(255) not null,
  display_name   varchar(40),
  avatar_data    text,
  gender         varchar(32),
  birthday       date,
  region         varchar(60),
  bio            varchar(200),
  token_version  integer      not null default 0,
  created_at     timestamptz  not null default now(),
  constraint users_username_format check (username ~ '^[A-Za-z0-9_.]{3,24}$')
);
create unique index users_username_lower on public.users (lower(username));

create table public.categories (
  category_id integer generated always as identity primary key,
  name        varchar(40) not null unique,
  slug        varchar(40) not null unique,
  sort_order  integer     not null default 100
);

insert into public.categories (name, slug, sort_order) values
  ('Tech', 'tech', 0), ('Money', 'money', 1), ('Career', 'career', 2), ('Study', 'study', 3),
  ('Travel', 'travel', 4), ('Food & Drink', 'food-drink', 5), ('Home', 'home', 6), ('Health', 'health', 7),
  ('Style', 'style', 8), ('Relationships', 'relationships', 9), ('Entertainment', 'entertainment', 10), ('Everyday', 'everyday', 11);

create table public.user_preferences (
  user_id     integer not null references public.users(user_id) on delete cascade,
  category_id integer not null references public.categories(category_id) on delete cascade,
  primary key (user_id, category_id)
);

-- ---------------------------------------------------------------------------
-- decisions (polls) and their two options
-- ---------------------------------------------------------------------------
create table public.questions (
  question_id       integer generated always as identity primary key,
  user_id           integer      not null references public.users(user_id) on delete cascade,
  category_id       integer      references public.categories(category_id) on delete set null,
  title             varchar(140) not null,
  description       text         not null default '',
  is_anonymous      boolean      not null default false,
  comments_enabled  boolean      not null default true,   -- "arguments enabled"
  hide_results      boolean      not null default true,
  status            varchar(12)  not null default 'open' check (status in ('open', 'archived', 'removed')),
  closes_at         timestamptz,
  created_at        timestamptz  not null default now(),
  outcome_option_id integer,
  outcome_at        timestamptz,
  edited_at         timestamptz,
  votes_total       integer      not null default 0 check (votes_total >= 0),
  args_count        integer      not null default 0 check (args_count >= 0)
);
create index questions_feed     on public.questions (status, created_at desc);
create index questions_category on public.questions (category_id);
create index questions_owner    on public.questions (user_id, created_at desc);
create index questions_closes   on public.questions (closes_at) where status = 'open';

create table public.options (
  option_id   integer generated always as identity primary key,
  question_id integer     not null references public.questions(question_id) on delete cascade,
  option_text varchar(60) not null,
  position    smallint    not null check (position in (0, 1)),   -- 0 = THIS, 1 = THAT
  votes_count integer     not null default 0 check (votes_count >= 0),
  unique (question_id, position),
  unique (option_id, question_id)                                 -- target for composite foreign keys
);
alter table public.questions
  add constraint questions_outcome_fk foreign key (outcome_option_id) references public.options(option_id) on delete set null;

-- ---------------------------------------------------------------------------
-- votes, arguments, saves
-- A vote or argument can only point at an option that belongs to the same
-- decision: the composite foreign key enforces that in the database itself.
-- ---------------------------------------------------------------------------
create table public.votes (
  vote_id     integer generated always as identity primary key,
  question_id integer     not null,
  option_id   integer     not null,
  user_id     integer     not null references public.users(user_id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (question_id, user_id),
  foreign key (option_id, question_id) references public.options(option_id, question_id) on delete cascade,
  foreign key (question_id) references public.questions(question_id) on delete cascade
);
create index votes_option on public.votes (option_id);
create index votes_time   on public.votes (question_id, created_at);
create index votes_user   on public.votes (user_id, created_at desc);

create table public.result_peeks (
  question_id integer     not null references public.questions(question_id) on delete cascade,
  user_id     integer     not null references public.users(user_id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (question_id, user_id)
);

create table public.arguments (
  argument_id      integer generated always as identity primary key,
  question_id      integer       not null,
  option_id        integer       not null,
  user_id          integer       not null references public.users(user_id) on delete cascade,
  body             varchar(1200) not null,
  convincing_count integer       not null default 0 check (convincing_count >= 0),
  hidden           boolean       not null default false,
  created_at       timestamptz   not null default now(),
  foreign key (option_id, question_id) references public.options(option_id, question_id) on delete cascade,
  foreign key (question_id) references public.questions(question_id) on delete cascade
);
create index arguments_poll on public.arguments (question_id, hidden, created_at desc);
create index arguments_user on public.arguments (user_id, question_id);

create table public.argument_marks (
  argument_id integer     not null references public.arguments(argument_id) on delete cascade,
  user_id     integer     not null references public.users(user_id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (argument_id, user_id)
);

create table public.saves (
  user_id     integer     not null references public.users(user_id) on delete cascade,
  question_id integer     not null references public.questions(question_id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, question_id)
);
create index saves_poll on public.saves (question_id);

-- ---------------------------------------------------------------------------
-- moderation and notifications
-- ---------------------------------------------------------------------------
create table public.reports (
  report_id   integer generated always as identity primary key,
  reporter_id integer     not null references public.users(user_id) on delete cascade,
  question_id integer     references public.questions(question_id) on delete cascade,
  argument_id integer     references public.arguments(argument_id) on delete cascade,
  target      varchar(24) not null,                    -- 'q:12' or 'a:7'; one report per reporter per target
  reason      varchar(16) not null check (reason in ('spam', 'abuse', 'misleading', 'other')),
  note        varchar(600),
  created_at  timestamptz not null default now(),
  unique (reporter_id, target)
);
create index reports_poll     on public.reports (question_id);
create index reports_argument on public.reports (argument_id);

create table public.notifications (
  notification_id integer generated always as identity primary key,
  user_id         integer     not null references public.users(user_id) on delete cascade,
  type            varchar(24) not null,
  question_id     integer     not null references public.questions(question_id) on delete cascade,
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);
create index notifications_user on public.notifications (user_id, read_at, created_at desc);

-- ---------------------------------------------------------------------------
-- lock down the Supabase Data API
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on all tables in schema public from anon;
    revoke all on all sequences in schema public from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on all tables in schema public from authenticated;
    revoke all on all sequences in schema public from authenticated;
  end if;
end $$;
