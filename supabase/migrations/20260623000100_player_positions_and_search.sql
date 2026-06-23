alter table public.players
add column if not exists position text not null default 'Mediocampista';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'players_valid_position'
      and conrelid = 'public.players'::regclass
  ) then
    alter table public.players
    add constraint players_valid_position
    check (position in ('Delantero', 'Mediocampista', 'Defensa', 'Arquero'));
  end if;
end;
$$;

insert into public.players (team_name, name, position, display_order, active)
values
  ('Colombia', 'Luis Diaz', 'Delantero', 1, true),
  ('Colombia', 'Jhon Duran', 'Delantero', 2, true),
  ('Colombia', 'Rafael Santos Borre', 'Delantero', 3, true),
  ('Colombia', 'Luis Sinisterra', 'Delantero', 4, true),
  ('Colombia', 'Jaminton Campaz', 'Delantero', 5, true),
  ('Colombia', 'James Rodriguez', 'Mediocampista', 20, true),
  ('Colombia', 'Jhon Arias', 'Mediocampista', 21, true),
  ('Colombia', 'Jefferson Lerma', 'Mediocampista', 22, true),
  ('Colombia', 'Richard Rios', 'Mediocampista', 23, true),
  ('Colombia', 'Kevin Castano', 'Mediocampista', 24, true),
  ('Colombia', 'Juan Fernando Quintero', 'Mediocampista', 25, true),
  ('Colombia', 'Daniel Munoz', 'Defensa', 40, true),
  ('Colombia', 'Yerry Mina', 'Defensa', 41, true),
  ('Colombia', 'Davinson Sanchez', 'Defensa', 42, true),
  ('Colombia', 'Jhon Lucumi', 'Defensa', 43, true),
  ('Colombia', 'Johan Mojica', 'Defensa', 44, true),
  ('Colombia', 'Carlos Cuesta', 'Defensa', 45, true),
  ('Colombia', 'Camilo Vargas', 'Arquero', 60, true),
  ('Colombia', 'David Ospina', 'Arquero', 61, true),
  ('Colombia', 'Alvaro Montero', 'Arquero', 62, true),
  ('Uzbekistan', 'Eldor Shomurodov', 'Delantero', 1, true),
  ('Uzbekistan', 'Oston Urunov', 'Delantero', 2, true),
  ('Uzbekistan', 'Abbosbek Fayzullaev', 'Mediocampista', 20, true),
  ('Uzbekistan', 'Jaloliddin Masharipov', 'Mediocampista', 21, true),
  ('Uzbekistan', 'Odiljon Hamrobekov', 'Mediocampista', 22, true),
  ('Uzbekistan', 'Azizbek Turgunboev', 'Mediocampista', 23, true),
  ('Uzbekistan', 'Farrukh Sayfiev', 'Defensa', 40, true),
  ('Uzbekistan', 'Rustam Ashurmatov', 'Defensa', 41, true),
  ('Uzbekistan', 'Abdukodir Khusanov', 'Defensa', 42, true),
  ('Uzbekistan', 'Utkir Yusupov', 'Arquero', 60, true),
  ('R. D. del Congo', 'Cedric Bakambu', 'Delantero', 1, true),
  ('R. D. del Congo', 'Yoane Wissa', 'Delantero', 2, true),
  ('R. D. del Congo', 'Silas', 'Delantero', 3, true),
  ('R. D. del Congo', 'Theo Bongonda', 'Delantero', 4, true),
  ('R. D. del Congo', 'Simon Banza', 'Delantero', 5, true),
  ('R. D. del Congo', 'Gael Kakuta', 'Mediocampista', 20, true),
  ('R. D. del Congo', 'Samuel Moutoussamy', 'Mediocampista', 21, true),
  ('R. D. del Congo', 'Charles Pickel', 'Mediocampista', 22, true),
  ('R. D. del Congo', 'Chancel Mbemba', 'Defensa', 40, true),
  ('R. D. del Congo', 'Arthur Masuaku', 'Defensa', 41, true),
  ('R. D. del Congo', 'Dimitry Bertaud', 'Arquero', 60, true),
  ('Portugal', 'Cristiano Ronaldo', 'Delantero', 1, true),
  ('Portugal', 'Rafael Leao', 'Delantero', 2, true),
  ('Portugal', 'Goncalo Ramos', 'Delantero', 3, true),
  ('Portugal', 'Joao Felix', 'Delantero', 4, true),
  ('Portugal', 'Diogo Jota', 'Delantero', 5, true),
  ('Portugal', 'Bruno Fernandes', 'Mediocampista', 20, true),
  ('Portugal', 'Bernardo Silva', 'Mediocampista', 21, true),
  ('Portugal', 'Vitinha', 'Mediocampista', 22, true),
  ('Portugal', 'Joao Palhinha', 'Mediocampista', 23, true),
  ('Portugal', 'Ruben Dias', 'Defensa', 40, true),
  ('Portugal', 'Pepe', 'Defensa', 41, true),
  ('Portugal', 'Joao Cancelo', 'Defensa', 42, true),
  ('Portugal', 'Diogo Dalot', 'Defensa', 43, true),
  ('Portugal', 'Diogo Costa', 'Arquero', 60, true)
on conflict (team_name, name)
do update set
  position = excluded.position,
  display_order = excluded.display_order,
  active = true;
