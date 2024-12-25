import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Button } from '../components/ui/button';
import { useToast } from '../components/ui/use-toast';

interface Task {
  id: number;
  title: string;
  description: string;
  completed: boolean;
}

const TasksList: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('idle');
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (status === 'idle') {
      fetchTasks();
    }
  }, [status]);

  const fetchTasks = async () => {
    setStatus('loading');
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        throw error;
      }

      setTasks(data || []);
      setStatus('succeeded');
    } catch (error) {
      setError('Görevler yüklenirken bir hata oluştu.');
      setStatus('failed');
      console.error('Görev yükleme hatası:', error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      setTasks(tasks.filter(task => task.id !== id));
      toast({
        title: "Görev Silindi",
        description: "Görev başarıyla silindi.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Görev silinirken bir hata oluştu.",
      });
      console.error('Görev silme hatası:', error);
    }
  };

  if (status === 'loading') {
    return <div>Yükleniyor...</div>;
  }

  if (status === 'failed') {
    return <div>Hata: {error}</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Görevler</h1>
      <ul>
        {tasks.map((task) => (
          <li key={task.id} className="flex justify-between items-center mb-2">
            <div>
              <h2 className="text-lg font-semibold">{task.title}</h2>
              <p>{task.description}</p>
              <p>Status: {task.completed ? 'Tamamlandı' : 'Tamamlanmadı'}</p>
            </div>
            <Button variant="destructive" onClick={() => handleDelete(task.id)}>
              Sil
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TasksList;