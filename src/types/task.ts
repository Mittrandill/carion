export interface Task {
  id: string;
  title: string;
  description?: string;
  date: string;
  tag: string;
  completed: boolean;
  vehicleId: string;
  created_at: string;
  updated_at: string;
}

export type NewTask = Omit<Task, 'id' | 'created_at' | 'updated_at'>;
export type UpdateTask = Partial<NewTask>;