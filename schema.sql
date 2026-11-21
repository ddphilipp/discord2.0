create table if not exists users (
  id serial primary key,
  username text unique not null,
  pw text not null
);
create table if not exists friendships (
  id serial primary key,
  a int not null references users(id),
  b int not null references users(id),
  status text not null default 'pending'
);
create table if not exists rooms (
  id serial primary key,
  name text not null,
  owner int not null references users(id)
);
create table if not exists room_members (
  room_id int references rooms(id) on delete cascade,
  user_id int references users(id),
  primary key (room_id, user_id)
);
create table if not exists room_requests (
  room_id int references rooms(id) on delete cascade,
  user_id int references users(id),
  primary key (room_id, user_id)
);
create table if not exists channels (
  id serial primary key,
  room_id int references rooms(id) on delete cascade,
  name text not null,
  kind text not null default 'text'
);
create table if not exists messages (
  id serial primary key,
  scope text not null,
  ref int not null,
  user_id int not null references users(id),
  body text not null default '',
  file_url text,
  file_name text,
  created_at timestamptz default now()
);
create index if not exists messages_chat on messages(scope, ref, id);
create table if not exists chat_game (
  scope text not null,
  ref int not null,
  game text not null default '',
  note text not null default '',
  links text not null default '',
  primary key (scope, ref)
);
