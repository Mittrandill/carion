import { supabase } from '../lib/supabaseClient';

type SettingType = 'stations' | 'brands' | 'taskTags';

export const addSettingHelper = async (type: SettingType, value: string): Promise<void> => {
  if (value.trim()) {
    const { data, error } = await supabase
      .from('settings')
      .upsert({ type, value: value.trim() })
      .select();

    if (error) {
      console.error('Error adding setting:', error);
      throw error;
    }
  }
};

export const removeSettingHelper = async (type: SettingType, value: string): Promise<void> => {
  const { error } = await supabase
    .from('settings')
    .delete()
    .match({ type, value });

  if (error) {
    console.error('Error removing setting:', error);
    throw error;
  }
};

export const getSettings = async (type: SettingType): Promise<string[]> => {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('type', type);

  if (error) {
    console.error('Error fetching settings:', error);
    throw error;
  }

  return data.map(item => item.value);
};