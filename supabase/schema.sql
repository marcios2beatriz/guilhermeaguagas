-- Tabela de clientes
create table clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text,
  endereco text,
  saldo_fiado numeric default 0,
  created_at timestamptz default now()
);

-- Tabela de vendas
create table vendas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id) on delete set null,
  produto text not null,
  quantidade int not null,
  valor_unit numeric not null,
  total numeric not null,
  fiado boolean default false,
  created_at timestamptz default now()
);

-- Tabela de fluxo de caixa
create table fluxo_caixa (
  id uuid primary key default gen_random_uuid(),
  descricao text not null,
  tipo text check (tipo in ('entrada', 'saida')) not null,
  valor numeric not null,
  cliente_id uuid references clientes(id) on delete set null,
  created_at timestamptz default now()
);

-- Função para incrementar fiado
create or replace function incrementar_fiado(p_cliente_id uuid, p_valor numeric)
returns void as $$
begin
  update clientes set saldo_fiado = saldo_fiado + p_valor where id = p_cliente_id;
end;
$$ language plpgsql;

-- Função para abater fiado
create or replace function abater_fiado(p_cliente_id uuid, p_valor numeric)
returns void as $$
begin
  update clientes
  set saldo_fiado = greatest(0, saldo_fiado - p_valor)
  where id = p_cliente_id;
end;
$$ language plpgsql;
