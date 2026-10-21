import { Request } from 'express';

// ==========================================
// 👤 AUTENTICAÇÃO E USUÁRIOS
// ==========================================
export type UserRole = 'admin' | 'editor' | 'viewer' | string;

export interface UserPayload {
  id?: number;
  username: string;
  name?: string;
  role: UserRole;
  secretariaId?: number;
  secretariaNome?: string;
  iat?: number;
  exp?: number;
}

export interface RequestWithUser extends Request {
  user?: UserPayload;
}

// ==========================================
// 🗺️ SIGEM (GEOPROCESSAMENTO E EQUIPAMENTOS)
// ==========================================
export type PrecisaoGeo =
  | 'NUMERO_EXATO'
  | 'APROXIMADO_LOGRADOURO'
  | 'CENTROIDE_BAIRRO'
  | 'CENTROIDE_DISTRITO'
  | 'NAO_MAPEADO';

export interface EquipamentoInput {
  nome: string;
  categoria_id?: number | string;
  bairro_id?: number | string;
  distrito_id?: number | string;
  endereco?: string;
  numero?: string;
  cep?: string;
  latitude?: number;
  longitude?: number;
  precisao_geo?: PrecisaoGeo;
  telefone?: string;
  email?: string;
  horario_funcionamento?: string;
  observacoes?: string;
  hub_id?: number | null;
}

export interface EquipamentoConsolidado {
  id: string;
  nome: string;
  categoria_id: number;
  categoria_nome: string;
  macrosetor: string;
  setor_oficial: string;
  bairro_id: number;
  bairro_nome: string;
  distrito_id: number;
  distrito_nome: string;
  logradouro: string;
  numero: string;
  cep: string;
  latitude: number | null;
  longitude: number | null;
  precisao_geo: PrecisaoGeo;
  telefone: string;
  email: string;
  hub_id: number | null;
  hub_nome: string | null;
}

// ==========================================
// 📋 CARTA DE SERVIÇOS (MYSQL)
// ==========================================
export interface Secretaria {
  id: number;
  name: string;
  code: string;
}

export interface ServiceSummary {
  id: number;
  secretaria_id: number;
  title: string;
  description: string;
  status: 'published' | 'draft' | 'archived';
  category_name?: string;
  secretaria_name?: string;
}

// ==========================================
// 🛡️ AUDITORIA E LOGS
// ==========================================
export interface AuditoriaLog {
  id: number;
  tabela: string;
  registro_id: string;
  acao: 'INSERT' | 'UPDATE' | 'DELETE' | 'EXPORT';
  usuario: string;
  dados_anteriores?: string;
  dados_novos?: string;
  criado_em: string;
}

// ==========================================
// 📦 RESPOSTAS PADRONIZADAS DE API
// ==========================================
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
