
export enum UserRole {
  ADMIN = 'Admin',
  MANAGER = 'Manager',
  TECHNICIAN = 'Technician',
}

export interface User {
  id: number;
  username: string;
  role: UserRole;
  password?: string; // In a real app, this would be a hashed value and never sent to the client.
}

export interface ProductType {
  id: number;
  typeName: string;
  partNumber: string;
}

export interface ProductionStage {
  id: number;
  productTypeId: number;
  stageName: string;
  description: string;
  sequenceOrder: number;
  instruction_file?: string;
}

export interface Job {
  id: number;
  docketNumber: string;
  quantity: number;
  priority: number; // 1=High, 2=Medium, 3=Normal
  dueDate: string;
  status: 'Open' | 'Completed';
  productType: ProductType;
  currentStageId: number;
  assignedUserId: number;
}

export interface Product {
  id: number;
  jobId: number;
  serialNumber: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Scrapped' | 'Failed';
  currentWorkerId?: number;
}

export interface JobAssignment {
  id: number;
  jobId: number;
  userId: number;
  productionStageId: number;
}

export interface JobStageStatus {
  id: number;
  jobId: number;
  productionStageId: number;
  status: 'Pending' | 'In Progress' | 'Completed';
  passedCount: number;
  failedCount: number;
  scrappedCount: number;
}

export enum StageEventStatus {
    PENDING = 'PENDING',
    STARTED = 'STARTED',
    PASSED = 'PASSED',
    FAILED = 'FAILED',
    RESET = 'RESET',
    SCRAPPED = 'SCRAPPED',
}

export interface ProductStageLink {
    id: number;
    productId: number;
    productionStageId: number;
}

export interface StageEvent {
    id: number;
    productStageLinkId: number;
    status: StageEventStatus;
    notes?: string;
    timestamp: string;
    userId: number;
    durationSeconds?: number;
}

export interface KanbanCardData {
  id: string;
  title: string;
  content: string;
  priority: number;
  dueDate: string;
  user: User;
  stage: ProductionStage;
}

export interface KanbanColumnData {
  id: string;
  title: string;
  cards: KanbanCardData[];
}